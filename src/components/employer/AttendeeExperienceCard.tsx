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
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Red Gradient Header */}
                <div className="relative h-32 bg-gradient-to-r from-red-700 to-red-600">
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </motion.button>

                    {/* Avatar */}
                    <motion.div
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="absolute -bottom-12 left-8"
                    >
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 flex items-center justify-center shadow-md">
                            <span className="material-symbols-outlined text-red-600 text-5xl">person</span>
                        </div>
                    </motion.div>
                </div>

                {/* Name, subtitle & Tabs */}
                <div className="pt-14 px-8 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                        {profile.full_name}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-600 dark:text-gray-400 text-sm"
                    >
                        {profile.faculty} · Verified Talent
                    </motion.p>

                    {/* Tabs */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex gap-6 mt-6"
                    >
                        {[
                            { id: 'personal', label: 'Personal' },
                            { id: 'academic', label: 'Academic' },
                            { id: 'documents', label: 'Documents' },
                        ].map((tab, index) => (
                            <motion.button
                                key={tab.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-2 text-sm font-semibold transition-colors relative ${activeTab === tab.id
                                    ? 'text-red-600'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.span
                                        layoutId="experienceActiveTab"
                                        className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full"
                                    />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                </div>

                {/* Scrollable Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">

                        {/* ── PERSONAL TAB ── */}
                        {activeTab === 'personal' && (
                            <motion.div
                                key="personal"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <motion.h3
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-red-500 text-lg">person</span>
                                    Personal Info
                                </motion.h3>

                                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                                    {[
                                        { label: 'Email Address', value: profile.email },
                                        { label: 'Phone Number', value: profile.phone || 'Not Provided' },
                                        { label: 'Gender', value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not Provided' },
                                        { label: 'Government Personal ID', value: profile.personal_id },
                                    ].map((item, index) => (
                                        <motion.div
                                            key={item.label}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + index * 0.1 }}
                                        >
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{item.value}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ── ACADEMIC TAB ── */}
                        {activeTab === 'academic' && (
                            <motion.div
                                key="academic"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <motion.h3
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-red-500 text-lg">school</span>
                                    Academic History
                                </motion.h3>

                                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                                    {[
                                        { label: 'Institution', value: profile.university || 'Ain Shams University', show: true },
                                        { label: 'Faculty / School', value: profile.faculty, show: true },
                                        { label: 'Department', value: profile.department || 'Undergraduate', show: true },
                                    ].filter(i => i.show).map((item, index) => (
                                        <motion.div
                                            key={item.label}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + index * 0.1 }}
                                        >
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ── DOCUMENTS TAB ── */}
                        {activeTab === 'documents' && (
                            <motion.div
                                key="documents"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                <motion.h3
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-red-500 text-lg">description</span>
                                    Documents
                                </motion.h3>

                                {/* CV */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    whileHover={{ y: -4 }}
                                    className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-100 dark:border-slate-700/50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.2, type: "spring" }}
                                                className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600 dark:text-blue-400"
                                            >
                                                <span className="material-symbols-outlined text-2xl">description</span>
                                            </motion.div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-white">Curriculum Vitae</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {profile.cv_url ? 'Professional history and skill summary document.' : 'No document has been linked to this profile.'}
                                                </p>
                                            </div>
                                        </div>
                                        {profile.cv_url && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <motion.a
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    href={profile.cv_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium hover:underline flex items-center gap-1"
                                                >
                                                    View
                                                    <span className="material-symbols-outlined text-base">open_in_new</span>
                                                </motion.a>
                                                <motion.a
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    href={profile.cv_url}
                                                    download
                                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-base">download</span>
                                                </motion.a>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Enrollment Proof */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-100 dark:border-slate-700/50 opacity-90"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.3, type: "spring" }}
                                                className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg text-purple-600 dark:text-purple-400"
                                            >
                                                <span className="material-symbols-outlined text-2xl">verified_user</span>
                                            </motion.div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-white">Enrolment Proof</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Verified by University</p>
                                            </div>
                                        </div>
                                        {profile.enrollment_proof_url ? (
                                            <motion.a
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                href={profile.enrollment_proof_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium hover:underline flex items-center gap-1"
                                            >
                                                View
                                                <span className="material-symbols-outlined text-base">open_in_new</span>
                                            </motion.a>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Not available</span>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default AttendeeExperienceCard;