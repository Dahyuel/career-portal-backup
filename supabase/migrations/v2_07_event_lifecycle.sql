-- ============================================================================
-- v2 step 7 — Event lifecycle: lock finished events, per-event activity log,
--             richer cloning, and full event deletion.
--
--   1. A completed or cancelled event stops accepting writes, so late or
--      accidental check-ins can no longer change finished statistics.
--   2. sadmin_audit_log gains event_id, so Activity can be read per event
--      or across all of them.
--   3. Creating an event can copy sessions, schedule and company
--      participation as well as teams, points and the landing page.
--   4. An event can be deleted together with everything in it (typed
--      confirmation), instead of only when empty.
--
-- Paste the WHOLE file into Supabase Dashboard → SQL Editor → Run.
-- One transaction. Safe to re-run. Requires v2_01 … v2_06.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Finished events are read-only
-- ---------------------------------------------------------------------------
/** A finished event keeps its data exactly as it was. */
CREATE OR REPLACE FUNCTION public.event_is_locked(_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE id = _event_id AND status IN ('completed', 'cancelled')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.event_is_locked(UUID) FROM PUBLIC, anon, authenticated;

/**
 * Refuses writes that belong to a finished event. Super admins stay able to
 * correct data, so a mistake can still be fixed after the event closes.
 */
CREATE OR REPLACE FUNCTION public.enforce_event_not_locked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID := COALESCE(NEW.event_id, OLD.event_id);
BEGIN
  IF v_event_id IS NOT NULL
     AND public.event_is_locked(v_event_id)
     AND NOT public.is_sadmin() THEN
    RAISE EXCEPTION 'This event is closed, so its records can no longer be changed.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'event_registrations', 'attendee_attendance', 'session_bookings',
    'volunteer_attendance', 'event_scores'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = v_table AND relnamespace = 'public'::regnamespace) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS enforce_event_not_locked ON public.%I', v_table);
      EXECUTE format(
        'CREATE TRIGGER enforce_event_not_locked
           BEFORE INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.enforce_event_not_locked()', v_table);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. The activity log remembers which event a change belonged to
-- ---------------------------------------------------------------------------
ALTER TABLE public.sadmin_audit_log ADD COLUMN IF NOT EXISTS event_id UUID;

CREATE INDEX IF NOT EXISTS sadmin_audit_log_event_idx ON public.sadmin_audit_log (event_id, created_at DESC);

-- Fill in what can be recovered from what was already recorded.
UPDATE public.sadmin_audit_log l
SET event_id = COALESCE(
      NULLIF(l.target_key ->> 'event_id', '')::UUID,
      CASE WHEN l.target_table = 'events' THEN NULLIF(l.target_key ->> 'id', '')::UUID END)
WHERE l.event_id IS NULL
  AND (NULLIF(l.target_key ->> 'event_id', '') IS NOT NULL
       OR (l.target_table = 'events' AND NULLIF(l.target_key ->> 'id', '') IS NOT NULL));

/**
 * Records one privileged change. The event is taken from the target when it
 * says which event it belongs to, so nothing else has to pass it in.
 */
CREATE OR REPLACE FUNCTION public.sa_audit_write(p_action TEXT, p_table TEXT, p_key JSONB, p_details JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  BEGIN
    v_event_id := COALESCE(
      NULLIF(p_key ->> 'event_id', '')::UUID,
      CASE WHEN p_table = 'events' THEN NULLIF(p_key ->> 'id', '')::UUID END);
  EXCEPTION WHEN invalid_text_representation THEN
    v_event_id := NULL;
  END;

  INSERT INTO public.sadmin_audit_log (actor_id, actor_email, action, target_table, target_key, details, event_id)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          p_action, p_table, p_key, p_details, v_event_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sa_audit_write(TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;

/** Activity, optionally narrowed to one event. _event_id NULL = every event. */
CREATE OR REPLACE FUNCTION public.sadmin_get_audit_log(
  _limit    INT         DEFAULT 50,
  _offset   INT         DEFAULT 0,
  _action   TEXT        DEFAULT NULL,
  _search   TEXT        DEFAULT NULL,
  _from     TIMESTAMPTZ DEFAULT NULL,
  _to       TIMESTAMPTZ DEFAULT NULL,
  _event_id UUID        DEFAULT NULL
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
      AND (_event_id IS NULL OR l.event_id = _event_id)
      AND (v_pattern IS NULL OR l.actor_email ILIKE v_pattern OR l.target_table ILIKE v_pattern
           OR l.target_key::TEXT ILIKE v_pattern OR l.details::TEXT ILIKE v_pattern)
  )
  SELECT (SELECT COUNT(*) FROM filtered),
         (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC), '[]'::JSONB)
          FROM (SELECT id, created_at, actor_email, action, target_table, target_key, details, event_id
                FROM filtered ORDER BY created_at DESC LIMIT v_limit OFFSET v_offset) p)
  INTO v_total, v_rows;

  RETURN jsonb_build_object(
    'success', TRUE, 'data', v_rows, 'total', v_total,
    'actions', (SELECT COALESCE(jsonb_agg(DISTINCT action), '[]'::JSONB) FROM sadmin_audit_log)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sadmin_get_audit_log(INT, INT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sadmin_get_audit_log(INT, INT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;

-- The old 6-argument version would still match calls that omit the event.
DROP FUNCTION IF EXISTS public.sadmin_get_audit_log(INT, INT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

-- ---------------------------------------------------------------------------
-- 3. Creating an event copies more of the previous one
--
--    Columns are discovered at run time, so a table with different columns in
--    another deployment still copies correctly and never lists a column twice.
-- ---------------------------------------------------------------------------
/** Copies every row of one table from one event to another, minus the identity columns. */
CREATE OR REPLACE FUNCTION public.sa_clone_event_table(_table TEXT, _from UUID, _to UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cols TEXT;
  v_n    INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = _table AND relnamespace = 'public'::regnamespace) THEN
    RETURN 0;
  END IF;

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = _table
    AND column_name NOT IN ('id', 'event_id', 'created_at', 'updated_at');

  IF v_cols IS NULL THEN
    RETURN 0;
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I (event_id, %s) SELECT $2, %s FROM public.%I WHERE event_id = $1',
    _table, v_cols, v_cols, _table)
  USING _from, _to;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sa_clone_event_table(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;

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
  v_copied  JSONB := '{}'::JSONB;
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
    -- Teams keep fresh ids because volunteers point at them.
    INSERT INTO volunteer_teams (id, event_id, team_name, description, points_per_hour)
    SELECT gen_random_uuid(), v_id, team_name, description, points_per_hour
    FROM volunteer_teams WHERE event_id = _copy_from;
    GET DIAGNOSTICS v_teams = ROW_COUNT;

    v_points := public.sa_clone_event_table('points_config', _copy_from, v_id);

    -- People, registrations and bookings are never copied — only the set-up.
    v_copied := jsonb_build_object(
      'teams',        v_teams,
      'points_rules', v_points,
      'sessions',     public.sa_clone_event_table('sessions', _copy_from, v_id),
      'schedule',     public.sa_clone_event_table('schedule', _copy_from, v_id),
      'companies',    public.sa_clone_event_table('company_event_participation', _copy_from, v_id),
      'maps',         public.sa_clone_event_table('event_maps', _copy_from, v_id)
    );
  END IF;

  PERFORM public.sa_audit_write('event_created', 'events', jsonb_build_object('id', v_id),
    jsonb_build_object('name', v_name, 'event_type', v_type, 'copied_from', _copy_from, 'copied', v_copied));

  RETURN jsonb_build_object('success', TRUE, 'id', v_id, 'teams', v_teams, 'copied', v_copied);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sadmin_create_event(JSONB, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sadmin_create_event(JSONB, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Deleting an event, optionally with everything inside it
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_delete_event(
  _event_id     UUID,
  _confirm_name TEXT,
  _reason       TEXT,
  _with_data    BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name       TEXT;
  v_type       TEXT;
  v_is_current BOOLEAN;
  v_counts     JSONB := '{}'::JSONB;
  v_total      INT := 0;
  v_blocking   TEXT[] := ARRAY[]::TEXT[];
  v_table      TEXT;
  v_n          INT;
  v_removed    JSONB := '{}'::JSONB;
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

  -- Count what is inside, whichever tables carry an event_id.
  FOR v_table IN
    SELECT c.relname
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE a.attname = 'event_id' AND a.attnum > 0 AND NOT a.attisdropped
      AND c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
      AND c.relname <> 'sadmin_audit_log'
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE event_id = $1', v_table) INTO v_n USING _event_id;
    IF v_n > 0 THEN
      v_counts := v_counts || jsonb_build_object(v_table, v_n);
      v_total := v_total + v_n;
      v_blocking := v_blocking || (v_n || ' in ' || replace(v_table, '_', ' '));
    END IF;
  END LOOP;

  IF v_total > 0 AND NOT COALESCE(_with_data, FALSE) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'This event still has records: ' || array_to_string(v_blocking, ', ') ||
               '. Choose "delete everything" to remove them as well.',
      'counts', v_counts);
  END IF;

  PERFORM public.sa_audit_write('event_deleted', 'events', jsonb_build_object('id', _event_id),
    jsonb_build_object('name', v_name, 'event_type', v_type, 'with_data', COALESCE(_with_data, FALSE),
                       'removed', v_counts, 'reason', LEFT(BTRIM(_reason), 500)));

  -- Children first, in an order that respects the obvious dependencies.
  FOR v_table IN
    SELECT c.relname
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE a.attname = 'event_id' AND a.attnum > 0 AND NOT a.attisdropped
      AND c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
      AND c.relname <> 'sadmin_audit_log'
    ORDER BY CASE c.relname
               WHEN 'user_activities'    THEN 1
               WHEN 'notifications'      THEN 2
               WHEN 'job_applications'   THEN 3
               WHEN 'job_positions'      THEN 4
               WHEN 'feedback_answers'   THEN 5
               WHEN 'feedback_submissions' THEN 6
               WHEN 'feedback_questions' THEN 7
               WHEN 'session_bookings'   THEN 8
               WHEN 'sessions'           THEN 9
               WHEN 'volunteer_attendance' THEN 10
               WHEN 'volunteers'         THEN 11
               WHEN 'points_config'      THEN 12
               WHEN 'volunteer_teams'    THEN 13
               WHEN 'user_roles'         THEN 14
               ELSE 0
             END
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE event_id = $1', v_table) USING _event_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      v_removed := v_removed || jsonb_build_object(v_table, v_n);
    END IF;
  END LOOP;

  DELETE FROM events WHERE id = _event_id;

  RETURN jsonb_build_object('success', TRUE, 'removed', v_removed);

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
    PERFORM public.sa_audit_write('event_delete_failed', 'events', jsonb_build_object('id', _event_id),
      jsonb_build_object('sqlstate', v_state, 'message', LEFT(v_message, 500),
                         'reason', LEFT(BTRIM(COALESCE(_reason, '')), 500)));
    RETURN jsonb_build_object('success', FALSE, 'error',
      CASE
        WHEN v_state = '23503' THEN 'Something else still points at this event, so it cannot be deleted. The details were saved in Activity.'
        WHEN v_state = '42501' THEN 'The database refused this deletion. The details were saved in Activity.'
        ELSE 'The event could not be deleted. The details were saved in Activity (Change log).'
      END);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sadmin_delete_event(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sadmin_delete_event(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- The old 3-argument version would still match calls that omit the new flag.
DROP FUNCTION IF EXISTS public.sadmin_delete_event(UUID, TEXT, TEXT);

-- ---------------------------------------------------------------------------
-- 5. Final check
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
