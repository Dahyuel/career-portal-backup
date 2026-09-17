-- v2_12 — Returning ASU students skip re-verification; super admins can assign
--         accounts to any event with everything the role needs.
--
-- 1. register_attendee: an ASU student who was already verified as an attendee in
--    another event is approved straight away. They still submit their current
--    year and a new enrollment proof, but do not wait for the verification team.
--    The result now includes registration_status so the app can route correctly.
--
-- 2. get_my_previous_registration(): the signed-in user's latest registration in
--    another event, used to pre-fill the registration form.
--
-- 3. sadmin_change_role gains _options. Assigning a role now also creates what
--    that role needs in the chosen event:
--      attendee  → an approved registration (copied from their latest one)
--      volunteer → an approved registration + a volunteer record (team optional)
--      employer  → a link to a company that takes part in the event (required)
--    Before, only user_roles was written, so those dashboards had no data.
--
-- Bodies are carried over from the live definitions; changes are marked v2_12.
-- Idempotent, single transaction.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. register_attendee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_attendee(p_user_id uuid, p_event_id uuid, p_university text DEFAULT NULL::text, p_faculty text DEFAULT NULL::text, p_department text DEFAULT NULL::text, p_year integer DEFAULT NULL::integer, p_student_status text DEFAULT NULL::text, p_volunteer_id text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event        uuid := COALESCE(p_event_id, public.get_active_event_id());
  v_event_status text;
  v_is_asu       boolean;
  v_email        text;
  v_award        json;
  v_verified     boolean := false;  -- v2_12
  v_status       text;              -- v2_12
BEGIN
  IF p_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Missing user_id');
  END IF;

  IF v_event IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active event');
  END IF;

  SELECT status INTO v_event_status
  FROM public.events
  WHERE id = v_event;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error',   'This event no longer exists.',
      'field',   'general'
    );
  END IF;

  IF v_event_status NOT IN ('published', 'ongoing') THEN
    RETURN json_build_object(
      'success', false,
      'error',   format('Registration for this event is not open (status: %s).', v_event_status),
      'field',   'general',
      'detail',  'event_not_open'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_user_id
      AND NULLIF(TRIM(COALESCE(personal_id, '')), '') IS NOT NULL
      AND NULLIF(TRIM(COALESCE(phone, '')), '')        IS NOT NULL
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error',   'Profile incomplete. Please complete your profile before registering.',
      'field',   'profile'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE user_id = p_user_id AND event_id = v_event
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error',   'You are already registered for this event.',
      'detail',  'duplicate_registration'
    );
  END IF;

  IF NULLIF(TRIM(COALESCE(p_volunteer_id, '')), '') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.volunteers
      WHERE event_id = v_event
        AND volunteer_id = LEFT(UPPER(TRIM(p_volunteer_id)), 20)
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error',   'Invalid volunteer referral code. Please check the code and try again.',
        'field',   'volunteerId'
      );
    END IF;
  END IF;

  v_is_asu := lower(trim(coalesce(p_university, ''))) = ANY(
    ARRAY['ain shams university', 'ain shams', 'جامعة عين شمس']
  );

  -- v2_12: an ASU student already verified as an attendee in another event
  -- does not wait for verification again.
  IF v_is_asu THEN
    v_verified := EXISTS (
      SELECT 1
      FROM public.event_registrations er
      JOIN public.user_roles ur
        ON ur.user_id = er.user_id AND ur.event_id = er.event_id AND ur.role = 'attendee'
      WHERE er.user_id = p_user_id
        AND er.event_id <> v_event
        AND er.is_asu_student IS TRUE
        AND er.registration_status = 'approved'
    );
  END IF;
  v_status := CASE WHEN v_verified THEN 'approved' ELSE 'pending' END;

  INSERT INTO public.event_registrations (
    user_id, event_id,
    is_asu_student, university, faculty,
    department, year, student_status,
    registration_status, payment_status
  ) VALUES (
    p_user_id, v_event,
    v_is_asu,
    LEFT(NULLIF(TRIM(COALESCE(p_university, '')), ''), 200),
    LEFT(NULLIF(TRIM(COALESCE(p_faculty, '')), ''), 150),
    LEFT(NULLIF(TRIM(COALESCE(p_department, '')), ''), 150),
    p_year,
    LEFT(NULLIF(TRIM(COALESCE(p_student_status, '')), ''), 50),
    v_status,
    CASE WHEN v_is_asu THEN 'not_required' ELSE 'pending' END
  );

  INSERT INTO public.user_roles (user_id, event_id, role)
  VALUES (p_user_id, v_event, 'attendee')
  ON CONFLICT (user_id, event_id) WHERE event_id IS NOT NULL DO NOTHING;

  IF NULLIF(TRIM(COALESCE(p_volunteer_id, '')), '') IS NOT NULL THEN
    SELECT email INTO v_email FROM public.user_profiles WHERE id = p_user_id;

    v_award := public.award_volunteer_referral_points(
      LEFT(TRIM(p_volunteer_id), 20),
      v_event,
      v_email
    );

    IF NOT (v_award->>'success')::boolean THEN
      RAISE EXCEPTION 'REFERRAL_FAILED: %',
        COALESCE(v_award->>'error', 'Referral could not be applied');
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'registration_status', v_status,        -- v2_12
    'previously_verified', v_verified       -- v2_12
  );

EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM LIKE 'REFERRAL_FAILED:%' THEN
      RETURN json_build_object(
        'success', false,
        'error',   trim(substring(SQLERRM from length('REFERRAL_FAILED:') + 1)),
        'field',   'volunteerId'
      );
    END IF;
    RAISE WARNING '[register_attendee] P0001: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error',   'Registration could not be completed. Please try again.'
    );

  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error',   'You are already registered for this event.',
      'detail',  'duplicate_registration'
    );

  WHEN foreign_key_violation THEN
    RETURN json_build_object(
      'success', false,
      'error',   'A related record (event or user) could not be found.',
      'field',   'general'
    );

  WHEN not_null_violation THEN
    RETURN json_build_object(
      'success', false,
      'error',   'A required field was missing. Please check your information and try again.',
      'field',   'general'
    );

  WHEN check_violation THEN
    RETURN json_build_object(
      'success', false,
      'error',   'One of the values you entered is not valid.',
      'field',   'general'
    );

  WHEN OTHERS THEN
    RAISE WARNING '[register_attendee] % (%)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'error',   'An unexpected error occurred. Please try again.',
      'field',   'general'
    );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. The user's previous registration (form pre-fill)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_previous_registration(p_event_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_row  jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
           'found', true,
           'event_name', e.name,
           'university', er.university,
           'faculty', er.faculty,
           'department', er.department,
           'student_status', er.student_status,
           'year', er.year,
           'is_asu_student', er.is_asu_student,
           'has_cv', er.cv_url IS NOT NULL,
           -- same rule as register_attendee
           'verified', EXISTS (
             SELECT 1
             FROM public.event_registrations v
             JOIN public.user_roles ur
               ON ur.user_id = v.user_id AND ur.event_id = v.event_id AND ur.role = 'attendee'
             WHERE v.user_id = v_user
               AND v.event_id IS DISTINCT FROM p_event_id
               AND v.is_asu_student IS TRUE
               AND v.registration_status = 'approved'
           )
         )
  INTO v_row
  FROM public.event_registrations er
  JOIN public.events e ON e.id = er.event_id
  WHERE er.user_id = v_user
    AND er.event_id IS DISTINCT FROM p_event_id
  ORDER BY (er.registration_status = 'approved') DESC, er.registered_at DESC NULLS LAST
  LIMIT 1;

  RETURN coalesce(v_row, jsonb_build_object('found', false));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_previous_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_previous_registration(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. sadmin_change_role with role set-up
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sadmin_change_role(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.sadmin_change_role(uuid, uuid, text, text, jsonb);

CREATE FUNCTION public.sadmin_change_role(_event_id uuid, _user_id uuid, _new_role text, _reason text, _options jsonb DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_role   TEXT;
  v_company    UUID;   -- v2_12
  v_team       UUID;   -- v2_12
  v_vol_id     TEXT;   -- v2_12
  v_next_num   INT;    -- v2_12
BEGIN
  PERFORM public._assert_sadmin();

  IF LENGTH(BTRIM(COALESCE(_reason, ''))) < 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Please give a reason (at least 5 characters).');
  END IF;
  IF _user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'You cannot change your own role.');
  END IF;
  IF _new_role NOT IN ('sadmin', 'admin', 'tech_support', 'team_leader', 'verification', 'registration',
                       'info_desk', 'building', 'volunteer', 'employer', 'attendee', 'none') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'That role does not exist.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = _user_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Account not found.');
  END IF;

  -- v2_12: what the role needs in this event
  IF _new_role <> 'sadmin' AND NOT EXISTS (SELECT 1 FROM events WHERE id = _event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Choose an event.');
  END IF;

  IF _new_role = 'employer' THEN
    v_company := NULLIF(_options ->> 'company_id', '')::UUID;
    IF v_company IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Choose the company this employer belongs to.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM company_event_participation WHERE company_id = v_company AND event_id = _event_id) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'That company is not part of this event. Add it to the event first.');
    END IF;
  END IF;

  IF _new_role = 'volunteer' THEN
    v_team := NULLIF(_options ->> 'team_id', '')::UUID;
    IF v_team IS NOT NULL AND NOT EXISTS (SELECT 1 FROM volunteer_teams WHERE id = v_team AND event_id = _event_id) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'That team does not belong to this event.');
    END IF;
  END IF;

  SELECT COALESCE(
           (SELECT 'sadmin' FROM user_roles WHERE user_id = _user_id AND role = 'sadmin' AND event_id IS NULL LIMIT 1),
           (SELECT role FROM user_roles WHERE user_id = _user_id AND event_id = _event_id LIMIT 1))
  INTO v_old_role;

  IF v_old_role = 'sadmin' AND _new_role <> 'sadmin' AND public.sa_is_last_active_sadmin(_user_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This is the last super admin, so the role cannot be removed.');
  END IF;

  BEGIN
    IF _new_role = 'sadmin' THEN
      -- Super admins are global: one row with no event.
      INSERT INTO user_roles (user_id, event_id, role)
      SELECT _user_id, NULL, 'sadmin'
      WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'sadmin' AND event_id IS NULL);
    ELSE
      DELETE FROM user_roles WHERE user_id = _user_id AND role = 'sadmin' AND event_id IS NULL;
      DELETE FROM user_roles WHERE user_id = _user_id AND event_id = _event_id;
      IF _new_role <> 'none' THEN
        INSERT INTO user_roles (user_id, event_id, role) VALUES (_user_id, _event_id, _new_role);
      END IF;

      -- v2_12: attendees and volunteers need a registration in the event.
      -- Copy the latest one; a super admin assignment counts as approved.
      IF _new_role IN ('attendee', 'volunteer')
         AND NOT EXISTS (SELECT 1 FROM event_registrations WHERE user_id = _user_id AND event_id = _event_id) THEN
        INSERT INTO event_registrations
          (user_id, event_id, is_asu_student, student_id, university, faculty, department,
           year, student_status, cv_url, enrollment_proof_url, registration_status, payment_status)
        SELECT _user_id, _event_id,
               CASE WHEN _new_role = 'volunteer' THEN TRUE ELSE prev.is_asu_student END,
               prev.student_id, prev.university, prev.faculty, prev.department,
               prev.year, prev.student_status, prev.cv_url, prev.enrollment_proof_url,
               'approved', 'not_required'
        FROM (SELECT 1) one
        LEFT JOIN LATERAL (
          SELECT * FROM event_registrations p
          WHERE p.user_id = _user_id
          ORDER BY (p.registration_status = 'approved') DESC, p.registered_at DESC NULLS LAST
          LIMIT 1
        ) prev ON TRUE;
      END IF;

      -- v2_12: volunteer record (same numbering as register_volunteer)
      IF _new_role = 'volunteer' THEN
        PERFORM pg_advisory_xact_lock(hashtext('volunteer_id_seq'));

        SELECT volunteer_id INTO v_vol_id
        FROM volunteers WHERE user_id = _user_id AND event_id = _event_id;

        IF v_vol_id IS NULL THEN
          SELECT COALESCE(MAX(NULLIF(regexp_replace(volunteer_id, '\D', '', 'g'), '')::INT), 0) + 1
          INTO v_next_num
          FROM volunteers;
          v_vol_id := 'VOL' || lpad(v_next_num::TEXT, 3, '0');
        END IF;

        INSERT INTO volunteers (user_id, event_id, team_id, volunteer_id)
        VALUES (_user_id, _event_id, v_team, v_vol_id)
        ON CONFLICT (user_id, event_id) DO UPDATE
        SET team_id = COALESCE(EXCLUDED.team_id, volunteers.team_id);
      END IF;

      -- v2_12: employer link
      IF _new_role = 'employer' THEN
        INSERT INTO employers (user_id, event_id, company_id)
        VALUES (_user_id, _event_id, v_company)
        ON CONFLICT (user_id, event_id) DO UPDATE SET company_id = EXCLUDED.company_id;

        DELETE FROM employer_event_removals WHERE user_id = _user_id AND event_id = _event_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'sadmin_change_role: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'error',
      CASE WHEN SQLERRM ILIKE '%super admin limit%'
           THEN 'Only 5 people can be super admins. Remove the role from someone first.'
           ELSE 'The role could not be changed.' END);
  END;

  PERFORM public.sa_audit_write('role_change', 'user_roles',
    jsonb_build_object('user_id', _user_id, 'event_id', CASE WHEN _new_role = 'sadmin' THEN NULL ELSE _event_id END),
    jsonb_build_object('old_role', v_old_role, 'new_role', _new_role, 'reason', LEFT(BTRIM(_reason), 500),
                       'options', _options));

  RETURN jsonb_build_object('success', TRUE);
END;
$function$;

REVOKE ALL ON FUNCTION public.sadmin_change_role(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sadmin_change_role(uuid, uuid, text, text, jsonb) TO authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'sadmin_change_role') <> 1 THEN
    RAISE EXCEPTION 'v2_12: sadmin_change_role must have exactly one signature';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
