import React from 'react';

interface JobDetailModalProps {
    job: any;
    onClose: () => void;
    onApply: () => void;
    hasApplied: boolean;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onApply, hasApplied }) => {
    if (!job) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                            {job.title}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined text-lg">apartment</span>
                            <span className="font-medium">{job.companies?.company_name || 'Unknown Company'}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">work</span>
                            {job.job_type}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">schedule</span>
                            {job.employment_mode}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">trending_up</span>
                            {job.experience_level}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">location_on</span>
                            {job.location}
                        </span>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">description</span>
                            Description
                        </h3>
                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                            <p className="whitespace-pre-wrap">{job.description}</p>
                        </div>
                    </div>

                    {/* Requirements */}
                    {job.required_skills && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">checklist</span>
                                Requirements / Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {job.required_skills.split(',').map((skill: string, index: number) => (
                                    <span key={index} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm border border-slate-200 dark:border-slate-700">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={onApply}
                        disabled={hasApplied}
                        className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 ${hasApplied
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-indigo-500/20'
                            }`}
                    >
                        <span className="material-symbols-outlined">
                            {hasApplied ? 'check_circle' : 'send'}
                        </span>
                        {hasApplied ? 'Applied' : 'Apply Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobDetailModal;
