-- v2_10 — Let admins create employer accounts from an e-mail only.
--
-- WHY
-- 1. trg_on_auth_user_created builds user_profiles from the new account's
--    metadata. personal_id and nationality are NOT NULL, so an account created
--    without them (the admin only enters an e-mail; the employer fills in their
--    details after the first login) was rejected with "Database error creating
--    new user".
--    Now: when no personal_id is supplied, no profile is created. The employer's
--    profile is written later by employer_complete_profile(). Every other signup
--    path sends personal_id, so their behaviour is unchanged.
--
-- 2. employer_admin_attach (v2_09) used
--        ON CONFLICT (user_id, COALESCE(event_id, ...))
--    but user_roles' unique index is (user_id, event_id) WHERE event_id IS NOT NULL,
--    so the insert failed. It now uses the same conflict target as
--    register_attendee.
--
-- Idempotent, single transaction.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Auth trigger: skip the profile when there is no personal ID yet
--    (carried over from the live definition; only the guard is new)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_on_auth_user_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- v2_10: admin-created employer accounts have no details yet; their profile
  -- is created by employer_complete_profile() after the first login.
  IF nullif(trim(coalesce(NEW.raw_user_meta_data->>'personal_id', '')), '') IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_profiles
    (id, full_name, email, phone, personal_id, nationality, gender)
  VALUES (
    NEW.id,
    left(
      coalesce(
        nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
        split_part(coalesce(NEW.email, 'user@localhost'), '@', 1),
        'New User'
      ), 100),
    lower(NEW.email),
    left(nullif(trim(coalesce(NEW.raw_user_meta_data->>'phone', '')), ''), 30),
    left(upper(nullif(trim(coalesce(NEW.raw_user_meta_data->>'personal_id', '')), '')), 50),
    left(nullif(trim(coalesce(NEW.raw_user_meta_data->>'nationality', '')), ''), 100),
    left(nullif(trim(coalesce(NEW.raw_user_meta_data->>'gender', '')), ''), 30)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. employer_admin_attach with the correct user_roles conflict target
-- ---------------------------------------------------------------------------
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

NOTIFY pgrst, 'reload schema';

COMMIT;
