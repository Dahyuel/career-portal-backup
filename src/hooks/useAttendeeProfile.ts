import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface AttendeeProfile {
    id: string;
    user_id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    personal_id?: string;
    university?: string;
    faculty?: string;
    department?: string;
    year?: number | null;
    student_status?: string | null;
    payment_status?: string;
    cv_url?: string;
    nationality?: string | null;
    gender?: string;
    enrollment_proof_url?: string;
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
            const { data, error: rpcError } = await supabase
                .rpc('get_attendee_profile', { _user_id: userId })
                .single();

            if (rpcError) {
                logger.error('Error fetching attendee profile via RPC:', rpcError);
                setError(rpcError.message || 'Failed to fetch profile');
                setAttendeeProfile(null);
                return;
            }

            if (!data) {
                setAttendeeProfile(null);
                return;
            }

            const result = data as any;
            setAttendeeProfile({
                id: userId,
                user_id: userId,
                full_name: result.full_name,
                email: result.email,
                phone: result.phone,
                personal_id: result.personal_id,
                nationality: result.nationality ?? null,
                gender: result.gender,
                university: result.university,
                faculty: result.faculty,
                department: result.department,
                payment_status: result.payment_status,
                cv_url: result.cv_url,
                enrollment_proof_url: result.enrollment_proof_url,
            });
        } catch (err: any) {
            logger.error('Error in useAttendeeProfile:', err);
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