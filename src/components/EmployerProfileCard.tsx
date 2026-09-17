import React, { useState, useMemo } from 'react';
import { getActiveEventId } from '../lib/currentEvent';
import { motion, AnimatePresence } from 'framer-motion';
import EditCompanyModal from './employer/EditCompanyModal';
import { useAuth } from '../contexts/AuthContext';

interface EmployerProfileCardProps {
    onClose: () => void;
}

const EmployerProfileCard: React.FC<EmployerProfileCardProps> = ({ onClose }) => {
    const { profile, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal');
    const [showEditCompany, setShowEditCompany] = useState(false);

    // Extract employer data from AuthContext profile
    const employerData = useMemo(() => {
        if (!profile?.employer || !profile?.company) return null;

        return {
            // Personal info
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            personal_id: profile.personal_id,

            // Employer info
            employer_id: profile.employer.user_id,
            job_title: profile.employer.job_title,

            // Company info
            company_id: profile.employer.company_id,
            company_name: profile.company.company_name,
            company_logo: profile.company.logo_url,
            company_website: profile.company.website,
            industry: profile.company.industry,
            description: profile.company.description,
            partner_type: profile.company.partner_type,
            target_faculties: profile.company.faculties || []
        };
    }, [profile]);

    if (!employerData) return null;

    const handleCompanyUpdate = async () => {
        // Get event_id from profile or use default
        const EVENT_ID = profile?.event_id || getActiveEventId();
        // Force refresh to get updated company data
        await refreshProfile(EVENT_ID, undefined, undefined, true);
        setShowEditCompany(false);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
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
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Gradient */}
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

                    {/* Partner Type Badge */}
                    {employerData.partner_type && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="absolute top-4 left-4"
                        >
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${employerData.partner_type === 'diamond' ? 'bg-cyan-200 text-cyan-800' :
                                employerData.partner_type === 'platinum' ? 'bg-slate-200 text-slate-800' :
                                    employerData.partner_type === 'gold' ? 'bg-yellow-400 text-yellow-900' :
                                        employerData.partner_type === 'silver' ? 'bg-slate-300 text-slate-700' :
                                            employerData.partner_type === 'exhibitor_a' ? 'bg-purple-200 text-purple-800' :
                                                employerData.partner_type === 'exhibitor_b' ? 'bg-blue-200 text-blue-800' :
                                                    employerData.partner_type === 'student_activity_partner' ? 'bg-violet-200 text-violet-800' :
                                                        employerData.partner_type === 'community_partner' ? 'bg-emerald-200 text-emerald-800' :
                                                            employerData.partner_type === 'catering_partner' ? 'bg-orange-200 text-orange-800' :
                                                                employerData.partner_type === 'career_coaching_partner' ? 'bg-sky-200 text-sky-800' :
                                                                    'bg-blue-500 text-white'
                                }`}>
                                {employerData.partner_type.replace('_', ' ')}
                            </span>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="absolute -bottom-12 left-8"
                    >
                        <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 flex items-center justify-center shadow-md overflow-hidden">
                            {employerData.company_logo ? (
                                <img
                                    src={employerData.company_logo}
                                    alt={employerData.company_name}
                                    className="w-full h-full object-contain p-2"
                                />
                            ) : (
                                <span className="material-symbols-outlined text-red-600 text-5xl">business</span>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Profile Name & Tabs */}
                <div className="pt-14 px-8 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                        {employerData.company_name || 'Company Name'}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-600 dark:text-gray-400 text-sm"
                    >
                        {employerData.job_title} • {employerData.full_name}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex gap-6 mt-6"
                    >
                        {['personal', 'company'].map((tab, index) => (
                            <motion.button
                                key={tab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-2 text-sm font-semibold transition-colors relative ${activeTab === tab
                                    ? 'text-red-600'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)} Info
                                {activeTab === tab && (
                                    <motion.span
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full"
                                    />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                </div>

                {/* Content Area */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <AnimatePresence mode="wait">
                        {activeTab === 'personal' && (
                            <motion.div
                                key="personal"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="space-y-4"
                                >
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                        <span className="material-symbols-outlined text-red-500 text-lg">person</span>
                                        Personal Contact
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                                        {[
                                            { label: 'Full Name', value: employerData.full_name },
                                            { label: 'Email', value: employerData.email },
                                            { label: 'Phone', value: employerData.phone },
                                            { label: 'Personal ID', value: employerData.personal_id }
                                        ].map((item, index) => (
                                            <motion.div
                                                key={item.label}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + index * 0.1 }}
                                            >
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value || 'N/A'}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="space-y-4"
                                >
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                        <span className="material-symbols-outlined text-red-500 text-lg">badge</span>
                                        Role Information
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Job Title</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{employerData.job_title || 'N/A'}</p>
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{employerData.company_name || 'N/A'}</p>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        {activeTab === 'company' && (
                            <motion.div
                                key="company"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="space-y-4"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500 text-lg">apartment</span>
                                            Company Details
                                        </h3>
                                        {employerData.company_id && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setShowEditCompany(true)}
                                                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                Edit Info
                                            </motion.button>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                                        {[
                                            { label: 'Company Name', value: employerData.company_name },
                                            { label: 'Industry', value: employerData.industry || 'N/A' },
                                            { label: 'Partner Type', value: employerData.partner_type?.toUpperCase() || 'N/A', isBadge: true },
                                            { label: 'Website', value: employerData.company_website, isLink: true },
                                            { label: 'Description', value: employerData.description || 'No description available', isTextarea: true },
                                            {
                                                label: 'Target Faculties',
                                                value: employerData.target_faculties?.length
                                                    ? employerData.target_faculties.join(', ')
                                                    : 'All Faculties'
                                            }
                                        ].map((item, index) => (
                                            <motion.div
                                                key={item.label}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + index * 0.1 }}
                                            >
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                                                {item.isLink && item.value && item.value !== 'N/A' ? (
                                                    <a
                                                        href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                    >
                                                        {item.value}
                                                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                                                    </a>
                                                ) : item.isBadge && item.value && item.value !== 'N/A' ? (
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.value === 'DIAMOND' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' :
                                                        item.value === 'PLATINUM' ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' :
                                                            item.value === 'GOLD' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                item.value === 'SILVER' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                                                                    item.value === 'EXHIBITOR_A' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                        item.value === 'EXHIBITOR_B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                            item.value === 'STUDENT_ACTIVITY_PARTNER' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' :
                                                                                item.value === 'COMMUNITY_PARTNER' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                                    item.value === 'CATERING_PARTNER' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                                        item.value === 'CAREER_COACHING_PARTNER' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' :
                                                                                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                        }`}>
                                                        {item.value.replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    <p className={`text-sm font-medium text-gray-900 dark:text-white ${item.isTextarea ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
                                                        {item.value || 'N/A'}
                                                    </p>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <AnimatePresence>
                {showEditCompany && employerData.company_id && (
                    <EditCompanyModal
                        companyId={employerData.company_id}
                        initialData={{
                            company_name: employerData.company_name || '',
                            industry: employerData.industry || '',
                            website: employerData.company_website || '',
                            description: employerData.description || '',
                            logo_url: employerData.company_logo || '',
                            target_faculties: employerData.target_faculties || []
                        }}
                        onClose={() => setShowEditCompany(false)}
                        onSave={handleCompanyUpdate}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmployerProfileCard;