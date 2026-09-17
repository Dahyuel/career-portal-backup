-- ============================================================================
-- v2 step 5 — Event feedback
--
-- Three tables and the ten functions the app already expects. The career-portal
-- project has no feedback migration file (its functions live only in that
-- database), so this is written fresh for v2 against the exact contract the
-- frontend uses: argument names, the { success, error, ... } envelope, and the
-- error strings the UI maps to friendly messages.
--
--   feedback_questions   — authored by admins, per event, ordered, show/hide
--   feedback_submissions — one per person per event
--   feedback_answers     — one row per answered question
--
-- Nothing is reachable directly: RLS is on with no policies, table rights are
-- revoked, and every read or write goes through these SECURITY DEFINER
-- functions. Feedback closes with the super admin switch (event_controls).
--
-- Paste the WHOLE file into Supabase Dashboard → SQL Editor → Run.
-- One transaction. Safe to re-run. Requires v2_02 (sa_event_controls).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'rating')),
  display_order INT  NOT NULL DEFAULT 0,
  is_required   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  respondent_role TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feedback_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES public.feedback_questions(id) ON DELETE CASCADE,
  answer_text   TEXT,
  rating        INT CHECK (rating BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS feedback_questions_event_idx   ON public.feedback_questions (event_id, display_order);
CREATE INDEX IF NOT EXISTS feedback_submissions_event_idx ON public.feedback_submissions (event_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS feedback_answers_question_idx  ON public.feedback_answers (question_id);

-- Everything goes through the functions below.
ALTER TABLE public.feedback_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.feedback_questions   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.feedback_submissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.feedback_answers     FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Internal helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fb_is_admin(_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_sadmin()
    OR EXISTS (SELECT 1 FROM user_roles
               WHERE user_id = auth.uid() AND event_id = _event_id AND role = 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.fb_is_open()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.sa_event_controls() ->> 'feedback_open')::BOOLEAN, TRUE);
$$;

/** The role this person answers as: their event role, or 'attendee' as a fallback. */
CREATE OR REPLACE FUNCTION public.fb_respondent_role(_event_id UUID, _user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles
     WHERE user_id = _user_id AND event_id = _event_id
     ORDER BY CASE role WHEN 'attendee' THEN 2 ELSE 1 END
     LIMIT 1),
    'attendee');
$$;

REVOKE EXECUTE ON FUNCTION public.fb_is_admin(UUID)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fb_is_open()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fb_respondent_role(UUID, UUID)  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Respondents
-- ---------------------------------------------------------------------------
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
    'open', public.fb_is_open(),
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

CREATE OR REPLACE FUNCTION public.get_my_feedback(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub feedback_submissions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_sub FROM feedback_submissions
  WHERE event_id = p_event_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', TRUE, 'submitted', FALSE, 'answers', '[]'::JSONB);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'submitted', TRUE,
    'submitted_at', v_sub.submitted_at,
    'updated_at', v_sub.updated_at,
    'answers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'question_id', a.question_id,
               'answer_text', a.answer_text,
               'rating', a.rating
             ) ORDER BY q.display_order)
      FROM feedback_answers a
      JOIN feedback_questions q ON q.id = a.question_id
      WHERE a.submission_id = v_sub.id), '[]'::JSONB)
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
  v_user    UUID := auth.uid();
  v_sub_id  UUID;
  v_saved   INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;
  IF NOT public.fb_is_open() THEN
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

  -- Only answers to this event's active questions are kept.
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
    -- Nothing usable came through: undo the empty submission so they can try again.
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
-- 4. Admin: questions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_feedback_questions(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fb_is_admin(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', q.id,
               'question_text', q.question_text,
               'question_type', q.question_type,
               'display_order', q.display_order,
               'is_required', q.is_required,
               'is_active', q.is_active,
               'created_at', q.created_at,
               'answer_count', (SELECT COUNT(*) FROM feedback_answers a WHERE a.question_id = q.id)
             ) ORDER BY q.display_order, q.created_at)
      FROM feedback_questions q
      WHERE q.event_id = p_event_id), '[]'::JSONB)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_feedback_question(
  p_event_id      UUID,
  p_question_text TEXT,
  p_question_type TEXT,
  p_question_id   UUID    DEFAULT NULL,
  p_is_required   BOOLEAN DEFAULT FALSE,
  p_is_active     BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_text     TEXT := NULLIF(BTRIM(LEFT(COALESCE(p_question_text, ''), 500)), '');
  v_id       UUID;
  v_old_type TEXT;
BEGIN
  IF NOT public.fb_is_admin(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;
  IF v_text IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Question text is required');
  END IF;
  IF p_question_type NOT IN ('text', 'rating') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid question type');
  END IF;

  IF p_question_id IS NULL THEN
    INSERT INTO feedback_questions (event_id, question_text, question_type, display_order, is_required, is_active)
    VALUES (p_event_id, v_text, p_question_type,
            COALESCE((SELECT MAX(display_order) + 1 FROM feedback_questions WHERE event_id = p_event_id), 0),
            COALESCE(p_is_required, FALSE), COALESCE(p_is_active, FALSE))
    RETURNING id INTO v_id;
  ELSE
    SELECT question_type INTO v_old_type FROM feedback_questions
    WHERE id = p_question_id AND event_id = p_event_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Question not found');
    END IF;

    UPDATE feedback_questions
    SET question_text = v_text,
        question_type = p_question_type,
        is_required   = COALESCE(p_is_required, FALSE),
        is_active     = COALESCE(p_is_active, FALSE),
        updated_at    = NOW()
    WHERE id = p_question_id AND event_id = p_event_id
    RETURNING id INTO v_id;

    -- Answers of the old type no longer make sense (the UI warns about this).
    IF v_old_type IS DISTINCT FROM p_question_type THEN
      DELETE FROM feedback_answers WHERE question_id = v_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'question_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_feedback_question(p_event_id UUID, p_question_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fb_is_admin(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  DELETE FROM feedback_questions WHERE id = p_question_id AND event_id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Question not found');
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_feedback_questions(p_event_id UUID, p_question_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fb_is_admin(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;
  IF p_question_ids IS NULL OR array_length(p_question_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Question not found');
  END IF;

  UPDATE feedback_questions q
  SET display_order = x.ord - 1, updated_at = NOW()
  FROM unnest(p_question_ids) WITH ORDINALITY AS x(id, ord)
  WHERE q.id = x.id AND q.event_id = p_event_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_all_feedback_questions_visibility(p_event_id UUID, p_is_active BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF NOT public.fb_is_admin(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;
  IF p_is_active IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid visibility');
  END IF;

  UPDATE feedback_questions SET is_active = p_is_active, updated_at = NOW()
  WHERE event_id = p_event_id AND is_active IS DISTINCT FROM p_is_active;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('success', TRUE, 'updated', v_updated);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Admin: submissions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_feedback_submissions(
  p_event_id UUID,
  p_limit    INT  DEFAULT 20,
  p_offset   INT  DEFAULT 0,
  p_search   TEXT DEFAULT NULL,
  p_role     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit   INT  := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset  INT  := GREATEST(COALESCE(p_offset, 0), 0);
  v_search  TEXT := NULLIF(BTRIM(COALESCE(p_search, '')), '');
  v_role    TEXT := NULLIF(BTRIM(COALESCE(p_role, '')), '');
  v_pattern TEXT;
  v_total   INT;
  v_rows    JSONB;
BEGIN
  IF NOT public.fb_is_admin(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  IF v_search IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(LEFT(v_search, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  WITH filtered AS (
    SELECT s.id, s.user_id, s.respondent_role, s.submitted_at,
           up.full_name, up.personal_id, up.email, up.phone,
           er.faculty, er.university, er.department,
           v.volunteer_id, vt.team_name
    FROM feedback_submissions s
    LEFT JOIN user_profiles up ON up.id = s.user_id
    LEFT JOIN event_registrations er ON er.user_id = s.user_id AND er.event_id = s.event_id
    LEFT JOIN volunteers v ON v.user_id = s.user_id AND v.event_id = s.event_id
    LEFT JOIN volunteer_teams vt ON vt.id = v.team_id
    WHERE s.event_id = p_event_id
      AND (v_role IS NULL OR s.respondent_role = v_role)
      AND (v_pattern IS NULL
           OR up.full_name ILIKE v_pattern
           OR up.personal_id ILIKE v_pattern
           OR up.email ILIKE v_pattern)
  )
  SELECT (SELECT COUNT(*) FROM filtered),
         (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                   'id', p.id,
                   'user_id', p.user_id,
                   'respondent_role', p.respondent_role,
                   'submitted_at', p.submitted_at,
                   'full_name', COALESCE(p.full_name, 'Unknown'),
                   'personal_id', p.personal_id,
                   'email', p.email,
                   'phone', p.phone,
                   'faculty', p.faculty,
                   'university', p.university,
                   'department', p.department,
                   'volunteer_id', p.volunteer_id,
                   'team_name', p.team_name,
                   'answers', COALESCE((
                     SELECT jsonb_agg(jsonb_build_object(
                              'question_id', a.question_id,
                              'question_text', q.question_text,
                              'question_type', q.question_type,
                              'display_order', q.display_order,
                              'answer_text', a.answer_text,
                              'rating', a.rating
                            ) ORDER BY q.display_order)
                     FROM feedback_answers a
                     JOIN feedback_questions q ON q.id = a.question_id
                     WHERE a.submission_id = p.id), '[]'::JSONB)
                 ) ORDER BY p.submitted_at DESC), '[]'::JSONB)
          FROM (SELECT * FROM filtered ORDER BY submitted_at DESC LIMIT v_limit OFFSET v_offset) p)
  INTO v_total, v_rows;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'submissions', v_rows
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_feedback_stats(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fb_is_admin(p_event_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total_submissions', (SELECT COUNT(*) FROM feedback_submissions WHERE event_id = p_event_id),
    'attendee_count',    (SELECT COUNT(*) FROM feedback_submissions WHERE event_id = p_event_id AND respondent_role = 'attendee'),
    'volunteer_count',   (SELECT COUNT(*) FROM feedback_submissions WHERE event_id = p_event_id AND respondent_role <> 'attendee'),
    'rating_summary', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', x.id,
               'question_text', x.question_text,
               'average_rating', ROUND(x.avg_rating, 2),
               'response_count', x.n
             ) ORDER BY x.display_order)
      FROM (
        SELECT q.id, q.question_text, q.display_order,
               AVG(a.rating)::NUMERIC AS avg_rating,
               COUNT(a.rating) AS n
        FROM feedback_questions q
        JOIN feedback_answers a ON a.question_id = q.id AND a.rating IS NOT NULL
        JOIN feedback_submissions s ON s.id = a.submission_id AND s.event_id = p_event_id
        WHERE q.event_id = p_event_id AND q.question_type = 'rating'
        GROUP BY q.id, q.question_text, q.display_order
      ) x), '[]'::JSONB)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Permissions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_fn TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.get_feedback_questions(UUID)',
    'public.get_my_feedback(UUID)',
    'public.submit_feedback(UUID, JSONB)',
    'public.admin_get_feedback_questions(UUID)',
    'public.admin_upsert_feedback_question(UUID, TEXT, TEXT, UUID, BOOLEAN, BOOLEAN)',
    'public.admin_delete_feedback_question(UUID, UUID)',
    'public.admin_reorder_feedback_questions(UUID, UUID[])',
    'public.admin_set_all_feedback_questions_visibility(UUID, BOOLEAN)',
    'public.admin_get_feedback_submissions(UUID, INT, INT, TEXT, TEXT)',
    'public.admin_get_feedback_stats(UUID)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_fn);
  END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
