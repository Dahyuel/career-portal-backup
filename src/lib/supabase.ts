// lib/supabase.ts - Optimized Supabase Integration for Employment Fair
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { sanitizeSearchQuery } from '../utils/sanitize';


// ============================================================================
// CONFIGURATION
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthResult {
  success: boolean;
  data: {
    user: any;
    session: any;
    profile?: any;
    attendee?: any;
    volunteer?: any;
  } | null;
  error: {
    message: string;
    field?: string;
    validationErrors?: ValidationError[];
  } | null;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  personalId: string;
  nationality?: string | null;
  gender?: string | null;
  registrationType?: 'attendee' | 'volunteer';
  eventId?: string;
  university?: string;
  faculty?: string;
  department?: string;
  year?: number;
  studentStatus?: string;
  volunteerId?: string;
  teamId?: string;
}

export interface EventRegistrationPayload {
  type: 'attendee';
  eventId: string;
  university?: string;
  faculty?: string;
  department?: string;
  year?: number;
  studentStatus?: 'undergraduate' | 'postgraduate' | 'phd' | 'graduate';
  volunteerId: string; // referral code from a volunteer
  enrollmentProofFile?: File;
  cvFile?: File;
}

export interface EventRegistrationResult {
  success: boolean;
  registration_status?: string;
  volunteer_id?: string;
  error?: {
    message: string;
    field?: string;
    detail?: string;
  } | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

type FileCategory = 'CV' | 'Uni_ID' | 'Companies';

// Building team: book or cancel an attendee's session booking.
export const buildTeamBookSessionAndLogRPC = (
  sessionId: string,
  attendeeId: string,
  eventId: string,
  action: 'book' | 'unbook'
) =>
  supabase.rpc('build_team_book_session_and_log', {
    p_session_id: sessionId,
    p_attendee_id: attendeeId,
    p_event_id: eventId,
    p_action: action,
  });

export const uploadFile = async (
  category: FileCategory,
  userId: string,
  file: File,
  eventId?: string
): Promise<{ data: { path: string } | null; error: { message: string } | null }> => {
  try {
    const allowedTypes: Record<FileCategory, string[]> = {
      'CV': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'Uni_ID': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif', 'application/pdf'],
      'Companies': ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
    };

    if (!allowedTypes[category].includes(file.type)) {
      return {
        data: null,
        error: { message: `Invalid file type for ${category}. Allowed: ${allowedTypes[category].join(', ')}` }
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { data: null, error: { message: 'File must be under 10MB' } };
    }

    if ((category === 'CV' || category === 'Uni_ID') && !eventId) {
      return { data: null, error: { message: `eventId is required for ${category} uploads` } };
    }

    const typeMap: Record<FileCategory, string> = {
      'CV': 'cv',
      'Uni_ID': 'proof',
      'Companies': 'logo'
    };

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', typeMap[category]);
    if (eventId) uploadFormData.append('event_id', eventId);
    uploadFormData.append('target_id', userId);

    logger.log(`📤 [UPLOAD] Uploading ${category} via storage-upload edge function`);

    const { data: invokeData, error: fnError } = await supabase.functions.invoke('storage-upload', {
      body: uploadFormData
    });

    let result = invokeData;
    if (!result && fnError) {
      try {
        const contextBody = await fnError.context?.json?.();
        if (contextBody) result = contextBody;
      } catch { /* context not parseable */ }
    }

    if (fnError && !result) {
      logger.error('❌ [UPLOAD] Edge function error:', fnError);
      return { data: null, error: { message: fnError.message || 'Could not reach the server. Please try again.' } };
    }

    if (!result?.path) {
      const errorMessage = result?.error || result?.message || 'Upload failed. Please try again.';
      logger.error('❌ [UPLOAD] Failed:', errorMessage);
      return { data: null, error: { message: errorMessage } };
    }

    logger.log('✅ [UPLOAD] File uploaded:', result.path);
    return { data: { path: result.path }, error: null };

  } catch (error: any) {
    logger.error('💥 [UPLOAD] Exception:', error.message);
    return { data: null, error: { message: error.message } };
  }
};

export const getSignedUrl = async (
  path: string
): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }> => {
  try {
    const { data: invokeData, error: fnError } = await supabase.functions.invoke('get-signed-url', {
      body: { path }
    });

    let result = invokeData;
    if (!result && fnError) {
      try {
        const contextBody = await fnError.context?.json?.();
        if (contextBody) result = contextBody;
      } catch { /* context not parseable */ }
    }

    if (fnError && !result) {
      logger.error('❌ [SIGNED URL] Edge function error:', fnError);
      return { data: null, error: { message: fnError.message || 'Could not reach the server. Please try again.' } };
    }

    if (!result?.signedUrl) {
      const errorMessage = result?.error || result?.message || 'Failed to get signed URL.';
      logger.error('❌ [SIGNED URL] Failed:', errorMessage);
      return { data: null, error: { message: errorMessage } };
    }

    return { data: { signedUrl: result.signedUrl }, error: null };
  } catch (error: any) {
    logger.error('💥 [SIGNED URL] Exception:', error.message);
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// SIGNUP (register-user edge function — no JWT, identity only)
// ============================================================================

export const signUpUser = async (data: SignupData): Promise<AuthResult> => {
  try {
    logger.log('🚀 [SIGNUP] Starting signup...');

    let result: any = null;
    let invokeErrorMessage: string | null = null;

    const invokeBody = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      personalId: data.personalId.trim(),
      nationality: data.nationality?.trim() || null,
      gender: data.gender?.trim() || null,
      registrationType: data.registrationType,
      eventId: data.eventId,
      university: data.university,
      faculty: data.faculty,
      department: data.department,
      year: data.year,
      studentStatus: data.studentStatus,
      volunteerId: data.volunteerId,
      teamId: data.teamId,
    };

    try {
      const { data: invokeData, error: fnError } = await supabase.functions.invoke('register-user', {
        body: invokeBody
      });

      result = invokeData;

      if (!result && fnError) {
        try {
          const contextBody = await fnError.context?.json?.();
          if (contextBody) result = contextBody;
        } catch { /* context not parseable */ }
        if (!result) invokeErrorMessage = fnError.message || String(fnError);
      }
    } catch (invokeErr: any) {
      logger.error('❌ [SIGNUP] Invoke threw:', invokeErr);
      invokeErrorMessage = invokeErr?.message || String(invokeErr) || null;
      result = null;
    }

    if (!result?.success) {
      const isConnectivityError = !result && !!invokeErrorMessage;
      const errorMessage = result?.error || result?.message || result?.details
        || (isConnectivityError
          ? 'Could not reach the server. Please check your internet connection and try again.'
          : 'Something went wrong. Please try again.');
      const errorField = result?.field || 'general';

      logger.error(`❌ [SIGNUP] Failed — field: ${errorField}, message: ${errorMessage}`);
      return {
        success: false,
        data: null,
        error: {
          message: errorMessage,
          field: errorField,
          validationErrors: errorField !== 'general' ? [{ field: errorField, message: errorMessage }] : []
        }
      };
    }

    logger.log('✅ [SIGNUP] Account created:', result.userId);
    return {
      success: true,
      data: { user: { id: result.userId }, session: null },
      error: null
    };

  } catch (error: any) {
    logger.error('💥 [SIGNUP] Unexpected error:', error.message);
    return {
      success: false,
      data: null,
      error: { message: error.message || 'Something went wrong. Please check your details and try again.' }
    };
  }
};
// ============================================================================
// POST-LOGIN EVENT REGISTRATION (register-for-event edge function — JWT required)
// ============================================================================

export const registerForEvent = async (
  payload: EventRegistrationPayload
): Promise<EventRegistrationResult> => {
  try {
    logger.log('🚀 [EVENT REG] Registering for event:', payload);

    const formData = new FormData();
    formData.append('type', payload.type);
    formData.append('eventId', payload.eventId);
    if (payload.university) formData.append('university', payload.university);
    if (payload.faculty) formData.append('faculty', payload.faculty);
    if (payload.department) formData.append('department', payload.department);
    if (payload.year !== undefined) formData.append('year', payload.year.toString());
    if (payload.studentStatus) formData.append('studentStatus', payload.studentStatus);
    if (payload.volunteerId) formData.append('volunteerId', payload.volunteerId);
    if (payload.enrollmentProofFile) formData.append('enrollmentProofFile', payload.enrollmentProofFile);
    if (payload.cvFile) formData.append('cvFile', payload.cvFile);

    const { data: invokeData, error: fnError } = await supabase.functions.invoke('register-for-event', {
      body: formData
    });

    let result = invokeData;
    if (!result && fnError) {
      try {
        const contextBody = await fnError.context?.json?.();
        if (contextBody) result = contextBody;
      } catch { /* context not parseable */ }
    }

    if (fnError && !result) {
      logger.error('❌ [EVENT REG] Edge function error:', fnError);
      return {
        success: false,
        error: { message: fnError.message || 'Could not reach the server. Please try again.' }
      };
    }

    if (!result?.success) {
      const status = fnError?.context?.status || result?.status;
      const errorMessage = result?.error || result?.message || result?.detail || 'Event registration failed. Please try again.';
      const errorField = result?.field || 'general';

      logger.error(`❌ [EVENT REG] Failed — status: ${status}, field: ${errorField}, message: ${errorMessage}`);
      return {
        success: false,
        registration_status: result?.registration_status,
        error: { message: errorMessage, field: errorField, detail: result?.detail }
      };
    }

    logger.log('✅ [EVENT REG] Registered for event:', result);
    return {
      success: true,
      registration_status: result.registration_status,
      volunteer_id: result.volunteer_id
    };

  } catch (error: any) {
    logger.error('💥 [EVENT REG] Unexpected error:', error.message);
    return {
      success: false,
      error: { message: error.message || 'Something went wrong. Please try again.' }
    };
  }
};

// ============================================================================
// EVENTS
// ============================================================================

export interface FairEvent {
  id: string;
  name: string;
  event_type?: string | null;
  start_date?: string;
  end_date?: string;
  status?: string;
  allow_non_asu_attendees?: boolean;
  non_asu_ticket_price?: number;
  venue_name?: string | null;
  is_current?: boolean;
  is_ended?: boolean;
  can_register?: boolean;
  landing?: any;
}

export const getActiveEvents = async (): Promise<{ data: FairEvent[]; error: { message: string } | null }> => {
  try {
    const { data, error } = await supabase.rpc('get_active_events');

    if (error) {
      logger.error('❌ [EVENTS] Error fetching active events:', error);
      return { data: [], error: { message: error.message } };
    }

    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch {
        // ignore JSON parse error
      }
    }
    const rawEvents = (parsedData as any)?.events ?? parsedData;
    const eventsArray = Array.isArray(rawEvents) ? rawEvents : (Array.isArray(parsedData) ? parsedData : []);

    return { data: eventsArray as FairEvent[], error: null };
  } catch (error: any) {
    logger.error('💥 [EVENTS] Exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

export const getCurrentEvent = async (): Promise<{ data: FairEvent | null; error: { message: string } | null }> => {
  try {
    const { data, error } = await supabase.rpc('get_current_event');
    if (error) {
      logger.error('❌ [EVENTS] Error fetching current event:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data: data as FairEvent | null, error: null };
  } catch (error: any) {
    logger.error('💥 [EVENTS] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const checkEventRegistration = async (eventId: string): Promise<{ data: any | null; error: { message: string } | null }> => {
  try {
    const { data, error } = await supabase
      .rpc('get_my_role_for_event', { p_event_id: eventId })
      .maybeSingle();

    if (error) return { data: null, error: { message: error.message } };
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// AUTH
// ============================================================================

// Login rate limiting is handled by Supabase Auth's built-in server-side rate
// limiter. The previous in-memory attempt counter was removed: it lived only in
// the browser tab, so a reload bypassed it entirely while real protection
// already exists server-side.
export const signInUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    logger.log('🔐 [LOGIN] Signing in:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      logger.error('❌ [LOGIN] Auth error:', error.message);
      return { success: false, data: null, error: { message: error.message } };
    }

    if (!data.user) {
      logger.error('❌ [LOGIN] No user returned');
      return { success: false, data: null, error: { message: 'Login failed - no user returned' } };
    }

    logger.log('✅ [LOGIN] Auth successful');

    return { success: true, data: { user: data.user, session: data.session, profile: null }, error: null };
  } catch (error: any) {
    logger.error('💥 [LOGIN] Exception:', error.message);
    return { success: false, data: null, error: { message: error.message } };
  }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  return { success: !error, error: error?.message || null };
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
};

export const getUserRolesForEvent = async (userId: string, eventId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_roles_for_event', { p_user_id: userId, p_event_id: eventId });

    if (error) {
      logger.error('Error fetching user roles:', error);
      return { data: null, error };
    }

    return { data: (data as string[]) || [], error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

export const resetPassword = async (email: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// ATTENDANCE & SEARCH
// ============================================================================

// `eventId` is the caller's own event (profile.event_id). Left out, the database
// falls back to the current event — which is wrong for staff of any other live event.
export const getAttendeeByPersonalId = async (personalId: string, eventId?: string) => {
  try {
    const { data, error } = await supabase
      .rpc('reg_team_get_attendee_by_personal_id', { p_personal_id: personalId, p_event_id: eventId ?? null });

    if (error) {
      logger.error('reg_team_get_attendee_by_personal_id Error:', error);
      return { data: null, error: { message: error.message } };
    }

    if (!data) return { data: null, error: { message: 'Attendee not found' } };

    return { data: data as any, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};


export const processAttendance = async (personalId: string, action: 'enter' | 'exit', eventId?: string) => {
  try {
    // First resolve the attendee to get their ID — in the same event we record into.
    const { data: attendee, error: fetchError } = await getAttendeeByPersonalId(personalId, eventId);
    if (fetchError || !attendee) {
      throw new Error(fetchError?.message || 'Attendee not found');
    }

    const { error } = await supabase
      .rpc('reg_team_record_attendance', {
        p_attendee_id: attendee.id,
        p_type: action === 'enter' ? 'entry' : 'exit',
        p_event_id: eventId ?? null
      });

    if (error) {
      logger.error('reg_team_record_attendance Error:', error);
      return { data: null, error: { message: error.message } };
    }

    return {
      data: { message: `Successfully processed ${action} for ${attendee.full_name}` },
      error: null
    };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// STATISTICS & RANKINGS
// ============================================================================

export const getRecentActivities = async (_userId: string, limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .rpc('get_all_user_activities', { p_limit: limit });

    if (error) {
      logger.error('get_all_user_activities Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};


// ============================================================================
// SECURE REGTEAM FUNCTIONS (via SECURITY DEFINER RPCs)
// ============================================================================

export const searchAttendeesByPersonalId = async (query: string, eventId?: string) => {
  try {
    const { data, error } = await supabase
      .rpc('reg_team_search_attendees', { p_query: sanitizeSearchQuery(query), p_event_id: eventId ?? null });

    if (error) {
      logger.error('reg_team_search_attendees Error:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: (data as any[]) || [], error: null };
  } catch (error: any) {
    logger.error('searchAttendeesByPersonalId Exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

export const getAttendeeByPersonalIdOptimized = async (personalId: string, eventId?: string) => {
  try {
    const { data, error } = await supabase
      .rpc('reg_team_get_attendee_by_personal_id', { p_personal_id: personalId, p_event_id: eventId ?? null });

    if (error) {
      logger.error('reg_team_get_attendee_by_personal_id Error:', error);
      return { data: null, error: { message: error.message } };
    }

    if (!data) return { data: null, error: { message: 'Attendee not found' } };

    return { data: data as any, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};
export const getUserProfileByUUID = async (uuid: string) => {
  try {
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role, event_id')
      .in('role', ['registration', 'building'])
      .order('role', { ascending: true }) // 'building' < 'registration'
      .limit(1)
      .maybeSingle();

    const rpcName =
      roleRow?.role === 'building'
        ? 'build_team_get_attendee_by_uuid'
        : 'reg_team_get_attendee_by_uuid';

    const { data, error } = await supabase
      .rpc(rpcName, { p_uuid: uuid });

    if (error) {
      logger.error('reg_team_get_attendee_by_uuid Error:', error);
      const msg = error.message?.includes('User not found')
        ? "This user doesn't have an account"
        : error.message?.includes('not registered')
          ? 'User not registered for this event'
          : error.message;
      return { data: null, error: { message: msg } };
    }

    if (!data) return { data: null, error: { message: 'User not found' } };

    return { data: data as any, error: null };
  } catch (error: any) {
    logger.error('getUserProfileByUUID Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const recordAttendeeAttendance = async ({
  attendeeId,
  checkedInBy: _checkedInBy,
  type,
  eventId
}: {
  attendeeId: string;
  checkedInBy: string;
  type: 'entry' | 'exit';
  /** The scanning staff member's own event (profile.event_id). Omitted, the
   *  database falls back to the current event — wrong when two events are live. */
  eventId?: string;
}) => {
  try {
    logger.log(`--- reg_team_record_attendance (${type}) ---`);
    logger.log('Attendee ID:', attendeeId);

    const { data, error } = await supabase
      .rpc('reg_team_record_attendance', { p_attendee_id: attendeeId, p_type: type, p_event_id: eventId ?? null });

    if (error) {
      logger.error('reg_team_record_attendance Error:', error);
      const msg = error.message?.includes('Entry denied') ? error.message
        : error.message?.includes('already checked in') ? 'User is already checked in!'
          : error.message?.includes('not currently inside') ? 'User is not checked in!'
            : error.message;
      return { data: null, error: { message: msg } };
    }

    logger.log(`✅ ${type} Successful:`, data);
    return { data, error: null };
  } catch (error: any) {
    logger.error('recordAttendeeAttendance Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const getVolunteerStatsRPC = async (_userId: string) => {
  try {
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role, event_id')
      .in('role', ['registration', 'verification', 'building'])
      .order('role', { ascending: true })
      .limit(1)
      .maybeSingle();

    const rpcName =
      roleRow?.role === 'building'
        ? 'build_team_get_volunteer_stats'
        : roleRow?.role === 'verification'
          ? 'verif_team_get_volunteer_stats'
          : 'reg_team_get_volunteer_stats';

    const { data, error } = await supabase
      .rpc(rpcName)
      .single();

    if (error) {
      logger.error('❌ [STATS RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }

    const stats = data as any;
    return {
      data: {
        total_points: stats?.total_points || 0,
        team_rank: stats?.team_rank || 0,
        team_size: stats?.team_size || 0
      },
      error: null
    };
  } catch (error: any) {
    logger.error('💥 [STATS RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// SESSION SEARCH
// ============================================================================

export const searchSessionBookings = async (sessionId: string, query: string, eventId?: string) => {
  if (!query || query.length < 2) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .rpc('build_team_search_session_bookings', {
        p_session_id: sessionId,
        p_query: sanitizeSearchQuery(query),
        p_event_id: eventId ?? null
      });

    if (error) {
      logger.error('❌ [SESSION SEARCH] building_search_session_bookings Error:', error.message);
      return { data: null, error: { message: error.message } };
    }

    return { data: (data as any[]) || [], error: null };
  } catch (error: any) {
    logger.error('💥 [SESSION SEARCH] Exception:', error.message);
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// BUILDING TEAM DASHBOARD RPC FUNCTIONS
// ============================================================================

export const getBuildingNotificationsRPC = async (eventId: string) => {
  try {
    // Shared by RegTeam + Building dashboards. Route by caller role.
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('event_id', eventId)
      .in('role', ['registration', 'building'])
      .order('role', { ascending: true }) // 'building' < 'registration'
      .limit(1)
      .maybeSingle();

    const rpcName =
      roleRow?.role === 'building'
        ? 'build_team_get_notifications'
        : 'reg_team_get_notifications';

    const { data, error } = await supabase.rpc(rpcName, { p_event_id: eventId });
    if (error) {
      logger.error('❌ [NOTIFICATIONS RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data: data || [], error: null };
  } catch (error: any) {
    logger.error('💥 [NOTIFICATIONS RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const getBuildingActivitiesRPC = async (limit: number = 3) => {
  try {
    const { data, error } = await supabase.rpc('get_my_activities', { p_limit: limit });
    if (error) {
      logger.error('❌ [BUILDING ACTIVITIES RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data: data || [], error: null };
  } catch (error: any) {
    logger.error('💥 [BUILDING ACTIVITIES RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const getBuildingSessionsRPC = async (eventId?: string) => {
  try {
    const { data, error } = await supabase.rpc('build_team_get_sessions', { p_event_id: eventId ?? null });
    if (error) {
      logger.error('❌ [BUILDING SESSIONS RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data: data || [], error: null };
  } catch (error: any) {
    logger.error('💥 [BUILDING SESSIONS RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const getSessionBookingForCheckinRPC = async (sessionId: string, attendeeId: string, eventId?: string) => {
  try {
    const { data, error } = await supabase.rpc('build_team_get_session_booking_for_checkin', {
      p_session_id: sessionId,
      p_attendee_id: attendeeId,
      p_event_id: eventId ?? null
    });
    if (error) {
      logger.error('❌ [SESSION BOOKING CHECKIN RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    const booking = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return { data: booking, error: null };
  } catch (error: any) {
    logger.error('💥 [SESSION BOOKING CHECKIN RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const buildingSessionCheckinRPC = async (bookingId: string) => {
  try {
    const { data, error } = await supabase.rpc('build_team_session_checkin', { p_booking_id: bookingId });
    if (error) {
      logger.error('❌ [BUILDING SESSION CHECKIN RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data, error: null };
  } catch (error: any) {
    logger.error('💥 [BUILDING SESSION CHECKIN RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const getMyScanCountRPC = async (eventId?: string) => {
  try {
    const { data, error } = await supabase.rpc('reg_team_get_my_scan_count', { p_event_id: eventId ?? null });
    if (error) {
      logger.error('❌ [MY SCAN COUNT RPC] Error:', error);
      return { count: 0, error: { message: error.message } };
    }
    return { count: data || 0, error: null };
  } catch (error: any) {
    logger.error('💥 [MY SCAN COUNT RPC] Exception:', error);
    return { count: 0, error: { message: error.message } };
  }
};

// ============================================================================
// BUILDING TEAM — BOOKING
// ============================================================================

export const logUserActivityRPC = async (eventId: string, activityType: string, description: string, points: number = 1) => {
  try {
    const { error } = await supabase.rpc('log_user_activity', {
      p_event_id: eventId,
      p_activity_type: activityType,
      p_description: description,
      p_points: points
    });
    if (error) {
      logger.error('❌ [LOG ACTIVITY RPC] Error:', error);
      return { error: { message: error.message } };
    }
    return { error: null };
  } catch (error: any) {
    logger.error('💥 [LOG ACTIVITY RPC] Exception:', error);
    return { error: { message: error.message } };
  }
};

// Merged Building dashboard stats.
export const getBuildingStatsRPC = async (eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('build_team_get_stats', { p_event_id: eventId });
    if (error) {
      logger.error('❌ [BUILDING STATS RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data, error: null };
  } catch (error: any) {
    logger.error('💥 [BUILDING STATS RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Building team: search attendees by Personal ID.
export const searchAttendeesByPersonalIdBuildingRPC = async (personalId: string, eventId?: string) => {
  try {
    const { data, error } = await supabase.rpc('build_team_search_attendees_by_personal_id', {
      p_personal_id: personalId,
      p_event_id: eventId ?? null
    });
    if (error) {
      logger.error('❌ [BUILDING ATTENDEE SEARCH RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data: (data as any[]) || [], error: null };
  } catch (error: any) {
    logger.error('💥 [BUILDING ATTENDEE SEARCH RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// In supabase.ts - add these helpers
export const getVolunteerNotificationsRPC = async (eventId: string) => {
  const { data, error } = await supabase.rpc('get_volunteer_notifications', { p_event_id: eventId });
  return { data: (data as any[]) || [], error };
};

export const getVolunteerRecentActivitiesRPC = async (limit: number = 3) => {
  const { data, error } = await supabase.rpc('get_volunteer_recent_activities', { p_limit: limit });
  return { data: (data as any[]) || [], error };
};

export const getSessionBookingsRPC = async (sessionId: string) => {
  try {
    const { data, error } = await supabase.rpc('admin_get_session_bookings', { _session_id: sessionId });
    if (error) {
      logger.error('❌ [SESSION BOOKINGS RPC] Error:', error);
      return { data: null, error: { message: error.message } };
    }
    return { data: data || [], error: null };
  } catch (error: any) {
    logger.error('💥 [SESSION BOOKINGS RPC] Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};
// ============================================================================
// SHARED — any authenticated user with any role can read their own activities
// ============================================================================

export const getMyActivitiesRPC = async (limit: number = 3) => {
  const { data, error } = await supabase.rpc('get_my_activities', { p_limit: limit });
  return {
    data: (data as any[]) || [],
    error: error ? { message: error.message } : null,
  };
};
// ============================================================================
// BUILDING TEAM RPC WRAPPERS (strict: role = 'building')
// ============================================================================

export const buildTeamGetAttendeeByUUID = async (uuid: string) => {
  const { data, error } = await supabase.rpc('build_team_get_attendee_by_uuid', { p_uuid: uuid });
  if (error) return { data: null, error: { message: error.message } };
  if (!data) return { data: null, error: { message: 'User not found' } };
  return { data: data as any, error: null };
};

export const buildTeamGetVolunteerStatsRPC = async (eventId?: string) => {
  const { data, error } = await supabase.rpc('build_team_get_volunteer_stats', { p_event_id: eventId ?? null }).single();
  if (error) {
    logger.error('❌ [BUILD TEAM STATS RPC] Error:', error);
    return { data: null, error: { message: error.message } };
  }
  const stats = data as any;
  return {
    data: {
      total_points: stats?.total_points || 0,
      team_rank: stats?.team_rank || 0,
      team_size: stats?.team_size || 0,
    },
    error: null,
  };
};

export const buildTeamGetNotificationsRPC = async (eventId: string) => {
  const { data, error } = await supabase.rpc('build_team_get_notifications', { p_event_id: eventId });
  return {
    data: (data as any[]) || [],
    error: error ? { message: error.message } : null,
  };
};

export const buildTeamGetSessionsRPC = async (eventId?: string) => {
  const { data, error } = await supabase.rpc('build_team_get_sessions', { p_event_id: eventId ?? null });
  return {
    data: (data as any[]) || [],
    error: error ? { message: error.message } : null,
  };
};

export const buildTeamSearchSessionBookings = async (sessionId: string, query: string, eventId?: string) => {
  if (!query || query.length < 2) return { data: [], error: null };
  const { data, error } = await supabase.rpc('build_team_search_session_bookings', {
    p_session_id: sessionId,
    p_query: sanitizeSearchQuery(query),
    p_event_id: eventId ?? null,
  });
  return {
    data: (data as any[]) || [],
    error: error ? { message: error.message } : null,
  };
};

export const buildTeamGetSessionBookingForCheckin = async (sessionId: string, attendeeId: string, eventId?: string) => {
  const { data, error } = await supabase.rpc('build_team_get_session_booking_for_checkin', {
    p_session_id: sessionId,
    p_attendee_id: attendeeId,
    p_event_id: eventId ?? null,
  });
  if (error) return { data: null, error: { message: error.message } };
  const booking = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return { data: booking, error: null };
};

export const buildTeamSessionCheckinRPC = async (bookingId: string) => {
  const { data, error } = await supabase.rpc('build_team_session_checkin', { p_booking_id: bookingId });
  return {
    data,
    error: error ? { message: error.message } : null,
  };
};

// ============================================================================
// EVENT FEEDBACK
// `eventId` is always passed in by the caller (the active event), so this file
// never imports currentEvent.ts — that would be a circular import.
// ============================================================================

export type FeedbackQuestionType = 'text' | 'rating';

export interface FeedbackQuestion {
  id: string;
  question_text: string;
  question_type: FeedbackQuestionType;
  display_order: number;
  is_required: boolean;
  is_active?: boolean;
  created_at?: string;
  answer_count?: number;
}

export interface FeedbackAnswerInput {
  question_id: string;
  answer_text?: string | null;
  rating?: number | null;
}

export interface FeedbackSubmissionAnswer extends FeedbackAnswerInput {
  question_text: string;
  question_type: FeedbackQuestionType;
  display_order: number;
}

export interface FeedbackSubmission {
  id: string;
  user_id: string;
  respondent_role: string;
  submitted_at: string;
  full_name: string;
  personal_id: string | null;
  email: string | null;
  phone: string | null;
  faculty: string | null;
  university: string | null;
  department: string | null;
  volunteer_id: string | null;
  team_name: string | null;
  answers: FeedbackSubmissionAnswer[];
}

/** Unwraps the `{ success, error, ... }` envelope every feedback RPC returns. */
const FEEDBACK_GENERIC_ERROR = 'Something went wrong. Please try again later.';

// Server messages that are safe to show as-is. Anything else (Postgres,
// PostgREST, network) is logged and replaced with a generic message, so schema
// and function names never reach the screen.
const FEEDBACK_SAFE_ERRORS: Record<string, string> = {
  'Unauthorized': 'You are not allowed to perform this action.',
  'Already submitted': 'You have already submitted your feedback.',
  'Feedback is closed': 'Feedback is closed at the moment.',
  'No answers provided': 'Answer at least one question before submitting.',
  'No valid answers provided': 'Answer at least one question before submitting.',
  'Question text is required': 'Question text is required.',
  'Invalid question type': 'Please choose a valid answer type.',
  'Invalid visibility': 'Please choose whether to show or hide the questions.',
  'Question not found': 'This question no longer exists. Refresh and try again.'
};

const feedbackFailure = (label: string, detail: unknown) => {
  logger.error(`[${label}]`, detail);
  const safe = typeof detail === 'string' ? FEEDBACK_SAFE_ERRORS[detail] : undefined;
  return { data: null, error: { message: safe || FEEDBACK_GENERIC_ERROR } };
};

const unwrapFeedbackRPC = <T,>(label: string, data: any, error: any): { data: T | null; error: { message: string } | null } => {
  if (error) return feedbackFailure(label, error);
  if (!data?.success) return feedbackFailure(label, data?.error);
  return { data: data as T, error: null };
};

/** Active questions shown to attendees and volunteers. */
export const getFeedbackQuestionsRPC = async (eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_feedback_questions', { p_event_id: eventId });
    const result = unwrapFeedbackRPC<{ questions: FeedbackQuestion[]; open?: boolean }>('FEEDBACK QUESTIONS RPC', data, error);
    // `open` is false when a super admin has closed feedback.
    return { data: result.data?.questions || null, open: result.data?.open !== false, error: result.error };
  } catch (error: any) {
    return { ...feedbackFailure('FEEDBACK QUESTIONS RPC', error), open: true };
  }
};

/** The caller's own submission, used to pre-fill and to show the submitted state. */
export const getMyFeedbackRPC = async (eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_my_feedback', { p_event_id: eventId });
    return unwrapFeedbackRPC<{
      submitted: boolean;
      submitted_at?: string;
      updated_at?: string;
      answers: FeedbackAnswerInput[];
    }>('MY FEEDBACK RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('MY FEEDBACK RPC', error);
  }
};

/** Submit the whole feedback form. */
export const submitFeedbackRPC = async (answers: FeedbackAnswerInput[], eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('submit_feedback', {
      p_event_id: eventId,
      p_answers: answers
    });
    return unwrapFeedbackRPC<{ submission_id: string; answers_saved: number }>('SUBMIT FEEDBACK RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('SUBMIT FEEDBACK RPC', error);
  }
};

/** Admin: every question, including hidden ones. */
export const adminGetFeedbackQuestionsRPC = async (eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('admin_get_feedback_questions', { p_event_id: eventId });
    const result = unwrapFeedbackRPC<{ questions: FeedbackQuestion[] }>('ADMIN FEEDBACK QUESTIONS RPC', data, error);
    return { data: result.data?.questions || null, error: result.error };
  } catch (error: any) {
    return feedbackFailure('ADMIN FEEDBACK QUESTIONS RPC', error);
  }
};

/** Admin: create (omit `questionId`) or update a question. */
export const adminUpsertFeedbackQuestionRPC = async (params: {
  questionText: string;
  questionType: FeedbackQuestionType;
  questionId?: string | null;
  isRequired?: boolean;
  isActive?: boolean;
  eventId: string;
}) => {
  try {
    const { data, error } = await supabase.rpc('admin_upsert_feedback_question', {
      p_event_id: params.eventId,
      p_question_text: params.questionText,
      p_question_type: params.questionType,
      p_question_id: params.questionId || null,
      p_is_required: params.isRequired ?? false,
      p_is_active: params.isActive ?? false
    });
    return unwrapFeedbackRPC<{ question_id: string }>('UPSERT FEEDBACK QUESTION RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('UPSERT FEEDBACK QUESTION RPC', error);
  }
};

export const adminDeleteFeedbackQuestionRPC = async (questionId: string, eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('admin_delete_feedback_question', {
      p_event_id: eventId,
      p_question_id: questionId
    });
    return unwrapFeedbackRPC<{ success: boolean }>('DELETE FEEDBACK QUESTION RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('DELETE FEEDBACK QUESTION RPC', error);
  }
};

/** Admin: persist a new order. `questionIds` must be the full ordered list. */
export const adminReorderFeedbackQuestionsRPC = async (questionIds: string[], eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('admin_reorder_feedback_questions', {
      p_event_id: eventId,
      p_question_ids: questionIds
    });
    return unwrapFeedbackRPC<{ success: boolean }>('REORDER FEEDBACK QUESTIONS RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('REORDER FEEDBACK QUESTIONS RPC', error);
  }
};

/** Admin: show (`true`) or hide (`false`) every question of the event at once. */
export const adminSetAllFeedbackQuestionsVisibilityRPC = async (isActive: boolean, eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('admin_set_all_feedback_questions_visibility', {
      p_event_id: eventId,
      p_is_active: isActive
    });
    return unwrapFeedbackRPC<{ updated: number }>('SET ALL FEEDBACK VISIBILITY RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('SET ALL FEEDBACK VISIBILITY RPC', error);
  }
};

/** Admin: paginated submissions with respondent identity and inlined answers. */
export const adminGetFeedbackSubmissionsRPC = async (params: {
  limit?: number;
  offset?: number;
  search?: string;
  role?: string;
  eventId: string;
}) => {
  try {
    const { data, error } = await supabase.rpc('admin_get_feedback_submissions', {
      p_event_id: params.eventId,
      p_limit: params.limit ?? 20,
      p_offset: params.offset ?? 0,
      p_search: params.search ? sanitizeSearchQuery(params.search) : null,
      p_role: params.role || null
    });
    return unwrapFeedbackRPC<{
      total: number;
      limit: number;
      offset: number;
      submissions: FeedbackSubmission[];
    }>('ADMIN FEEDBACK SUBMISSIONS RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('ADMIN FEEDBACK SUBMISSIONS RPC', error);
  }
};

/** Admin: totals and per-question rating averages. */
export const adminGetFeedbackStatsRPC = async (eventId: string) => {
  try {
    const { data, error } = await supabase.rpc('admin_get_feedback_stats', { p_event_id: eventId });
    return unwrapFeedbackRPC<{
      total_submissions: number;
      attendee_count: number;
      volunteer_count: number;
      rating_summary: { id: string; question_text: string; average_rating: number; response_count: number }[];
    }>('ADMIN FEEDBACK STATS RPC', data, error);
  } catch (error: any) {
    return feedbackFailure('ADMIN FEEDBACK STATS RPC', error);
  }
};
