// lib/supabase.ts - Optimized Supabase Integration for Employment Fair
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================
// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Default event ID for EF2026
export const DEFAULT_EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create clients
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'supabase.admin.auth.token' // Explicitly separate storage
    }
  })
  : null;

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
    validationErrors?: ValidationError[];
  } | null;
}

export interface AttendeeRegistrationData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  personalId: string;
  gender?: string;
  nationality?: string;
  university: string;
  faculty: string;
  degreeLevel?: string;
  department: string;
  classYear?: string;
  cvFile?: File;
  enrollmentProofFile?: File;
  volunteerId?: string;
}

export interface VolunteerRegistrationData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  personalId: string;
  gender: string;
  teamId: string;
  isTeamLeader?: boolean;
}

export interface EmployerRegistrationData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  personalId: string;
  jobTitle: string;
  companyKey: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Delete auth user (admin only) - Used for cleanup on registration failures
 */
const deleteAuthUser = async (userId: string): Promise<void> => {
  if (!supabaseAdmin) {
    console.warn('⚠️ Cannot delete auth user - admin client unavailable');
    return;
  }

  try {
    console.log('🗑️ [CLEANUP] Deleting auth user:', userId);

    // First, sign out the client to ensure no lingering session state
    await supabase.auth.signOut();

    // Then delete the user from admin
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('❌ [CLEANUP] Failed to delete auth user:', error.message);
    } else {
      console.log('✅ [CLEANUP] Auth user deleted successfully');
    }
  } catch (error: any) {
    console.error('❌ [CLEANUP] Exception deleting auth user:', error.message);
  }
};



/**
 * Upload file to Supabase Storage
 */
type FileCategory = 'CV' | 'Uni_ID' | 'company-logo';

export const uploadFile = async (
  category: FileCategory,
  userId: string,
  file: File
): Promise<{ data: { path: string; url: string } | null; error: { message: string } | null }> => {
  try {
    // Validate file type
    const allowedTypes: Record<FileCategory, string[]> = {
      'CV': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'Uni_ID': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
      'company-logo': ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
    };

    if (!allowedTypes[category].includes(file.type)) {
      return {
        data: null,
        error: { message: `Invalid file type for ${category}. Allowed: ${allowedTypes[category].join(', ')}` }
      };
    }

    // Check size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { data: null, error: { message: `File must be under 10MB` } };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      return { data: null, error: { message: 'File must have an extension' } };
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
    const fileName = `${sanitized}_${timestamp}_${random}.${fileExt}`;
    const filePath = `${userId}/${category}/${fileName}`;

    console.log(`📤 [UPLOAD] Uploading ${category}:`, fileName);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('Users')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [UPLOAD] Error:', uploadError.message);
      return { data: null, error: { message: uploadError.message } };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('Users')
      .getPublicUrl(filePath);

    console.log('✅ [UPLOAD] File uploaded:', publicUrl);

    return {
      data: { path: filePath, url: publicUrl },
      error: null
    };

  } catch (error: any) {
    console.error('💥 [UPLOAD] Exception:', error.message);
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// ATTENDEE REGISTRATION
// ============================================================================

export const registerAttendee = async (data: AttendeeRegistrationData): Promise<AuthResult> => {
  let authUserId: string | null = null;
  const warnings: string[] = [];

  try {
    console.log('🚀 [ATTENDEE] Starting registration for:', data.email);

    // ========================================================================
    // STEP 1: AUTH USER CREATION
    // ========================================================================
    console.log('🔐 [ATTENDEE] Step 1: Creating auth user...');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName.trim(),
          role: 'attendee'
        }
      }
    });

    if (authError) {
      console.error('❌ [ATTENDEE] Auth error:', authError.message);
      return {
        success: false,
        data: null,
        error: {
          message: authError.message,
          validationErrors: [{ field: 'email', message: authError.message }]
        }
      };
    }

    if (!authData.user) {
      console.error('❌ [ATTENDEE] No user returned from auth');
      return {
        success: false,
        data: null,
        error: { message: 'User creation failed - no user returned' }
      };
    }

    authUserId = authData.user.id;
    console.log('✅ [ATTENDEE] Auth user created:', authUserId);

    // ========================================================================
    // STEP 2: USER PROFILE
    // ========================================================================
    console.log('👤 [ATTENDEE] Step 2: Creating user profile...');

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUserId,
        email: data.email.trim().toLowerCase(),
        full_name: data.fullName.trim(),
        phone: data.phone.trim(),
        personal_id: data.personalId.trim(),
        preferred_language: 'en',
        score: 0
      });

    if (profileError) {
      console.error('❌ [ATTENDEE] Profile creation failed:', profileError.message);
      // Cleanup: Delete auth user since profile failed
      await deleteAuthUser(authUserId);

      return {
        success: false,
        data: null,
        error: {
          message: 'Failed to create user profile: ' + profileError.message,
          validationErrors: [{ field: 'general', message: profileError.message }]
        }
      };
    }

    console.log('✅ [ATTENDEE] User profile created');

    // ========================================================================
    // STEP 3: ATTENDEE RECORD
    // ========================================================================
    console.log('🎓 [ATTENDEE] Step 3: Creating attendee record...');

    const isAsuStudent = data.university.toLowerCase() === 'ain shams university';
    console.log(`📊 [ATTENDEE] ASU Student: ${isAsuStudent}`);

    const { error: attendeeError } = await supabase
      .from('attendees')
      .insert({
        user_id: authUserId,
        is_asu_student: isAsuStudent,
        student_id: data.personalId.trim(),
        university: data.university.trim(),
        faculty: data.faculty.trim(),
        department: data.department.trim(),
        cv_url: null, // Will be updated after file upload
        enrollment_proof_url: null, // Will be updated after file upload
        registration_status: 'pending',
        payment_status: isAsuStudent ? null : 'pending'
      });
    // .select().single() removed as id column is gone

    if (attendeeError) {
      console.error('❌ [ATTENDEE] Attendee record creation failed:', attendeeError.message);
      // Cleanup: Delete auth user
      await deleteAuthUser(authUserId);

      return {
        success: false,
        data: null,
        error: {
          message: 'Failed to create attendee record: ' + attendeeError.message,
          validationErrors: [{ field: 'general', message: attendeeError.message }]
        }
      };
    }

    const attendeeData = { user_id: authUserId }; // Placeholder for data


    console.log('✅ [ATTENDEE] Attendee record created');

    // ========================================================================
    // STEP 4: ROLE ASSIGNMENT
    // ========================================================================
    console.log('🎭 [ATTENDEE] Step 4: Assigning role...');

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUserId,
        event_id: DEFAULT_EVENT_ID,
        role: 'attendee'
      });

    if (roleError) {
      console.error('❌ [ATTENDEE] Role assignment failed:', roleError.message);
      // Cleanup: Delete auth user
      await deleteAuthUser(authUserId);

      return {
        success: false,
        data: null,
        error: {
          message: 'Failed to assign role: ' + roleError.message,
          validationErrors: [{ field: 'general', message: roleError.message }]
        }
      };
    }

    console.log('✅ [ATTENDEE] Role assigned');

    // ========================================================================
    // STEP 5: EVENT LINK (SKIPPED)
    // ========================================================================
    // console.log('🔗 [ATTENDEE] Step 5: Linking to event (SKIPPED)...');
    // User events table is deprecated

    // ========================================================================
    // STEP 6: FILE UPLOADS (Non-critical)
    // ========================================================================
    console.log('📁 [ATTENDEE] Step 6: Uploading files...');

    let cvUrl: string | null = null;
    let enrollmentProofUrl: string | null = null;

    // Upload CV (optional)
    if (data.cvFile) {
      console.log('📄 [ATTENDEE] Uploading CV...');
      const { data: cvData, error: cvError } = await uploadFile('CV', authUserId, data.cvFile);

      if (cvData) {
        cvUrl = cvData.url;
        console.log('✅ [ATTENDEE] CV uploaded');
      } else {
        console.warn('⚠️ [ATTENDEE] CV upload failed:', cvError?.message);
        warnings.push('CV upload failed: ' + (cvError?.message || 'Unknown error'));
      }
    }

    // Upload University ID (required but non-critical for success)
    if (data.enrollmentProofFile) {
      console.log('🆔 [ATTENDEE] Uploading University ID...');
      const { data: idData, error: idError } = await uploadFile('Uni_ID', authUserId, data.enrollmentProofFile);

      if (idData) {
        enrollmentProofUrl = idData.url;
        console.log('✅ [ATTENDEE] University ID uploaded');
      } else {
        console.warn('⚠️ [ATTENDEE] University ID upload failed:', idError?.message);
        warnings.push('University ID upload failed: ' + (idError?.message || 'Unknown error'));
      }
    }

    // Update attendee record with file URLs
    if (cvUrl || enrollmentProofUrl) {
      console.log('💾 [ATTENDEE] Updating file URLs in database...');

      const updateData: any = {};
      if (cvUrl) updateData.cv_url = cvUrl;
      if (enrollmentProofUrl) updateData.enrollment_proof_url = enrollmentProofUrl;

      const { error: updateError } = await supabase
        .from('attendees')
        .update(updateData)
        .eq('user_id', authUserId);

      if (updateError) {
        console.warn('⚠️ [ATTENDEE] File URL update failed:', updateError.message);
        warnings.push('File URL update failed: ' + updateError.message);
      } else {
        console.log('✅ [ATTENDEE] File URLs updated');
      }
    }

    // ========================================================================
    // STEP 7: REFERRAL PROCESSING (Non-critical)
    // ========================================================================
    if (data.volunteerId) {
      console.log('🤝 [ATTENDEE] Processing referral:', data.volunteerId);
      try {
        // 1. Find volunteer by custom ID (case-insensitive)
        const { data: volunteerData, error: voltError } = await supabase
          .from('volunteers')
          .select('user_id, full_name')
          .ilike('volunteer_id', data.volunteerId.trim())
          .single();

        if (volunteerData) {
          console.log(`✅ [ATTENDEE] Volunteer found: ${volunteerData.full_name}`);

          // 2. Award points
          const { error: pointsError } = await supabase
            .from('user_activities')
            .insert({
              user_id: volunteerData.user_id, // Volunteer's user_id
              event_id: DEFAULT_EVENT_ID,
              activity_type: 'recruit_attendee',
              description: `Recruited attendee: ${data.email}`,
              points_earned: 10
            });

          if (pointsError) {
            console.warn('⚠️ [ATTENDEE] Failed to award points:', pointsError.message);
          } else {
            console.log('✅ [ATTENDEE] Points awarded to volunteer');
          }
        } else {
          console.warn('⚠️ [ATTENDEE] Volunteer not found for referral:', data.volunteerId);
          if (voltError) console.warn('Error details:', voltError.message);
        }
      } catch (err) {
        console.error('⚠️ [ATTENDEE] Referral processing error:', err);
      }
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('🎉 [ATTENDEE] Registration complete!');

    if (warnings.length > 0) {
      console.warn('⚠️ [ATTENDEE] Registration succeeded with warnings:', warnings);
    }

    return {
      success: true,
      data: {
        user: authData.user,
        session: authData.session,
        profile: {
          id: authUserId,
          full_name: data.fullName,
          phone: data.phone,
          personal_id: data.personalId
        },
        attendee: {
          ...attendeeData,
          cv_url: cvUrl,
          enrollment_proof_url: enrollmentProofUrl
        }
      },
      error: warnings.length > 0 ? {
        message: warnings.join('; '),
        validationErrors: warnings.map(w => ({ field: 'files', message: w }))
      } : null
    };

  } catch (error: any) {
    console.error('💥 [ATTENDEE] Registration failed:', error.message);

    // Cleanup on failure
    if (authUserId) {
      await deleteAuthUser(authUserId);
    }

    return {
      success: false,
      data: null,
      error: {
        message: error.message || 'Registration failed',
        validationErrors: [{ field: 'general', message: error.message }]
      }
    };
  }
};

// ============================================================================
// VOLUNTEER REGISTRATION
// ============================================================================



/**
 * Register a new volunteer with 5-step flow:
 * 1. Create Auth User
 * 2. Create User Profile
 * 3. Create Volunteer Record (with auto-generated volunteer_id)
 * 4. Assign volunteer role
 * 5. Link to default event
 */
export const registerVolunteer = async (data: VolunteerRegistrationData): Promise<AuthResult> => {
  console.log('🚀 [VOLUNTEER] Starting registration for:', data.email);
  let authUserId: string | null = null;

  try {
    // ========================================================================
    // STEP 1: Create Auth User
    // ========================================================================
    console.log('🔐 [VOLUNTEER] Step 1: Creating auth user...');

    // Determine role based on team ID
    // Building: f9419a07... -> building
    // Registration: fc15e3bb... -> registration
    // Info Desk: 9269ac6a... -> info_desk
    // Verification: a0abd4b7... -> verification
    // Others -> volunteer
    let volunteerRole = 'volunteer';
    const teamId = data.teamId;

    if (teamId === 'f9419a07-f974-4f59-bba2-b2f9a2b2fa7f') volunteerRole = 'building';
    else if (teamId === 'fc15e3bb-ceed-4aa3-acf5-004a7af664ed') volunteerRole = 'registration';
    else if (teamId === '9269ac6a-7b2c-4be5-ab72-3f8278eb8e33') volunteerRole = 'info_desk';
    else if (teamId === 'a0abd4b7-7879-4a07-806d-fd0e2f4257f1') volunteerRole = 'verification';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName.trim(),
          role: volunteerRole
        }
      }
    });

    if (authError) {
      console.error('❌ [VOLUNTEER] Auth creation failed:', authError.message);

      // Handle specific auth errors
      if (authError.message.includes('already registered')) {
        return {
          success: false,
          data: null,
          error: {
            message: 'This email is already registered',
            validationErrors: [{ field: 'email', message: 'Email already in use' }]
          }
        };
      }

      return {
        success: false,
        data: null,
        error: { message: authError.message }
      };
    }

    if (!authData.user) {
      return {
        success: false,
        data: null,
        error: { message: 'Failed to create user account' }
      };
    }

    authUserId = authData.user.id;
    console.log('✅ [VOLUNTEER] Step 1 complete. User ID:', authUserId);

    // ========================================================================
    // STEP 2: Create User Profile
    // ========================================================================
    console.log('👤 [VOLUNTEER] Step 2: Creating user profile...');

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUserId,
        email: data.email.trim().toLowerCase(),
        full_name: data.fullName.trim(),
        phone: data.phone.trim(),
        personal_id: data.personalId.trim(),
        preferred_language: 'en',
        score: 0
      });

    if (profileError) {
      console.error('❌ [VOLUNTEER] Profile creation failed:', profileError.message);
      await deleteAuthUser(authUserId);

      if (profileError.message.includes('duplicate') || profileError.message.includes('unique')) {
        const field = profileError.message.includes('phone') ? 'phone' :
          profileError.message.includes('personal_id') ? 'personalId' : 'email';
        return {
          success: false,
          data: null,
          error: {
            message: `This ${field} is already registered`,
            validationErrors: [{ field, message: `${field} already in use` }]
          }
        };
      }

      return {
        success: false,
        data: null,
        error: { message: 'Failed to create user profile' }
      };
    }

    console.log('✅ [VOLUNTEER] Step 2 complete. Profile created.');

    // ========================================================================
    // STEP 3: Create Volunteer Record
    // ========================================================================
    console.log('🎫 [VOLUNTEER] Step 3: Creating volunteer record...');

    const { error: volunteerError } = await supabase
      .from('volunteers')
      .insert({
        user_id: authUserId,
        team_id: data.teamId,
        full_name: data.fullName.trim(),
        volunteer_id: null, // explicit null as requested
        total_points: 0,
        hours_volunteered: 0
      });
    // .select().single() removed

    if (volunteerError) {
      console.error('❌ [VOLUNTEER] Volunteer record creation failed:', volunteerError.message);
      // Cleanup: Delete auth user
      await deleteAuthUser(authUserId);

      if (volunteerError.message.includes('duplicate') || volunteerError.message.includes('unique')) {
        return {
          success: false,
          data: null,
          error: {
            message: 'Volunteer ID conflict. Please try again.',
            validationErrors: [{ field: 'personalId', message: 'Please try again' }]
          }
        };
      }

      return {
        success: false,
        data: null,
        error: { message: 'Failed to create volunteer record' }
      };
    }

    const volunteerData = { user_id: authUserId }; // Placeholder


    console.log('✅ [VOLUNTEER] Step 3 complete. Volunteer record created.');

    // ========================================================================
    // STEP 4: Assign Volunteer Role
    // ========================================================================
    console.log('🎭 [VOLUNTEER] Step 4: Assigning volunteer role...');

    // Override role if team leader
    let finalRole = volunteerRole;
    if (data.isTeamLeader) {
      finalRole = 'team_leader';
      console.log('👑 [VOLUNTEER] User is registering as Team Leader');
    }

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUserId,
        event_id: DEFAULT_EVENT_ID,
        role: finalRole
      });

    if (roleError) {
      console.error('❌ [VOLUNTEER] Role assignment failed:', roleError.message);
      await deleteAuthUser(authUserId);
      return {
        success: false,
        data: null,
        error: { message: 'Failed to assign volunteer role' }
      };
    }

    console.log('✅ [VOLUNTEER] Step 4 complete. Role assigned.');

    // ========================================================================
    // STEP 4.5: Update volunteer_teams if Team Leader
    // ========================================================================
    if (data.isTeamLeader) {
      console.log('👑 [VOLUNTEER] Step 4.5: Updating volunteer_teams with team_leader_id...');

      const { error: teamUpdateError } = await supabase
        .from('volunteer_teams')
        .update({ team_leader_id: authUserId })
        .eq('id', data.teamId);

      if (teamUpdateError) {
        console.error('❌ [VOLUNTEER] Team leader assignment failed:', teamUpdateError.message);
        // This is not critical - user is still created, but team won't have leader set
        console.warn('⚠️ [VOLUNTEER] Continuing despite team leader assignment failure');
      } else {
        console.log('✅ [VOLUNTEER] Step 4.5 complete. Team leader assigned to team.');
      }
    }

    // ========================================================================
    // STEP 5: Link to Default Event (SKIPPED)
    // ========================================================================
    // console.log('🔗 [VOLUNTEER] Step 5: Linking to event (SKIPPED)...');
    // User events table is deprecated

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('🎉 [VOLUNTEER] Registration complete!');

    return {
      success: true,
      data: {
        user: authData.user,
        session: authData.session,
        profile: {
          id: authUserId,
          full_name: data.fullName.trim(),
          phone: data.phone.trim(),
          personal_id: data.personalId.trim()
        },
        volunteer: {
          ...volunteerData,
          volunteer_id: null
        }
      },
      error: null
    };

  } catch (error: any) {
    console.error('❌ [VOLUNTEER] Unexpected error:', error);

    // Cleanup on any unexpected error
    if (authUserId) {
      await deleteAuthUser(authUserId);
    }

    return {
      success: false,
      data: null,
      error: { message: error.message || 'An unexpected error occurred' }
    };
  }
};

// ============================================================================
// EMPLOYER REGISTRATION
// ============================================================================

export const registerEmployer = async (data: EmployerRegistrationData): Promise<AuthResult> => {
  let authUserId: string | null = null;
  console.log('🚀 [EMPLOYER] Starting registration process...');

  try {
    // ========================================================================
    // STEP 0: VALIDATE COMPANY KEY
    // ========================================================================
    console.log('🏢 [EMPLOYER] Step 0: Validating Company ID...');

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id, company_name')
      .ilike('company_key', data.companyKey.trim()) // Case-insensitive match
      .single();

    if (companyError || !companyData) {
      console.error('❌ [EMPLOYER] Invalid Company ID');
      return {
        success: false,
        data: null,
        error: {
          message: 'Invalid Company ID. Please check and try again.',
          validationErrors: [{ field: 'companyKey', message: 'Invalid Company ID' }]
        }
      };
    }

    console.log(`✅ [EMPLOYER] Company found: ${companyData.company_name} (${companyData.id})`);

    // ========================================================================
    // STEP 1: AUTH USER CREATION
    // ========================================================================
    console.log('👤 [EMPLOYER] Step 1: Creating auth user...');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          personal_id: data.personalId,
          role: 'employer'
        }
      }
    });

    if (authError) {
      console.error('❌ [EMPLOYER] Auth failed:', authError.message);
      return {
        success: false,
        data: null,
        error: {
          message: authError.message,
          validationErrors: [{ field: 'email', message: authError.message }]
        }
      };
    }

    if (!authData.user || !authData.session) {
      console.error('❌ [EMPLOYER] No user/session returned');
      return {
        success: false,
        data: null,
        error: { message: 'Registration failed - No session created' }
      };
    }

    authUserId = authData.user.id;
    console.log('✅ [EMPLOYER] Auth user created:', authUserId);

    // ========================================================================
    // STEP 2: PROFILE CREATION
    // ========================================================================
    console.log('📝 [EMPLOYER] Step 2: Creating user profile...');

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUserId,
        email: data.email.trim().toLowerCase(),
        full_name: data.fullName.trim(),
        phone: data.phone.trim(),
        personal_id: data.personalId.trim(),
        preferred_language: 'en',
        score: 0
      });

    if (profileError) {
      console.error('❌ [EMPLOYER] Profile creation failed:', profileError.message);
      await deleteAuthUser(authUserId);

      if (profileError.message.includes('duplicate') || profileError.message.includes('unique')) {
        const field = profileError.message.includes('phone') ? 'phone' :
          profileError.message.includes('personal_id') ? 'personalId' : 'email';
        return {
          success: false,
          data: null,
          error: {
            message: `This ${field} is already registered`,
            validationErrors: [{ field, message: `${field} already in use` }]
          }
        };
      }

      return {
        success: false,
        data: null,
        error: { message: 'Failed to create user profile' }
      };
    }

    console.log('✅ [EMPLOYER] Profile created');

    // ========================================================================
    // STEP 3: EMPLOYER RECORD
    // ========================================================================
    console.log('💼 [EMPLOYER] Step 3: Creating employer record...');

    const { error: employerError } = await supabase
      .from('employer')
      .insert({
        user_id: authUserId,
        company_id: companyData.id,
        job_title: data.jobTitle.trim()
      });

    if (employerError) {
      console.error('❌ [EMPLOYER] Employer record creation failed:', employerError.message);
      await deleteAuthUser(authUserId);
      return {
        success: false,
        data: null,
        error: { message: 'Failed to create employer record' }
      };
    }

    console.log('✅ [EMPLOYER] Employer record created');

    // ========================================================================
    // STEP 4: ROLE ASSIGNMENT
    // ========================================================================
    console.log('🎭 [EMPLOYER] Step 4: Assigning role...');

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUserId,
        event_id: DEFAULT_EVENT_ID,
        role: 'employer'
      });

    if (roleError) {
      console.error('❌ [EMPLOYER] Role assignment failed:', roleError.message);
      await deleteAuthUser(authUserId);
      return {
        success: false,
        data: null,
        error: { message: 'Failed to assign role' }
      };
    }

    console.log('✅ [EMPLOYER] Role assigned');

    // ========================================================================
    // STEP 5: EVENT LINK (SKIPPED)
    // ========================================================================
    // console.log('🔗 [EMPLOYER] Step 5: Linking to event (SKIPPED)...');
    // User events table is deprecated

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('🎉 [EMPLOYER] Registration complete!');

    return {
      success: true,
      data: {
        user: authData.user,
        session: authData.session,
        profile: {
          id: authUserId,
          full_name: data.fullName,
          phone: data.phone,
          personal_id: data.personalId
        },
        attendee: null,
        volunteer: null
      },
      error: null
    };

  } catch (error: any) {
    console.error('❌ [EMPLOYER] Unexpected error:', error);

    if (authUserId) {
      await deleteAuthUser(authUserId);
    }

    return {
      success: false,
      data: null,
      error: { message: error.message || 'An unexpected error occurred' }
    };
  }
};

// ============================================================================
// LOGIN
// ============================================================================

export const signInUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    console.log('🔐 [LOGIN] Signing in:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      console.error('❌ [LOGIN] Auth error:', error.message);
      return {
        success: false,
        data: null,
        error: { message: error.message }
      };
    }

    if (!data.user) {
      console.error('❌ [LOGIN] No user returned');
      return {
        success: false,
        data: null,
        error: { message: 'Login failed - no user returned' }
      };
    }

    console.log('✅ [LOGIN] Auth successful');

    // Note: Profile data will be fetched by AuthContext using get_my_profile RPC
    // We just return the basic auth data here

    return {
      success: true,
      data: {
        user: data.user,
        session: data.session,
        profile: null // Will be populated by AuthContext
      },
      error: null
    };
  } catch (error: any) {
    console.error('💥 [LOGIN] Exception:', error.message);
    return {
      success: false,
      data: null,
      error: { message: error.message }
    };
  }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  return { success: !error, error: error?.message || null };
};

export const getUserRolesForEvent = async (userId: string, eventId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return { data: null, error };
    }

    const roles = data?.map(r => r.role) || [];
    return { data: roles, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Note: Full profile with all roles will be fetched by AuthContext
  // This function just returns basic auth user data
  return user;
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

export const resetPassword = async (email: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`
      }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// ATTENDANCE & SEARCH
// ============================================================================

export const getAttendeeByPersonalId = async (personalId: string) => {
  try {
    // Search in user_profiles first to get the user_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, personal_id')
      .eq('personal_id', personalId)
      .single();

    if (profileError || !profile) {
      return { data: null, error: profileError || { message: 'Attendee not found' } };
    }

    // Then get attendee details
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('*')
      .eq('user_id', profile.id)
      .single();

    if (attendeeError) {
      return { data: null, error: attendeeError };
    }

    // Get role from user_roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .eq('event_id', DEFAULT_EVENT_ID);

    const roles = rolesData?.map(r => r.role) || ['attendee'];
    const primaryRole = roles[0] || 'attendee';

    // Merge data
    return {
      data: {
        ...attendee,
        ...profile,
        id: profile.id,
        role: primaryRole, // Primary role for backwards compatibility
        roles: roles // All roles
      },
      error: null
    };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

export const getAttendeeByUUID = async (uuid: string) => {
  try {
    // Try to find by attendee ID or user ID
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('*')
      .eq('user_id', uuid) // Only user_id is checked now
      .single();

    if (attendeeError || !attendee) {
      return { data: null, error: attendeeError || { message: 'Attendee not found' } };
    }

    // Get profile details
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone, personal_id')
      .eq('id', attendee.user_id)
      .single();

    if (profileError) {
      return { data: null, error: profileError };
    }

    return {
      data: {
        ...attendee,
        ...profile
      },
      error: null
    };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

export const searchAttendeesByPersonalId = async (query: string) => {
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, personal_id')
      .ilike('personal_id', `%${query}%`)
      .limit(5);

    if (error) {
      return { data: null, error };
    }

    // Fetch attendee data for these profiles
    const results = await Promise.all(
      profiles.map(async (profile) => {
        const { data: attendee } = await supabase
          .from('attendees')
          .select('*')
          .eq('user_id', profile.id)
          .single();

        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('event_id', DEFAULT_EVENT_ID);

        const roles = rolesData?.map(r => r.role) || ['attendee'];
        const primaryRole = roles[0] || 'attendee';

        if (!attendee) return null;

        return {
          ...attendee,
          ...profile,
          role: primaryRole,
          roles: roles
        };
      })
    );

    return { data: results.filter(Boolean), error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

export const processAttendance = async (personalId: string, action: 'enter' | 'exit') => {
  try {
    // First get the attendee
    const { data: attendeeResult, error: fetchError } = await getAttendeeByPersonalId(personalId);

    if (fetchError || !attendeeResult) {
      throw new Error(fetchError?.message || 'Attendee not found');
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Update attendee event_entry status
    const eventEntry = action === 'enter';
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ event_entry: eventEntry })
      .eq('user_id', attendeeResult.user_id);

    if (updateError) {
      console.warn('⚠️ Failed to update event_entry status:', updateError.message);
    }

    // Log the attendance
    const { error: logError } = await supabase
      .from('attendance_logs')
      .insert({
        attendee_id: attendeeResult.id,
        action: action,
        scanned_by: user?.id || null
      });

    if (logError) {
      console.warn('⚠️ Failed to log attendance:', logError.message);
    }

    return {
      data: { message: `Successfully processed ${action} for ${attendeeResult.full_name}` },
      error: null
    };

  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Book a session for a user
 */
export const bookSession = async (userId: string, sessionId: string) => {
  try {
    // Check if session exists and has capacity
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, max_attendees, current_bookings')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return { data: null, error: { message: 'Session not found' } };
    }

    if (session.current_bookings >= session.max_attendees) {
      return { data: null, error: { message: 'Session is full' } };
    }

    // Create booking
    const { data, error } = await supabase
      .from('session_bookings')
      .insert({
        user_id: userId,
        session_id: sessionId,
        booking_status: 'confirmed'
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate')) {
        return { data: null, error: { message: 'You have already booked this session' } };
      }
      return { data: null, error: { message: error.message } };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Cancel a session booking
 */
export const cancelBooking = async (userId: string, sessionId: string) => {
  try {
    const { error } = await supabase
      .from('session_bookings')
      .update({ booking_status: 'cancelled' })
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get user's session bookings
 */
export const getUserBookings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('session_bookings')
      .select(`
        *,
        sessions(
          id,
          title,
          description,
          speaker_name,
          start_time,
          end_time,
          location,
          session_type
        )
      `)
      .eq('user_id', userId)
      .neq('booking_status', 'cancelled')
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Record session attendance
 */
export const recordSessionAttendance = async (
  userId: string,
  sessionId: string,
  scannedBy: string
) => {
  try {
    const { data, error } = await supabase
      .from('session_bookings')
      .update({
        booking_status: 'attended',
        attended: true,
        attended_at: new Date().toISOString(),
        scanned_by: scannedBy
      })
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    // Award points for session attendance
    await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        event_id: DEFAULT_EVENT_ID,
        activity_type: 'session_attendance',
        description: `Attended session`,
        points_earned: 15
      });

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

/**
 * Send announcement to users
 */
export const sendAnnouncement = async ({
  title,
  message,
  targetType,
  targetRole,
  targetUsers
}: {
  title: string;
  message: string;
  targetType: 'all' | 'role' | 'custom';
  targetRole?: string;
  targetUsers?: string[];
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('announcements')
      .insert({
        title,
        message,
        sender_id: user.id,
        target_type: targetType,
        target_role: targetRole || null,
        target_users: targetUsers || null
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get announcements for current user
 */
export const getUserAnnouncements = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const userRole = roleData?.role;

    // Get announcements targeting this user
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .or(`target_type.eq.all,and(target_type.eq.role,target_role.eq.${userRole}),and(target_type.eq.custom,target_users.cs.{${user.id}})`)
      .order('created_at', { ascending: false })
      .limit(50);

    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// STATISTICS & RANKINGS
// ============================================================================

/**
 * Get user ranking and score
 */
export const getUserRankingAndScore = async (userId: string) => {
  try {
    // Get user score
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('score')
      .eq('id', userId)
      .single();

    if (profileError) {
      return { data: null, error: profileError };
    }

    // Get ranking (count users with higher scores)
    const { count, error: rankError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gt('score', profile.score || 0);

    if (rankError) {
      return { data: null, error: rankError };
    }

    const rank = (count || 0) + 1;

    return {
      data: {
        score: profile.score || 0,
        rank
      },
      error: null
    };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Get recent activities for a user
 */
export const getRecentActivities = async (userId: string, limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Award points to a user
 */
export const awardPoints = async ({
  userId,
  activityType,
  points,
  description
}: {
  userId: string;
  activityType: string;
  points: number;
  description: string;
}) => {
  try {
    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        event_id: DEFAULT_EVENT_ID,
        activity_type: activityType,
        description,
        points_earned: points
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

/**
 * Get team members for a team leader
 */
export const getTeamMembers = async (teamId: string) => {
  try {
    const { data, error } = await supabase
      .from('volunteers')
      .select(`
        *,
        user_profiles(
          id,
          full_name,
          phone,
          score
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Get all teams
 */
export const getAllTeams = async () => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('team_name', { ascending: true });

    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all sessions
 */
export const getAllSessions = async (eventId?: string) => {
  try {
    let query = supabase
      .from('sessions')
      .select('*')
      .order('start_time', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Get all companies
 */
export const getAllCompanies = async () => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('company_name', { ascending: true });

    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Get schedule items
 */
export const getScheduleItems = async (dayNumber?: number) => {
  try {
    let query = supabase
      .from('schedule_items')
      .select('*')
      .order('start_time', { ascending: true });

    if (dayNumber) {
      query = query.eq('day_number', dayNumber);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Get building statistics (for dashboards)
 */
export const getDynamicBuildingStats = async () => {
  try {
    // Get current attendees in building
    const { count: buildingCount, error: buildingError } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('building_entry', true);

    if (buildingError) {
      console.error('Error fetching building stats:', buildingError);
    }

    // Get total entries today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayEntries, error: entriesError } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .eq('action', 'building_enter');

    if (entriesError) {
      console.error('Error fetching entry stats:', entriesError);
    }

    return {
      data: {
        currentInBuilding: buildingCount || 0,
        todayEntries: todayEntries || 0
      },
      error: null
    };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// ============================================================================
// ATTENDEE ATTENDANCE TRACKING (Registration Team)
// ============================================================================

/**
 * Get user profile by UUID
 * Used when scanning QR codes containing user UUIDs
 */
export const getUserProfileByUUID = async (uuid: string) => {
  try {
    // 1. Get profile basic info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, personal_id')
      .eq('id', uuid)
      .single();

    if (profileError || !profile) {
      return { data: null, error: { message: 'This user doesn\'t have an account' } };
    }

    // 2. Get additional attendee details (university, faculty)
    const { data: attendeeDetails } = await supabase
      .from('attendees')
      .select('user_id, university, faculty')
      .eq('user_id', uuid)
      .single();

    // 3. Check for attendance records to determine current status
    // Get the latest attendance record (ordered by created_at desc)
    const { data: attendanceData } = await supabase
      .from('attendee_attendance')
      .select('created_at, check_in_time, check_out_time')
      .eq('attendee_id', uuid)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastRecord = attendanceData && attendanceData.length > 0 ? attendanceData[0] : null;

    // Determine if they are currently inside
    // They are inside if we have a record with check_in_time BUT NO check_out_time
    let currentStatus: 'inside' | 'outside' = 'outside';
    let lastAttendance = null;

    if (lastRecord) {
      if (lastRecord.check_in_time && !lastRecord.check_out_time) {
        currentStatus = 'inside';
        lastAttendance = {
          type: 'entry', // Derived for compatibility
          timestamp: lastRecord.check_in_time
        };
      } else {
        currentStatus = 'outside';
        lastAttendance = {
          type: 'exit', // Derived for compatibility
          timestamp: lastRecord.check_out_time || lastRecord.created_at
        };
      }
    }

    // 4. Get role
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uuid)
      .eq('event_id', DEFAULT_EVENT_ID);

    const roles = rolesData?.map(r => r.role) || ['attendee'];
    const primaryRole = roles[0] || 'attendee';

    return {
      data: {
        ...profile,
        university: attendeeDetails?.university,
        faculty: attendeeDetails?.faculty,
        last_attendance: lastAttendance,
        current_status: currentStatus,
        role: primaryRole,
        roles: roles
      },
      error: null
    };

  } catch (error: any) {
    console.error('getUserProfileByUUID Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Record attendee attendance (entry or exit)
 * Refactored: Entry = INSERT new record, Exit = UPDATE latest active record
 */
export const recordAttendeeAttendance = async ({
  attendeeId,
  checkedInBy,
  type
}: {
  attendeeId: string;
  checkedInBy: string;
  type: 'entry' | 'exit';
}) => {
  try {
    const now = new Date().toISOString();

    console.log(`--- recordAttendeeAttendance (${type}) ---`);
    console.log('Attendee ID:', attendeeId);

    // Get the latest record to check current status
    const { data: latestRecord, error: fetchError } = await supabase
      .from('attendee_attendance')
      .select('id, check_in_time, check_out_time')
      .eq('attendee_id', attendeeId)
      .eq('event_id', DEFAULT_EVENT_ID) // Ensure strictly strictly for this event
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching latest attendance:', fetchError);
      return { data: null, error: { message: 'Failed to verify current status' } };
    }

    const isCurrentlyInside = latestRecord && latestRecord.check_in_time && !latestRecord.check_out_time;

    // LOGIC:
    // Entry: User must be OUTSIDE (no active record). Create NEW record.
    // Exit: User must be INSIDE (has active record). Update THAT record.

    if (type === 'entry') {
      // CHECK-IN
      if (isCurrentlyInside) {
        return { data: null, error: { message: 'User is already checked in!' } };
      }

      const insertData = {
        attendee_id: attendeeId,
        event_id: DEFAULT_EVENT_ID,
        checked_in_by: checkedInBy,
        check_in_time: now
        // check_out_time is null by default
        // type column is removed
      };

      const { data, error } = await supabase
        .from('attendee_attendance')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error recording check-in:', error);
        return { data: null, error: { message: error.message } };
      }

      console.log('Check-in Successful:', data);
      return { data, error: null };

    } else {
      // CHECK-OUT
      if (!isCurrentlyInside) {
        return { data: null, error: { message: 'User is not checked in!' } };
      }

      // Update the EXISTING active record
      const { data, error } = await supabase
        .from('attendee_attendance')
        .update({
          check_out_time: now
          // We don't update checked_in_by on exit, typically check-out is just closing the loop
          // But if we want to track who checked them out, we'd need a checked_out_by column
        })
        .eq('id', latestRecord.id) // Update SPECIFIC record
        .select()
        .single();

      if (error) {
        console.error('Error recording check-out:', error);
        return { data: null, error: { message: error.message } };
      }

      console.log('Check-out Successful:', data);
      return { data, error: null };
    }

  } catch (error: any) {
    console.error('recordAttendeeAttendance Exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Get total count of attendees who have entered (type = 'entry')
 */
export const getTotalEntryCount = async () => {
  try {
    // Count ALL records in attendee_attendance for this event
    // Since each record represents a check-in (visit), this is the total number of visits
    const { count, error } = await supabase
      .from('attendee_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', DEFAULT_EVENT_ID);

    if (error) {
      console.error('Error getting entry count:', error);
      return { count: 0, error: { message: error.message } };
    }

    return { count: count || 0, error: null };
  } catch (error: any) {
    return { count: 0, error: { message: error.message } };
  }
};

/**
 * Get recent scans by a specific volunteer
 */
export const getRecentScansByVolunteer = async (volunteerId: string, limit: number = 10) => {
  try {
    // We need to fetch records where this volunteer checked them in
    // Note: We currently don't track who checked them OUT, so we only show Check-ins here primarily
    const { data, error } = await supabase
      .from('attendee_attendance')
      .select(`
        id,
        check_in_time,
        check_out_time,
        created_at,
        user_profiles!attendee_attendance_attendee_id_fkey (
          id,
          full_name,
          personal_id
        )
      `)
      .eq('checked_in_by', volunteerId)
      .eq('event_id', DEFAULT_EVENT_ID)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting recent scans:', error);
      return { data: null, error: { message: error.message } };
    }

    // Transform the data for easier consumption
    const transformedData = (data || []).map((scan: any) => {
      // Determine type based on check_out_time presence
      const hasCheckedOut = !!scan.check_out_time;

      return {
        id: scan.id,
        type: hasCheckedOut ? 'visit' : 'entry', // 'visit' means completed (in and out), 'entry' means currently inside
        check_in_time: scan.check_in_time || scan.created_at,
        check_out_time: scan.check_out_time,
        time: scan.check_in_time || scan.created_at, // Keep for legacy, but UI should prefer specific times
        attendee: scan.user_profiles ? {
          id: scan.user_profiles.id,
          name: scan.user_profiles.full_name,
          personalId: scan.user_profiles.personal_id
        } : null
      };
    });

    return { data: transformedData, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};