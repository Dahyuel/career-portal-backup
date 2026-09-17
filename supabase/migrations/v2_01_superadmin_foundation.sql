-- ============================================================================
-- v2 step 1 — Super admin foundation
--
-- Built for the employment-fair-v2 schema (event_registrations, per-event roles,
-- global sadmin rows with event_id IS NULL, guards is_sadmin()/is_admin()).
--
-- What this file does:
--   1. _assert_sadmin(): v2's is_sadmin() PLUS an authenticator-verified session (aal2)
--   2. sadmin_audit_log + sa_audit_write(): a record of every privileged change
--   3. audit triggers on user_roles, user_profiles (delete) and system_config
--   4. at most 5 super admins
--   5. secret key (bcrypt) used before setting up an authenticator app
--   6. removes the raw-SQL tools and the Face ID functions
--   7. creates the first super admin (edit the email in section 8)
--
-- Paste the WHOLE file into Supabase Dashboard → SQL Editor → Run.
-- One transaction: if anything fails, nothing changes. Safe to re-run.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. The guard: super admin AND a session that entered an authenticator code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._assert_sadmin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- v2's own guard: a sadmin row with event_id IS NULL.
  IF NOT public.is_sadmin() THEN
    RAISE EXCEPTION 'Unauthorized: sadmin access required' USING ERRCODE = '42501';
  END IF;

  -- aal2 = this session entered a code from the authenticator app.
  IF COALESCE(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Two-factor verification required' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._assert_sadmin() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sadmin_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id     UUID,
  actor_email  TEXT,
  action       TEXT NOT NULL,
  target_table TEXT,
  target_key   JSONB,
  details      JSONB
);

CREATE INDEX IF NOT EXISTS idx_sadmin_audit_log_created ON public.sadmin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sadmin_audit_log_action  ON public.sadmin_audit_log (action);

ALTER TABLE public.sadmin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sadmin_audit_log FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.sadmin_audit_log_id_seq FROM anon, authenticated;

-- Internal: one audit entry. The actor is empty for SQL-editor / service-role changes.
CREATE OR REPLACE FUNCTION public.sa_audit_write(p_action TEXT, p_table TEXT, p_key JSONB, p_details JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.sadmin_audit_log (actor_id, actor_email, action, target_table, target_key, details)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), p_action, p_table, p_key, p_details);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sa_audit_write(TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Audit triggers — they fire whichever tool made the change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_privileged_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'user_roles' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM public.sa_audit_write('role_insert', 'user_roles',
        jsonb_build_object('user_id', NEW.user_id, 'event_id', NEW.event_id),
        jsonb_build_object('new_role', NEW.role));
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.role IS DISTINCT FROM OLD.role OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        PERFORM public.sa_audit_write('role_update', 'user_roles',
          jsonb_build_object('user_id', NEW.user_id, 'event_id', NEW.event_id),
          jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
      END IF;
    ELSE
      PERFORM public.sa_audit_write('role_delete', 'user_roles',
        jsonb_build_object('user_id', OLD.user_id, 'event_id', OLD.event_id),
        jsonb_build_object('old_role', OLD.role));
    END IF;

  ELSIF TG_TABLE_NAME = 'user_profiles' THEN
    PERFORM public.sa_audit_write('user_delete', 'user_profiles',
      jsonb_build_object('id', OLD.id), jsonb_build_object('email', OLD.email, 'full_name', OLD.full_name));

  ELSIF TG_TABLE_NAME = 'system_config' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM public.sa_audit_write('config_delete', 'system_config', jsonb_build_object('key', OLD.key), NULL);
    ELSIF NEW.key = 'sadmin_secret_key' THEN
      PERFORM public.sa_audit_write('config_' || LOWER(TG_OP), 'system_config', jsonb_build_object('key', NEW.key),
        jsonb_build_object('note', 'secret key changed (value not logged)'));
    ELSE
      PERFORM public.sa_audit_write('config_' || LOWER(TG_OP), 'system_config', jsonb_build_object('key', NEW.key),
        jsonb_build_object('new_value', NEW.value));
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_privileged_changes();

DROP TRIGGER IF EXISTS audit_user_profiles_delete ON public.user_profiles;
CREATE TRIGGER audit_user_profiles_delete
  AFTER DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_privileged_changes();

DROP TRIGGER IF EXISTS audit_system_config ON public.system_config;
CREATE TRIGGER audit_system_config
  AFTER INSERT OR UPDATE OR DELETE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_privileged_changes();

-- ---------------------------------------------------------------------------
-- 4. At most 5 super admins (v2 keeps sadmin rows with event_id IS NULL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_sadmin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_others INT;
BEGIN
  IF NEW.role = 'sadmin'
     AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role OR OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
    -- Serialise concurrent promotions so two at once cannot both slip past the limit.
    PERFORM pg_advisory_xact_lock(hashtext('sadmin_limit'));
    SELECT COUNT(DISTINCT user_id) INTO v_others
    FROM public.user_roles WHERE role = 'sadmin' AND user_id <> NEW.user_id;
    IF v_others >= 5 THEN
      RAISE EXCEPTION 'Super admin limit reached: at most 5 people can be super admins';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_sadmin_limit ON public.user_roles;
CREATE TRIGGER enforce_sadmin_limit
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sadmin_limit();

-- ---------------------------------------------------------------------------
-- 5. Secret key (needed before an authenticator app can be set up)
--    Stored as a bcrypt hash in system_config → key 'sadmin_secret_key'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sadmin_verify_secret_key(p_key TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF NOT public.is_sadmin() THEN
    RETURN json_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  SELECT value ->> 'hash' INTO v_hash FROM public.system_config WHERE key = 'sadmin_secret_key';

  IF v_hash IS NULL THEN
    RETURN json_build_object('success', FALSE, 'configured', FALSE);
  END IF;
  IF COALESCE(p_key, '') = '' THEN
    RETURN json_build_object('success', FALSE, 'configured', TRUE);
  END IF;

  RETURN json_build_object('success', extensions.crypt(p_key, v_hash) = v_hash, 'configured', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.sadmin_set_secret_key(p_new_key TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public._assert_sadmin();

  IF p_new_key IS NULL OR LENGTH(p_new_key) < 12 OR LENGTH(p_new_key) > 72 THEN
    RETURN json_build_object('success', FALSE, 'error', 'The secret key must be 12 to 72 characters.');
  END IF;

  INSERT INTO public.system_config (key, value, updated_at)
  VALUES ('sadmin_secret_key', jsonb_build_object('hash', extensions.crypt(p_new_key, extensions.gen_salt('bf'))), NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

  RETURN json_build_object('success', TRUE);
END;
$$;

REVOKE ALL     ON FUNCTION public.sadmin_verify_secret_key(TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sadmin_verify_secret_key(TEXT) TO authenticated;
REVOKE ALL     ON FUNCTION public.sadmin_set_secret_key(TEXT)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sadmin_set_secret_key(TEXT)    TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Remove the raw-database tools and Face ID
--    (The old super admin screen's "Table Browser"/"Users" tabs stop working here;
--     the replacement dashboard arrives in a later step.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_fn REGPROCEDURE;
BEGIN
  FOR v_fn IN
    SELECT p.oid::REGPROCEDURE FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'sadmin_execute_sql', 'sadmin_execute_write', 'sadmin_get_table_data', 'sadmin_get_db_stats',
        'sadmin_get_auth_data', 'sadmin_get_auth_tables', 'sadmin_list_users', 'sadmin_list_users_paginated',
        'sadmin_browse_table', 'sadmin_write_row',
        'sadmin_get_face_descriptor', 'sadmin_has_biometric', 'sadmin_get_credentials',
        'sadmin_register_credential', 'sadmin_verify_credential', 'sadmin_create_challenge', 'sadmin_delete_credential'
      )
  LOOP
    EXECUTE format('DROP FUNCTION %s', v_fn);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.sadmin_webauthn_credentials;
DROP TABLE IF EXISTS public.sadmin_webauthn_challenges;

-- ---------------------------------------------------------------------------
-- 7. Maintenance gains an end time, and the open/closed switches appear.
--    v2's key name ("maintenance") is kept so its check_maintenance_status()
--    keeps working; the shape only grows.
-- ---------------------------------------------------------------------------
INSERT INTO public.system_config (key, value, updated_at)
VALUES ('event_controls', '{"registration_open": true, "booking_open": true, "feedback_open": true}'::JSONB, NOW())
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. The first super admin
--    ►►► Put the email of the account that should be super admin here. ◄◄◄
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_email TEXT := 'support@mail.com';
  v_user  UUID;
  v_name  TEXT;
BEGIN
  IF v_email = 'CHANGE_ME@example.com' THEN
    RAISE NOTICE 'No super admin was created: edit v_email in section 8 and run this file again.';
    RETURN;
  END IF;

  SELECT id, COALESCE(NULLIF(BTRIM(raw_user_meta_data ->> 'full_name'), ''), split_part(email, '@', 1))
  INTO v_user, v_name
  FROM auth.users
  WHERE LOWER(email) = LOWER(BTRIM(v_email));

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'There is no account with the email %. Create it first (Authentication → Users → Add user), then run this file again.', v_email;
  END IF;

  -- The dashboard reads the profile, so make sure one exists. If the profile table
  -- requires more fields, this is skipped with a notice: finish the profile in the app.
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_user) THEN
    BEGIN
      INSERT INTO public.user_profiles (id, email, full_name)
      VALUES (v_user, LOWER(BTRIM(v_email)), v_name);
      RAISE NOTICE 'Profile created for %', v_email;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create the profile automatically (%). Sign in once in the app to complete it.', SQLERRM;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role = 'sadmin' AND event_id IS NULL
  ) THEN
    INSERT INTO public.user_roles (user_id, event_id, role) VALUES (v_user, NULL, 'sadmin');
    RAISE NOTICE 'Super admin created for %', v_email;
  ELSE
    RAISE NOTICE '% is already a super admin', v_email;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Final check — every new super admin function goes through _assert_sadmin().
--    The two secret-key functions do their own checks; the two functions v2 already
--    had are wrapped in a later step.
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

-- ============================================================================
-- After running this file:
--   1. Set the first secret key (12–72 characters), because the dashboard needs it
--      before an authenticator app can be added. Run this once, with your own key:
--
--      INSERT INTO public.system_config (key, value, updated_at)
--      VALUES ('sadmin_secret_key',
--              jsonb_build_object('hash', extensions.crypt('PUT-A-LONG-KEY-HERE', extensions.gen_salt('bf'))),
--              NOW())
--      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
--
--   2. Sign in as the super admin and set up the authenticator app.
-- ============================================================================
