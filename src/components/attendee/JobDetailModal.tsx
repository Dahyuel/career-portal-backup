import React from 'react';
import { motion } from 'framer-motion';

interface JobDetailModalProps {
    job: any;
    onClose: () => void;
    onApply: () => void;
    hasApplied: boolean;
    onWithdraw: () => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onApply, hasApplied, onWithdraw }) => {
    if (!job) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
            >
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-red-600 to-red-800 relative">
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </motion.button>
                </div>

                {/* Content Container */}
                <div className="px-8 pb-8 -mt-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-6">
                        {/* Header Info */}
                        <div className="flex items-end gap-6">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.1, type: "spring" }}
                                className="w-24 h-24 rounded-2xl bg-white p-2 shadow-lg border-2 border-white dark:border-slate-800 flex items-center justify-center shrink-0 relative z-10"
                            >
                                {job.companies?.logo_url ? (
                                    <img
                                        src={job.companies.logo_url}
                                        alt={job.companies.company_name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-4xl text-slate-300">business</span>
                                )}
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex-1 relative z-10"
                            >
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                    {job.title}
                                </h2>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                                    <span className="material-symbols-outlined text-lg">apartment</span>
                                    {job.companies?.company_name || 'Unknown Company'}
                                </div>
                            </motion.div>
                        </div>

                        {/* Badges */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap gap-2"
                        >
                            {[
                                { icon: 'work', text: job.job_type, color: 'red' },
                                { icon: 'layers', text: job.experience_level, color: 'slate' },
                                { icon: 'pnp', text: job.employment_mode, color: 'slate' },
                                { icon: 'location_on', text: job.location || 'Remote', color: 'slate' },
                                { icon: 'schedule', text: new Date(job.posted_at).toLocaleDateString(), color: 'slate' }
                            ].map((badge, index) => (
                                <motion.span
                                    key={index}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4 + index * 0.1, type: "spring" }}
                                    className={`px-3 py-1.5 rounded-lg ${badge.color === 'red'
                                        ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                        } text-[10px] font-bold uppercase flex items-center gap-1.5`}
                                >
                                    <span className="material-symbols-outlined text-lg">{badge.icon}</span>
                                    {badge.text}
                                </motion.span>
                            ))}
                        </motion.div>

                        <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />

                        {/* Description */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <motion.span
                                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                                    transition={{ delay: 0.8, duration: 0.5 }}
                                    className="material-symbols-outlined text-red-600"
                                >
                                    description
                                </motion.span>
                                About the Role
                            </h3>
                            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                                <p className="whitespace-pre-wrap">{job.description}</p>
                            </div>
                        </motion.div>

                        {/* Requirements */}
                        {job.required_skills && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9 }}
                            >
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-600">checklist</span>
                                    Requirements & Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {job.required_skills.split(',').map((skill: string, index: number) => (
                                        <motion.span
                                            key={index}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 1 + index * 0.05, type: "spring" }}
                                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700"
                                        >
                                            {skill.trim()}
                                        </motion.span>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end items-center gap-3"
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </motion.button>
                    {hasApplied ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onWithdraw}
                            className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                            <span className="material-symbols-outlined">cancel</span>
                            Withdraw
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onApply}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center gap-2"
                        >
                            Apply Now
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </motion.button>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default JobDetailModal;