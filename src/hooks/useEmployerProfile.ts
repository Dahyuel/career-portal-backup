import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface EmployerProfile {
    // From user_profiles
    id: string;
    full_name: string;
    email?: string; // from auth.users if needed, but usually just profile data
    phone: string;
    personal_id: string;

    // From employer table
    employer_id?: string;
    company_id?: string;
    job_title?: string;

    // From companies table
    company_name?: string;
    company_logo?: string;
    company_website?: string;
    event_id?: string;
}

export const useEmployerProfile = (userId: string | undefined) => {
    const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployerProfile = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // 1. Fetch user profile
                const { data: userProfile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;

                // 2. Fetch employer details
                const { data: employerData, error: employerError } = await supabase
                    .from('employer')
                    .select('*, companies(*)')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (employerError) throw employerError;

                // Construct combined profile
                const profile: EmployerProfile = {
                    ...userProfile,
                    employer_id: employerData?.id,
                    company_id: employerData?.company_id,
                    job_title: employerData?.job_title,
                    company_name: employerData?.companies?.company_name,
                    company_logo: employerData?.companies?.logo_url,
                    company_website: employerData?.companies?.website,
                    event_id: employerData?.companies?.event_id
                };

                setEmployerProfile(profile);

            } catch (err: any) {
                console.error('Error fetching employer profile:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployerProfile();
    }, [userId]);

    return { employerProfile, loading, error };
};
