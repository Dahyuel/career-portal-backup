import React from 'react';
import { motion } from 'framer-motion';

interface WithdrawJobModalProps {
    jobTitle: string;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

const WithdrawJobModal: React.FC<WithdrawJobModalProps> = ({ jobTitle, onClose, onConfirm, loading }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
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
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400"
                    >
                        <span className="material-symbols-outlined text-3xl">warning</span>
                    </motion.div>
                    <motion.h3
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
                    >
                        Withdraw Application?
                    </motion.h3>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-500 dark:text-slate-400"
                    >
                        Are you sure you want to withdraw your application for <strong>{jobTitle}</strong>?
                    </motion.p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8 text-left"
                >
                    <div className="flex gap-3">
                        <motion.span
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            className="material-symbols-outlined text-red-600 dark:text-red-400 shrink-0"
                        >
                            info
                        </motion.span>
                        <div>
                            <h4 className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">Important Note</h4>
                            <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                                This action cannot be undone. You will need to re-apply if you change your mind.
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col gap-3"
                >
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
                                <span className="material-symbols-outlined">remove_circle</span>
                                Yes, Withdraw
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

export default WithdrawJobModal;