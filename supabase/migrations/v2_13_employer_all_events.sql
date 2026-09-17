-- v2_13 — Employers see every published event.
--
-- WHY
-- v2_11 listed only events the employer's company takes part in, so a newly
-- published event did not show up until an admin added the company to it.
--
-- WHAT CHANGES
-- 1. _employer_available_events also lists every published / ongoing / completed
--    event, for the employer's company (the company of their most recent
--    membership).
-- 2. employer_open_event adds the company to such an event
--    (company_event_participation) before linking the employer.
-- 3. company_event_removals: when an event admin removes a company from their
--    event, it is not added back automatically. Adding the company again
--    (Add Company / Add Existing / super admin) clears the removal.
--
-- Unchanged: draft and cancelled events are never offered; an employer removed
-- from an event is not offered it again; another role in the event wins.
--
-- Idempotent, single transaction.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Company removals that must stick
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_event_removals (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, event_id)
);

ALTER TABLE public.company_event_removals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.company_event_removals FROM PUBLIC, anon, authenticated;

-- Any way a company is (re)added to an event clears its removal.
CREATE OR REPLACE FUNCTION public.trg_cep_clear_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.company_event_removals
  WHERE company_id = NEW.company_id AND event_id = NEW.event_id;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_cep_clear_removal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cep_clear_removal ON public.company_event_participation;
CREATE TRIGGER trg_cep_clear_removal
  AFTER INSERT ON public.company_event_participation
  FOR EACH ROW EXECUTE FUNCTION public.trg_cep_clear_removal();

-- Carried over from v2_09; records the removal (unless the company itself is gone).
CREATE OR REPLACE FUNCTION public.admin_delete_company(_company_id uuid, _event_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(_event_id, public.get_active_event_id());
BEGIN
  IF NOT public.is_admin(v_event) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = _company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  DELETE FROM public.job_applications
  WHERE job_position_id IN (
    SELECT jp.id FROM public.job_positions jp
    WHERE jp.company_id = _company_id AND jp.event_id = v_event
  );

  DELETE FROM public.job_positions
  WHERE company_id = _company_id AND event_id = v_event;

  DELETE FROM public.user_roles ur
  USING public.employers em
  WHERE em.company_id = _company_id
    AND em.event_id = v_event
    AND ur.user_id = em.user_id
    AND ur.event_id = v_event
    AND ur.role = 'employer';

  DELETE FROM public.employers
  WHERE company_id = _company_id AND event_id = v_event;

  DELETE FROM public.company_event_participation
  WHERE company_id = _company_id AND event_id = v_event;

  -- Remove the global row only when fully orphaned.
  IF NOT EXISTS (
    SELECT 1 FROM public.company_event_participation WHERE company_id = _company_id
  ) THEN
    DELETE FROM public.companies WHERE id = _company_id;
  ELSE
    -- v2_13: employers of this company must not re-add it by opening the event
    INSERT INTO public.company_event_removals (company_id, event_id, removed_by)
    VALUES (_company_id, v_event, auth.uid())
    ON CONFLICT (company_id, event_id) DO UPDATE
    SET removed_by = EXCLUDED.removed_by, removed_at = now();
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Events an employer can open
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._employer_available_events(_user_id uuid)
RETURNS TABLE (event_id uuid, company_id uuid, is_member boolean, job_title text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH my_companies AS (
    SELECT DISTINCT ON (em.company_id) em.company_id, em.job_title, em.created_at
    FROM public.employers em
    WHERE em.user_id = _user_id
    ORDER BY em.company_id, em.created_at DESC
  ),
  main_company AS (
    SELECT * FROM my_companies ORDER BY created_at DESC LIMIT 1
  ),
  candidates AS (
    -- 0: already a member
    SELECT em.event_id, em.company_id, true AS is_member, em.job_title, 0 AS rank, em.created_at
    FROM public.employers em
    JOIN public.user_roles ur
      ON ur.user_id = em.user_id AND ur.event_id = em.event_id AND ur.role = 'employer'
    WHERE em.user_id = _user_id
    UNION ALL
    -- 1: one of their companies takes part
    SELECT cep.event_id, mc.company_id, false, mc.job_title, 1, mc.created_at
    FROM my_companies mc
    JOIN public.company_event_participation cep
      ON cep.company_id = mc.company_id AND coalesce(cep.is_active, true)
    UNION ALL
    -- 2: any other visible event, for their main company (v2_13)
    SELECT e.id, m.company_id, false, m.job_title, 2, m.created_at
    FROM main_company m
    CROSS JOIN public.events e
    WHERE e.status IN ('published', 'ongoing', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM public.company_event_removals r
        WHERE r.company_id = m.company_id AND r.event_id = e.id
      )
      -- a deactivated participation counts as a removal
      AND NOT EXISTS (
        SELECT 1 FROM public.company_event_participation cep
        WHERE cep.company_id = m.company_id AND cep.event_id = e.id
          AND NOT coalesce(cep.is_active, true)
      )
  )
  SELECT DISTINCT ON (c.event_id) c.event_id, c.company_id, c.is_member, c.job_title
  FROM candidates c
  JOIN public.events e ON e.id = c.event_id
  WHERE (
      c.is_member
      OR (
        e.status NOT IN ('draft', 'cancelled')
        AND NOT EXISTS (
          SELECT 1 FROM public.employer_event_removals r
          WHERE r.user_id = _user_id AND r.event_id = c.event_id
        )
        -- another role in that event (attendee, staff) takes precedence
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id AND ur.event_id = c.event_id AND ur.role <> 'employer'
        )
      )
    )
  ORDER BY c.event_id, c.rank, c.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public._employer_available_events(uuid) FROM PUBLIC, anon, authenticated;

-- Carried over from v2_11; adds the company to the event when needed.
CREATE OR REPLACE FUNCTION public.employer_open_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_row  record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public._employer_available_events(v_user) a
  WHERE a.event_id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have access to this event.');
  END IF;

  IF NOT v_row.is_member THEN
    -- v2_13: the company joins the event first
    INSERT INTO public.company_event_participation (company_id, event_id, is_active)
    VALUES (v_row.company_id, p_event_id, true)
    ON CONFLICT (company_id, event_id) DO NOTHING;

    INSERT INTO public.employers (user_id, event_id, company_id, job_title)
    VALUES (v_user, p_event_id, v_row.company_id, v_row.job_title)
    ON CONFLICT (user_id, event_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, event_id, role)
    VALUES (v_user, p_event_id, 'employer')
    ON CONFLICT (user_id, event_id) WHERE event_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'company_id', v_row.company_id,
    'is_ended', public.employer_event_is_ended(p_event_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.employer_open_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_open_event(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
