-- v2_08 — Let team dashboards work on their own event, not just the current one.
--
-- WHY
-- Every team function below opens with:
--     v_event uuid := public.get_active_event_id();
-- so it always reads whichever event system_config points at. With two events live
-- at once, a staff member of event B either sees event A's data or is rejected,
-- because their guard (is_reg_team_member / is_building_team_member / has_role)
-- is checked against event A, where they hold no role.
--
-- WHAT CHANGES
-- Exactly one line per function: the event is resolved from a new trailing
-- parameter, falling back to the active event when it is not supplied.
--     v_event uuid := coalesce(p_event_id, public.get_active_event_id());
-- Every other statement is carried over byte-for-byte from the live definitions.
--
-- WHY THIS IS SAFE
-- The guards already take an event and are unchanged, so passing someone else's
-- event id does not grant anything: the caller must hold the role IN that event or
-- the function raises. The parameter defaults to NULL, so any caller that has not
-- been updated yet keeps the old behaviour exactly.
--
-- Each function is dropped before being recreated. CREATE OR REPLACE cannot change
-- an argument list; it would leave a second overload behind, and a no-argument call
-- against f() plus f(uuid DEFAULT NULL) fails as ambiguous — which would break the
-- live dashboards. Dropping first keeps exactly one signature. DROP is not CASCADE
-- on purpose: if anything unexpected depends on these, this migration fails loudly
-- and changes nothing, rather than quietly removing the dependent.
--
-- Idempotent, and a single transaction: it either fully applies or does nothing.

BEGIN;

-- ---------------------------------------------------------------------------
-- Drop the current signatures (no CASCADE — see header)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.build_team_get_sessions();
DROP FUNCTION IF EXISTS public.build_team_get_volunteer_stats();
DROP FUNCTION IF EXISTS public.build_team_search_session_bookings(uuid, text);
DROP FUNCTION IF EXISTS public.get_full_volunteer_details(text);
DROP FUNCTION IF EXISTS public.get_team_leader_data();
DROP FUNCTION IF EXISTS public.reg_team_get_attendee_by_personal_id(text);
DROP FUNCTION IF EXISTS public.reg_team_get_my_scan_count();
DROP FUNCTION IF EXISTS public.reg_team_record_attendance(uuid, text);
DROP FUNCTION IF EXISTS public.reg_team_search_attendees(text);
DROP FUNCTION IF EXISTS public.verif_team_get_attendees(boolean, text, text, integer, integer);

-- Any overloads this migration may have created on an earlier run.
DROP FUNCTION IF EXISTS public.build_team_get_sessions(uuid);
DROP FUNCTION IF EXISTS public.build_team_get_volunteer_stats(uuid);
DROP FUNCTION IF EXISTS public.build_team_search_session_bookings(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_full_volunteer_details(text, uuid);
DROP FUNCTION IF EXISTS public.get_team_leader_data(uuid);
DROP FUNCTION IF EXISTS public.reg_team_get_attendee_by_personal_id(text, uuid);
DROP FUNCTION IF EXISTS public.reg_team_get_my_scan_count(uuid);
DROP FUNCTION IF EXISTS public.reg_team_record_attendance(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.reg_team_search_attendees(text, uuid);
DROP FUNCTION IF EXISTS public.verif_team_get_attendees(boolean, text, text, integer, integer, uuid);

-- ---------------------------------------------------------------------------
-- 1. build_team_get_sessions
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.build_team_get_sessions(p_event_id uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, event_id uuid, title text, session_type text, status text, start_time timestamp with time zone, end_time timestamp with time zone, room_name text, room_capacity integer, max_attendees integer, current_bookings integer, is_full boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_event IS NULL THEN RAISE EXCEPTION 'No active event'; END IF;
  IF NOT public.is_building_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: building team access only';
  END IF;

  RETURN QUERY
  SELECT s.id, s.event_id, s.title, s.session_type, s.status,
         s.start_time, s.end_time, s.room_name, s.room_capacity,
         s.max_attendees, s.current_bookings, s.is_full
  FROM public.sessions s
  WHERE s.event_id = v_event
    AND s.end_time > now()
  ORDER BY s.start_time ASC;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. build_team_get_volunteer_stats
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.build_team_get_volunteer_stats(p_event_id uuid DEFAULT NULL)
 RETURNS TABLE(total_points bigint, team_rank bigint, team_size bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
  v_team uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_event IS NULL THEN RAISE EXCEPTION 'No active event'; END IF;
  IF NOT public.is_building_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: building team access only';
  END IF;

  SELECT team_id INTO v_team
  FROM public.volunteers
  WHERE user_id = auth.uid() AND event_id = v_event;

  -- Not on a team → return zeros, don't crash the dashboard
  IF v_team IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT
    coalesce(es.score, v.total_points, 0),
    (
      SELECT count(*) + 1
      FROM (
        SELECT coalesce(sum(es2.score), 0) AS team_score
        FROM public.volunteers v2
        LEFT JOIN public.event_scores es2
          ON es2.user_id = v2.user_id AND es2.event_id = v2.event_id
        WHERE v2.event_id = v_event AND v2.team_id IS NOT NULL
        GROUP BY v2.team_id
      ) ts
      WHERE ts.team_score > COALESCE((
        SELECT sum(es3.score)
        FROM public.volunteers v3
        LEFT JOIN public.event_scores es3
          ON es3.user_id = v3.user_id AND es3.event_id = v3.event_id
        WHERE v3.event_id = v_event AND v3.team_id = v_team
      ), 0)
    ),
    (SELECT count(*) FROM public.volunteers WHERE team_id = v_team AND event_id = v_event)
  INTO total_points, team_rank, team_size
  FROM public.volunteers v
  LEFT JOIN public.event_scores es
    ON es.user_id = v.user_id AND es.event_id = v.event_id
  WHERE v.user_id = auth.uid() AND v.event_id = v_event;

  RETURN NEXT;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. build_team_search_session_bookings
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.build_team_search_session_bookings(p_session_id uuid, p_query text, p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
  v_q text := nullif(trim(coalesce(p_query, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_event IS NULL THEN RAISE EXCEPTION 'No active event'; END IF;
  IF NOT public.is_building_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: building team access only';
  END IF;

  IF v_q IS NULL OR length(v_q) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          up.id,
          'full_name',   up.full_name,
          'email',       up.email,
          'phone',       up.phone,
          'personal_id', up.personal_id,
          'booking_id',  sb.id,
          'checked_in',  sb.checked_in
        )
      )
      FROM public.session_bookings sb
      JOIN public.user_profiles up ON up.id = sb.user_id
      WHERE sb.session_id = p_session_id
        AND sb.event_id = v_event
        AND sb.booking_status = 'confirmed'
        AND up.personal_id ILIKE '%' || v_q || '%'
      LIMIT 50
    ),
    '[]'::jsonb
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. get_full_volunteer_details
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_full_volunteer_details(p_volunteer_identifier text, p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
  v_caller_team uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'No active event';
  END IF;

  IF NOT public.has_role(v_event, 'team_leader')
     AND NOT public.is_admin(v_event) THEN
    RAISE EXCEPTION 'Unauthorized: team leader access required';
  END IF;

  -- Non-admin callers: find the team they lead (via the array)
  IF NOT public.is_admin(v_event) THEN
    SELECT vt.id INTO v_caller_team
    FROM public.volunteer_teams vt
    WHERE vt.event_id = v_event
      AND auth.uid() = ANY(vt.team_leader_ids)
    LIMIT 1;

    IF v_caller_team IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: you do not lead a team';
    END IF;
  END IF;

  SELECT jsonb_build_object(
           'user_id', v.user_id,
           'volunteer_id', v.volunteer_id,
           'full_name', up.full_name,
           'total_points', coalesce(es.score, v.total_points, 0),
           'hours_volunteered', v.hours_volunteered,
           'team_id', v.team_id,
           'team_name', vt.team_name,
           'email', up.email,
           'phone', up.phone,
           'personal_id', up.personal_id
         )
  INTO v_result
  FROM public.volunteers v
  JOIN public.user_profiles up ON up.id = v.user_id
  LEFT JOIN public.event_scores es
    ON es.user_id = v.user_id AND es.event_id = v.event_id
  LEFT JOIN public.volunteer_teams vt ON vt.id = v.team_id
  WHERE v.event_id = v_event
    AND (
      v.volunteer_id = left(upper(trim(coalesce(p_volunteer_identifier, ''))), 20)
      OR up.id::text = trim(coalesce(p_volunteer_identifier, ''))
    )
    AND (
      public.is_admin(v_event)
      OR v.team_id = v_caller_team
    );

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Volunteer not found';
  END IF;

  RETURN v_result;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. get_team_leader_data
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_team_leader_data(p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
  v_team uuid;
  v_team_name text;
  v_leader_name text;
  v_members bigint;
  v_leaders uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'No active event';
  END IF;

  IF NOT public.has_role(v_event, 'team_leader')
     AND NOT public.is_admin(v_event) THEN
    RAISE EXCEPTION 'Unauthorized: team leader access required';
  END IF;

  -- Find the team this caller leads (via the array)
  SELECT vt.id, vt.team_name, vt.team_leader_ids
  INTO v_team, v_team_name, v_leaders
  FROM public.volunteer_teams vt
  WHERE vt.event_id = v_event
    AND auth.uid() = ANY(vt.team_leader_ids)
  LIMIT 1;

  IF v_team IS NULL THEN
    IF public.is_admin(v_event) THEN
      RETURN jsonb_build_object(
        'team_id', NULL,
        'team_name', NULL,
        'event_id', v_event,
        'leader_name', NULL,
        'members_count', 0,
        'leader_ids', '[]'::jsonb,
        'team_leader_ids', '[]'::jsonb
      );
    END IF;
    RAISE EXCEPTION 'No team assigned to this team leader';
  END IF;

  SELECT up.full_name INTO v_leader_name
  FROM public.user_profiles up
  WHERE up.id = auth.uid();

  -- Members of this team, excluding anyone who is a team leader
  SELECT count(*) INTO v_members
  FROM public.volunteers v
  WHERE v.team_id = v_team
    AND v.event_id = v_event
    AND v.user_id <> ALL (v_leaders);

  RETURN jsonb_build_object(
    'team_id', v_team,
    'team_name', v_team_name,
    'event_id', v_event,
    'leader_name', coalesce(v_leader_name, ''),
    'members_count', v_members,
    'leader_ids', to_jsonb(v_leaders),
    'team_leader_ids', to_jsonb(v_leaders)
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. reg_team_get_attendee_by_personal_id
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.reg_team_get_attendee_by_personal_id(p_personal_id text, p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_event IS NULL THEN RAISE EXCEPTION 'No active event'; END IF;
  IF NOT public.is_reg_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: registration team access only';
  END IF;

  SELECT jsonb_build_object(
           'id', up.id,
           'full_name', up.full_name,
           'email', up.email,
           'phone', up.phone,
           'personal_id', up.personal_id,
           'nationality', up.nationality,
           'gender', up.gender,
           'university', er.university,
           'faculty', er.faculty,
           'department', er.department,
           'year', er.year,
           'student_status', er.student_status,
           'is_asu_student', er.is_asu_student,
           'student_id', er.student_id,
           'registration_status', er.registration_status,
           'payment_status', er.payment_status,
           'cv_url', er.cv_url,
           'enrollment_proof_url', er.enrollment_proof_url,
           'event_entry', (
             SELECT aa.check_out_time IS NULL
             FROM public.attendee_attendance aa
             WHERE aa.user_id = up.id AND aa.event_id = v_event
             ORDER BY aa.check_in_time DESC LIMIT 1
           ),
           'current_status', (
             SELECT CASE WHEN aa.check_out_time IS NULL THEN 'inside' ELSE 'outside' END
             FROM public.attendee_attendance aa
             WHERE aa.user_id = up.id AND aa.event_id = v_event
             ORDER BY aa.check_in_time DESC LIMIT 1
           ),
           'check_in_time', (
             SELECT aa.check_in_time
             FROM public.attendee_attendance aa
             WHERE aa.user_id = up.id AND aa.event_id = v_event
             ORDER BY aa.check_in_time DESC LIMIT 1
           ),
           'check_out_time', (
             SELECT aa.check_out_time
             FROM public.attendee_attendance aa
             WHERE aa.user_id = up.id AND aa.event_id = v_event
             ORDER BY aa.check_in_time DESC LIMIT 1
           )
         )
  INTO v_result
  FROM public.user_profiles up
  JOIN public.event_registrations er
    ON er.user_id = up.id AND er.event_id = v_event
  WHERE upper(up.personal_id) = upper(left(trim(coalesce(p_personal_id, '')), 50));

  RETURN v_result;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. reg_team_get_my_scan_count
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.reg_team_get_my_scan_count(p_event_id uuid DEFAULT NULL)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_event IS NULL THEN RAISE EXCEPTION 'No active event'; END IF;
  IF NOT public.is_reg_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: registration team access only';
  END IF;

  RETURN (
    SELECT count(*)::integer
    FROM public.attendee_attendance
    WHERE event_id = v_event
      AND (checked_in_by = auth.uid() OR checked_out_by = auth.uid())
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. reg_team_record_attendance
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.reg_team_record_attendance(p_attendee_id uuid, p_type text, p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user         uuid := auth.uid();
  v_event        uuid := coalesce(p_event_id, public.get_active_event_id());
  v_status       text;
  v_full_name    text;
  v_points       integer;
  v_config_key   text;
  v_activity     text;
  v_description  text;
  v_staff_event  text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'No active event';
  END IF;

  IF NOT public.is_reg_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: registration team access only';
  END IF;

  IF p_type NOT IN ('entry', 'exit') THEN
    RAISE EXCEPTION 'Invalid attendance type';
  END IF;

  SELECT er.registration_status, up.full_name
  INTO v_status, v_full_name
  FROM public.event_registrations er
  JOIN public.user_profiles up ON up.id = er.user_id
  WHERE er.user_id = p_attendee_id AND er.event_id = v_event;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendee not found for the active event';
  END IF;

  IF p_type = 'entry' THEN
    ------------------------------------------------------------------
    -- ENTRY
    ------------------------------------------------------------------
    IF v_status <> 'approved' THEN
      RAISE EXCEPTION 'Entry denied: attendee registration status is "%". Only approved attendees may enter.', v_status;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.attendee_attendance
      WHERE user_id = p_attendee_id AND event_id = v_event
        AND check_in_time::date = now()::date
        AND check_out_time IS NULL
    ) THEN
      RAISE EXCEPTION 'Attendee is already checked in';
    END IF;

    INSERT INTO public.attendee_attendance (user_id, event_id, check_in_time, checked_in_by)
    VALUES (p_attendee_id, v_event, now(), v_user);

    v_config_key  := 'attendee_checkin';
    v_activity    := 'check_in';
    v_description := 'Checked in to the event';
    v_staff_event := 'event_checkin_staff';

    SELECT points INTO v_points
    FROM public.points_config
    WHERE event_id = v_event AND config_key = v_config_key;

    -- Points for the attendee
    INSERT INTO public.user_activities
      (user_id, event_id, activity_type, description, points_earned, activity_timestamp)
    VALUES (
      p_attendee_id, v_event, v_activity,
      left(v_description, 500),
      coalesce(v_points, 0), now()
    );

    -- Points for the staff member
    INSERT INTO public.user_activities
      (user_id, event_id, activity_type, description, points_earned, activity_timestamp)
    VALUES (
      v_user, v_event, v_staff_event,
      left('Scanned entry for ' || coalesce(v_full_name, 'attendee'), 500),
      coalesce(v_points, 0), now()
    );

    RETURN jsonb_build_object('success', true, 'status', 'inside');

  ELSE
    ------------------------------------------------------------------
    -- EXIT
    ------------------------------------------------------------------
    UPDATE public.attendee_attendance
    SET check_out_time = now(), checked_out_by = v_user
    WHERE id = (
      SELECT id FROM public.attendee_attendance
      WHERE user_id = p_attendee_id AND event_id = v_event
        AND check_out_time IS NULL
      ORDER BY check_in_time DESC
      LIMIT 1
    );

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Attendee is not currently inside';
    END IF;

    v_config_key  := 'attendee_checkout';
    v_activity    := 'check_out';
    v_description := 'Checked out from the event';
    v_staff_event := 'event_checkout_staff';

    SELECT points INTO v_points
    FROM public.points_config
    WHERE event_id = v_event AND config_key = v_config_key;

    -- Points for the attendee
    INSERT INTO public.user_activities
      (user_id, event_id, activity_type, description, points_earned, activity_timestamp)
    VALUES (
      p_attendee_id, v_event, v_activity,
      left(v_description, 500),
      coalesce(v_points, 0), now()
    );

    -- Points for the staff member
    INSERT INTO public.user_activities
      (user_id, event_id, activity_type, description, points_earned, activity_timestamp)
    VALUES (
      v_user, v_event, v_staff_event,
      left('Scanned exit for ' || coalesce(v_full_name, 'attendee'), 500),
      coalesce(v_points, 0), now()
    );

    RETURN jsonb_build_object('success', true, 'status', 'outside');
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 9. reg_team_search_attendees
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.reg_team_search_attendees(p_query text, p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event uuid := coalesce(p_event_id, public.get_active_event_id());
  v_q text := nullif(trim(coalesce(p_query, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'No active event';
  END IF;

  IF NOT public.is_reg_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: registration team access only';
  END IF;

  IF v_q IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', sub.id,
          'full_name', sub.full_name,
          'first_name', split_part(sub.full_name, ' ', 1),
          'last_name', CASE
                         WHEN strpos(sub.full_name, ' ') > 0
                         THEN substr(sub.full_name, strpos(sub.full_name, ' ') + 1)
                         ELSE ''
                       END,
          'email', sub.email,
          'phone', sub.phone,
          'personal_id', sub.personal_id,
          'university', sub.university,
          'faculty', sub.faculty,
          'registration_status', sub.registration_status,
          'role', 'attendee'
        )
        ORDER BY sub.full_name
      )
      FROM (
        SELECT up.id, up.full_name, up.email, up.phone, up.personal_id,
               er.university, er.faculty, er.registration_status
        FROM public.user_profiles up
        JOIN public.event_registrations er
          ON er.user_id = up.id AND er.event_id = v_event
        JOIN public.user_roles ur
          ON ur.user_id = up.id
         AND ur.event_id = v_event
         AND ur.role = 'attendee'          -- ← only attendees
        WHERE up.full_name ILIKE '%' || v_q || '%'
           OR up.email ILIKE '%' || v_q || '%'
           OR up.phone ILIKE '%' || v_q || '%'
           OR up.personal_id ILIKE '%' || v_q || '%'
        LIMIT 20
      ) sub
    ),
    '[]'::jsonb
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 10. verif_team_get_attendees
--     This is the verification queue and its status counts — the read path
--     behind the numbers that looked wrong.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.verif_team_get_attendees(p_is_asu boolean DEFAULT true, p_search_term text DEFAULT ''::text, p_status_filter text DEFAULT 'all'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_event_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_event  uuid := coalesce(p_event_id, public.get_active_event_id());
  v_search text := nullif(trim(coalesce(p_search_term, '')), '');
  v_status text := nullif(trim(coalesce(p_status_filter, '')), '');
  v_total  bigint;
  v_rows   jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'No active event';
  END IF;

  IF NOT public.is_verification_team_member(v_event) THEN
    RAISE EXCEPTION 'FORBIDDEN: verification team access only';
  END IF;

  IF p_limit  IS NULL OR p_limit  < 1 THEN p_limit  := 20; END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN p_offset := 0;  END IF;

  SELECT count(*) INTO v_total
  FROM public.event_registrations er
  JOIN public.user_profiles up ON up.id = er.user_id
  JOIN public.user_roles    ur ON ur.user_id = er.user_id
                              AND ur.event_id = er.event_id
                              AND ur.role = 'attendee'
  WHERE er.event_id = v_event
    AND er.is_asu_student = p_is_asu
    AND (v_status IS NULL OR v_status = 'all' OR er.registration_status = v_status)
    AND (v_search IS NULL
         OR up.full_name   ILIKE '%' || v_search || '%'
         OR up.personal_id ILIKE '%' || v_search || '%'
         OR up.email       ILIKE '%' || v_search || '%');

  SELECT coalesce(jsonb_agg(row_json ORDER BY registered_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
             'user_id',              er.user_id,
             'is_asu_student',       er.is_asu_student,
             'university',           er.university,
             'faculty',              er.faculty,
             'department',           er.department,
             'cv_url',               er.cv_url,
             'enrollment_proof_url', er.enrollment_proof_url,
             'registration_status',  er.registration_status,
             'payment_status',       er.payment_status,
             'registered_at',        er.registered_at,
             'user_profiles', jsonb_build_object(
               'id',          up.id,
               'full_name',   up.full_name,
               'phone',       up.phone,
               'personal_id', up.personal_id,
               'email',       up.email
             )
           ) AS row_json,
           er.registered_at AS registered_at
    FROM public.event_registrations er
    JOIN public.user_profiles up ON up.id = er.user_id
    JOIN public.user_roles    ur ON ur.user_id = er.user_id
                                AND ur.event_id = er.event_id
                                AND ur.role = 'attendee'
    WHERE er.event_id = v_event
      AND er.is_asu_student = p_is_asu
      AND (v_status IS NULL OR v_status = 'all' OR er.registration_status = v_status)
      AND (v_search IS NULL
           OR up.full_name   ILIKE '%' || v_search || '%'
           OR up.personal_id ILIKE '%' || v_search || '%'
           OR up.email       ILIKE '%' || v_search || '%')
    ORDER BY er.registered_at DESC
    LIMIT p_limit OFFSET p_offset
  ) page;

  RETURN jsonb_build_object('attendees', v_rows, 'total', v_total);
END;
$function$;

-- ---------------------------------------------------------------------------
-- Grants — DROP removed the old ones, so they are restored here.
-- These are staff functions: signed-in callers only, never anon.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'build_team_get_sessions(uuid)',
    'build_team_get_volunteer_stats(uuid)',
    'build_team_search_session_bookings(uuid, text, uuid)',
    'get_full_volunteer_details(text, uuid)',
    'get_team_leader_data(uuid)',
    'reg_team_get_attendee_by_personal_id(text, uuid)',
    'reg_team_get_my_scan_count(uuid)',
    'reg_team_record_attendance(uuid, text, uuid)',
    'reg_team_search_attendees(text, uuid)',
    'verif_team_get_attendees(boolean, text, text, integer, integer, uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Invariants — fail the whole migration rather than leave a half-applied state.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_name text;
  v_count int;
BEGIN
  -- a) Exactly one signature each: an extra overload would make calls ambiguous.
  FOREACH v_name IN ARRAY ARRAY[
    'build_team_get_sessions',
    'build_team_get_volunteer_stats',
    'build_team_search_session_bookings',
    'get_full_volunteer_details',
    'get_team_leader_data',
    'reg_team_get_attendee_by_personal_id',
    'reg_team_get_my_scan_count',
    'reg_team_record_attendance',
    'reg_team_search_attendees',
    'verif_team_get_attendees'
  ]
  LOOP
    SELECT count(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = v_name;

    IF v_count <> 1 THEN
      RAISE EXCEPTION 'v2_08: public.% has % signatures, expected exactly 1', v_name, v_count;
    END IF;

    -- b) Each one takes p_event_id and still resolves it through the active event.
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
        AND 'p_event_id' = ANY(p.proargnames)
        AND pg_get_functiondef(p.oid) LIKE '%coalesce(p_event_id, public.get_active_event_id())%'
    ) THEN
      RAISE EXCEPTION 'v2_08: public.% did not pick up the p_event_id fallback', v_name;
    END IF;

    -- c) Still SECURITY DEFINER with a pinned search_path.
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
        AND p.prosecdef
        AND p.proconfig IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'v2_08: public.% lost SECURITY DEFINER or its search_path', v_name;
    END IF;

    -- d) Not callable by anon.
    IF has_function_privilege('anon', (
      SELECT p.oid FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_name
    ), 'EXECUTE') THEN
      RAISE EXCEPTION 'v2_08: public.% is executable by anon', v_name;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
