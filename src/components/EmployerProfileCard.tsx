import React from 'react';
import { EmployerProfile } from '../hooks/useEmployerProfile';

interface EmployerProfileCardProps {
    profile: EmployerProfile | null;
    onClose: () => void;
}

const EmployerProfileCard: React.FC<EmployerProfileCardProps> = ({ profile, onClose }) => {
    if (!profile) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop-blur"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 modal-content-blur"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Cover */}
                <div className="relative h-32 bg-gradient-to-r from-orange-500 to-red-600">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>

                    {/* Profile Image / Initials */}
                    <div className="absolute -bottom-10 left-8">
                        <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-xl">
                            {profile.company_logo ? (
                                <img
                                    src={profile.company_logo}
                                    alt={profile.company_name}
                                    className="w-full h-full object-contain rounded-xl bg-white"
                                />
                            ) : (
                                <div className="w-full h-full rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-400">
                                        business
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-12 px-8 pb-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {profile.full_name}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mt-1">
                            <span className="material-symbols-outlined text-lg opacity-70">badge</span>
                            <p className="font-medium">{profile.job_title || 'Employer'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined text-lg opacity-70">apartment</span>
                            <p>{profile.company_name || 'No Company Linked'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-6">
                        {/* Contact Info */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                Contact Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-blue-600 text-sm">mail</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Email Address</p>
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {profile.email || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-purple-600 text-sm">call</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Phone Number</p>
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {profile.phone}
                                        </p>
                                    </div>
                                </div>

                                {profile.company_website && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-emerald-600 text-sm">language</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Website</p>
                                            <a
                                                href={profile.company_website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                {profile.company_website}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployerProfileCard;
