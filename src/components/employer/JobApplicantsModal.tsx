import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AttendeeProfileCard from '../AttendeeProfileCard';
import { AttendeeProfile } from '../../hooks/useAttendeeProfile';

interface Applicant {
    id: string; // job_application id
    applied_at: string;
    cv_url: string;
    attendee: {
        user_id: string; // attendee id is user_id
        user_profile: {
            full_name: string;
            personal_id: string;
        };
        university: string;
        faculty: string;
        registration_status: string;
    };
}

interface JobApplicantsModalProps {
    jobId: string;
    jobTitle: string;
    onClose: () => void;
}

const JobApplicantsModal: React.FC<JobApplicantsModalProps> = ({ jobId, jobTitle, onClose }) => {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApplicantProfile, setSelectedApplicantProfile] = useState<AttendeeProfile | null>(null);

    useEffect(() => {
        const fetchApplicants = async () => {
            try {
                // Fetch applications with nested attendee and user_profile data
                // Schema: job_applications -> attendees -> user_profiles (via user_id)
                // Note: The schema definitions show relations.
                // job_applications: attendee_id -> public.attendees.id
                // attendees: user_id -> auth.users.id
                // user_profiles: id -> auth.users.id

                // We need to join carefully.
                // job_applications(*, attendee:attendees(*, user_profile:user_profiles(*)))
                // Note: user_profiles is joined on attendees.user_id = user_profiles.id

                const { data, error } = await supabase
                    .from('job_applications')
                    .select(`
                        id,
                        applied_at,
                        cv_url,
                        attendee:attendees (
                            user_id,
                            university,
                            faculty,
                            registration_status
                        )
                    `)
                    .eq('job_position_id', jobId)
                    .order('applied_at', { ascending: false });

                if (error) throw error;

                // Now for each attendee, we need to fetch their user profile name
                // supabase-js doesn't always handle deep nested joins across schemas/tables perfectly 
                // if foreign keys aren't named standardly or if permissions vary. 
                // But let's try to fetch user profiles separately for simplicity and robustness if a deep join fails.

                const applicantsData: Applicant[] = [];

                for (const app of data || []) {
                    // Supabase join might return array for 1:1 if not detected correctly by types
                    // @ts-ignore
                    const attendeeData = Array.isArray(app.attendee) ? app.attendee[0] : app.attendee;

                    if (!attendeeData) continue;

                    const { data: userProfile } = await supabase
                        .from('user_profiles')
                        .select('full_name, personal_id')
                        .eq('id', attendeeData.user_id)
                        .single();

                    applicantsData.push({
                        ...app,
                        attendee: {
                            ...attendeeData,
                            user_profile: userProfile || { full_name: 'Unknown', personal_id: 'N/A' }
                        }
                    });
                }

                setApplicants(applicantsData);

            } catch (err) {
                console.error('Error fetching applicants:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchApplicants();
    }, [jobId]);

    const handleViewProfile = async (applicant: Applicant) => {
        // Construct AttendeeProfile object for the card
        const profileData: AttendeeProfile = {
            id: applicant.attendee.user_id,
            full_name: applicant.attendee.user_profile.full_name,
            personal_id: applicant.attendee.user_profile.personal_id,
            university: applicant.attendee.university,
            faculty: applicant.attendee.faculty,
            registration_status: applicant.attendee.registration_status,
            // Add other fields as needed, defaults for missing ones
            phone: '',
            preferred_language: 'en',
            score: 0,
            created_at: '',
            cv_url: applicant.cv_url
        };
        setSelectedApplicantProfile(profileData);
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop-blur"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 modal-content-blur flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Applicants
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {jobTitle}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <span className="material-symbols-outlined animate-spin text-3xl text-orange-500">progress_activity</span>
                        </div>
                    ) : applicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-2">person_off</span>
                            <p>No applicants yet</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidate</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">University</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Applied At</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {applicants.map((app) => (
                                    <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                                                    {app.attendee.user_profile.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {app.attendee.user_profile.full_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">ID: {app.attendee.user_profile.personal_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{app.attendee.university}</p>
                                            <p className="text-xs text-slate-500">{app.attendee.faculty}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {new Date(app.applied_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleViewProfile(app)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
                                            >
                                                <span className="material-symbols-outlined text-base">visibility</span>
                                                Profile
                                            </button>
                                            {app.cv_url && (
                                                <a
                                                    href={app.cv_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                                                >
                                                    <span className="material-symbols-outlined text-base">description</span>
                                                    CV
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {selectedApplicantProfile && (
                <AttendeeProfileCard
                    profile={selectedApplicantProfile}
                    onClose={() => setSelectedApplicantProfile(null)}
                />
            )}
        </div>
    );
};

export default JobApplicantsModal;
