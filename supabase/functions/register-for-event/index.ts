import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const ALLOWED_PROOF_MIME = new Set(['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/bmp','image/tiff','image/heic','image/heif','application/pdf'])
const ALLOWED_CV_MIME = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
const MIME_EXT: Record<string, string> = {
  'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp',
  'image/bmp':'bmp','image/tiff':'tiff','image/heic':'heic','image/heif':'heif',
  'application/pdf':'pdf','application/msword':'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx',
}
const MAX_FILE_SIZE = 10 * 1024 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REGISTRABLE_EVENT_STATUSES = new Set(['published', 'ongoing'])

function getCorsHeaders(_req: Request) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function err(msg: string, field = 'general', status = 400, extra = {}, corsHeaders: Record<string, string>) {
  return Response.json({ success: false, error: msg, field, ...extra }, { status, headers: corsHeaders })
}

function clean(v: unknown, max = 200): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

async function readFileChecked(file: File | null, allowed: Set<string>): Promise<{ ok: true; buffer: Uint8Array; ext: string } | { ok: false; error: string }> {
  if (!file) return { ok: false, error: 'missing' }
  if (!allowed.has(file.type)) return { ok: false, error: 'type' }
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: 'size' }
  const buffer = new Uint8Array(await file.arrayBuffer())
  return { ok: true, buffer, ext: MIME_EXT[file.type] ?? 'bin' }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return err('Method not allowed.', 'general', 405, {}, corsHeaders)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return err('Authentication required.', 'general', 401, {}, corsHeaders)

  const { data: { user }, error: jwtError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (jwtError || !user) return err('Invalid or expired session. Please sign in again.', 'general', 401, {}, corsHeaders)

  const userId = user.id

  try {
    const formData = await req.formData()
    const type = clean(formData.get('type'), 20) ?? 'attendee'
    const eventId = clean(formData.get('eventId'), 64)
    const university = clean(formData.get('university'), 200)
    const faculty = clean(formData.get('faculty'), 150)
    const department = clean(formData.get('department'), 150)
    const studentStatus = clean(formData.get('studentStatus'), 50)
    const volunteerId = clean(formData.get('volunteerId'), 20)
    const proofFile = formData.get('enrollmentProofFile') as File | null
    const cvFile = formData.get('cvFile') as File | null

    if (type !== 'attendee') return err('Invalid registration type.', 'type', 400, {}, corsHeaders)
    if (!eventId || !UUID_RE.test(eventId)) return err('A valid event is required.', 'eventId', 400, {}, corsHeaders)

    const yearRaw = clean(formData.get('year'), 10)
    let year: number | null = null
    if (yearRaw) {
      const n = Number.parseInt(yearRaw, 10)
      if (Number.isNaN(n) || n < 1 || n > 7) return err('Invalid class year.', 'year', 400, {}, corsHeaders)
      year = n
    }

    const { data: eventRow, error: eventErr } = await supabase.from('events').select('id, status').eq('id', eventId).maybeSingle()
    if (eventErr || !eventRow) return err('This event no longer exists.', 'eventId', 404, {}, corsHeaders)
    if (!REGISTRABLE_EVENT_STATUSES.has(eventRow.status)) return err('Registration for this event is not open.', 'eventId', 400, {}, corsHeaders)

    const { data: profileRow } = await supabase.from('user_profiles').select('personal_id, phone').eq('id', userId).maybeSingle()
    if (!profileRow?.personal_id || !profileRow?.phone) return err('Profile incomplete. Please complete your profile before registering.', 'profile', 400, {}, corsHeaders)
    const personalId = String(profileRow.personal_id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50)
    if (!personalId) return err('Profile incomplete. Please complete your profile before registering.', 'profile', 400, {}, corsHeaders)

    let proofBuffer: Uint8Array | null = null
    let proofExt = 'bin'
    if (proofFile) {
      const r = await readFileChecked(proofFile, ALLOWED_PROOF_MIME)
      if (!r.ok) {
        const msg = r.error === 'size' ? 'Enrollment proof must be 10MB or smaller.' : 'Unsupported enrollment proof format.'
        return err(msg, 'enrollmentProofFile', 400, {}, corsHeaders)
      }
      proofBuffer = r.buffer; proofExt = r.ext
    }

    let cvBuffer: Uint8Array | null = null
    let cvExt = 'bin'
    if (cvFile) {
      const r = await readFileChecked(cvFile, ALLOWED_CV_MIME)
      if (!r.ok) {
        const msg = r.error === 'size' ? 'CV must be 10MB or smaller.' : 'Unsupported CV format.'
        return err(msg, 'cvFile', 400, {}, corsHeaders)
      }
      cvBuffer = r.buffer; cvExt = r.ext
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_attendee', {
      p_user_id: userId, p_event_id: eventId, p_university: university, p_faculty: faculty,
      p_department: department, p_year: year, p_student_status: studentStatus, p_volunteer_id: volunteerId,
    })

    if (rpcError || !rpcResult?.success) {
      const detail = rpcResult?.detail
      const status = detail === 'event_not_open' ? 400 : 409
      return err(rpcResult?.error ?? rpcError?.message ?? 'Registration failed.', rpcResult?.field ?? 'general', status, detail ? { detail } : {}, corsHeaders)
    }

    const uploadedPaths: string[] = []
    const fileUpdates: Record<string, string> = {}
    const rollback = async (reason: string) => {
      console.error(`[register-for-event] ROLLING BACK: ${reason}`)
      if (uploadedPaths.length > 0) await supabase.storage.from('ems-assets').remove(uploadedPaths)
      await supabase.from('event_registrations').delete().eq('user_id', userId).eq('event_id', eventId)
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('event_id', eventId)
    }

    if (proofBuffer) {
      const path = `${personalId}/enrollment_proof/${personalId}_enrollment_proof.${proofExt}`
      await supabase.storage.from('ems-assets').remove([path])
      const { error: upErr } = await supabase.storage.from('ems-assets').upload(path, proofBuffer, { contentType: proofFile!.type, upsert: true })
      if (upErr) {
        await rollback(`Proof upload failed: ${upErr.message}`)
        return err('Failed to upload enrollment proof. Your registration was cancelled — please try again.', 'enrollmentProofFile', 500, {}, corsHeaders)
      }
      uploadedPaths.push(path); fileUpdates.enrollment_proof_url = path
    }

    if (cvBuffer) {
      const path = `${personalId}/cv/${personalId}_cv.${cvExt}`
      await supabase.storage.from('ems-assets').remove([path])
      const { error: upErr } = await supabase.storage.from('ems-assets').upload(path, cvBuffer, { contentType: cvFile!.type, upsert: true })
      if (upErr) {
        await rollback(`CV upload failed: ${upErr.message}`)
        return err('Failed to upload CV. Your registration was cancelled — please try again.', 'cvFile', 500, {}, corsHeaders)
      }
      uploadedPaths.push(path); fileUpdates.cv_url = path
    }

    if (Object.keys(fileUpdates).length > 0) {
      const { error: updateErr } = await supabase.from('event_registrations').update(fileUpdates).eq('user_id', userId).eq('event_id', eventId)
      if (updateErr) {
        await rollback(`DB file path update failed: ${updateErr.message}`)
        return err('Registration could not be saved. Please try again.', 'general', 500, {}, corsHeaders)
      }
    }

    return Response.json({
      success: true, userId, type, event_id: eventId,
      registration_status: rpcResult.registration_status ?? 'pending',
      previously_verified: rpcResult.previously_verified ?? false,
      volunteer_id: null,
      cv_url: fileUpdates.cv_url ?? null,
      enrollment_proof_url: fileUpdates.enrollment_proof_url ?? null,
      message: 'Registration submitted successfully.',
    }, { status: 200, headers: corsHeaders })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[register-for-event] UNCAUGHT ERROR:`, msg)
    return err('An unexpected error occurred. Please try again.', 'general', 500, {}, corsHeaders)
  }
})
