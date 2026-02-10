import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AttendeeProfile } from '../../hooks/useAttendeeProfile';

interface AttendeeExperienceCardProps {
    profile: AttendeeProfile | null;
    onClose: () => void;
}

const AttendeeExperienceCard: React.FC<AttendeeExperienceCardProps> = ({
    profile,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'documents'>('personal');

    if (!profile) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-[9999]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] sm:max-h-[90vh] relative z-10 border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header for Mobile - Only visible on small screens */}
                <div className="md:hidden px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-bold text-slate-900 dark:text-white truncate text-sm">{profile.full_name}</h2>
                            <div className="flex flex-col">
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">{profile.faculty}</p>
                                <div className="mt-0.5">
                                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[8px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 uppercase tracking-tighter">
                                        Verified Talent
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Sidebar - Profile Summary (Hidden on mobile) */}
                <div className="hidden md:flex flex-col w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800 p-6 sm:p-8 items-center overflow-y-auto md:overflow-visible">
                    {/* Desktop Avatar */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="hidden md:block w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-1 mb-6 shadow-xl"
                    >
                        <div className="w-full h-full rounded-[1.4rem] bg-white dark:bg-slate-900 flex items-center justify-center">
                            <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 text-6xl">
                                person
                            </span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-center w-full"
                    >
                        <h2 className="hidden md:block text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-1">
                            {profile.full_name}
                        </h2>
                        <p className="hidden md:block text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-2">
                            {profile.faculty} Candidate
                        </p>

                        <div className="hidden md:flex justify-center mb-6">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                Verified Talent
                            </span>
                        </div>

                        <div className="space-y-4 text-left w-full hidden md:block">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center mb-2">Primary Faculty</p>
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <span className="material-symbols-outlined text-indigo-500 text-xl font-icon">account_balance</span>
                                <div className="min-w-0">
                                    <p className="text-sm text-slate-700 dark:text-slate-200 font-bold truncate">{profile.faculty}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="hidden md:flex mt-auto pt-8 w-full">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-lg transition-all hover:opacity-90 active:scale-95"
                        >
                            Close Profile
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                    {/* Tabs Navigation - Scrollable on Mobile with smooth scroll indicators */}
                    <div className="px-6 sm:px-8 pt-6 sm:pt-8 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex gap-6 sm:gap-8 overflow-x-auto no-scrollbar pb-px">
                            {[
                                { id: 'personal', label: 'Personal', icon: 'person' },
                                { id: 'academic', label: 'Academic', icon: 'school' },
                                { id: 'documents', label: 'Documents', icon: 'verified' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`relative pb-4 flex items-center gap-2 font-bold transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === tab.id
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="recruiterActiveTab"
                                            className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'personal' && (
                                <motion.div
                                    key="personal"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-6 rounded-[1.5rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 flex flex-col gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                                <span className="material-symbols-outlined">mail</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Email Address</p>
                                                <p className="text-slate-900 dark:text-white font-bold break-all">{profile.email}</p>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-[1.5rem] bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                <span className="material-symbols-outlined">call</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Phone Number</p>
                                                <p className="text-slate-900 dark:text-white font-bold">{profile.phone || 'Not Provided'}</p>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-[1.5rem] bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/20 flex flex-col gap-4 sm:col-span-2">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                                <span className="material-symbols-outlined">badge</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Government Personal ID</p>
                                                <p className="text-slate-900 dark:text-white font-bold tracking-[0.2em]">{profile.personal_id}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'academic' && (
                                <motion.div
                                    key="academic"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-slate-900 dark:bg-slate-800 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <span className="material-symbols-outlined text-7xl sm:text-9xl transform rotate-12">history_edu</span>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-bold mb-6 relative z-10">Academic History</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 relative z-10">
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Institution</p>
                                                <p className="font-bold text-sm sm:text-base">{profile.university || 'Ain Shams University'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Faculty / School</p>
                                                <p className="font-bold text-sm sm:text-base">{profile.faculty}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Department</p>
                                                <p className="font-bold text-sm sm:text-base">{profile.department || 'Undergraduate'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Student Reference</p>
                                                <p className="font-bold text-sm sm:text-base tracking-widest">{profile.student_id || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ID Card section removed from Academic for a cleaner look */}
                                </motion.div>
                            )}

                            {activeTab === 'documents' && (
                                <motion.div
                                    key="documents"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="group relative bg-white dark:bg-slate-800 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-all hover:border-indigo-500/50 min-h-[250px] sm:min-h-[300px]">
                                        {profile.cv_url ? (
                                            <>
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 mb-6 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-3xl sm:text-4xl">description</span>
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">Curriculum Vitae</h3>
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 sm:mb-8 max-w-xs">
                                                    Professional history and skill summary document.
                                                </p>
                                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                                                    <a
                                                        href={profile.cv_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                                                        View Online
                                                    </a>
                                                    <a
                                                        href={profile.cv_url}
                                                        download
                                                        className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">download</span>
                                                        Download PDF
                                                    </a>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 mb-6 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-400 mb-2">Unavailable</h3>
                                                <p className="text-xs text-slate-400 italic">No document has been linked to this profile.</p>
                                            </>
                                        )}
                                    </div>

                                    {profile.enrollment_proof_url && (
                                        <div className="p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                                    <span className="material-symbols-outlined text-xl">verified_user</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h5 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">Enrolment Proof</h5>
                                                    <p className="text-[10px] text-slate-500">Verified by University</p>
                                                </div>
                                            </div>
                                            <a
                                                href={profile.enrollment_proof_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                                            >
                                                <span className="material-symbols-outlined">open_in_new</span>
                                            </a>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AttendeeExperienceCard;
