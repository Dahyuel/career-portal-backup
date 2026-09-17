-- ============================================================================
-- v2 step 4 — Admin statistics: one secure, consistent function for the
--             Statistics tab and the full event report.
--
-- Same result shape as the career-portal version, remapped onto v2:
--   attendees                  -> event_registrations
--   attendee_attendance.attendee_id -> user_id
--   session_bookings.attendee_id    -> user_id (and it carries event_id)
--   companies.event_id         -> company_event_participation
--   super admins are global    -> user_roles.event_id IS NULL
--
-- Definitions used everywhere in the result:
--   attendee        = has an event_registrations row AND the event role 'attendee'
--                     (staff who also registered are NOT counted as attendees)
--   "not_specified" = the value is missing; it is always returned, never hidden
--   days / hours    = local time in Africa/Cairo; each day says whether it falls
--                     inside the event's start/end dates
--
-- Paste the WHOLE file into Supabase Dashboard → SQL Editor → Run. Safe to re-run.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_get_event_statistics(_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz        CONSTANT TEXT := 'Africa/Cairo';
  v_event     events%ROWTYPE;
  v_start_day DATE;
  v_end_day   DATE;
  v_result    JSONB;
BEGIN
  -- Admins of this event, plus super admins (who are global in v2).
  IF auth.uid() IS NULL OR NOT (
    public.is_sadmin()
    OR EXISTS (SELECT 1 FROM user_roles
               WHERE user_id = auth.uid() AND event_id = _event_id AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_event FROM events WHERE id = _event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;

  v_start_day := (v_event.start_date AT TIME ZONE v_tz)::DATE;
  v_end_day   := (v_event.end_date   AT TIME ZONE v_tz)::DATE;

  WITH
  roles AS (
    SELECT user_id, role FROM user_roles WHERE event_id = _event_id
    UNION
    SELECT user_id, role FROM user_roles WHERE event_id IS NULL AND role = 'sadmin'
  ),
  att AS (
    SELECT er.user_id,
           er.is_asu_student,
           NULLIF(BTRIM(er.university), '')                  AS university,
           NULLIF(BTRIM(er.faculty), '')                     AS faculty,
           LOWER(NULLIF(BTRIM(er.registration_status), ''))  AS registration_status,
           LOWER(NULLIF(BTRIM(er.payment_status), ''))       AS payment_status,
           LOWER(NULLIF(BTRIM(er.student_status), ''))       AS student_status,
           er.year,
           er.registered_at,
           CASE LOWER(NULLIF(BTRIM(up.gender), ''))
             WHEN 'male'   THEN 'male'
             WHEN 'female' THEN 'female'
             ELSE 'not_specified'
           END AS gender,
           CASE er.is_asu_student
             WHEN TRUE  THEN 'asu'
             WHEN FALSE THEN 'other'
             ELSE 'not_specified'
           END AS asu
    FROM event_registrations er
    JOIN roles r ON r.user_id = er.user_id AND r.role = 'attendee'
    LEFT JOIN user_profiles up ON up.id = er.user_id
    WHERE er.event_id = _event_id
  ),
  checkins AS (
    SELECT aa.user_id AS attendee_id,
           aa.check_out_time,
           (aa.check_in_time AT TIME ZONE v_tz)::DATE                AS day,
           EXTRACT(HOUR FROM aa.check_in_time AT TIME ZONE v_tz)::INT AS hour,
           att.asu,
           att.gender,
           COALESCE(att.university, 'not_specified') AS university,
           COALESCE(att.faculty, 'not_specified')    AS faculty
    FROM attendee_attendance aa
    JOIN att ON att.user_id = aa.user_id
    WHERE aa.event_id = _event_id
      AND aa.check_in_time IS NOT NULL
  ),
  event_bookings AS (
    SELECT sb.session_id, sb.user_id AS attendee_id, sb.booking_status, sb.checked_in, sb.checked_in_at
    FROM session_bookings sb
    WHERE sb.event_id = _event_id
  ),
  session_attendance_by_day AS (
    SELECT (checked_in_at AT TIME ZONE v_tz)::DATE AS day, COUNT(*) AS n
    FROM event_bookings
    WHERE checked_in AND checked_in_at IS NOT NULL
    GROUP BY 1
  ),
  day_keys AS (
    SELECT day FROM checkins
    UNION
    SELECT day FROM session_attendance_by_day
  )
  SELECT jsonb_build_object(
    'generated_at', NOW(),

    'event', jsonb_build_object(
      'id',         v_event.id,
      'name',       v_event.name,
      'start_date', v_event.start_date,
      'end_date',   v_event.end_date,
      'start_day',  v_start_day,
      'end_day',    v_end_day
    ),

    'people', jsonb_build_object(
      'total',      (SELECT COUNT(DISTINCT user_id) FROM roles),
      'attendees',  (SELECT COUNT(*) FROM roles WHERE role = 'attendee'),
      'volunteers', (SELECT COUNT(*) FROM roles WHERE role IN ('volunteer', 'team_leader', 'building', 'registration', 'info_desk', 'verification', 'tech_support')),
      'employers',  (SELECT COUNT(*) FROM roles WHERE role = 'employer'),
      'admins',     (SELECT COUNT(*) FROM roles WHERE role IN ('admin', 'sadmin')),
      'by_role',    (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', role, 'count', n) ORDER BY n DESC, role), '[]'::JSONB)
                     FROM (SELECT role, COUNT(*) AS n FROM roles GROUP BY role) x)
    ),

    'companies', (SELECT COUNT(*) FROM company_event_participation WHERE event_id = _event_id),

    'funnel', jsonb_build_object(
      'registered',       (SELECT COUNT(*) FROM att),
      'approved',         (SELECT COUNT(*) FROM att WHERE registration_status = 'approved'),
      'checked_in',       (SELECT COUNT(DISTINCT attendee_id) FROM checkins),
      'attended_session', (SELECT COUNT(DISTINCT eb.attendee_id) FROM event_bookings eb JOIN att ON att.user_id = eb.attendee_id WHERE eb.checked_in)
    ),

    'attendees', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM att),
      'registration_status', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT COALESCE(registration_status, 'not_specified') AS label, COUNT(*) AS n FROM att GROUP BY 1) x),
      'asu',                 (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT asu AS label, COUNT(*) AS n FROM att GROUP BY 1) x),
      'payment',             (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT COALESCE(payment_status, CASE WHEN is_asu_student THEN 'not_required' ELSE 'not_specified' END) AS label,
                                           COUNT(*) AS n
                                    FROM att GROUP BY 1) x),
      'gender',              (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT gender AS label, COUNT(*) AS n FROM att GROUP BY 1) x),
      'degree_level',        (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT COALESCE(student_status, 'not_specified') AS label, COUNT(*) AS n FROM att GROUP BY 1) x),
      'class_year',          (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT COALESCE(year::TEXT, 'not_specified') AS label, COUNT(*) AS n FROM att GROUP BY 1) x),
      'universities',        (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT COALESCE(university, 'not_specified') AS label, COUNT(*) AS n FROM att GROUP BY 1) x),
      'faculties',           (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                              FROM (SELECT COALESCE(faculty, 'not_specified') AS label, COUNT(*) AS n FROM att GROUP BY 1) x),
      'registrations_by_day', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY label), '[]'::JSONB)
                               FROM (SELECT (registered_at AT TIME ZONE v_tz)::DATE::TEXT AS label, COUNT(*) AS n
                                     FROM att WHERE registered_at IS NOT NULL GROUP BY 1) x)
    ),

    'checkins', jsonb_build_object(
      'total',            (SELECT COUNT(*) FROM checkins),
      'unique_attendees', (SELECT COUNT(DISTINCT attendee_id) FROM checkins),
      'checked_out',      (SELECT COUNT(*) FROM checkins WHERE check_out_time IS NOT NULL),
      'still_inside',     (SELECT COUNT(*) FROM checkins WHERE check_out_time IS NULL),
      'days', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'date',               dk.day,
          'in_event_window',    dk.day BETWEEN v_start_day AND v_end_day,
          'check_ins',          (SELECT COUNT(*) FROM checkins c WHERE c.day = dk.day),
          'unique_attendees',   (SELECT COUNT(DISTINCT c.attendee_id) FROM checkins c WHERE c.day = dk.day),
          'check_outs',         (SELECT COUNT(*) FROM checkins c WHERE c.day = dk.day AND c.check_out_time IS NOT NULL),
          'session_attendance', COALESCE((SELECT sa.n FROM session_attendance_by_day sa WHERE sa.day = dk.day), 0),
          'asu',          (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                           FROM (SELECT c.asu AS label, COUNT(*) AS n FROM checkins c WHERE c.day = dk.day GROUP BY 1) x),
          'gender',       (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                           FROM (SELECT c.gender AS label, COUNT(*) AS n FROM checkins c WHERE c.day = dk.day GROUP BY 1) x),
          'universities', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                           FROM (SELECT c.university AS label, COUNT(*) AS n FROM checkins c WHERE c.day = dk.day GROUP BY 1) x),
          'faculties',    (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
                           FROM (SELECT c.faculty AS label, COUNT(*) AS n FROM checkins c WHERE c.day = dk.day GROUP BY 1) x),
          'hours',        (SELECT COALESCE(jsonb_agg(jsonb_build_object('hour', hour, 'count', n) ORDER BY hour), '[]'::JSONB)
                           FROM (SELECT c.hour, COUNT(*) AS n FROM checkins c WHERE c.day = dk.day GROUP BY 1) x)
        ) ORDER BY dk.day), '[]'::JSONB)
        FROM day_keys dk
      )
    ),

    'sessions', jsonb_build_object(
      'total_bookings',     (SELECT COUNT(*) FROM event_bookings WHERE booking_status <> 'cancelled'),
      'cancelled_bookings', (SELECT COUNT(*) FROM event_bookings WHERE booking_status = 'cancelled'),
      'items', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'id', id, 'title', title, 'start_time', start_time, 'capacity', capacity,
                 'booked', booked, 'cancelled', cancelled, 'attended', attended
               ) ORDER BY booked DESC, start_time), '[]'::JSONB)
        FROM (
          SELECT s.id, s.title, s.start_time, s.max_attendees AS capacity,
                 COUNT(eb.session_id) FILTER (WHERE eb.booking_status <> 'cancelled') AS booked,
                 COUNT(eb.session_id) FILTER (WHERE eb.booking_status = 'cancelled')  AS cancelled,
                 COUNT(eb.session_id) FILTER (WHERE eb.checked_in)                    AS attended
          FROM sessions s
          LEFT JOIN event_bookings eb ON eb.session_id = s.id
          WHERE s.event_id = _event_id
          GROUP BY s.id, s.title, s.start_time, s.max_attendees
        ) x
      )
    ),

    'volunteer_teams', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('label', label, 'count', n) ORDER BY n DESC, label), '[]'::JSONB)
      FROM (
        SELECT vt.team_name AS label, COUNT(v.user_id) AS n
        FROM volunteer_teams vt
        LEFT JOIN volunteers v ON v.team_id = vt.id
        WHERE vt.event_id = _event_id
        GROUP BY vt.id, vt.team_name
      ) x
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_event_statistics(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_event_statistics(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Lock the older, unprotected statistics functions — but only the ones that
-- actually exist here, so this file never fails on a different deployment.
-- They are kept (not dropped) so they can be re-enabled if needed.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_fn TEXT;
BEGIN
  FOR v_fn IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('admin_get_enhanced_statistics',
                        'admin_get_total_session_bookings',
                        'admin_get_session_attendance_by_day')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_fn);
    RAISE NOTICE 'Locked old statistics function: %', v_fn;
  END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
