-- ============================================================================
-- v2 step 2 — Super admin dashboard functions
--
-- Everything the dashboard tabs need, mapped onto the v2 schema:
--   event_registrations (not attendees) · event_scores · per-event volunteers
--   session_bookings.user_id · company_event_participation · global sadmin rows
--   active event = system_config.active_event_id
--
-- Tabs covered: Command Center · People & Access · Activity · Event Controls
--               Security · Data Health
-- (Events + landing page come in the next file.)
--
-- Paste the WHOLE file into Supabase Dashboard → SQL Editor → Run.
-- One transaction: if anything fails, nothing changes. Safe to re-run.
-- Requires v2_01_superadmin_foundation.sql.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Settings helpers (internal)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sa_event_controls()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'registration_open', COALESCE((v ->> 'registration_open')::BOOLEAN, TRUE),
    'booking_open',      COALESCE((v ->> 'booking_open')::BOOLEAN, TRUE),
    'feedback_open',     COALESCE((v ->> 'feedback_open')::BOOLEAN, TRUE)
  )
  FROM (SELECT (SELECT value FROM system_config WHERE key = 'event_controls') AS v) x;
$$;

CREATE OR REPLACE FUNCTION public.app_control_enabled(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.sa_event_controls() ->> p_name)::BOOLEAN, TRUE);
$$;

-- v2 stores maintenance under the key "maintenance"; an end time is optional.
CREATE OR REPLACE FUNCTION public.sa_maintenance_state()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'enabled', COALESCE((v ->> 'enabled')::BOOLEAN, FALSE)
               AND (NULLIF(v ->> 'ends_at', '') IS NULL OR (v ->> 'ends_at')::TIMESTAMPTZ > NOW()),
    'stored_enabled', COALESCE((v ->> 'enabled')::BOOLEAN, FALSE),
    'message', COALESCE(NULLIF(v ->> 'message', ''), 'System is under maintenance. Please try again later.'),
    'ends_at', NULLIF(v ->> 'ends_at', '')
  )
  FROM (SELECT (SELECT value FROM system_config WHERE key = 'maintenance') AS v) x;
$$;

REVOKE EXECUTE ON FUNCTION public.sa_event_controls()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.app_control_enabled(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sa_maintenance_state()    FROM PUBLIC, anon, authenticated;

-- Public: lets pages show "closed" states before the user tries.
CREATE OR REPLACE FUNCTION public.get_public_event_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sa_event_controls() || jsonb_build_object('maintenance', public.sa_maintenance_state() -> 'enabled');
$$;

REVOKE ALL     ON FUNCTION public.get_public_event_status() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_public_event_status() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Enforcement: the switches actually block writes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_registration_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_control_enabled('registration_open')
     AND NOT public.is_sadmin()
     AND NOT public.is_admin(NEW.event_id) THEN
    RAISE EXCEPTION 'Registration is currently closed.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_registration_open ON public.event_registrations;
CREATE TRIGGER enforce_registration_open
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_registration_open();

CREATE OR REPLACE FUNCTION public.enforce_booking_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status IS DISTINCT FROM 'cancelled'
     AND (TG_OP = 'INSERT' OR OLD.booking_status = 'cancelled')
     AND NOT public.app_control_enabled('booking_open')
     AND NOT EXISTS (
       SELECT 1 FROM user_roles
       WHERE user_id = auth.uid() AND role NOT IN ('attendee', 'employer')
     ) THEN
    RAISE EXCEPTION 'Session booking is currently closed.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_open ON public.session_bookings;
CREATE TRIGGER enforce_booking_open
  BEFORE INSERT OR UPDATE OF booking_status ON public.session_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_open();

-- ---------------------------------------------------------------------------
-- 3. Command Center
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_command_center(_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tz               CONSTANT TEXT := 'Africa/Cairo';
  v_event            events%ROWTYPE;
  v_today            DATE := (NOW() AT TIME ZONE v_tz)::DATE;
  v_start_day        DATE;
  v_end_day          DATE;
  v_reg_today        INT;
  v_reg_total        INT;
  v_pending          INT;
  v_pending_old      INT;
  v_oldest           TIMESTAMPTZ;
  v_checkins_hour    INT;
  v_inside           INT;
  v_outside_checkins INT;
  v_sessions_now     JSONB;
  v_full_sessions    INT;
  v_admins           INT;
  v_sadmins          INT;
  v_no2fa            INT;
  v_orphans          INT;
  v_maintenance      JSONB := public.sa_maintenance_state();
  v_controls         JSONB := public.sa_event_controls();
  v_alerts           JSONB := '[]'::JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT * INTO v_event FROM events WHERE id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;
  v_start_day := (v_event.start_date AT TIME ZONE v_tz)::DATE;
  v_end_day   := (v_event.end_date   AT TIME ZONE v_tz)::DATE;

  SELECT COUNT(*) FILTER (WHERE (registered_at AT TIME ZONE v_tz)::DATE = v_today),
         COUNT(*),
         COUNT(*) FILTER (WHERE registration_status = 'pending'),
         COUNT(*) FILTER (WHERE registration_status = 'pending' AND registered_at < NOW() - INTERVAL '24 hours'),
         MIN(registered_at) FILTER (WHERE registration_status = 'pending')
  INTO v_reg_today, v_reg_total, v_pending, v_pending_old, v_oldest
  FROM event_registrations WHERE event_id = _event_id;

  SELECT COUNT(*) FILTER (WHERE check_in_time >= NOW() - INTERVAL '1 hour'),
         COUNT(*) FILTER (WHERE check_out_time IS NULL AND (check_in_time AT TIME ZONE v_tz)::DATE = v_today),
         COUNT(*) FILTER (WHERE (check_in_time AT TIME ZONE v_tz)::DATE NOT BETWEEN v_start_day AND v_end_day)
  INTO v_checkins_hour, v_inside, v_outside_checkins
  FROM attendee_attendance
  WHERE event_id = _event_id AND check_in_time IS NOT NULL;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', s.id, 'title', s.title, 'room_name', s.room_name,
           'start_time', s.start_time, 'end_time', s.end_time,
           'capacity', s.max_attendees, 'booked', b.booked, 'checked_in', b.checked_in
         ) ORDER BY s.start_time), '[]'::JSONB)
  INTO v_sessions_now
  FROM sessions s
  CROSS JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE sb.booking_status <> 'cancelled') AS booked,
           COUNT(*) FILTER (WHERE sb.checked_in) AS checked_in
    FROM session_bookings sb WHERE sb.session_id = s.id
  ) b
  WHERE s.event_id = _event_id AND s.end_time >= NOW() AND s.start_time <= NOW() + INTERVAL '2 hours';

  SELECT COUNT(*) INTO v_full_sessions
  FROM sessions s
  WHERE s.event_id = _event_id AND s.end_time >= NOW() AND COALESCE(s.max_attendees, 0) > 0
    AND (SELECT COUNT(*) FROM session_bookings sb WHERE sb.session_id = s.id AND sb.booking_status <> 'cancelled') >= s.max_attendees;

  SELECT COUNT(*) FILTER (WHERE role = 'admin' AND event_id = _event_id) INTO v_admins FROM user_roles;
  SELECT COUNT(DISTINCT user_id) INTO v_sadmins FROM user_roles WHERE role = 'sadmin';

  SELECT COUNT(DISTINCT r.user_id) INTO v_no2fa
  FROM user_roles r
  WHERE r.role = 'sadmin'
    AND NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = r.user_id AND f.status = 'verified');

  SELECT COUNT(*) INTO v_orphans
  FROM user_roles r
  WHERE (r.event_id = _event_id OR r.event_id IS NULL)
    AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = r.user_id);

  IF (v_maintenance ->> 'enabled')::BOOLEAN THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'critical', 'tab', 'controls',
      'message', 'Maintenance mode is ON. The site is closed to everyone.'));
  END IF;
  IF v_no2fa > 0 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'critical', 'tab', 'people',
      'message', v_no2fa || ' super admin account(s) have no authenticator app and cannot use this dashboard.'));
  END IF;
  IF v_pending_old > 0 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'warning', 'tab', NULL,
      'message', v_pending_old || ' verification request(s) have been waiting for more than 24 hours.'));
  END IF;
  IF NOT (v_controls ->> 'registration_open')::BOOLEAN THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'info', 'tab', 'controls', 'message', 'Registration is closed.'));
  END IF;
  IF NOT (v_controls ->> 'booking_open')::BOOLEAN THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'info', 'tab', 'controls', 'message', 'Session booking is closed for attendees.'));
  END IF;
  IF v_full_sessions > 0 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'info', 'tab', NULL,
      'message', v_full_sessions || ' upcoming session(s) are fully booked.'));
  END IF;
  IF v_outside_checkins > 0 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'info', 'tab', 'health',
      'message', v_outside_checkins || ' check-in(s) are recorded outside the event dates.'));
  END IF;
  IF v_orphans > 0 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level', 'info', 'tab', 'health',
      'message', v_orphans || ' role record(s) belong to accounts with no profile.'));
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'generated_at', NOW(),
    'event', jsonb_build_object('name', v_event.name, 'start_date', v_event.start_date,
                                'end_date', v_event.end_date, 'status', v_event.status),
    'registrations', jsonb_build_object('today', v_reg_today, 'total', v_reg_total),
    'verification', jsonb_build_object('pending', v_pending, 'waiting_over_24h', v_pending_old, 'oldest_pending_at', v_oldest),
    'checkins', jsonb_build_object('last_hour', v_checkins_hour, 'inside_now', v_inside),
    'sessions_now', v_sessions_now,
    'staff', jsonb_build_object('admins', v_admins, 'sadmins', v_sadmins, 'sadmin_limit', 5, 'sadmins_without_2fa', v_no2fa),
    'maintenance', v_maintenance,
    'controls', v_controls,
    'alerts', v_alerts
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. People & Access
--    A sadmin row has event_id IS NULL and counts for every event.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_list_accounts(
  _event_id UUID,
  _scope    TEXT DEFAULT 'staff',
  _search   TEXT DEFAULT NULL,
  _limit    INT  DEFAULT 20,
  _offset   INT  DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_limit   INT  := LEAST(GREATEST(COALESCE(_limit, 20), 1), 100);
  v_offset  INT  := GREATEST(COALESCE(_offset, 0), 0);
  v_search  TEXT := NULLIF(BTRIM(COALESCE(_search, '')), '');
  v_pattern TEXT;
  v_rows    JSONB;
  v_total   INT;
BEGIN
  PERFORM public._assert_sadmin();

  IF v_search IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(LEFT(v_search, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  WITH base AS (
    SELECT up.id, up.full_name, up.email, up.personal_id, up.created_at,
           COALESCE(
             (SELECT 'sadmin' FROM user_roles s WHERE s.user_id = up.id AND s.role = 'sadmin' AND s.event_id IS NULL LIMIT 1),
             (SELECT ur.role FROM user_roles ur WHERE ur.user_id = up.id AND ur.event_id = _event_id LIMIT 1),
             'none') AS role,
           EXISTS (SELECT 1 FROM user_roles s WHERE s.user_id = up.id AND s.role = 'sadmin' AND s.event_id IS NULL) AS all_events,
           au.last_sign_in_at,
           (au.banned_until IS NOT NULL AND au.banned_until > NOW()) AS disabled,
           EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = up.id AND f.status = 'verified') AS has_2fa
    FROM user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    WHERE (v_pattern IS NULL OR up.full_name ILIKE v_pattern OR up.email ILIKE v_pattern OR up.personal_id ILIKE v_pattern)
  ), filtered AS (
    SELECT *,
           CASE role
             WHEN 'sadmin' THEN 1 WHEN 'admin' THEN 2 WHEN 'tech_support' THEN 3 WHEN 'team_leader' THEN 4
             WHEN 'employer' THEN 7 WHEN 'attendee' THEN 8 WHEN 'none' THEN 9 ELSE 5
           END AS sort_rank
    FROM base
    WHERE COALESCE(_scope, 'staff') = 'all'
       OR (role NOT IN ('none', 'attendee', 'employer'))
  )
  SELECT (SELECT COUNT(*) FROM filtered),
         (SELECT COALESCE(jsonb_agg(to_jsonb(p) - 'sort_rank' ORDER BY p.sort_rank, p.full_name), '[]'::JSONB)
          FROM (SELECT * FROM filtered ORDER BY sort_rank, full_name LIMIT v_limit OFFSET v_offset) p)
  INTO v_total, v_rows;

  RETURN jsonb_build_object(
    'success', TRUE,
    'data', v_rows,
    'total', v_total,
    'seats', jsonb_build_object(
      'count', (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'sadmin'),
      'limit', 5)
  );
END;
$$;

-- Internal: is this user the only remaining super admin who can still sign in?
CREATE OR REPLACE FUNCTION public.sa_is_last_active_sadmin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'sadmin')
     AND NOT EXISTS (
       SELECT 1 FROM user_roles r
       JOIN auth.users u ON u.id = r.user_id
       WHERE r.role = 'sadmin' AND r.user_id <> p_user_id
         AND (u.banned_until IS NULL OR u.banned_until <= NOW())
     );
$$;

REVOKE EXECUTE ON FUNCTION public.sa_is_last_active_sadmin(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sadmin_change_role(_event_id UUID, _user_id UUID, _new_role TEXT, _reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_role TEXT;
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
    jsonb_build_object('old_role', v_old_role, 'new_role', _new_role, 'reason', LEFT(BTRIM(_reason), 500)));

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_set_account_disabled(_user_id UUID, _disabled BOOLEAN, _reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_sadmin();

  IF _user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'You cannot disable your own account.');
  END IF;
  IF _disabled AND LENGTH(BTRIM(COALESCE(_reason, ''))) < 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Please give a reason (at least 5 characters).');
  END IF;
  IF _disabled AND public.sa_is_last_active_sadmin(_user_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This is the last super admin, so the account cannot be disabled.');
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN _disabled THEN '2999-12-31 00:00:00+00'::TIMESTAMPTZ ELSE NULL END
  WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Account not found.');
  END IF;

  IF _disabled THEN
    DELETE FROM auth.sessions WHERE user_id = _user_id;
  END IF;

  PERFORM public.sa_audit_write(CASE WHEN _disabled THEN 'account_disabled' ELSE 'account_enabled' END, 'auth.users',
    jsonb_build_object('user_id', _user_id), jsonb_build_object('reason', LEFT(BTRIM(COALESCE(_reason, '')), 500)));

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_sign_out_user(_user_id UUID, _reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count INT;
BEGIN
  PERFORM public._assert_sadmin();

  IF _user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Use "Sign out my other sessions" in the Security tab for your own account.');
  END IF;

  DELETE FROM auth.sessions WHERE user_id = _user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.sa_audit_write('sessions_revoked', 'auth.sessions',
    jsonb_build_object('user_id', _user_id), jsonb_build_object('sessions', v_count, 'reason', LEFT(BTRIM(COALESCE(_reason, '')), 500)));

  RETURN jsonb_build_object('success', TRUE, 'sessions', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_delete_account(_user_id UUID, _confirm_email TEXT, _reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email  TEXT;
  v_result JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  IF _user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'You cannot delete your own account.');
  END IF;
  IF LENGTH(BTRIM(COALESCE(_reason, ''))) < 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Please give a reason (at least 5 characters).');
  END IF;
  IF public.sa_is_last_active_sadmin(_user_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This is the last super admin, so the account cannot be deleted.');
  END IF;

  SELECT COALESCE(up.email, au.email) INTO v_email
  FROM auth.users au LEFT JOIN user_profiles up ON up.id = au.id
  WHERE au.id = _user_id;

  IF v_email IS NULL OR LOWER(BTRIM(v_email)) <> LOWER(BTRIM(COALESCE(_confirm_email, ''))) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The email you typed does not match this account.');
  END IF;

  PERFORM public.sa_audit_write('account_deleted', 'auth.users',
    jsonb_build_object('user_id', _user_id), jsonb_build_object('email', v_email, 'reason', LEFT(BTRIM(_reason), 500)));

  BEGIN
    v_result := to_jsonb(public.sadmin_delete_user(_user_id));
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'sadmin_delete_account: %', SQLERRM;
    RAISE EXCEPTION 'The account could not be deleted.';
  END;

  IF COALESCE((v_result ->> 'success')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RAISE EXCEPTION 'The account could not be deleted.';
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Activity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_get_audit_log(
  _limit  INT         DEFAULT 50,
  _offset INT         DEFAULT 0,
  _action TEXT        DEFAULT NULL,
  _search TEXT        DEFAULT NULL,
  _from   TIMESTAMPTZ DEFAULT NULL,
  _to     TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit   INT  := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
  v_offset  INT  := GREATEST(COALESCE(_offset, 0), 0);
  v_search  TEXT := NULLIF(BTRIM(COALESCE(_search, '')), '');
  v_pattern TEXT;
  v_rows    JSONB;
  v_total   INT;
BEGIN
  PERFORM public._assert_sadmin();

  IF v_search IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(LEFT(v_search, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  WITH filtered AS (
    SELECT * FROM sadmin_audit_log l
    WHERE (NULLIF(_action, '') IS NULL OR l.action = _action)
      AND (_from IS NULL OR l.created_at >= _from)
      AND (_to IS NULL OR l.created_at <= _to)
      AND (v_pattern IS NULL OR l.actor_email ILIKE v_pattern OR l.target_table ILIKE v_pattern
           OR l.target_key::TEXT ILIKE v_pattern OR l.details::TEXT ILIKE v_pattern)
  )
  SELECT (SELECT COUNT(*) FROM filtered),
         (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC), '[]'::JSONB)
          FROM (SELECT id, created_at, actor_email, action, target_table, target_key, details
                FROM filtered ORDER BY created_at DESC LIMIT v_limit OFFSET v_offset) p)
  INTO v_total, v_rows;

  RETURN jsonb_build_object(
    'success', TRUE, 'data', v_rows, 'total', v_total,
    'actions', (SELECT COALESCE(jsonb_agg(DISTINCT action), '[]'::JSONB) FROM sadmin_audit_log)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_get_signin_activity(_event_id UUID, _limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_limit  INT := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
  v_staff  JSONB;
  v_events JSONB := '[]'::JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', r.user_id, 'email', COALESCE(up.email, au.email), 'full_name', up.full_name, 'role', r.role,
           'last_sign_in_at', au.last_sign_in_at,
           'has_2fa', EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = r.user_id AND f.status = 'verified'),
           'disabled', (au.banned_until IS NOT NULL AND au.banned_until > NOW())
         ) ORDER BY au.last_sign_in_at DESC NULLS LAST), '[]'::JSONB)
  INTO v_staff
  FROM (
    SELECT DISTINCT ON (user_id) user_id, role
    FROM user_roles
    WHERE (event_id = _event_id OR event_id IS NULL) AND role NOT IN ('attendee', 'employer')
    ORDER BY user_id, CASE role WHEN 'sadmin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
  ) r
  LEFT JOIN user_profiles up ON up.id = r.user_id
  LEFT JOIN auth.users au ON au.id = r.user_id;

  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'created_at', e.created_at, 'ip', e.ip_address,
             'action', e.payload ->> 'action', 'email', e.payload ->> 'actor_username'
           ) ORDER BY e.created_at DESC), '[]'::JSONB)
    INTO v_events
    FROM (
      SELECT * FROM auth.audit_log_entries
      WHERE COALESCE(payload ->> 'action', '') NOT IN ('token_refreshed', 'token_revoked')
        AND (payload ->> 'actor_id') IN (
          SELECT user_id::TEXT FROM user_roles
          WHERE (event_id = _event_id OR event_id IS NULL) AND role NOT IN ('attendee', 'employer'))
      ORDER BY created_at DESC
      LIMIT v_limit
    ) e;
  EXCEPTION WHEN OTHERS THEN
    v_events := '[]'::JSONB;
  END;

  RETURN jsonb_build_object('success', TRUE, 'staff', v_staff, 'events', v_events);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Event Controls
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_get_event_settings(_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event events%ROWTYPE;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT * INTO v_event FROM events WHERE id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'event', jsonb_build_object(
      'name', v_event.name, 'event_type', v_event.event_type, 'venue_name', v_event.venue_name,
      'start_date', v_event.start_date, 'end_date', v_event.end_date, 'status', v_event.status,
      'allow_non_asu_attendees', v_event.allow_non_asu_attendees, 'non_asu_ticket_price', v_event.non_asu_ticket_price),
    'controls', public.sa_event_controls(),
    'maintenance', public.sa_maintenance_state()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_update_event_settings(_event_id UUID, _settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new events%ROWTYPE;
BEGIN
  PERFORM public._assert_sadmin();

  IF _settings IS NULL OR jsonb_typeof(_settings) <> 'object' OR _settings = '{}'::JSONB THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Nothing to change.');
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(_settings) k
             WHERE k NOT IN ('name', 'event_type', 'venue_name', 'start_date', 'end_date', 'status',
                             'allow_non_asu_attendees', 'non_asu_ticket_price')) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown setting.');
  END IF;

  BEGIN
    SELECT * INTO v_new FROM events WHERE id = _event_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
    END IF;

    IF _settings ? 'name' THEN
      v_new.name := NULLIF(BTRIM(_settings ->> 'name'), '');
      IF v_new.name IS NULL OR LENGTH(v_new.name) > 200 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'The event name must be 1 to 200 characters.');
      END IF;
    END IF;
    IF _settings ? 'event_type' THEN v_new.event_type := LEFT(NULLIF(BTRIM(_settings ->> 'event_type'), ''), 50); END IF;
    IF _settings ? 'venue_name' THEN v_new.venue_name := LEFT(NULLIF(BTRIM(_settings ->> 'venue_name'), ''), 200); END IF;
    IF _settings ? 'start_date' THEN v_new.start_date := (_settings ->> 'start_date')::TIMESTAMPTZ; END IF;
    IF _settings ? 'end_date' THEN v_new.end_date := (_settings ->> 'end_date')::TIMESTAMPTZ; END IF;
    IF v_new.start_date IS NULL OR v_new.end_date IS NULL OR v_new.end_date <= v_new.start_date THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'The end date must be after the start date.');
    END IF;
    IF _settings ? 'status' THEN
      IF _settings ->> 'status' NOT IN ('draft', 'published', 'ongoing', 'completed', 'cancelled') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid status.');
      END IF;
      v_new.status := _settings ->> 'status';
    END IF;
    IF _settings ? 'allow_non_asu_attendees' THEN v_new.allow_non_asu_attendees := (_settings ->> 'allow_non_asu_attendees')::BOOLEAN; END IF;
    IF _settings ? 'non_asu_ticket_price' THEN
      v_new.non_asu_ticket_price := (_settings ->> 'non_asu_ticket_price')::INT;
      IF v_new.non_asu_ticket_price < 0 OR v_new.non_asu_ticket_price > 100000 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'The ticket price must be between 0 and 100000.');
      END IF;
    END IF;

    UPDATE events
    SET name = v_new.name, event_type = v_new.event_type, venue_name = v_new.venue_name,
        start_date = v_new.start_date, end_date = v_new.end_date, status = v_new.status,
        allow_non_asu_attendees = v_new.allow_non_asu_attendees,
        non_asu_ticket_price = v_new.non_asu_ticket_price, updated_at = NOW()
    WHERE id = _event_id;
  EXCEPTION
    WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR numeric_value_out_of_range THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'One of the values has the wrong format.');
    WHEN check_violation OR not_null_violation THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'One of the values is not allowed.');
  END;

  PERFORM public.sa_audit_write('event_settings_updated', 'events', jsonb_build_object('id', _event_id),
    jsonb_build_object('changes', _settings));

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_set_event_controls(_controls JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_new JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  IF _controls IS NULL OR jsonb_typeof(_controls) <> 'object' OR _controls = '{}'::JSONB THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Nothing to change.');
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(_controls) LOOP
    IF v_key NOT IN ('registration_open', 'booking_open', 'feedback_open') OR jsonb_typeof(_controls -> v_key) <> 'boolean' THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown setting.');
    END IF;
  END LOOP;

  v_new := public.sa_event_controls() || _controls;
  INSERT INTO system_config (key, value, updated_at) VALUES ('event_controls', v_new, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

  RETURN jsonb_build_object('success', TRUE, 'controls', v_new);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_set_maintenance(_enabled BOOLEAN, _message TEXT DEFAULT NULL, _ends_at TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_sadmin();

  IF COALESCE(_enabled, FALSE) AND _ends_at IS NOT NULL AND _ends_at <= NOW() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The end time must be in the future.');
  END IF;

  -- Keeps v2's key name and shape, with an optional end time added.
  INSERT INTO system_config (key, value, updated_at)
  VALUES ('maintenance', jsonb_build_object(
            'enabled', COALESCE(_enabled, FALSE),
            'message', COALESCE(NULLIF(BTRIM(LEFT(COALESCE(_message, ''), 300)), ''), 'System is under maintenance. Please try again later.'),
            'ends_at', CASE WHEN COALESCE(_enabled, FALSE) THEN _ends_at END),
          NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

  RETURN jsonb_build_object('success', TRUE, 'maintenance', public.sa_maintenance_state());
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Security report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_security_report(_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tables    JSONB;
  v_functions JSONB;
  v_buckets   JSONB := '[]'::JSONB;
  v_sessions  JSONB := '[]'::JSONB;
  v_no2fa     JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT COALESCE(jsonb_agg(jsonb_build_object('table', t.relname, 'rls', t.relrowsecurity, 'level', t.lvl)
           ORDER BY CASE t.lvl WHEN 'open' THEN 1 ELSE 2 END, t.relname), '[]'::JSONB)
  INTO v_tables
  FROM (
    SELECT c.relname, c.relrowsecurity,
      CASE
        WHEN NOT has_any_column_privilege('anon', c.oid, 'SELECT') THEN 'closed'
        WHEN c.relkind <> 'r' OR NOT c.relrowsecurity THEN 'open'
        WHEN EXISTS (SELECT 1 FROM pg_policies p
                     WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.cmd IN ('SELECT', 'ALL')
                       AND p.roles && ARRAY['anon', 'public']::NAME[] AND COALESCE(p.qual, '') IN ('true', '(true)')) THEN 'open'
        WHEN EXISTS (SELECT 1 FROM pg_policies p
                     WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.cmd IN ('SELECT', 'ALL')
                       AND p.roles && ARRAY['anon', 'public']::NAME[]) THEN 'conditional'
        ELSE 'closed'
      END AS lvl
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'v', 'm')
  ) t
  WHERE t.lvl <> 'closed';

  SELECT COALESCE(jsonb_agg(p.proname ORDER BY p.proname), '[]'::JSONB)
  INTO v_functions
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.prosecdef
    AND p.prorettype <> 'trigger'::REGTYPE
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'name', b.name, 'public', b.public,
             'files', (SELECT COUNT(*) FROM storage.objects o WHERE o.bucket_id = b.id)
           ) ORDER BY b.name), '[]'::JSONB)
    INTO v_buckets FROM storage.buckets b;
  EXCEPTION WHEN OTHERS THEN
    v_buckets := '[]'::JSONB;
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'id', s.id, 'created_at', s.created_at, 'updated_at', s.updated_at,
             'user_agent', s.user_agent, 'ip', host(s.ip),
             'current', s.id::TEXT = auth.jwt() ->> 'session_id'
           ) ORDER BY s.updated_at DESC NULLS LAST), '[]'::JSONB)
    INTO v_sessions FROM auth.sessions s WHERE s.user_id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_sessions := '[]'::JSONB;
  END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('email', COALESCE(up.email, au.email), 'role', r.role)), '[]'::JSONB)
  INTO v_no2fa
  FROM user_roles r
  LEFT JOIN user_profiles up ON up.id = r.user_id
  LEFT JOIN auth.users au ON au.id = r.user_id
  WHERE (r.event_id = _event_id OR r.event_id IS NULL)
    AND r.role IN ('sadmin', 'admin', 'tech_support')
    AND NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = r.user_id AND f.status = 'verified');

  RETURN jsonb_build_object(
    'success', TRUE, 'generated_at', NOW(),
    'public_tables', v_tables, 'public_functions', v_functions,
    'buckets', v_buckets, 'my_sessions', v_sessions, 'privileged_without_2fa', v_no2fa
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Data Health
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sa_health_checks()
RETURNS TABLE (code TEXT, label TEXT, description TEXT, severity TEXT, fixable BOOLEAN)
LANGUAGE sql
IMMUTABLE
AS $$
  VALUES
    ('checkins_outside_event', 'Check-ins outside the event dates', 'Check-in records dated before or after the event, usually left over from testing. They distort the statistics.', 'warning', TRUE),
    ('orphan_roles', 'Roles without a profile', 'Role records that point to accounts with no profile. They count as people but cannot sign in properly.', 'warning', TRUE),
    ('duplicate_personal_ids', 'Duplicate personal IDs', 'Different accounts sharing the same national ID. Usually the same person registered twice.', 'warning', FALSE),
    ('stale_pending_verifications', 'Verifications waiting over 7 days', 'Attendees still waiting for approval after a week.', 'warning', FALSE),
    ('sessions_over_capacity', 'Sessions booked over capacity', 'Sessions with more active bookings than seats.', 'warning', FALSE),
    ('staff_with_registration', 'Staff registered as attendees', 'Staff accounts that also have an attendee registration for this event.', 'info', FALSE),
    ('missing_gender', 'Registered attendees without gender', 'Profiles with no gender recorded, which limits the statistics.', 'info', FALSE)
$$;

CREATE OR REPLACE FUNCTION public.sa_health_count(_event_id UUID, _code TEXT)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz    CONSTANT TEXT := 'Africa/Cairo';
  v_start DATE;
  v_end   DATE;
  v_count INT := 0;
BEGIN
  SELECT (start_date AT TIME ZONE v_tz)::DATE, (end_date AT TIME ZONE v_tz)::DATE INTO v_start, v_end
  FROM events WHERE id = _event_id;

  CASE _code
    WHEN 'checkins_outside_event' THEN
      SELECT COUNT(*) INTO v_count FROM attendee_attendance
      WHERE event_id = _event_id AND check_in_time IS NOT NULL
        AND (check_in_time AT TIME ZONE v_tz)::DATE NOT BETWEEN v_start AND v_end;
    WHEN 'orphan_roles' THEN
      SELECT COUNT(*) INTO v_count FROM user_roles r
      WHERE (r.event_id = _event_id OR r.event_id IS NULL)
        AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = r.user_id);
    WHEN 'duplicate_personal_ids' THEN
      SELECT COUNT(*) INTO v_count FROM (
        SELECT personal_id FROM user_profiles WHERE NULLIF(BTRIM(personal_id), '') IS NOT NULL
        GROUP BY personal_id HAVING COUNT(*) > 1) d;
    WHEN 'stale_pending_verifications' THEN
      SELECT COUNT(*) INTO v_count FROM event_registrations
      WHERE event_id = _event_id AND registration_status = 'pending' AND registered_at < NOW() - INTERVAL '7 days';
    WHEN 'sessions_over_capacity' THEN
      SELECT COUNT(*) INTO v_count FROM sessions s
      WHERE s.event_id = _event_id AND COALESCE(s.max_attendees, 0) > 0
        AND (SELECT COUNT(*) FROM session_bookings b WHERE b.session_id = s.id AND b.booking_status <> 'cancelled') > s.max_attendees;
    WHEN 'staff_with_registration' THEN
      SELECT COUNT(*) INTO v_count FROM event_registrations er
      JOIN user_roles r ON r.user_id = er.user_id AND (r.event_id = er.event_id OR r.event_id IS NULL)
      WHERE er.event_id = _event_id AND r.role NOT IN ('attendee', 'employer');
    WHEN 'missing_gender' THEN
      SELECT COUNT(*) INTO v_count FROM event_registrations er
      JOIN user_profiles p ON p.id = er.user_id
      WHERE er.event_id = _event_id AND NULLIF(BTRIM(p.gender), '') IS NULL;
    ELSE
      v_count := NULL;
  END CASE;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sa_health_checks()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sa_health_count(UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sadmin_data_health(_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_check  RECORD;
BEGIN
  PERFORM public._assert_sadmin();

  FOR v_check IN SELECT * FROM public.sa_health_checks() LOOP
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'code', v_check.code, 'label', v_check.label, 'description', v_check.description,
      'severity', v_check.severity, 'fixable', v_check.fixable,
      'count', public.sa_health_count(_event_id, v_check.code)));
  END LOOP;

  RETURN jsonb_build_object('success', TRUE, 'generated_at', NOW(), 'checks', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_data_health_preview(_event_id UUID, _code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz    CONSTANT TEXT := 'Africa/Cairo';
  v_start DATE;
  v_end   DATE;
  v_rows  JSONB := '[]'::JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT (start_date AT TIME ZONE v_tz)::DATE, (end_date AT TIME ZONE v_tz)::DATE INTO v_start, v_end
  FROM events WHERE id = _event_id;

  IF _code = 'checkins_outside_event' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('attendee', p.full_name, 'checked_in', x.check_in_time, 'checked_out', x.check_out_time) ORDER BY x.check_in_time), '[]'::JSONB)
    INTO v_rows
    FROM (SELECT * FROM attendee_attendance
          WHERE event_id = _event_id AND check_in_time IS NOT NULL
            AND (check_in_time AT TIME ZONE v_tz)::DATE NOT BETWEEN v_start AND v_end
          ORDER BY check_in_time LIMIT 20) x
    LEFT JOIN user_profiles p ON p.id = x.user_id;

  ELSIF _code = 'orphan_roles' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'role', r.role)), '[]'::JSONB) INTO v_rows
    FROM (SELECT * FROM user_roles r0
          WHERE (r0.event_id = _event_id OR r0.event_id IS NULL)
            AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = r0.user_id)
          LIMIT 20) r;

  ELSIF _code = 'duplicate_personal_ids' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('personal_id', '•••' || RIGHT(d.personal_id, 4), 'accounts', d.n)), '[]'::JSONB) INTO v_rows
    FROM (SELECT personal_id, COUNT(*) AS n FROM user_profiles
          WHERE NULLIF(BTRIM(personal_id), '') IS NOT NULL
          GROUP BY personal_id HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 20) d;

  ELSIF _code = 'stale_pending_verifications' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('attendee', x.full_name, 'university', x.university, 'registered_at', x.registered_at) ORDER BY x.registered_at), '[]'::JSONB) INTO v_rows
    FROM (SELECT p.full_name, er.university, er.registered_at FROM event_registrations er
          LEFT JOIN user_profiles p ON p.id = er.user_id
          WHERE er.event_id = _event_id AND er.registration_status = 'pending' AND er.registered_at < NOW() - INTERVAL '7 days'
          ORDER BY er.registered_at LIMIT 20) x;

  ELSIF _code = 'sessions_over_capacity' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('session', x.title, 'booked', x.booked, 'capacity', x.max_attendees)), '[]'::JSONB) INTO v_rows
    FROM (SELECT s.title, s.max_attendees,
                 (SELECT COUNT(*) FROM session_bookings b WHERE b.session_id = s.id AND b.booking_status <> 'cancelled') AS booked
          FROM sessions s WHERE s.event_id = _event_id AND COALESCE(s.max_attendees, 0) > 0) x
    WHERE x.booked > x.max_attendees;

  ELSIF _code = 'staff_with_registration' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', x.full_name, 'role', x.role)), '[]'::JSONB) INTO v_rows
    FROM (SELECT DISTINCT p.full_name, r.role FROM event_registrations er
          JOIN user_roles r ON r.user_id = er.user_id AND (r.event_id = er.event_id OR r.event_id IS NULL)
          LEFT JOIN user_profiles p ON p.id = er.user_id
          WHERE er.event_id = _event_id AND r.role NOT IN ('attendee', 'employer') LIMIT 20) x;

  ELSIF _code = 'missing_gender' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('attendee', x.full_name, 'university', x.university)), '[]'::JSONB) INTO v_rows
    FROM (SELECT p.full_name, er.university FROM event_registrations er
          JOIN user_profiles p ON p.id = er.user_id
          WHERE er.event_id = _event_id AND NULLIF(BTRIM(p.gender), '') IS NULL LIMIT 20) x;

  ELSE
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown check.');
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'rows', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_data_health_fix(_event_id UUID, _code TEXT, _expected_count INT, _reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz      CONSTANT TEXT := 'Africa/Cairo';
  v_start   DATE;
  v_end     DATE;
  v_count   INT;
  v_deleted INT := 0;
  v_table   TEXT;
BEGIN
  PERFORM public._assert_sadmin();

  IF _code NOT IN ('checkins_outside_event', 'orphan_roles') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This check cannot be fixed automatically.');
  END IF;
  IF LENGTH(BTRIM(COALESCE(_reason, ''))) < 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Please give a reason (at least 5 characters).');
  END IF;

  v_count := public.sa_health_count(_event_id, _code);
  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'There is nothing to fix.');
  END IF;
  IF v_count IS DISTINCT FROM _expected_count THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The data changed since you looked. Refresh and try again.');
  END IF;

  IF _code = 'checkins_outside_event' THEN
    SELECT (start_date AT TIME ZONE v_tz)::DATE, (end_date AT TIME ZONE v_tz)::DATE INTO v_start, v_end
    FROM events WHERE id = _event_id;
    DELETE FROM attendee_attendance
    WHERE event_id = _event_id AND check_in_time IS NOT NULL
      AND (check_in_time AT TIME ZONE v_tz)::DATE NOT BETWEEN v_start AND v_end;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_table := 'attendee_attendance';
  ELSE
    DELETE FROM user_roles r
    WHERE (r.event_id = _event_id OR r.event_id IS NULL)
      AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = r.user_id);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_table := 'user_roles';
  END IF;

  PERFORM public.sa_audit_write('data_fix', v_table, jsonb_build_object('check', _code),
    jsonb_build_object('rows_deleted', v_deleted, 'reason', LEFT(BTRIM(_reason), 500)));

  RETURN jsonb_build_object('success', TRUE, 'deleted', v_deleted);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Permissions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_fn TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.sadmin_command_center(UUID)',
    'public.sadmin_list_accounts(UUID, TEXT, TEXT, INT, INT)',
    'public.sadmin_change_role(UUID, UUID, TEXT, TEXT)',
    'public.sadmin_set_account_disabled(UUID, BOOLEAN, TEXT)',
    'public.sadmin_sign_out_user(UUID, TEXT)',
    'public.sadmin_delete_account(UUID, TEXT, TEXT)',
    'public.sadmin_get_audit_log(INT, INT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)',
    'public.sadmin_get_signin_activity(UUID, INT)',
    'public.sadmin_get_event_settings(UUID)',
    'public.sadmin_update_event_settings(UUID, JSONB)',
    'public.sadmin_set_event_controls(JSONB)',
    'public.sadmin_set_maintenance(BOOLEAN, TEXT, TIMESTAMPTZ)',
    'public.sadmin_security_report(UUID)',
    'public.sadmin_data_health(UUID)',
    'public.sadmin_data_health_preview(UUID, TEXT)',
    'public.sadmin_data_health_fix(UUID, TEXT, INT, TEXT)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 10. Final check
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_names TEXT;
BEGIN
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname)
  INTO v_names
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname LIKE 'sadmin\_%'
    AND p.proname NOT IN ('sadmin_verify_secret_key', 'sadmin_set_secret_key',
                          'sadmin_update_user_role', 'sadmin_delete_user', 'sadmin_toggle_maintenance')
    AND POSITION('_assert_sadmin()' IN p.prosrc) = 0;

  IF v_names IS NOT NULL THEN
    RAISE EXCEPTION 'Stopped, nothing was changed. These super admin functions do not call _assert_sadmin(): %', v_names;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
