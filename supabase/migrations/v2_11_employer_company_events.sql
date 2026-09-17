-- v2_11 — Employers see every event their company takes part in.
--
-- WHY
-- employer_get_my_events (v2_09) listed only events where an admin had added the
-- employer personally. A company that joins another event (new or past) did not
-- show up for its employers until an admin added them again in that event.
--
-- WHAT CHANGES
-- 1. employer_get_my_events also lists events (not draft / cancelled) in which one
--    of the employer's companies participates.
-- 2. employer_open_event(): opening such an event links the employer to it
--    (employers row + employer role), so the dashboard works as usual. Ended
--    events stay view-only through employer_event_is_ended().
-- 3. employer_event_removals: when an admin removes an employer from an event,
--    that event is not offered to them again automatically. Adding them back from
--    the admin panel clears the removal.
--
-- Idempotent, single transaction.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Removals that must stick
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employer_event_removals (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- Only reached through the SECURITY DEFINER functions below.
ALTER TABLE public.employer_event_removals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.employer_event_removals FROM PUBLIC, anon, authenticated;

-- Carried over from v2_09; now records the removal.
CREATE OR REPLACE FUNCTION public.admin_remove_employer(_event_id uuid, _user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF NOT public.is_admin(_event_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  DELETE FROM public.employers
  WHERE user_id = _user_id AND event_id = _event_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Employer not found');
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND event_id = _event_id AND role = 'employer';

  INSERT INTO public.employer_event_removals (user_id, event_id, removed_by)
  VALUES (_user_id, _event_id, auth.uid())
  ON CONFLICT (user_id, event_id) DO UPDATE
  SET removed_by = EXCLUDED.removed_by, removed_at = now();

  RETURN json_build_object('success', true);
END;
$function$;

-- Carried over from v2_10; adding an employer clears an earlier removal.
CREATE OR REPLACE FUNCTION public.employer_admin_attach(
  p_admin_id uuid, p_event_id uuid, p_company_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_role text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_admin_id
      AND ((role = 'admin' AND event_id = p_event_id)
        OR (role = 'sadmin' AND event_id IS NULL))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required', 'field', 'general');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_event_participation
    WHERE company_id = p_company_id AND event_id = p_event_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This company is not part of your event', 'field', 'general');
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id AND event_id = p_event_id;

  IF v_role IS NOT NULL AND v_role <> 'employer' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('This account already has the role "%s" in this event', v_role),
      'field', 'email'
    );
  END IF;

  -- The job title is filled in by the employer during profile setup.
  INSERT INTO public.employers (user_id, event_id, company_id)
  VALUES (p_user_id, p_event_id, p_company_id)
  ON CONFLICT (user_id, event_id) DO UPDATE
  SET company_id = EXCLUDED.company_id;

  INSERT INTO public.user_roles (user_id, event_id, role)
  VALUES (p_user_id, p_event_id, 'employer')
  ON CONFLICT (user_id, event_id) WHERE event_id IS NOT NULL DO NOTHING;

  -- v2_11
  DELETE FROM public.employer_event_removals
  WHERE user_id = p_user_id AND event_id = p_event_id;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);

EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'The account, company or event could not be found.', 'field', 'general');
  WHEN OTHERS THEN
    RAISE WARNING '[employer_admin_attach] % (%)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object('success', false, 'error', 'Could not link the employer. Please try again.', 'field', 'general');
END;
$function$;

REVOKE ALL ON FUNCTION public.employer_admin_attach(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employer_admin_attach(uuid, uuid, uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Events an employer can open
-- ---------------------------------------------------------------------------

-- One row per event: events the employer is already in, plus events one of their
-- companies takes part in (company of the most recent membership wins).
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
  candidates AS (
    -- already a member
    SELECT em.event_id, em.company_id, true AS is_member, em.job_title, 0 AS rank, em.created_at
    FROM public.employers em
    JOIN public.user_roles ur
      ON ur.user_id = em.user_id AND ur.event_id = em.event_id AND ur.role = 'employer'
    WHERE em.user_id = _user_id
    UNION ALL
    -- company takes part, employer not removed, event visible
    SELECT cep.event_id, mc.company_id, false, mc.job_title, 1, mc.created_at
    FROM my_companies mc
    JOIN public.company_event_participation cep
      ON cep.company_id = mc.company_id AND coalesce(cep.is_active, true)
    JOIN public.events e ON e.id = cep.event_id
    WHERE e.status NOT IN ('draft', 'cancelled')
      AND NOT EXISTS (
        SELECT 1 FROM public.employer_event_removals r
        WHERE r.user_id = _user_id AND r.event_id = cep.event_id
      )
      -- another role in that event (attendee, staff) takes precedence
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id AND ur.event_id = cep.event_id AND ur.role <> 'employer'
      )
  )
  SELECT DISTINCT ON (c.event_id) c.event_id, c.company_id, c.is_member, c.job_title
  FROM candidates c
  ORDER BY c.event_id, c.rank, c.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public._employer_available_events(uuid) FROM PUBLIC, anon, authenticated;

-- Same result shape as v2_09.
CREATE OR REPLACE FUNCTION public.employer_get_my_events()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user    uuid := auth.uid();
  v_profile jsonb;
  v_events  jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
           'full_name', up.full_name,
           'phone', up.phone,
           'personal_id', up.personal_id,
           'nationality', up.nationality,
           'gender', up.gender
         )
  INTO v_profile
  FROM public.user_profiles up
  WHERE up.id = v_user;

  SELECT coalesce(jsonb_agg(ev ORDER BY (ev ->> 'is_ended')::boolean, ev ->> 'start_date' DESC NULLS LAST), '[]'::jsonb)
  INTO v_events
  FROM (
    SELECT jsonb_build_object(
             'event_id', e.id,
             'event_name', e.name,
             'event_type', e.event_type,
             'status', e.status,
             'start_date', e.start_date,
             'end_date', e.end_date,
             'venue_name', e.venue_name,
             'is_ended', public.employer_event_is_ended(e.id),
             'is_current', e.id IS NOT DISTINCT FROM public.get_active_event_id(),
             'company_id', c.id,
             'company_name', c.company_name,
             'company_logo', c.logo_url,
             'job_title', a.job_title
           ) AS ev
    FROM public._employer_available_events(v_user) a
    JOIN public.events e ON e.id = a.event_id
    JOIN public.companies c ON c.id = a.company_id
  ) x;

  RETURN jsonb_build_object(
    'is_employer', jsonb_array_length(v_events) > 0,
    'profile_complete', v_profile IS NOT NULL
                        AND nullif(v_profile ->> 'full_name', '') IS NOT NULL
                        AND nullif(v_profile ->> 'phone', '') IS NOT NULL
                        AND nullif(v_profile ->> 'personal_id', '') IS NOT NULL,
    'profile', v_profile,
    'events', v_events
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.employer_get_my_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_get_my_events() TO authenticated;

-- Called when the employer picks an event: joins it if they aren't a member yet.
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
