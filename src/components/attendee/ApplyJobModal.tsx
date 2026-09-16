import React from 'react';
import { motion } from 'framer-motion';

interface ApplyJobModalProps {
    jobTitle: string;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

const ApplyJobModal: React.FC<ApplyJobModalProps> = ({ jobTitle, onClose, onConfirm, loading }) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
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
                className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 relative z-10"
                onClick={e => e.stopPropagation()}
            >
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center text-center mb-6"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 3 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-4 text-red-600 dark:text-red-400 transform shadow-lg shadow-red-500/10"
                    >
                        <span className="material-symbols-outlined text-3xl">assignment_ind</span>
                    </motion.div>
                    <motion.h3
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
                    >
                        Apply to {jobTitle}?
                    </motion.h3>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-500 dark:text-slate-400"
                    >
                        Are you sure you want to apply for this position?
                    </motion.p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 text-left"
                >
                    <div className="flex gap-3">
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.6, type: "spring" }}
                            className="material-symbols-outlined text-amber-600 dark:text-amber-400 shrink-0"
                        >
                            privacy_tip
                        </motion.span>
                        <div>
                            <motion.h4
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1"
                            >
                                Privacy Notice
                            </motion.h4>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed"
                            >
                                By applying, you agree to share your <strong>full profile</strong>, including your <strong>CV, contact details, and academic info</strong>, with the employer.
                            </motion.p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col gap-3"
                >
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="material-symbols-outlined"
                            >
                                progress_activity
                            </motion.span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">send</span>
                                Yes, Apply Now
                            </>
                        )}
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default ApplyJobModal;