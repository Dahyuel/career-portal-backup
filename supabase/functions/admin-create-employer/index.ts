// admin-create-employer — an event admin adds an employer to a company.
//
// There is no employer self-registration: only this function creates employer
// accounts. The employer fills in their own profile after the first login.
//
// Flow:
//   1. admin_employer_precheck, called with the ADMIN's token: caller is an admin
//      of the event, company is in the event, e-mail usable
//   2a. e-mail already has an account → link that account (password unchanged)
//   2b. otherwise → create the account with a generated default password
//   3. employer_admin_attach (service role): employers row + employer role
//   4. if step 3 fails for an account created in 2b, delete that account
//
// Response: { success, userId, existingAccount, password? } — the password is
// returned once so the admin can send it to the employer.
//
// Deploy: supabase functions deploy admin-create-employer
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (error: string, field = "general", status = 400) =>
  json({ success: false, error, field }, status);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 12 characters without look-alikes (0/O, 1/l/I), at least one of each kind.
const generatePassword = (): string => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < 12) chars.push(pick(all));
  // Fisher–Yates so the guaranteed characters aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", "general", 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return fail("Not authenticated", "general", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body");
  }

  const str = (k: string, max: number) => String(body[k] ?? "").trim().slice(0, max);
  const eventId = str("eventId", 36);
  const companyId = str("companyId", 36);
  const email = str("email", 200).toLowerCase();

  if (!UUID_RE.test(eventId) || !UUID_RE.test(companyId)) return fail("Invalid event or company");
  if (!EMAIL_RE.test(email)) return fail("Enter a valid email address", "email");

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData?.user) return fail("Not authenticated", "general", 401);
  const adminId = userData.user.id;

  // Runs as the admin, so is_admin() inside checks the real caller.
  const { data: check, error: checkErr } = await caller.rpc("admin_employer_precheck", {
    _event_id: eventId,
    _company_id: companyId,
    _email: email,
  });
  if (checkErr) {
    console.error("[admin-create-employer] precheck", checkErr);
    return /unauthorized|not authenticated/i.test(checkErr.message)
      ? fail("Only admins of this event can add employers", "general", 403)
      : fail("Something went wrong. Please try again.", "general", 500);
  }
  if (!check?.success) return fail(check?.error ?? "Could not add the employer", check?.field);

  const existingUserId: string | null = check.existing_user_id ?? null;
  let userId = existingUserId;
  let password: string | null = null;

  if (!userId) {
    password = generatePassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { registration_type: "employer" },
    });
    if (createErr || !created?.user) {
      console.error("[admin-create-employer] createUser", createErr);
      // Only admins reach this point, so the underlying reason is shown to help fix it
      const reason = createErr?.message ? ` (${createErr.message})` : "";
      return fail(`Could not create the account${reason}.`, "general", 500);
    }
    userId = created.user.id;
  }

  const { data: done, error: doneErr } = await admin.rpc("employer_admin_attach", {
    p_admin_id: adminId,
    p_event_id: eventId,
    p_company_id: companyId,
    p_user_id: userId,
  });

  if (doneErr || !done?.success) {
    console.error("[admin-create-employer] attach", doneErr ?? done);
    if (!existingUserId) {
      await admin.auth.admin.deleteUser(userId!).catch((e) => console.error("[admin-create-employer] cleanup", e));
    }
    return doneErr
      ? fail("Something went wrong. Please try again.", "general", 500)
      : fail(done.error ?? "Could not add the employer", done.field);
  }

  return json({ success: true, userId, existingAccount: !!existingUserId, password });
});
