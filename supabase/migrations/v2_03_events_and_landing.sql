-- ============================================================================
-- v2 step 3 — Events tab: create, edit, switch and delete events; landing page
--             content; volunteer teams; media storage.
--
-- Notes on the v2 schema:
--   * there is no events.is_current column. The active event is
--     system_config → active_event_id, read through get_active_event_id().
--     sadmin_set_current_event writes that key and KEEPS ITS EXISTING SHAPE,
--     whatever get_active_event_id() expects (object or bare string).
--   * v2's get_current_event() is NOT touched. The landing page reads a new
--     function, get_landing_page(), so nothing that calls the old one changes.
--   * super admins are global (user_roles.event_id IS NULL), so there is no
--     per-event copying of super admin access.
--
-- Paste the WHOLE file into Supabase Dashboard → SQL Editor → Run.
-- One transaction: if anything fails, nothing changes. Safe to re-run.
-- Requires v2_01 and v2_02.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Landing page content lives on the event
-- ---------------------------------------------------------------------------
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS landing JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Public: everything the landing page needs about the active event, in one call.
-- Empty landing = the page's built-in text, merged in the browser.
CREATE OR REPLACE FUNCTION public.get_landing_page()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'event_type', e.event_type,
    'status', e.status,
    'start_date', e.start_date,
    'end_date', e.end_date,
    'venue_name', e.venue_name,
    'allow_non_asu_attendees', e.allow_non_asu_attendees,
    'non_asu_ticket_price', e.non_asu_ticket_price,
    'landing', e.landing,
    'teams', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'team_name', t.team_name, 'description', t.description)
             ORDER BY t.team_name)
      FROM volunteer_teams t WHERE t.event_id = e.id), '[]'::JSONB),
    'controls', public.sa_event_controls()
  )
  FROM events e
  WHERE e.id = public.get_active_event_id();
$$;

REVOKE ALL     ON FUNCTION public.get_landing_page() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_landing_page() TO anon, authenticated;

-- Public: partner logos of the active event. In v2 the link between a company and
-- an event is company_event_participation, not a column on companies.
CREATE OR REPLACE FUNCTION public.get_event_partners()
RETURNS TABLE (company_name TEXT, logo_url TEXT, partner_type TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.company_name, c.logo_url, p.partner_type
  FROM company_event_participation p
  JOIN companies c ON c.id = p.company_id
  WHERE p.event_id = public.get_active_event_id()
    AND p.partner_type IS NOT NULL
    AND COALESCE(p.is_active, TRUE)
  ORDER BY c.company_name;
$$;

REVOKE ALL     ON FUNCTION public.get_event_partners() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_event_partners() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Super admin: listing and reading events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_list_events()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active UUID := public.get_active_event_id();
BEGIN
  PERFORM public._assert_sadmin();

  RETURN jsonb_build_object('success', TRUE, 'events', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'id', e.id, 'name', e.name, 'event_type', e.event_type, 'status', e.status,
             'start_date', e.start_date, 'end_date', e.end_date, 'venue_name', e.venue_name,
             'is_current', (e.id = v_active), 'created_at', e.created_at,
             'teams', (SELECT COUNT(*) FROM volunteer_teams t WHERE t.event_id = e.id),
             'attendees', (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id),
             'staff', (SELECT COUNT(*) FROM user_roles r
                       WHERE r.event_id = e.id AND r.role NOT IN ('attendee', 'employer'))
           ) ORDER BY (e.id = v_active) DESC, e.start_date DESC NULLS LAST)
    FROM events e), '[]'::JSONB));
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_get_event(_event_id UUID)
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
      'id', v_event.id, 'name', v_event.name, 'event_type', v_event.event_type, 'status', v_event.status,
      'start_date', v_event.start_date, 'end_date', v_event.end_date, 'venue_name', v_event.venue_name,
      'allow_non_asu_attendees', v_event.allow_non_asu_attendees,
      'non_asu_ticket_price', v_event.non_asu_ticket_price,
      'is_current', (v_event.id = public.get_active_event_id())),
    'landing', v_event.landing,
    'teams', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', t.id, 'team_name', t.team_name, 'description', t.description,
               'points_per_hour', t.points_per_hour,
               'volunteers', (SELECT COUNT(*) FROM volunteers v WHERE v.team_id = t.id)
             ) ORDER BY t.team_name)
      FROM volunteer_teams t WHERE t.event_id = _event_id), '[]'::JSONB)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Creating an event
--    A new event is a draft and is NOT made active: switch to it deliberately.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_create_event(_details JSONB, _copy_from UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id      UUID;
  v_name    TEXT;
  v_type    TEXT;
  v_start   TIMESTAMPTZ;
  v_end     TIMESTAMPTZ;
  v_landing JSONB := '{}'::JSONB;
  v_teams   INT := 0;
  v_points  INT := 0;
BEGIN
  PERFORM public._assert_sadmin();

  IF _details IS NULL OR jsonb_typeof(_details) <> 'object' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Fill in the event details.');
  END IF;

  v_name := NULLIF(BTRIM(_details ->> 'name'), '');
  IF v_name IS NULL OR LENGTH(v_name) > 120 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The event name must be 1 to 120 characters.');
  END IF;
  IF EXISTS (SELECT 1 FROM events WHERE LOWER(name) = LOWER(v_name)) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'An event with this name already exists.');
  END IF;

  v_type := COALESCE(NULLIF(_details ->> 'event_type', ''), 'career_fair');
  IF v_type NOT IN ('career_fair', 'career_week') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Choose Career Expo or Career Week.');
  END IF;

  IF _copy_from IS NOT NULL THEN
    SELECT landing INTO v_landing FROM events WHERE id = _copy_from;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'The event to copy from was not found.');
    END IF;
  END IF;

  BEGIN
    v_start := (_details ->> 'start_date')::TIMESTAMPTZ;
    v_end   := (_details ->> 'end_date')::TIMESTAMPTZ;
    IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'The end date must be after the start date.');
    END IF;

    INSERT INTO events (name, event_type, start_date, end_date, status, venue_name,
                        allow_non_asu_attendees, non_asu_ticket_price, landing)
    VALUES (v_name, v_type, v_start, v_end, 'draft',
            LEFT(NULLIF(BTRIM(_details ->> 'venue_name'), ''), 200),
            COALESCE((_details ->> 'allow_non_asu_attendees')::BOOLEAN, FALSE),
            GREATEST(COALESCE((_details ->> 'non_asu_ticket_price')::INT, 0), 0),
            COALESCE(v_landing, '{}'::JSONB))
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR numeric_value_out_of_range THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'One of the values has the wrong format.');
    WHEN check_violation OR not_null_violation THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'One of the values is not allowed.');
  END;

  IF _copy_from IS NOT NULL THEN
    INSERT INTO volunteer_teams (id, event_id, team_name, description, points_per_hour)
    SELECT gen_random_uuid(), v_id, team_name, description, points_per_hour
    FROM volunteer_teams WHERE event_id = _copy_from;
    GET DIAGNOSTICS v_teams = ROW_COUNT;

    -- points_config differs between deployments; copy it only if it looks the same here.
    IF (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'points_config'
          AND column_name IN ('event_id', 'config_key', 'points')) = 3 THEN
      EXECUTE 'INSERT INTO points_config (event_id, config_key, points)
               SELECT $1, config_key, points FROM points_config WHERE event_id = $2'
      USING v_id, _copy_from;
      GET DIAGNOSTICS v_points = ROW_COUNT;
    END IF;
  END IF;

  PERFORM public.sa_audit_write('event_created', 'events', jsonb_build_object('id', v_id),
    jsonb_build_object('name', v_name, 'event_type', v_type, 'copied_from', _copy_from,
                       'teams', v_teams, 'points_rules', v_points));

  RETURN jsonb_build_object('success', TRUE, 'id', v_id, 'teams', v_teams);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Event settings (same as v2_02, plus the event type)
-- ---------------------------------------------------------------------------
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
      IF v_new.name IS NULL OR LENGTH(v_new.name) > 120 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'The event name must be 1 to 120 characters.');
      END IF;
      IF EXISTS (SELECT 1 FROM events WHERE LOWER(name) = LOWER(v_new.name) AND id <> _event_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'An event with this name already exists.');
      END IF;
    END IF;
    IF _settings ? 'event_type' THEN
      IF _settings ->> 'event_type' NOT IN ('career_fair', 'career_week') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Choose Career Expo or Career Week.');
      END IF;
      v_new.event_type := _settings ->> 'event_type';
    END IF;
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

-- ---------------------------------------------------------------------------
-- 5. Landing page content
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_update_landing(_event_id UUID, _landing JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_sadmin();

  IF _landing IS NULL OR jsonb_typeof(_landing) <> 'object' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Nothing to save.');
  END IF;
  IF LENGTH(_landing::TEXT) > 100000 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The page content is too large.');
  END IF;

  UPDATE events SET landing = _landing, updated_at = NOW() WHERE id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;

  PERFORM public.sa_audit_write('landing_updated', 'events', jsonb_build_object('id', _event_id),
    jsonb_build_object('sections', (SELECT jsonb_agg(k) FROM jsonb_object_keys(_landing) k)));

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Volunteer teams
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_save_team(
  _event_id        UUID,
  _team_id         UUID,
  _team_name       TEXT,
  _description     TEXT,
  _points_per_hour INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := NULLIF(BTRIM(_team_name), '');
  v_id   UUID;
BEGIN
  PERFORM public._assert_sadmin();

  IF v_name IS NULL OR LENGTH(v_name) > 60 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The team name must be 1 to 60 characters.');
  END IF;
  IF _points_per_hour IS NULL OR _points_per_hour < 0 OR _points_per_hour > 1000 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Points per hour must be between 0 and 1000.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = _event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;
  IF EXISTS (SELECT 1 FROM volunteer_teams
             WHERE event_id = _event_id AND LOWER(team_name) = LOWER(v_name) AND id IS DISTINCT FROM _team_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Another team in this event already has this name.');
  END IF;

  IF _team_id IS NULL THEN
    INSERT INTO volunteer_teams (id, event_id, team_name, description, points_per_hour)
    VALUES (gen_random_uuid(), _event_id, v_name, LEFT(NULLIF(BTRIM(_description), ''), 300), _points_per_hour)
    RETURNING id INTO v_id;
  ELSE
    UPDATE volunteer_teams
    SET team_name = v_name, description = LEFT(NULLIF(BTRIM(_description), ''), 300), points_per_hour = _points_per_hour
    WHERE id = _team_id AND event_id = _event_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Team not found.');
    END IF;
  END IF;

  PERFORM public.sa_audit_write(CASE WHEN _team_id IS NULL THEN 'team_created' ELSE 'team_updated' END,
    'volunteer_teams', jsonb_build_object('id', v_id, 'event_id', _event_id),
    jsonb_build_object('team_name', v_name, 'points_per_hour', _points_per_hour));

  RETURN jsonb_build_object('success', TRUE, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_delete_team(_event_id UUID, _team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name    TEXT;
  v_members INT;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT team_name INTO v_name FROM volunteer_teams WHERE id = _team_id AND event_id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Team not found.');
  END IF;

  SELECT COUNT(*) INTO v_members FROM volunteers WHERE team_id = _team_id;
  IF v_members > 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error',
      v_members || ' volunteer(s) are in this team. Move them to another team first.');
  END IF;

  BEGIN
    DELETE FROM volunteer_teams WHERE id = _team_id AND event_id = _event_id;
  EXCEPTION WHEN foreign_key_violation THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This team is still used by other records, so it cannot be deleted.');
  END;

  PERFORM public.sa_audit_write('team_deleted', 'volunteer_teams',
    jsonb_build_object('id', _team_id, 'event_id', _event_id), jsonb_build_object('team_name', v_name));

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Switching the active event
--    The stored shape of system_config.active_event_id is preserved exactly as
--    found, so get_active_event_id() keeps working whatever it expects.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_set_current_event(_event_id UUID, _confirm_name TEXT, _reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name     TEXT;
  v_previous UUID := public.get_active_event_id();
  v_existing JSONB;
  v_value    JSONB;
  v_check    UUID;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT name INTO v_name FROM events WHERE id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;
  IF _event_id = v_previous THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This is already the current event.');
  END IF;
  IF LOWER(BTRIM(COALESCE(_confirm_name, ''))) <> LOWER(BTRIM(COALESCE(v_name, ''))) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The name you typed does not match this event.');
  END IF;
  IF LENGTH(BTRIM(COALESCE(_reason, ''))) < 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Please give a reason (at least 5 characters).');
  END IF;

  SELECT value INTO v_existing FROM system_config WHERE key = 'active_event_id';

  v_value := CASE
    WHEN v_existing IS NULL THEN jsonb_build_object('event_id', _event_id)
    WHEN jsonb_typeof(v_existing) = 'string' THEN to_jsonb(_event_id::TEXT)
    WHEN jsonb_typeof(v_existing) = 'object' AND v_existing ? 'event_id'
      THEN v_existing || jsonb_build_object('event_id', _event_id)
    WHEN jsonb_typeof(v_existing) = 'object' AND v_existing ? 'id'
      THEN v_existing || jsonb_build_object('id', _event_id)
    ELSE jsonb_build_object('event_id', _event_id)
  END;

  INSERT INTO system_config (key, value, updated_at) VALUES ('active_event_id', v_value, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

  -- Refuse the change rather than leave the site pointing nowhere.
  v_check := public.get_active_event_id();
  IF v_check IS DISTINCT FROM _event_id THEN
    RAISE EXCEPTION 'active_event_id was written but get_active_event_id() still returns %', v_check;
  END IF;

  -- A newly activated event starts closed; open it from Event Controls.
  INSERT INTO system_config (key, value, updated_at)
  VALUES ('event_controls', '{"registration_open": false, "booking_open": false, "feedback_open": false}'::JSONB, NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

  PERFORM public.sa_audit_write('current_event_changed', 'events', jsonb_build_object('id', _event_id),
    jsonb_build_object('name', v_name, 'previous_event', v_previous, 'reason', LEFT(BTRIM(_reason), 500)));

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Deleting an event (only an empty one, never the active one)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_delete_event(_event_id UUID, _confirm_name TEXT, _reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name       TEXT;
  v_type       TEXT;
  v_is_current BOOLEAN;
  v_people     INT;
  v_regs       INT;
  v_volunteers INT;
  v_sessions   INT;
  v_bookings   INT;
  v_companies  INT;
  v_employers  INT;
  v_speakers   INT;
  v_checkins   INT;
  v_hours      INT;
  v_scores     INT;
  v_schedule   INT;
  v_maps       INT;
  v_teams      INT;
  v_blocking   TEXT[] := ARRAY[]::TEXT[];
  v_table      TEXT;
  v_state      TEXT;
  v_message    TEXT;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT e.name, e.event_type, (e.id = public.get_active_event_id())
  INTO v_name, v_type, v_is_current
  FROM events e WHERE e.id = _event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;
  IF COALESCE(v_is_current, FALSE) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'This is the current event. Make another event current first.');
  END IF;
  IF LOWER(BTRIM(COALESCE(_confirm_name, ''))) <> LOWER(BTRIM(COALESCE(v_name, ''))) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'The name you typed does not match this event.');
  END IF;
  IF LENGTH(BTRIM(COALESCE(_reason, ''))) < 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Please give a reason (at least 5 characters).');
  END IF;

  -- Super admin rows have no event, so they never block a deletion.
  SELECT COUNT(*) INTO v_people     FROM user_roles WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_regs       FROM event_registrations WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_volunteers FROM volunteers WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_sessions   FROM sessions WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_bookings   FROM session_bookings WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_companies  FROM company_event_participation WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_employers  FROM employers WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_speakers   FROM speakers WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_checkins   FROM attendee_attendance WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_hours      FROM volunteer_attendance WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_scores     FROM event_scores WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_schedule   FROM schedule WHERE event_id = _event_id;
  SELECT COUNT(*) INTO v_maps       FROM event_maps WHERE event_id = _event_id;

  IF v_people     > 0 THEN v_blocking := v_blocking || (v_people     || ' person/people with a role'); END IF;
  IF v_regs       > 0 THEN v_blocking := v_blocking || (v_regs       || ' attendee registration(s)'); END IF;
  IF v_volunteers > 0 THEN v_blocking := v_blocking || (v_volunteers || ' volunteer(s)'); END IF;
  IF v_sessions   > 0 THEN v_blocking := v_blocking || (v_sessions   || ' session(s)'); END IF;
  IF v_bookings   > 0 THEN v_blocking := v_blocking || (v_bookings   || ' session booking(s)'); END IF;
  IF v_companies  > 0 THEN v_blocking := v_blocking || (v_companies  || ' company/companies'); END IF;
  IF v_employers  > 0 THEN v_blocking := v_blocking || (v_employers  || ' employer account(s)'); END IF;
  IF v_speakers   > 0 THEN v_blocking := v_blocking || (v_speakers   || ' speaker(s)'); END IF;
  IF v_checkins   > 0 THEN v_blocking := v_blocking || (v_checkins   || ' attendee check-in(s)'); END IF;
  IF v_hours      > 0 THEN v_blocking := v_blocking || (v_hours      || ' volunteer hour record(s)'); END IF;
  IF v_scores     > 0 THEN v_blocking := v_blocking || (v_scores     || ' score record(s)'); END IF;
  IF v_schedule   > 0 THEN v_blocking := v_blocking || (v_schedule   || ' schedule item(s)'); END IF;
  IF v_maps       > 0 THEN v_blocking := v_blocking || (v_maps       || ' map(s)'); END IF;

  IF array_length(v_blocking, 1) > 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error',
      'Only an empty event can be deleted. This one still has: ' || array_to_string(v_blocking, ', ') || '.');
  END IF;

  SELECT COUNT(*) INTO v_teams FROM volunteer_teams WHERE event_id = _event_id;

  -- Record what is being removed before it is gone.
  PERFORM public.sa_audit_write('event_deleted', 'events', jsonb_build_object('id', _event_id),
    jsonb_build_object('name', v_name, 'event_type', v_type,
                       'teams_removed', v_teams, 'reason', LEFT(BTRIM(_reason), 500)));

  -- Remove every row that points at this event, whichever table it is in.
  FOR v_table IN
    SELECT c.relname
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE a.attname = 'event_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND c.relkind = 'r'
      AND c.relnamespace = 'public'::regnamespace
    ORDER BY CASE c.relname
               WHEN 'user_activities'    THEN 1
               WHEN 'notifications'      THEN 2
               WHEN 'session_bookings'   THEN 3
               WHEN 'sessions'           THEN 4
               WHEN 'volunteers'         THEN 5
               WHEN 'points_config'      THEN 6
               WHEN 'volunteer_teams'    THEN 7
               WHEN 'user_roles'         THEN 8
               ELSE 0
             END
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE event_id = $1', v_table) USING _event_id;
  END LOOP;

  DELETE FROM events WHERE id = _event_id;

  RETURN jsonb_build_object('success', TRUE, 'teams_removed', v_teams);

EXCEPTION
  WHEN OTHERS THEN
    -- The work above is rolled back; this note is kept so a super admin can see the
    -- cause in Activity without technical details reaching the screen.
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    PERFORM public.sa_audit_write('event_delete_failed', 'events', jsonb_build_object('id', _event_id),
      jsonb_build_object('sqlstate', v_state, 'message', LEFT(v_message, 500),
                         'reason', LEFT(BTRIM(COALESCE(_reason, '')), 500)));
    RETURN jsonb_build_object('success', FALSE, 'error',
      CASE
        WHEN v_state = '23503' THEN 'Something else in the system still points at this event, so it cannot be deleted. The details were saved in Activity.'
        WHEN v_state = '42501' THEN 'The database refused this deletion. The details were saved in Activity.'
        ELSE 'The event could not be deleted. The details were saved in Activity (Change log).'
      END);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Storage for landing page images and videos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media',
  'event-media',
  TRUE,
  52428800,
  -- No SVG on purpose: SVG files can contain scripts.
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "event media are public" ON storage.objects;
CREATE POLICY "event media are public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'event-media');

-- Only super admins can change them. In v2 a super admin row has event_id IS NULL.
DROP POLICY IF EXISTS "event media upload by super admins" ON storage.objects;
CREATE POLICY "event media upload by super admins"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-media' AND public.is_sadmin());

DROP POLICY IF EXISTS "event media update by super admins" ON storage.objects;
CREATE POLICY "event media update by super admins"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-media' AND public.is_sadmin())
  WITH CHECK (bucket_id = 'event-media' AND public.is_sadmin());

DROP POLICY IF EXISTS "event media delete by super admins" ON storage.objects;
CREATE POLICY "event media delete by super admins"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-media' AND public.is_sadmin());

-- ---------------------------------------------------------------------------
-- 10. Permissions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_fn TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.sadmin_list_events()',
    'public.sadmin_get_event(UUID)',
    'public.sadmin_create_event(JSONB, UUID)',
    'public.sadmin_update_event_settings(UUID, JSONB)',
    'public.sadmin_update_landing(UUID, JSONB)',
    'public.sadmin_save_team(UUID, UUID, TEXT, TEXT, INT)',
    'public.sadmin_delete_team(UUID, UUID)',
    'public.sadmin_set_current_event(UUID, TEXT, TEXT)',
    'public.sadmin_delete_event(UUID, TEXT, TEXT)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 11. Final check
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
