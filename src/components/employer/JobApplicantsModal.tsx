import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import AttendeeExperienceCard from './AttendeeExperienceCard';
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
            email: string;
            phone: string;
            score?: number;
        };
        university: string;
        faculty: string;
        registration_status: string;
        department?: string;
        student_id?: string;
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
                // 1. Fetch applications and basic attendee data
                const { data: applications, error: appsError } = await supabase
                    .from('job_applications')
                    .select(`
                        id,
                        applied_at,
                        cv_url,
                        attendee:attendees (
                            user_id,
                            university,
                            faculty,
                            registration_status,
                            department,
                            student_id
                        )
                    `)
                    .eq('job_position_id', jobId)
                    .order('applied_at', { ascending: false });

                if (appsError) throw appsError;

                // 2. Extract user IDs and fetch profiles in one go
                const userIds = applications?.map((app: any) => app.attendee?.user_id).filter(Boolean) || [];

                let profileMap: Record<string, any> = {};
                if (userIds.length > 0) {
                    const { data: profiles, error: profileError } = await supabase
                        .from('user_profiles')
                        .select('id, full_name, personal_id, email, phone, score')
                        .in('id', userIds);

                    if (profileError) throw profileError;

                    profileMap = (profiles || []).reduce((acc: any, p) => {
                        acc[p.id] = p;
                        return acc;
                    }, {});
                }

                // 3. Merge data
                const formattedApplicants: Applicant[] = (applications || []).map((app: any) => ({
                    id: app.id,
                    applied_at: app.applied_at,
                    cv_url: app.cv_url,
                    attendee: {
                        ...app.attendee,
                        user_profile: profileMap[app.attendee?.user_id] || {
                            full_name: 'Unknown',
                            personal_id: 'N/A',
                            email: '',
                            phone: '',
                            score: 0
                        }
                    }
                }));

                setApplicants(formattedApplicants);
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
            email: applicant.attendee.user_profile.email,
            phone: applicant.attendee.user_profile.phone,
            personal_id: applicant.attendee.user_profile.personal_id,
            university: applicant.attendee.university,
            faculty: applicant.attendee.faculty,
            department: applicant.attendee.department,
            student_id: applicant.attendee.student_id,
            registration_status: applicant.attendee.registration_status,
            // Add other fields as needed, defaults for missing ones
            preferred_language: 'en',
            score: applicant.attendee.user_profile.score || 0,
            created_at: applicant.applied_at,
            cv_url: applicant.cv_url
        };
        setSelectedApplicantProfile(profileData);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Applicants
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {jobTitle}
                        </p>
                    </motion.div>
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </motion.button>
                </div>

                <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <span className="material-symbols-outlined animate-spin text-3xl text-indigo-500">progress_activity</span>
                        </div>
                    ) : applicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl">person_off</span>
                            </div>
                            <p className="font-medium text-sm">No applications received yet</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Candidate</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Academic</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Applied At</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <motion.tbody
                                        initial="hidden"
                                        animate="visible"
                                        variants={{
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.05
                                                }
                                            }
                                        }}
                                        className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900"
                                    >
                                        {applicants.map((app) => (
                                            <motion.tr
                                                key={app.id}
                                                variants={{
                                                    hidden: { opacity: 0, y: 10 },
                                                    visible: { opacity: 1, y: 0 }
                                                }}
                                                className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                                                            {app.attendee.user_profile.full_name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                                                {app.attendee.user_profile.full_name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase truncate tracking-tight">Personal ID: {app.attendee.user_profile.personal_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{app.attendee.university}</p>
                                                    <p className="text-xs text-slate-400">{app.attendee.faculty}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewProfile(app);
                                                            }}
                                                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95 flex items-center gap-1.5 px-3"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                                            <span className="text-xs font-bold">View</span>
                                                        </motion.button>
                                                        {app.cv_url && (
                                                            <motion.a
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                href={app.cv_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center gap-1.5 px-3"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">description</span>
                                                                <span className="text-xs font-bold">CV</span>
                                                            </motion.a>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </motion.tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.1
                                        }
                                    }
                                }}
                                className="md:hidden p-4 space-y-3"
                            >
                                {applicants.map((app) => (
                                    <motion.div
                                        key={app.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                        whileHover={{ y: -5 }}
                                        onClick={() => handleViewProfile(app)}
                                        className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-indigo-500/20 shadow-lg">
                                                    {app.attendee.user_profile.full_name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{app.attendee.user_profile.full_name}</h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${app.attendee.registration_status === 'approved'
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                                                            }`}>
                                                            {app.attendee.registration_status}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {app.cv_url && (
                                                    <motion.a
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        href={app.cv_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-xl">description</span>
                                                    </motion.a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                            <div className="min-w-0">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">University</p>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{app.attendee.university}</p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Faculty</p>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{app.attendee.faculty}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {selectedApplicantProfile && (
                    <AttendeeExperienceCard
                        profile={selectedApplicantProfile}
                        onClose={() => setSelectedApplicantProfile(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default JobApplicantsModal;
