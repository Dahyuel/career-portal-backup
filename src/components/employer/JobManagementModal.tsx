import React from 'react';
import { motion } from 'framer-motion';

interface JobPosition {
    id: string;
    title: string;
    job_type: string;
    employment_mode: string;
    experience_level: string;
    description: string;
    location: string;
    required_skills: string;
    posted_at: string;
    no_of_applicants: number;
}

interface JobManagementModalProps {
    job: JobPosition;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    /** Ended event: details only, no edit/delete */
    readOnly?: boolean;
}

const JobManagementModal: React.FC<JobManagementModalProps> = ({ job, onClose, onEdit, onDelete, readOnly = false }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[110]">
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
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-red-600 to-red-700 p-6 flex items-end">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div className="text-white">
                        <h2 className="text-2xl font-bold line-clamp-1">{job.title}</h2>
                        <p className="text-red-100 flex items-center gap-1 text-sm">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            Posted on {new Date(job.posted_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Key Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Type - Blue */}
                        <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">category</span>
                                Type
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{job.job_type}</p>
                        </div>

                        {/* Mode - Emerald */}
                        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">home_work</span>
                                Mode
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{job.employment_mode}</p>
                        </div>

                        {/* Level - Amber */}
                        <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50">
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">bolt</span>
                                Level
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{job.experience_level}</p>
                        </div>

                        {/* Applicants - Red */}
                        <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50">
                            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">group</span>
                                Applicants
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{job.no_of_applicants || 0}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-red-600">description</span>
                            Job Description
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                            {job.description}
                        </p>
                    </section>

                    {/* Required Skills */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-red-600">psychology</span>
                            Required Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {job.required_skills.split(',').map((skill, i) => (
                                <span key={i} className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                                    {skill.trim()}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Location */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-red-600">location_on</span>
                            Location
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {job.location}
                        </p>
                    </section>
                </div>

                {/* Footer Actions */}
                {readOnly ? (
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">lock</span>
                        This event has ended. Jobs can no longer be changed.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
                ) : (
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onDelete}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border font-bold transition-all active:scale-95 order-2 sm:order-1 ${job.no_of_applicants > 0
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-70'
                                : 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                            }`}
                    >
                        <span className="material-symbols-outlined">{job.no_of_applicants > 0 ? 'lock' : 'delete'}</span>
                        Delete Job
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95 order-1 sm:order-2"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Edit Job Details
                    </button>
                </div>
                )}
            </motion.div>
        </div>
    );
};

export default JobManagementModal;
