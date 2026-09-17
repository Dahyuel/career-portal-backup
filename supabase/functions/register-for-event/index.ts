import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://your-production-domain.com', // TODO: replace with real domain
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5174',
]

const ALLOWED_PROOF_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
  'application/pdf',
])

const ALLOWED_CV_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024

// Events in these statuses are open for registration.
const REGISTRABLE_EVENT_STATUSES = new Set(['published', 'ongoing'])

function getCorsHeaders(req: Request) {
  const origin  = req.headers.get('origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function err(msg: string, field = 'general', status = 400, extra = {}, corsHeaders: Record<string,string>) {
  return Response.json({ success: false, error: msg, field, ...extra }, { status, headers: corsHeaders })
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return err('Authentication required.', 'general', 401, {}, corsHeaders)
  }

  const { data: { user }, error: jwtError } =
    await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (jwtError || !user) {
    return err('Invalid or expired session. Please sign in again.', 'general', 401, {}, corsHeaders)
  }

  const userId = user.id
  console.log(`[register-for-event] userId=${userId}`)

  try {
    // ── 2. Parse form ────────────────────────────────────────────────────────
    const formData = await req.formData()

    const type          = (formData.get('type') as string)?.trim()
    const eventId       = (formData.get('eventId') as string)?.trim()
    const university    = (formData.get('university') as string | null)?.trim() || null
    const faculty       = (formData.get('faculty') as string | null)?.trim() || null
    const department    = (formData.get('department') as string | null)?.trim() || null
    const yearRaw       = (formData.get('year') as string | null)?.trim() || null
    const studentStatus = (formData.get('studentStatus') as string | null)?.trim() || null
    const volunteerId   = (formData.get('volunteerId') as string | null)?.trim() || null
    const teamId        = (formData.get('teamId') as string | null)?.trim() || null
    const proofFile     = formData.get('enrollmentProofFile') as File | null
    const cvFile        = formData.get('cvFile') as File | null

    // ── 3. Validate inputs ───────────────────────────────────────────────────
    if (!['attendee', 'volunteer'].includes(type)) {
      return err('type must be attendee or volunteer.', 'type', 400, {}, corsHeaders)
    }
    if (!eventId) {
      return err('eventId is required.', 'general', 400, {}, corsHeaders)
    }
    if (type === 'attendee' && !proofFile) {
      return err('Enrollment proof is required.', 'enrollmentProofFile', 400, {}, corsHeaders)
    }

    // Validate + buffer files BEFORE any DB/storage writes
    let proofBuffer: ArrayBuffer | null = null
    let proofExt = 'pdf'
    let cvBuffer: ArrayBuffer | null = null
    let cvExt = 'pdf'

    if (proofFile) {
      if (!ALLOWED_PROOF_MIME.has(proofFile.type)) {
        return err(
          `Invalid enrollment proof type (${proofFile.type}). Allowed: JPG, PNG, GIF, WEBP, BMP, TIFF, HEIC, PDF.`,
          'enrollmentProofFile', 400, {}, corsHeaders
        )
      }
      if (proofFile.size > MAX_FILE_SIZE) {
        return err('Enrollment proof must be under 10MB.', 'enrollmentProofFile', 400, {}, corsHeaders)
      }
      proofBuffer = await proofFile.arrayBuffer()
      proofExt = proofFile.name.split('.').pop()?.toLowerCase() ??
        (proofFile.type === 'application/pdf' ? 'pdf' : 'jpg')
    }

    if (cvFile) {
      if (!ALLOWED_CV_MIME.has(cvFile.type)) {
        return err(
          `Invalid CV type (${cvFile.type}). Allowed: PDF, DOC, DOCX.`,
          'cvFile', 400, {}, corsHeaders
        )
      }
      if (cvFile.size > MAX_FILE_SIZE) {
        return err('CV must be under 10MB.', 'cvFile', 400, {}, corsHeaders)
      }
      cvBuffer = await cvFile.arrayBuffer()
      cvExt = cvFile.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    }

    // ── 4. Duplicate check ───────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('registration_status')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle()

    if (existing) {
      return err(
        'You are already registered for this event.',
        'general', 409,
        { detail: 'duplicate_registration', registration_status: existing.registration_status },
        corsHeaders
      )
    }

    // ── 5. Event eligibility check ───────────────────────────────────────────
    // Only published / ongoing events are open for registration.
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, name, status, start_date, end_date')
      .eq('id', eventId)
      .maybeSingle()

    if (eventErr) {
      console.error(`[register-for-event] Event lookup failed:`, eventErr.message)
      return err('Could not verify this event. Please try again.', 'general', 500, {}, corsHeaders)
    }

    if (!event) {
      return err('This event no longer exists.', 'general', 404, {}, corsHeaders)
    }

    if (!REGISTRABLE_EVENT_STATUSES.has(event.status)) {
      console.warn(`[register-for-event] Rejected: event ${eventId} status=${event.status}`)
      return err(
        `Registration for "${event.name}" is not open (status: ${event.status}).`,
        'general', 403,
        { detail: 'event_not_open', event_status: event.status },
        corsHeaders
      )
    }

    // ── 6. Get personal_id for storage paths ─────────────────────────────────
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('personal_id')
      .eq('id', userId)
      .single()

    if (!profile?.personal_id) {
      return err('User profile not found. Please sign in again.', 'general', 400, {}, corsHeaders)
    }
    const personalId = profile.personal_id

    // ── 7. Call registration RPC ─────────────────────────────────────────────
    const year = yearRaw ? parseInt(yearRaw, 10) : null
    const baseParams = {
      p_user_id:        userId,
      p_event_id:       eventId,
      p_university:     university,
      p_faculty:        faculty,
      p_department:     department,
      p_year:           Number.isNaN(year) ? null : year,
      p_student_status: studentStatus,
    }

    // Note: register-for-event is only used by attendees now.
    // Volunteers register atomically via register-user.
    if (type !== 'attendee') {
      return err('Volunteer registration must go through the volunteer registration page.', 'general', 400, {}, corsHeaders)
    }

    const rpcParams = { ...baseParams, p_volunteer_id: volunteerId }

    console.log(`[register-for-event] Calling RPC: register_attendee`)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_attendee', rpcParams)

    if (rpcError || !rpcResult?.success) {
      const rpcMsg = rpcResult?.error ?? rpcError?.message ?? 'Registration failed'
      console.error(`[register-for-event] RPC failed:`, rpcMsg)
      return err(rpcMsg, rpcResult?.field ?? 'general', 400, {}, corsHeaders)
    }

    console.log(`[register-for-event] RPC success, uploading files...`)

    // ── 8. Upload files ───────────────────────────────────────────────────────
    const uploadedPaths: string[] = []
    const fileUpdates: Record<string, string> = {}

    const rollback = async (reason: string) => {
      console.error(`[register-for-event] ROLLING BACK: ${reason}`)
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('ems-assets').remove(uploadedPaths)
        console.log(`[register-for-event] Deleted uploaded files:`, uploadedPaths)
      }
      await supabase
        .from('event_registrations')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)
      console.log(`[register-for-event] DB rollback complete`)
    }

    if (proofBuffer) {
      const path = `${personalId}/enrollment_proof/${personalId}_enrollment_proof.${proofExt}`
      await supabase.storage.from('ems-assets').remove([path])
      const { error: upErr } = await supabase.storage
        .from('ems-assets')
        .upload(path, proofBuffer, { contentType: proofFile!.type, upsert: true })

      if (upErr) {
        await rollback(`Proof upload failed: ${upErr.message}`)
        return err(
          'Failed to upload enrollment proof. Your registration was cancelled — please try again.',
          'enrollmentProofFile', 500, {}, corsHeaders
        )
      }
      uploadedPaths.push(path)
      fileUpdates.enrollment_proof_url = path
      console.log(`[register-for-event] Proof uploaded: ${path}`)
    }

    if (cvBuffer) {
      const path = `${personalId}/cv/${personalId}_cv.${cvExt}`
      await supabase.storage.from('ems-assets').remove([path])
      const { error: upErr } = await supabase.storage
        .from('ems-assets')
        .upload(path, cvBuffer, { contentType: cvFile!.type, upsert: true })

      if (upErr) {
        await rollback(`CV upload failed: ${upErr.message}`)
        return err(
          'Failed to upload CV. Your registration was cancelled — please try again.',
          'cvFile', 500, {}, corsHeaders
        )
      }
      uploadedPaths.push(path)
      fileUpdates.cv_url = path
      console.log(`[register-for-event] CV uploaded: ${path}`)
    }

    // ── 9. Update DB with file paths ──────────────────────────────────────────
    if (Object.keys(fileUpdates).length > 0) {
      const { error: updateErr } = await supabase
        .from('event_registrations')
        .update(fileUpdates)
        .eq('user_id', userId)
        .eq('event_id', eventId)

      if (updateErr) {
        await rollback(`DB file path update failed: ${updateErr.message}`)
        return err(
          'Registration could not be saved. Please try again.',
          'general', 500, {}, corsHeaders
        )
      }
    }

    console.log(`[register-for-event] SUCCESS userId=${userId} event=${eventId} type=${type}`)

    return Response.json({
      success:              true,
      userId,
      type,
      event_id:             eventId,
      // 'approved' straight away for ASU students verified in an earlier event (v2_12)
      registration_status:  rpcResult.registration_status ?? 'pending',
      previously_verified:  rpcResult.previously_verified ?? false,
      volunteer_id:         null,
      cv_url:               fileUpdates.cv_url ?? null,
      enrollment_proof_url: fileUpdates.enrollment_proof_url ?? null,
      message:              'Registration submitted successfully.',
    }, { status: 200, headers: corsHeaders })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[register-for-event] UNCAUGHT ERROR:`, msg)
    return err('An unexpected error occurred. Please try again.', 'general', 500, {}, corsHeaders)
  }
})