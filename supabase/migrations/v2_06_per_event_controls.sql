-- ============================================================================
-- v2 step 6 — Per-event controls (before and after publishing)
--
-- Until now registration / booking / feedback were ONE global switchboard in
-- system_config, so closing registration closed it for every live event. Now
-- that several events can be published at once, each event carries its own.
--
--   events.controls = {
--     "registration": { "open": true,  "opens_at": null, "closes_at": null },
--     "booking":      { "open": true,  "opens_at": null, "closes_at": null },
--     "feedback":     { "open": false, "opens_at": null, "closes_at": null }
--   }
--
-- "open" is the manual switch. opens_at / closes_at are optional times: when
-- set, the control is only open inside that window. Both work together, so a
-- switch can be left on and still open on schedule. No cron job is needed —
-- the window is evaluated whenever the control is read.
--
-- Maintenance stays global: it freezes the whole site, not one event.
--
-- Paste the WHOLE file into Supabase Dashboard → SQL Editor → Run.
-- One transaction. Safe to re-run. Requires v2_02 and v2_05.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The column, seeded from the old global settings so nothing changes today
-- ---------------------------------------------------------------------------
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS controls JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$
DECLARE
  v_global JSONB := COALESCE((SELECT value FROM system_config WHERE key = 'event_controls'), '{}'::JSONB);
  v_seed   JSONB;
BEGIN
  v_seed := jsonb_build_object(
    'registration', jsonb_build_object('open', COALESCE((v_global ->> 'registration_open')::BOOLEAN, TRUE), 'opens_at', NULL, 'closes_at', NULL),
    'booking',      jsonb_build_object('open', COALESCE((v_global ->> 'booking_open')::BOOLEAN, TRUE),      'opens_at', NULL, 'closes_at', NULL),
    'feedback',     jsonb_build_object('open', COALESCE((v_global ->> 'feedback_open')::BOOLEAN, TRUE),     'opens_at', NULL, 'closes_at', NULL)
  );

  UPDATE events SET controls = v_seed WHERE controls = '{}'::JSONB OR controls IS NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Reading a control
-- ---------------------------------------------------------------------------
/** One control of one event, with every key present. */
CREATE OR REPLACE FUNCTION public.event_control(_event_id UUID, _name TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'open',      COALESCE((c ->> 'open')::BOOLEAN, TRUE),
    'opens_at',  NULLIF(c ->> 'opens_at', ''),
    'closes_at', NULLIF(c ->> 'closes_at', '')
  )
  FROM (SELECT (e.controls -> _name) AS c FROM events e WHERE e.id = _event_id) x;
$$;

/** Is this control open right now: the switch AND the optional time window. */
CREATE OR REPLACE FUNCTION public.event_control_open(_event_id UUID, _name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((c ->> 'open')::BOOLEAN, TRUE)
     AND (NULLIF(c ->> 'opens_at', '')  IS NULL OR (c ->> 'opens_at')::TIMESTAMPTZ  <= NOW())
     AND (NULLIF(c ->> 'closes_at', '') IS NULL OR (c ->> 'closes_at')::TIMESTAMPTZ >  NOW())
  FROM (SELECT public.event_control(_event_id, _name) AS c) x;
$$;

/** All three controls of one event, in the shape the dashboard expects. */
CREATE OR REPLACE FUNCTION public.sa_event_controls(_event_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'registration_open', public.event_control_open(_event_id, 'registration'),
    'booking_open',      public.event_control_open(_event_id, 'booking'),
    'feedback_open',     public.event_control_open(_event_id, 'feedback'),
    'registration',      public.event_control(_event_id, 'registration'),
    'booking',           public.event_control(_event_id, 'booking'),
    'feedback',          public.event_control(_event_id, 'feedback')
  );
$$;

-- The no-argument version now means "the active event", so every existing
-- caller (landing page, feedback, command centre) becomes per-event for free.
CREATE OR REPLACE FUNCTION public.sa_event_controls()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sa_event_controls(public.get_active_event_id());
$$;

CREATE OR REPLACE FUNCTION public.app_control_enabled(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.event_control_open(public.get_active_event_id(), p_name);
$$;

REVOKE EXECUTE ON FUNCTION public.event_control(UUID, TEXT)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.event_control_open(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sa_event_controls(UUID)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sa_event_controls()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.app_control_enabled(TEXT)      FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Enforcement now follows the row's own event
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_registration_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.event_control_open(NEW.event_id, 'registration')
     AND NOT public.is_sadmin()
     AND NOT public.is_admin(NEW.event_id) THEN
    RAISE EXCEPTION 'Registration is currently closed for this event.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_booking_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status IS DISTINCT FROM 'cancelled'
     AND (TG_OP = 'INSERT' OR OLD.booking_status = 'cancelled')
     AND NOT public.event_control_open(NEW.event_id, 'booking')
     AND NOT EXISTS (
       SELECT 1 FROM user_roles
       WHERE user_id = auth.uid() AND role NOT IN ('attendee', 'employer')
     ) THEN
    RAISE EXCEPTION 'Session booking is currently closed for this event.';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Feedback follows the event it belongs to
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_is_open(_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.event_control_open(_event_id, 'feedback');
$$;

REVOKE EXECUTE ON FUNCTION public.fb_is_open(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_feedback_questions(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'open', public.fb_is_open(p_event_id),
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', q.id,
               'question_text', q.question_text,
               'question_type', q.question_type,
               'display_order', q.display_order,
               'is_required', q.is_required,
               'is_active', q.is_active
             ) ORDER BY q.display_order, q.created_at)
      FROM feedback_questions q
      WHERE q.event_id = p_event_id AND q.is_active), '[]'::JSONB)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_feedback(p_event_id UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_sub_id UUID;
  v_saved  INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;
  IF NOT public.fb_is_open(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Feedback is closed');
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' OR jsonb_array_length(p_answers) = 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'No answers provided');
  END IF;
  IF EXISTS (SELECT 1 FROM feedback_submissions WHERE event_id = p_event_id AND user_id = v_user) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Already submitted');
  END IF;

  INSERT INTO feedback_submissions (event_id, user_id, respondent_role)
  VALUES (p_event_id, v_user, public.fb_respondent_role(p_event_id, v_user))
  RETURNING id INTO v_sub_id;

  INSERT INTO feedback_answers (submission_id, question_id, answer_text, rating)
  SELECT v_sub_id,
         q.id,
         CASE WHEN q.question_type = 'text'
              THEN NULLIF(BTRIM(LEFT(a ->> 'answer_text', 2000)), '') END,
         CASE WHEN q.question_type = 'rating'
              THEN NULLIF(a ->> 'rating', '')::INT END
  FROM jsonb_array_elements(p_answers) a
  JOIN feedback_questions q
    ON q.id = NULLIF(a ->> 'question_id', '')::UUID
   AND q.event_id = p_event_id
   AND q.is_active
  WHERE (q.question_type = 'text'   AND NULLIF(BTRIM(COALESCE(a ->> 'answer_text', '')), '') IS NOT NULL)
     OR (q.question_type = 'rating' AND NULLIF(a ->> 'rating', '') IS NOT NULL)
  ON CONFLICT (submission_id, question_id) DO NOTHING;

  GET DIAGNOSTICS v_saved = ROW_COUNT;

  IF v_saved = 0 THEN
    DELETE FROM feedback_submissions WHERE id = v_sub_id;
    RETURN jsonb_build_object('success', FALSE, 'error', 'No valid answers provided');
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'submission_id', v_sub_id, 'answers_saved', v_saved);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Already submitted');
  WHEN invalid_text_representation OR numeric_value_out_of_range OR check_violation THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'No valid answers provided');
  WHEN OTHERS THEN
    RAISE LOG 'submit_feedback: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'error', 'Could not save your feedback');
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Super admin: set one event's controls (switch and/or schedule)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sadmin_set_event_controls(JSONB);

CREATE OR REPLACE FUNCTION public.sadmin_set_event_controls(_event_id UUID, _controls JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name    TEXT;
  v_patch   JSONB;
  v_current JSONB;
  v_next    JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  IF _controls IS NULL OR jsonb_typeof(_controls) <> 'object' OR _controls = '{}'::JSONB THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Nothing to change.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = _event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;

  SELECT COALESCE(controls, '{}'::JSONB) INTO v_next FROM events WHERE id = _event_id FOR UPDATE;

  FOR v_name IN SELECT jsonb_object_keys(_controls) LOOP
    IF v_name NOT IN ('registration', 'booking', 'feedback') THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown setting.');
    END IF;

    v_patch   := _controls -> v_name;
    v_current := COALESCE(v_next -> v_name, jsonb_build_object('open', TRUE, 'opens_at', NULL, 'closes_at', NULL));

    IF jsonb_typeof(v_patch) <> 'object' THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown setting.');
    END IF;
    IF v_patch ? 'open' AND jsonb_typeof(v_patch -> 'open') <> 'boolean' THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown setting.');
    END IF;

    BEGIN
      IF NULLIF(v_patch ->> 'opens_at', '') IS NOT NULL THEN
        PERFORM (v_patch ->> 'opens_at')::TIMESTAMPTZ;
      END IF;
      IF NULLIF(v_patch ->> 'closes_at', '') IS NOT NULL THEN
        PERFORM (v_patch ->> 'closes_at')::TIMESTAMPTZ;
      END IF;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'One of the times has the wrong format.');
    END;

    IF NULLIF(v_patch ->> 'opens_at', '') IS NOT NULL
       AND NULLIF(v_patch ->> 'closes_at', '') IS NOT NULL
       AND (v_patch ->> 'closes_at')::TIMESTAMPTZ <= (v_patch ->> 'opens_at')::TIMESTAMPTZ THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'The closing time must be after the opening time.');
    END IF;

    v_next := jsonb_set(v_next, ARRAY[v_name], v_current || v_patch, TRUE);
  END LOOP;

  UPDATE events SET controls = v_next, updated_at = NOW() WHERE id = _event_id;

  PERFORM public.sa_audit_write('event_controls_updated', 'events',
    jsonb_build_object('id', _event_id), jsonb_build_object('changes', _controls));

  RETURN jsonb_build_object('success', TRUE, 'controls', public.sa_event_controls(_event_id));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sadmin_set_event_controls(UUID, JSONB) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sadmin_set_event_controls(UUID, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Settings panel reads that event's own controls
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
    'controls', public.sa_event_controls(_event_id),
    'maintenance', public.sa_maintenance_state()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6b. The command centre must report the controls of the event being viewed,
--     not the active one. Its body is long, so rewrite just that one line in
--     place (signature-agnostic, like the v2_01 clean-up).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_oid OID;
  v_def TEXT;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname = 'sadmin_command_center'
  LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE NOTICE 'sadmin_command_center not installed yet — skipped.';
    RETURN;
  END IF;

  v_def := pg_get_functiondef(v_oid);

  IF POSITION('sa_event_controls(_event_id)' IN v_def) > 0 THEN
    RAISE NOTICE 'sadmin_command_center already per-event — skipped.';
    RETURN;
  END IF;

  v_def := replace(v_def, 'public.sa_event_controls()', 'public.sa_event_controls(_event_id)');

  IF POSITION('sa_event_controls(_event_id)' IN v_def) = 0 THEN
    RAISE EXCEPTION 'Stopped: could not point sadmin_command_center at its own event.';
  END IF;

  EXECUTE v_def;
  RAISE NOTICE 'sadmin_command_center now reports the controls of the event it is given.';
END $$;

-- ---------------------------------------------------------------------------
-- 7. Readiness: what is still missing before an event can go live
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_event_readiness(_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event  events%ROWTYPE;
  v_checks JSONB := '[]'::JSONB;
  v_add    JSONB;
BEGIN
  PERFORM public._assert_sadmin();

  SELECT * INTO v_event FROM events WHERE id = _event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found.');
  END IF;

  v_add := jsonb_build_array(
    jsonb_build_object('code', 'dates', 'label', 'Start and end dates',
      'ok', v_event.start_date IS NOT NULL AND v_event.end_date IS NOT NULL AND v_event.end_date > v_event.start_date,
      'hint', 'Set in Details.'),
    jsonb_build_object('code', 'venue', 'label', 'Venue',
      'ok', NULLIF(BTRIM(COALESCE(v_event.venue_name, '')), '') IS NOT NULL,
      'hint', 'Shown on the landing page and tickets.'),
    jsonb_build_object('code', 'landing', 'label', 'Landing page edited',
      'ok', COALESCE(v_event.landing, '{}'::JSONB) <> '{}'::JSONB,
      'hint', 'Otherwise the built-in default text is shown.'),
    jsonb_build_object('code', 'teams', 'label', 'Volunteer teams',
      'ok', EXISTS (SELECT 1 FROM volunteer_teams WHERE event_id = _event_id),
      'hint', 'Volunteers cannot register without teams.'),
    jsonb_build_object('code', 'ticket', 'label', 'Non-ASU ticket price',
      'ok', NOT v_event.allow_non_asu_attendees OR COALESCE(v_event.non_asu_ticket_price, 0) > 0,
      'hint', 'Non-ASU attendees are allowed, so set a price.'),
    jsonb_build_object('code', 'sessions', 'label', 'Sessions',
      'ok', EXISTS (SELECT 1 FROM sessions WHERE event_id = _event_id),
      'hint', 'Optional, but session booking needs them.')
  );

  v_checks := v_add;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', v_event.status,
    'is_live', v_event.status IN ('published', 'active', 'open'),
    'is_current', (v_event.id = public.get_active_event_id()),
    'checks', v_checks,
    'ready', NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_checks) c
      WHERE (c ->> 'ok')::BOOLEAN IS NOT TRUE AND c ->> 'code' <> 'sessions'
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sadmin_event_readiness(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sadmin_event_readiness(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Final check
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
