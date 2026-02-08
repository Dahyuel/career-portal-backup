import React from 'react';

interface ApplyJobModalProps {
    jobTitle: string;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

const ApplyJobModal: React.FC<ApplyJobModalProps> = ({ jobTitle, onClose, onConfirm, loading }) => {
    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 transform transition-all scale-100"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                        <span className="material-symbols-outlined text-3xl">assignment_ind</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Apply to {jobTitle}?
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        Are you sure you want to apply for this position?
                    </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 text-left">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 shrink-0">privacy_tip</span>
                        <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Privacy Notice</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                                By applying, you agree to share your <strong>full profile</strong>, including your <strong>CV, contact details, and academic info</strong>, with the employer.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">send</span>
                                Yes, Apply Now
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApplyJobModal;
