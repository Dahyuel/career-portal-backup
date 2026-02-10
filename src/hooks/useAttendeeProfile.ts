import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AttendeeProfile {
    // From user_profiles
    id: string;
    full_name: string;
    email: string;
    phone: string;
    personal_id: string;
    preferred_language: string;
    score: number;
    created_at: string;
    // From attendees
    attendee_id?: string;
    is_asu_student?: boolean;
    student_id?: string;
    university?: string;
    faculty?: string;
    department?: string;
    cv_url?: string;
    enrollment_proof_url?: string;
    registration_status?: string;
    payment_status?: string;
    registered_at?: string;
}

export const useAttendeeProfile = (userId: string | undefined, enabled: boolean = true) => {
    const { handleAuthError, profile: authProfile } = useAuth();

    // Initialize with auth profile if available (partial data) to prevent double loading
    const [attendeeProfile, setAttendeeProfile] = useState<AttendeeProfile | null>(() => {
        if (authProfile && authProfile.id === userId) {
            return {
                id: authProfile.id,
                full_name: authProfile.full_name || '',
                email: authProfile.email || '',
                phone: authProfile.phone || '',
                personal_id: authProfile.personal_id || '',
                preferred_language: 'en',
                score: 0,
                created_at: authProfile.created_at || new Date().toISOString(),
                attendee_id: authProfile.id
            };
        }
        return null;
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAttendeeProfile = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // PARALLEL: Fetch user profile (if not in auth) and attendee data simultaneously
            const [profileResult, attendeeResult] = await Promise.all([
                (authProfile && authProfile.id === userId)
                    ? Promise.resolve({ data: authProfile, error: null })
                    : supabase.from('user_profiles').select('*').eq('id', userId).single(),
                supabase.from('attendees').select('*').eq('user_id', userId).single()
            ]);

            const { data: userProfile, error: profileError } = profileResult;
            const { data: attendeeData } = attendeeResult;

            if (profileError) throw profileError;
            if (!userProfile) throw new Error('Profile not found');

            // Combine both datasets
            const combinedProfile: AttendeeProfile = {
                id: userProfile.id,
                full_name: userProfile.full_name || '',
                email: userProfile.email || '',
                phone: userProfile.phone || '',
                personal_id: userProfile.personal_id || '',
                preferred_language: userProfile.preferred_language || 'en',
                score: userProfile.score || 0,
                created_at: userProfile.created_at,
                // Attendee-specific data (may be null if not found)
                attendee_id: userProfile.id, // ID is now same as user_id
                is_asu_student: attendeeData?.is_asu_student,
                student_id: attendeeData?.student_id,
                university: attendeeData?.university,
                faculty: attendeeData?.faculty,
                department: attendeeData?.department,
                cv_url: attendeeData?.cv_url,
                enrollment_proof_url: attendeeData?.enrollment_proof_url,
                registration_status: attendeeData?.registration_status,
                payment_status: attendeeData?.payment_status,
                registered_at: attendeeData?.registered_at
            };

            setAttendeeProfile(combinedProfile);
        } catch (err: any) {
            console.error('Error fetching attendee profile:', err);
            setError(err.message || 'Failed to fetch profile');
            await handleAuthError(err);
        } finally {
            setLoading(false);
        }
    }, [userId, authProfile]);

    useEffect(() => {
        if (enabled) {
            fetchAttendeeProfile();
        } else {
            setLoading(false);
        }
    }, [userId, enabled, fetchAttendeeProfile]);

    return { attendeeProfile, loading, error, refetch: fetchAttendeeProfile };
};
