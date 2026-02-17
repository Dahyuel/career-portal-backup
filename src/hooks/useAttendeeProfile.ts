import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AttendeeProfile {
    user_id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    personal_id?: string;
    is_asu_student?: boolean;
    student_id?: string;
    university?: string;
    faculty?: string;
    department?: string;
    registration_status?: string;
    payment_status?: string;
    cv_url?: string;
}

export const useAttendeeProfile = (userId?: string) => {
    const [attendeeProfile, setAttendeeProfile] = useState<AttendeeProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!userId) {
            setAttendeeProfile(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Get attendee data
            const { data: attendeeData, error: attendeeError } = await supabase
                .from('attendees')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (attendeeError) {
                console.error('Error fetching attendee data:', attendeeError);
            }

            // Get user profile data
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('full_name, email, phone, personal_id')
                .eq('id', userId)
                .maybeSingle();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
            }

            // Combine the data
            if (attendeeData || profileData) {
                setAttendeeProfile({
                    user_id: userId,
                    full_name: profileData?.full_name,
                    email: profileData?.email,
                    phone: profileData?.phone,
                    personal_id: profileData?.personal_id,
                    is_asu_student: attendeeData?.is_asu_student,
                    student_id: attendeeData?.student_id,
                    university: attendeeData?.university,
                    faculty: attendeeData?.faculty,
                    department: attendeeData?.department,
                    registration_status: attendeeData?.registration_status,
                    payment_status: attendeeData?.payment_status,
                    cv_url: attendeeData?.cv_url
                });
            } else {
                setAttendeeProfile(null);
            }
        } catch (err: any) {
            console.error('Error in useAttendeeProfile:', err);
            setError(err.message || 'Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return { attendeeProfile, loading, error, refetch: fetchProfile };
};
