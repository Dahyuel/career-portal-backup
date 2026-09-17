-- v2_09 — Companies, admin-managed employers, employer onboarding, read-only
--         ended events, and the Companies bucket.
--
-- EMPLOYER FLOW
--   1. An event admin adds an employer (e-mail + company) from the admin panel.
--      The admin-create-employer edge function creates the account with a
--      generated password (or links an existing account with that e-mail).
--   2. The admin sends the password to the employer, who logs in at /login.
--   3. On first login the employer fills in their profile
--      (employer_complete_profile), then picks one of their events
--      (employer_get_my_events) and lands on the dashboard.
--   4. An ended event is view-only: every employer write refuses it.
--
-- WHAT THIS FILE DOES
--   1. partner_type: the table accepted 8 values, the admin UI offers 10 — the
--      constraint now accepts both lists.
--   2. company_key: every company gets a unique key generated in the database
--      (e.g. VODA-3F9A1C07). Existing companies without one are backfilled.
--   3. Admin RPCs for employers and for linking existing companies to an event.
--   4. Employer self-service: profile completion, event list.
--   5. Ended events are read-only for employers (jobs, applications, company).
--   6. Storage: the 'Companies' bucket the logo uploader writes to did not exist.
--
-- SECURITY
--   register_employer() takes an arbitrary user id and was callable by clients,
--   which let anyone make any account an employer of any company. It is now
--   service_role only.
--
-- Idempotent, and a single transaction: it either fully applies or does nothing.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. partner_type constraint
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.company_event_participation'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%partner_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.company_event_participation DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.company_event_participation
  ADD CONSTRAINT company_event_participation_partner_type_check
  CHECK (partner_type IS NULL OR partner_type IN (
    'diamond', 'platinum', 'gold', 'silver', 'exhibitor_a', 'exhibitor_b',
    'exhibitor_a&b', 'silver&exhibitor_a',
    'student_activity_partner', 'community_partner', 'catering_partner',
    'career_coaching_partner'
  ));

-- ---------------------------------------------------------------------------
-- 2. Company keys
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._generate_company_key(_name text)
RETURNS text
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_prefix text;
  v_key    text;
BEGIN
  -- Up to 4 letters/digits from the company name; COMP when the name has none
  -- (e.g. a name written only in Arabic).
  v_prefix := upper(left(regexp_replace(coalesce(_name, ''), '[^A-Za-z0-9]', '', 'g'), 4));
  IF length(v_prefix) < 2 THEN
    v_prefix := 'COMP';
  END IF;

  LOOP
    v_key := v_prefix || '-' || upper(encode(gen_random_bytes(4), 'hex'));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.companies WHERE company_key = v_key);
  END LOOP;

  RETURN v_key;
END;
$function$;

REVOKE ALL ON FUNCTION public._generate_company_key(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_companies_set_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND nullif(btrim(coalesce(OLD.company_key, '')), '') IS NOT NULL THEN
    -- A key is permanent once issued.
    NEW.company_key := OLD.company_key;
  ELSIF NEW.company_key IS NULL OR btrim(NEW.company_key) = '' THEN
    NEW.company_key := public._generate_company_key(NEW.company_name);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_companies_set_key() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_companies_set_key ON public.companies;
CREATE TRIGGER trg_companies_set_key
  BEFORE INSERT OR UPDATE OF company_key ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trg_companies_set_key();

-- Backfill one row at a time so each new key sees the ones issued before it.
-- (Setting it to NULL lets the trigger generate it.)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.companies
           WHERE company_key IS NULL OR btrim(company_key) = ''
  LOOP
    UPDATE public.companies SET company_key = NULL WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.companies ALTER COLUMN company_key SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Admin-managed employers
-- ---------------------------------------------------------------------------

-- Called by the admin-create-employer edge function with the ADMIN's token, so
-- is_admin() checks the real caller. Returns {success, existing_user_id} or
-- {success:false, error, field}.
CREATE OR REPLACE FUNCTION public.admin_employer_precheck(_event_id uuid, _company_id uuid, _email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_email   text := lower(btrim(coalesce(_email, '')));
  v_user    uuid;
  v_role    text;
  v_company text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin(_event_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_event_participation
    WHERE company_id = _company_id AND event_id = _event_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This company is not part of your event', 'field', 'general');
  END IF;

  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(v_email) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a valid email address', 'field', 'email');
  END IF;

  SELECT id INTO v_user FROM auth.users WHERE lower(email) = v_email LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', true, 'existing_user_id', NULL);
  END IF;

  SELECT c.company_name INTO v_company
  FROM public.employers em
  JOIN public.companies c ON c.id = em.company_id
  WHERE em.user_id = v_user AND em.event_id = _event_id;

  IF v_company IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('This account is already an employer of %s in this event', v_company),
      'field', 'email'
    );
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_user AND event_id = _event_id;

  IF v_role IS NOT NULL AND v_role <> 'employer' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('This account already has the role "%s" in this event', v_role),
      'field', 'email'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'existing_user_id', v_user);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_employer_precheck(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_employer_precheck(uuid, uuid, text) TO authenticated;

-- Called by the edge function with the service role once the admin is verified.
-- Re-checks the admin by id (auth.uid() is empty under service_role).
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
  ON CONFLICT (user_id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'))
  DO NOTHING;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.employer_admin_attach(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employer_admin_attach(uuid, uuid, uuid, uuid) TO service_role;

-- Take employer access away in this event. The account itself is kept.
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

  RETURN json_build_object('success', true);
END;
$function$;

-- Takes an arbitrary user id: server-side only.
DO $$
BEGIN
  IF to_regprocedure('public.register_employer(uuid,text,text,text,text,uuid,text,uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.register_employer(uuid, text, text, text, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.register_employer(uuid, text, text, text, text, uuid, text, uuid) TO service_role;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3b. Admin company RPCs
-- ---------------------------------------------------------------------------

-- Companies of the admin's event, now with their key and employers.
CREATE OR REPLACE FUNCTION public.admin_get_companies(_event_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT coalesce(
    json_agg(
      json_build_object(
        'id', c.id,
        'event_id', cep.event_id,
        'company_name', c.company_name,
        'company_key', c.company_key,
        'industry', c.industry,
        'email', c.email,
        'website', c.website,
        'description', c.description,
        'booth_number', cep.booth_number,
        'logo_url', c.logo_url,
        'partner_type', cep.partner_type,
        'faculties', cep.faculties,
        'is_active', cep.is_active,
        'created_at', c.created_at,
        'employers', (
          SELECT coalesce(json_agg(
                   json_build_object(
                     'user_id', em.user_id,
                     'full_name', up.full_name,
                     'email', coalesce(up.email, u.email),
                     'phone', up.phone,
                     'job_title', em.job_title,
                     'profile_complete', up.id IS NOT NULL,
                     'added_at', em.created_at
                   )
                   ORDER BY em.created_at
                 ), '[]'::json)
          FROM public.employers em
          LEFT JOIN public.user_profiles up ON up.id = em.user_id
          LEFT JOIN auth.users u ON u.id = em.user_id
          WHERE em.company_id = c.id AND em.event_id = cep.event_id
        )
      )
      ORDER BY c.created_at DESC
    ),
    '[]'::json
  )
  FROM public.companies c
  JOIN public.company_event_participation cep ON cep.company_id = c.id
  WHERE cep.event_id = _event_id
    AND public.is_admin(_event_id);
$function$;

-- Every company in the system, flagged when already in the admin's event.
CREATE OR REPLACE FUNCTION public.admin_get_all_companies(_event_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF NOT public.is_admin(_event_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN coalesce((
    SELECT json_agg(
             json_build_object(
               'id', c.id,
               'company_name', c.company_name,
               'industry', c.industry,
               'logo_url', c.logo_url,
               'website', c.website,
               'in_event', EXISTS (
                 SELECT 1 FROM public.company_event_participation cep
                 WHERE cep.company_id = c.id AND cep.event_id = _event_id
               ),
               'events_count', (
                 SELECT count(*) FROM public.company_event_participation cep
                 WHERE cep.company_id = c.id
               )
             )
             ORDER BY lower(c.company_name)
           )
    FROM public.companies c
  ), '[]'::json);
END;
$function$;

-- Add existing companies to the admin's event.
CREATE OR REPLACE FUNCTION public.admin_link_companies(_event_id uuid, _company_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_admin(_event_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF _company_ids IS NULL OR cardinality(_company_ids) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Select at least one company');
  END IF;

  IF cardinality(_company_ids) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'Select at most 200 companies at a time');
  END IF;

  INSERT INTO public.company_event_participation (company_id, event_id, is_active)
  SELECT c.id, _event_id, true
  FROM public.companies c
  WHERE c.id = ANY(_company_ids)
  ON CONFLICT (company_id, event_id) DO UPDATE SET is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'linked', v_count);
END;
$function$;

-- Carried over from the live definition; now also returns success + company_key.
CREATE OR REPLACE FUNCTION public.admin_add_company(_event_id uuid, _company_name text, _industry text DEFAULT NULL::text, _email text DEFAULT NULL::text, _website text DEFAULT NULL::text, _description text DEFAULT NULL::text, _booth_number text DEFAULT NULL::text, _logo_url text DEFAULT NULL::text, _partner_type text DEFAULT NULL::text, _faculties text[] DEFAULT '{}'::text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_partner text := nullif(trim(coalesce(_partner_type, '')), '');
  v_company_id uuid;
  v_company_key text;
  v_created boolean := false;
BEGIN
  IF NOT public.is_admin(_event_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF nullif(trim(coalesce(_company_name, '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Company name is required');
  END IF;

  IF v_partner IS NOT NULL AND v_partner NOT IN (
    'diamond', 'platinum', 'gold', 'silver', 'exhibitor_a', 'exhibitor_b',
    'student_activity_partner', 'community_partner', 'catering_partner',
    'career_coaching_partner'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid partner type');
  END IF;

  -- Reuse the global company when one with the same name already exists.
  SELECT id, company_key INTO v_company_id, v_company_key
  FROM public.companies
  WHERE lower(company_name) = lower(trim(_company_name))
  LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (company_name, industry, email, website, description, logo_url)
    VALUES (
      left(trim(_company_name), 200),
      left(nullif(trim(coalesce(_industry, '')), ''), 150),
      left(nullif(trim(coalesce(_email, '')), ''), 150),
      left(nullif(trim(coalesce(_website, '')), ''), 300),
      left(nullif(trim(coalesce(_description, '')), ''), 2000),
      left(nullif(trim(coalesce(_logo_url, '')), ''), 500)
    )
    RETURNING id, company_key INTO v_company_id, v_company_key;
    v_created := true;
  END IF;

  INSERT INTO public.company_event_participation
    (company_id, event_id, booth_number, partner_type, faculties, is_active)
  VALUES (
    v_company_id,
    _event_id,
    left(nullif(trim(coalesce(_booth_number, '')), ''), 50),
    v_partner,
    coalesce(_faculties, '{}'),
    true
  )
  ON CONFLICT (company_id, event_id) DO UPDATE
  SET booth_number = EXCLUDED.booth_number,
      partner_type = EXCLUDED.partner_type,
      faculties   = EXCLUDED.faculties,
      is_active   = true;

  RETURN json_build_object(
    'success', true,
    'id', v_company_id,
    'event_id', _event_id,
    'company_name', trim(_company_name),
    'company_key', v_company_key,
    'industry', nullif(trim(coalesce(_industry, '')), ''),
    'email', nullif(trim(coalesce(_email, '')), ''),
    'website', nullif(trim(coalesce(_website, '')), ''),
    'description', nullif(trim(coalesce(_description, '')), ''),
    'booth_number', nullif(trim(coalesce(_booth_number, '')), ''),
    'logo_url', nullif(trim(coalesce(_logo_url, '')), ''),
    'partner_type', v_partner,
    'faculties', coalesce(_faculties, '{}'),
    'created', v_created
  );
END;
$function$;

-- Carried over from the live definition; now also removes the employer roles of
-- the company's employers in this event.
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
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Employer self-service
-- ---------------------------------------------------------------------------

-- An event is over for employers once it is completed/cancelled or its last
-- day (Cairo time) has passed.
CREATE OR REPLACE FUNCTION public.employer_event_is_ended(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = _event_id
      AND (
        e.status IN ('completed', 'cancelled')
        OR (e.end_date IS NOT NULL
            AND (e.end_date AT TIME ZONE 'Africa/Cairo')::date
                < (now() AT TIME ZONE 'Africa/Cairo')::date)
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.employer_event_is_ended(uuid) FROM PUBLIC, anon, authenticated;

-- Everything the employer onboarding page needs: is the profile filled in, and
-- which events can this employer open.
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
             'job_title', em.job_title
           ) AS ev
    FROM public.employers em
    JOIN public.events e ON e.id = em.event_id
    JOIN public.companies c ON c.id = em.company_id
    JOIN public.user_roles ur
      ON ur.user_id = em.user_id AND ur.event_id = em.event_id AND ur.role = 'employer'
    WHERE em.user_id = v_user
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

-- First-login profile form. Only accounts an admin made employers can use it.
CREATE OR REPLACE FUNCTION public.employer_complete_profile(
  p_full_name text, p_phone text, p_personal_id text,
  p_nationality text, p_gender text, p_job_title text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user        uuid := auth.uid();
  v_email       text;
  v_name        text := left(btrim(coalesce(p_full_name, '')), 100);
  v_phone       text := left(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 30);
  v_pid         text := left(upper(btrim(coalesce(p_personal_id, ''))), 50);
  v_nationality text := left(coalesce(nullif(btrim(coalesce(p_nationality, '')), ''), 'Egyptian'), 60);
  v_gender      text := nullif(lower(btrim(coalesce(p_gender, ''))), '');
  v_job         text := left(nullif(btrim(coalesce(p_job_title, '')), ''), 150);
  v_constraint  text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.employers WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This account is not an employer account', 'field', 'general');
  END IF;

  IF length(v_name) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full name is required', 'field', 'fullName');
  END IF;
  IF length(v_phone) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a valid phone number', 'field', 'phone');
  END IF;
  IF length(v_pid) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Personal ID is required', 'field', 'personalId');
  END IF;
  IF v_gender IS NOT NULL AND v_gender NOT IN ('male', 'female') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Choose a gender', 'field', 'gender');
  END IF;
  IF v_job IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job title is required', 'field', 'jobTitle');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  BEGIN
    INSERT INTO public.user_profiles AS up (id, full_name, email, phone, personal_id, nationality, gender)
    VALUES (v_user, v_name, lower(v_email), v_phone, v_pid, v_nationality, v_gender)
    ON CONFLICT (id) DO UPDATE
    SET full_name   = EXCLUDED.full_name,
        email       = coalesce(up.email, EXCLUDED.email),
        phone       = EXCLUDED.phone,
        personal_id = EXCLUDED.personal_id,
        nationality = EXCLUDED.nationality,
        gender      = EXCLUDED.gender;
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      RETURN jsonb_build_object(
        'success', false,
        'error', CASE WHEN v_constraint ILIKE '%phone%'
                      THEN 'This phone number is already registered to another account'
                      ELSE 'This personal ID is already registered to another account' END,
        'field', CASE WHEN v_constraint ILIKE '%phone%' THEN 'phone' ELSE 'personalId' END
      );
  END;

  -- Job title for every event this employer is in that is still open.
  UPDATE public.employers
  SET job_title = v_job
  WHERE user_id = v_user
    AND (job_title IS NULL OR NOT public.employer_event_is_ended(event_id));

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.employer_complete_profile(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_complete_profile(text, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Employer functions follow the selected event; ended events are read-only
--    (bodies carried over from the live definitions, changes marked)
-- ---------------------------------------------------------------------------

-- Jobs of the selected event (was: always the active event).
DROP FUNCTION IF EXISTS public.employer_get_my_jobs();
DROP FUNCTION IF EXISTS public.employer_get_my_jobs(uuid);
CREATE FUNCTION public.employer_get_my_jobs(p_event_id uuid DEFAULT NULL)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT coalesce(
    json_agg(
      json_build_object(
        'id', jp.id,
        'title', jp.title,
        'description', jp.description,
        'location', jp.location,
        'job_type', jp.job_type,
        'employment_mode', jp.employment_mode,
        'experience_level', jp.experience_level,
        'required_skills', jp.required_skills,
        'is_active', jp.is_active,
        'posted_at', jp.posted_at,
        'company_id', jp.company_id,
        'no_of_applicants', jp.no_of_applicants
      )
      ORDER BY jp.posted_at DESC
    ),
    '[]'::json
  )
  FROM public.job_positions jp
  WHERE jp.employer_id = auth.uid()
    AND jp.event_id = coalesce(p_event_id, public.get_active_event_id());
$function$;

REVOKE ALL ON FUNCTION public.employer_get_my_jobs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_get_my_jobs(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.employer_upsert_job(_job_id uuid DEFAULT NULL::uuid, _title text DEFAULT NULL::text, _description text DEFAULT NULL::text, _location text DEFAULT NULL::text, _job_type text DEFAULT 'full-time'::text, _employment_mode text DEFAULT 'on-site'::text, _experience_level text DEFAULT 'entry'::text, _required_skills text DEFAULT NULL::text, _is_active boolean DEFAULT true, _company_id uuid DEFAULT NULL::uuid, _event_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_row public.job_positions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF nullif(trim(coalesce(_title, '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Job title is required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employers
    WHERE user_id = auth.uid() AND event_id = _event_id AND company_id = _company_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you are not an employer for this company in this event';
  END IF;

  -- v2_09: ended events are view-only
  IF public.employer_event_is_ended(_event_id) THEN
    RAISE EXCEPTION 'This event has ended. Its data is view-only.';
  END IF;

  IF _job_id IS NULL THEN
    INSERT INTO public.job_positions
      (event_id, company_id, employer_id, title, description, location,
       job_type, employment_mode, experience_level, required_skills, is_active)
    VALUES (
      _event_id,
      _company_id,
      auth.uid(),
      left(trim(_title), 200),
      left(nullif(trim(coalesce(_description, '')), ''), 5000),
      left(nullif(trim(coalesce(_location, '')), ''), 150),
      left(trim(coalesce(_job_type, 'full-time')), 30),
      left(trim(coalesce(_employment_mode, 'on-site')), 30),
      left(trim(coalesce(_experience_level, 'entry')), 30),
      left(nullif(trim(coalesce(_required_skills, '')), ''), 1000),
      coalesce(_is_active, true)
    )
    RETURNING * INTO v_row;
  ELSE
    SELECT * INTO v_row
    FROM public.job_positions
    WHERE id = _job_id AND employer_id = auth.uid() AND event_id = _event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Job not found or not owned by you';
    END IF;

    UPDATE public.job_positions
    SET title           = left(trim(_title), 200),
        description     = left(nullif(trim(coalesce(_description, '')), ''), 5000),
        location        = left(nullif(trim(coalesce(_location, '')), ''), 150),
        job_type        = left(trim(coalesce(_job_type, 'full-time')), 30),
        employment_mode = left(trim(coalesce(_employment_mode, 'on-site')), 30),
        experience_level = left(trim(coalesce(_experience_level, 'entry')), 30),
        required_skills = left(nullif(trim(coalesce(_required_skills, '')), ''), 1000),
        is_active       = coalesce(_is_active, true)
    WHERE id = _job_id AND employer_id = auth.uid() AND event_id = _event_id
    RETURNING * INTO v_row;
  END IF;

  RETURN json_build_object('success', true, 'job_id', v_row.id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.employer_delete_job(_job_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_owner uuid;
  v_event uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT employer_id, event_id INTO v_owner, v_event
  FROM public.job_positions WHERE id = _job_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF v_owner <> auth.uid() AND NOT public.is_admin(v_event) THEN
    RAISE EXCEPTION 'Unauthorized: you can only delete your own jobs';
  END IF;

  -- v2_09: ended events are view-only for employers
  IF public.employer_event_is_ended(v_event) AND NOT public.is_admin(v_event) THEN
    RAISE EXCEPTION 'This event has ended. Its data is view-only.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.job_applications WHERE job_position_id = _job_id) THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete a job that has applicants');
  END IF;

  DELETE FROM public.job_positions WHERE id = _job_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.employer_update_application_status(_application_id uuid, _status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_owner uuid;
  v_event uuid;
  v_applicant uuid;
  v_job_title text;
  v_company text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  SELECT jp.employer_id, jp.event_id, jp.title, c.company_name,
         ja.user_id
  INTO v_owner, v_event, v_job_title, v_company, v_applicant
  FROM public.job_applications ja
  JOIN public.job_positions jp ON jp.id = ja.job_position_id
  JOIN public.companies c ON c.id = jp.company_id
  WHERE ja.id = _application_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_owner <> auth.uid() AND NOT public.is_admin(v_event) THEN
    RAISE EXCEPTION 'Unauthorized: you can only update applications for your own jobs';
  END IF;

  -- v2_09: ended events are view-only for employers
  IF public.employer_event_is_ended(v_event) AND NOT public.is_admin(v_event) THEN
    RAISE EXCEPTION 'This event has ended. Its data is view-only.';
  END IF;

  UPDATE public.job_applications
  SET status = _status
  WHERE id = _application_id;

  IF _status = 'approved' THEN
    INSERT INTO public.notifications
      (event_id, sender_id, type, receiver_id, title, content, publish_at)
    VALUES (
      v_event,
      auth.uid(),
      'direct',
      v_applicant,
      'Job Application Approved 🎉',
      left('Congratulations! Your application for "' || coalesce(v_job_title, '')
           || '" at ' || coalesce(v_company, 'the company') || ' has been approved.', 500),
      now()
    );
  END IF;
END;
$function$;

-- Company edits follow the selected event (new trailing p_event_id).
DROP FUNCTION IF EXISTS public.update_company_details(uuid, text, text, text, text, text, text, text[]);
DROP FUNCTION IF EXISTS public.update_company_details(uuid, text, text, text, text, text, text, text[], uuid);
CREATE FUNCTION public.update_company_details(p_company_id uuid, p_company_name text DEFAULT NULL::text, p_industry text DEFAULT NULL::text, p_website text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_logo_url text DEFAULT NULL::text, p_booth_number text DEFAULT NULL::text, p_target_faculties text[] DEFAULT NULL::text[], p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- The caller must be an employer of this company in the selected event.
  IF NOT EXISTS (
    SELECT 1 FROM public.employers
    WHERE user_id = auth.uid() AND company_id = p_company_id AND event_id = v_event
  ) AND NOT public.is_admin(v_event) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not linked to this company');
  END IF;

  -- v2_09: ended events are view-only for employers
  IF public.employer_event_is_ended(v_event) AND NOT public.is_admin(v_event) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This event has ended. Its data is view-only.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Company not found');
  END IF;

  UPDATE public.companies
  SET company_name = coalesce(
        CASE WHEN nullif(trim(coalesce(p_company_name, '')), '') IS NULL
             THEN company_name ELSE left(trim(p_company_name), 200) END,
        company_name),
      industry     = coalesce(left(nullif(trim(coalesce(p_industry, '')), ''), 150), industry),
      website      = coalesce(left(nullif(trim(coalesce(p_website, '')), ''), 300), website),
      description  = coalesce(left(nullif(trim(coalesce(p_description, '')), ''), 2000), description),
      logo_url     = coalesce(left(nullif(trim(coalesce(p_logo_url, '')), ''), 500), logo_url)
  WHERE id = p_company_id;

  IF p_booth_number IS NOT NULL OR p_target_faculties IS NOT NULL THEN
    INSERT INTO public.company_event_participation
      (company_id, event_id, booth_number, faculties, is_active)
    VALUES (
      p_company_id, v_event,
      left(nullif(trim(coalesce(p_booth_number, '')), ''), 50),
      coalesce(p_target_faculties, '{}'),
      true
    )
    ON CONFLICT (company_id, event_id) DO UPDATE
    SET booth_number = coalesce(EXCLUDED.booth_number, company_event_participation.booth_number),
        faculties    = coalesce(EXCLUDED.faculties, company_event_participation.faculties);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Grants for the admin/employer functions defined in this file.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'admin_get_companies(uuid)',
    'admin_get_all_companies(uuid)',
    'admin_link_companies(uuid, uuid[])',
    'admin_remove_employer(uuid, uuid)',
    'admin_add_company(uuid, text, text, text, text, text, text, text, text, text[])',
    'admin_delete_company(uuid, uuid)',
    'employer_upsert_job(uuid, text, text, text, text, text, text, text, boolean, uuid, uuid)',
    'employer_delete_job(uuid)',
    'employer_update_application_status(uuid, text)',
    'update_company_details(uuid, text, text, text, text, text, text, text[], uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Companies bucket (logo uploads)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('Companies', 'Companies', true, 5242880,
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public             = true,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Admins of any event and employers may manage logos.
CREATE OR REPLACE FUNCTION public.can_manage_company_media()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT public.is_sadmin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND event_id IS NOT NULL
          AND role IN ('admin', 'employer')
      );
$function$;

REVOKE ALL ON FUNCTION public.can_manage_company_media() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_company_media() TO authenticated;

-- Public URLs don't go through RLS; this only governs listing and upsert.
DROP POLICY IF EXISTS "company logos select by managers" ON storage.objects;
CREATE POLICY "company logos select by managers"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'Companies' AND public.can_manage_company_media());

DROP POLICY IF EXISTS "company logos upload by managers" ON storage.objects;
CREATE POLICY "company logos upload by managers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'Companies' AND public.can_manage_company_media());

DROP POLICY IF EXISTS "company logos update by managers" ON storage.objects;
CREATE POLICY "company logos update by managers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'Companies' AND public.can_manage_company_media())
  WITH CHECK (bucket_id = 'Companies' AND public.can_manage_company_media());

DROP POLICY IF EXISTS "company logos delete by managers" ON storage.objects;
CREATE POLICY "company logos delete by managers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'Companies' AND public.can_manage_company_media());

-- ---------------------------------------------------------------------------
-- Invariants
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.companies WHERE company_key IS NULL OR btrim(company_key) = '') THEN
    RAISE EXCEPTION 'v2_09: a company is still missing its key';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'Companies' AND public) THEN
    RAISE EXCEPTION 'v2_09: Companies bucket missing';
  END IF;

  -- One signature each for the functions whose argument list changed.
  FOREACH v_name IN ARRAY ARRAY['employer_get_my_jobs', 'update_company_details']
  LOOP
    IF (SELECT count(*) FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace AND proname = v_name) <> 1 THEN
      RAISE EXCEPTION 'v2_09: public.% has more than one signature', v_name;
    END IF;
  END LOOP;

  -- Server-side helpers are not callable by clients.
  FOREACH v_name IN ARRAY ARRAY[
    'employer_admin_attach(uuid,uuid,uuid,uuid)',
    'employer_event_is_ended(uuid)',
    '_generate_company_key(text)'
  ]
  LOOP
    IF has_function_privilege('anon', ('public.' || v_name)::regprocedure, 'EXECUTE')
       OR has_function_privilege('authenticated', ('public.' || v_name)::regprocedure, 'EXECUTE') THEN
      RAISE EXCEPTION 'v2_09: public.% is callable by clients', v_name;
    END IF;
  END LOOP;

  IF to_regprocedure('public.register_employer(uuid,text,text,text,text,uuid,text,uuid)') IS NOT NULL
     AND has_function_privilege('authenticated', 'public.register_employer(uuid,text,text,text,text,uuid,text,uuid)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'v2_09: register_employer is still callable by clients';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
