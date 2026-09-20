import { createClient } from 'jsr:@supabase/supabase-js@2'

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5174',
]

const ALLOWED_ORIGINS = new Set([
  ...DEFAULT_ORIGINS,
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
])

const MAX_BODY_BYTES = 2048
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })

const fail = (req: Request, error: string, status = 400) => json(req, { success: false, error }, status)

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const header = toBase64Url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = toBase64Url(enc.encode(JSON.stringify(payload)))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`)))
  return `${header}.${body}.${toBase64Url(sig)}`
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) })
  }
  if (req.method !== 'POST') return fail(req, 'Method not allowed', 405)
  if (origin && !ALLOWED_ORIGINS.has(origin)) return fail(req, 'Request not allowed', 403)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return fail(req, 'Not authenticated', 401)

  if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
    return fail(req, 'Invalid request', 415)
  }
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (declared > MAX_BODY_BYTES) return fail(req, 'Request too large', 413)

  let body: Record<string, unknown>
  try {
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) return fail(req, 'Request too large', 413)
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
    body = parsed
  } catch {
    return fail(req, 'Invalid request body')
  }

  const attendeeId = typeof body.attendeeId === 'string' ? body.attendeeId.trim() : ''
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : ''
  const status = typeof body.status === 'string' ? body.status.trim() : ''

  if (!UUID_RE.test(attendeeId) || !UUID_RE.test(eventId)) return fail(req, 'Invalid attendee or event')
  if (status !== 'approved' && status !== 'rejected') return fail(req, 'Invalid status')

  const url = Deno.env.get('SUPABASE_URL')!
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData?.user) return fail(req, 'Not authenticated', 401)

  const { data: allowed, error: roleErr } = await caller.rpc('is_verification_team_member', {
    p_event_id: eventId,
  })
  if (roleErr) {
    console.error('[verify-attendee-webhook] role check', roleErr.message)
    return fail(req, 'Something went wrong. Please try again.', 500)
  }
  if (!allowed) return fail(req, 'Only verification team members can trigger this', 403)

  const { data: rows, error: regErr } = await caller
    .from('event_registrations')
    .select('user_id, is_asu_student, registration_status, user_profiles:user_id(full_name, email)')
    .eq('user_id', attendeeId)
    .eq('event_id', eventId)
    .limit(1)

  if (regErr) {
    console.error('[verify-attendee-webhook] lookup', regErr.message)
    return fail(req, 'Something went wrong. Please try again.', 500)
  }

  const reg = rows?.[0] as
    | { is_asu_student: boolean; registration_status: string; user_profiles: { full_name: string; email: string | null } | null }
    | undefined
  if (!reg) return fail(req, 'Registration not found for this event', 404)
  if (reg.registration_status !== status) {
    return fail(req, 'Status mismatch - reload and try again', 409)
  }

  const secret = Deno.env.get('N8N_JWT_SECRET')
  const webhookUrl = Deno.env.get('N8N_VERIFICATION_WEBHOOK_URL')
  if (!secret || !webhookUrl) {
    console.error('[verify-attendee-webhook] missing N8N_JWT_SECRET or N8N_VERIFICATION_WEBHOOK_URL')
    return fail(req, 'Webhook is not configured', 503)
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    attendee_id: attendeeId,
    name: reg.user_profiles?.full_name ?? 'Unknown User',
    email: reg.user_profiles?.email ?? '',
    status,
    is_asu_student: reg.is_asu_student ?? false,
    event_id: eventId,
    iat: now,
    exp: now + 300,
  }

  const token = await signJwt(payload, secret)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error('[verify-attendee-webhook] n8n responded', res.status)
      return json(req, { success: false, error: 'Webhook delivery failed' }, 502)
    }
  } catch (e) {
    console.error('[verify-attendee-webhook] fetch', (e as Error)?.message)
    return json(req, { success: false, error: 'Webhook delivery failed' }, 502)
  }

  return json(req, { success: true })
})
