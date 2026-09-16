import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JobDetailModalProps {
    job: any;
    onClose: () => void;
    onApply: () => void;
    hasApplied: boolean;
    onWithdraw: () => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onApply, hasApplied, onWithdraw }) => {
    if (!job) return null;

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 25
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    const details = [
        { icon: 'work', label: 'Type', text: job.job_type },
        { icon: 'layers', label: 'Level', text: job.experience_level },
        { icon: 'hub', label: 'Mode', text: job.employment_mode },
        { icon: 'location_on', label: 'Location', text: job.location || 'Remote' },
        { icon: 'schedule', label: 'Posted', text: new Date(job.posted_at).toLocaleDateString() },
    ];

    const skills = job.required_skills
        ? job.required_skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

    return (
        <AnimatePresence>
            <>
                {/* Backdrop */}
                <motion.div
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 relative overflow-hidden flex-shrink-0">
                            {/* Decorative background icon */}
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <span className="material-symbols-outlined text-7xl text-white">
                                    work
                                </span>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-3">
                                    {/* Company logo + info */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden shrink-0">
                                            {job.companies?.logo_url ? (
                                                <img
                                                    src={job.companies.logo_url}
                                                    alt={job.companies.company_name}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <span className="material-symbols-outlined text-xl text-white/70">business</span>
                                            )}
                                        </div>
                                        <div>
                                            <motion.p
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="text-red-100 text-xs font-semibold uppercase tracking-wider mb-0.5"
                                            >
                                                {job.companies?.company_name || 'Unknown Company'}
                                            </motion.p>
                                            <motion.h2
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.15 }}
                                                className="text-xl font-bold text-white leading-tight"
                                            >
                                                {job.title}
                                            </motion.h2>
                                        </div>
                                    </div>

                                    {/* Close button */}
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2 shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-white">close</span>
                                    </motion.button>
                                </div>


                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">

                            {/* Detail Cards */}
                            <div className="grid gap-3">
                                {details.map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + i * 0.05 }}
                                        className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                    >
                                        <span className="material-symbols-outlined text-red-600">{item.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{item.text}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* About the Role */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                    <span className="material-symbols-outlined text-red-600">description</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">About the Role</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                                            {job.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Skills */}
                            {skills.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-red-600">psychology</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Required Skills</p>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                                            {skills.join(', ')}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Faculties */}
                            {job.companies?.faculties && job.companies.faculties.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-red-600">school</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Target Faculties</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {job.companies.faculties.map((faculty: string, i: number) => (
                                                <motion.span
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.85 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.37 + i * 0.04, type: 'spring' }}
                                                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20"
                                                >
                                                    {faculty}
                                                </motion.span>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {/* Apply / Withdraw Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                {hasApplied ? (
                                    <button
                                        onClick={onWithdraw}
                                        className="w-full mt-2 bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 border border-gray-200 dark:border-zinc-700"
                                    >
                                        <span className="material-symbols-outlined">cancel</span>
                                        Withdraw Application
                                    </button>
                                ) : (
                                    <button
                                        onClick={onApply}
                                        className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        Apply Now
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </>
        </AnimatePresence>
    );
};

export default JobDetailModal;