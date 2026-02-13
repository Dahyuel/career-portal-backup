import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface VolunteerProfile {
    user_id?: string;
    volunteer_id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    personal_id?: string;
    total_points?: number;
    hours_volunteered?: number;
}

export const useVolunteerProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user?.id) return;

        setLoading(true);
        setError(null);
        try {
            // Get volunteer data
            const { data: volunteerData, error: volunteerError } = await supabase
                .from('volunteers')
                .select('volunteer_id, full_name, total_points, hours_volunteered')
                .eq('user_id', user.id)
                .maybeSingle();

            if (volunteerError) {
                console.error('Error fetching volunteer data:', volunteerError);
                // Don't return here, try to fetch user profile anyway as fallback for basic info
            }

            // Get user profile data
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('email, phone, personal_id')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
            }

            // Combine the data
            if (volunteerData || profileData) {
                setProfile({
                    user_id: user.id,
                    volunteer_id: volunteerData?.volunteer_id,
                    full_name: volunteerData?.full_name || user.user_metadata?.full_name, // Fallback to auth metadata
                    email: profileData?.email || user.email,
                    phone: profileData?.phone,
                    personal_id: profileData?.personal_id,
                    total_points: volunteerData?.total_points || 0,
                    hours_volunteered: volunteerData?.hours_volunteered || 0
                });
            }
        } catch (err: any) {
            console.error('Error in useVolunteerProfile:', err);
            setError(err.message || 'Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        if (user?.id) {
            fetchProfile();
        }
    }, [user?.id, fetchProfile]);

    return { profile, loading, error, refetch: fetchProfile };
};
