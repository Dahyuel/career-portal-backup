import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Company {
    id: string;
    company_name: string;
    industry: string;
    description: string;
    website: string;
    logo_url: string;
    booth_number: string;
    partner_type: string;
    email: string;
}

interface CompanyDetailModalProps {
    company: Company | null;
    isOpen: boolean;
    onClose: () => void;
}

const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({ company, isOpen, onClose }) => {
    // Move AnimatePresence outside the conditional logic
    return (
        <AnimatePresence mode="wait">
            {isOpen && company && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
                    {/* Backdrop with exit animation */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Container with enhanced exit animation */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{
                            opacity: 0,
                            scale: 0.9,
                            y: 30,
                            transition: {
                                duration: 0.3,
                                ease: [0.4, 0, 0.2, 1] // Custom easing for smooth exit
                            }
                        }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button with exit animation */}
                        <motion.button
                            initial={{ opacity: 0, scale: 0, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0, rotate: 90 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-red-500 p-2.5 rounded-full transition-all shadow-sm z-20 backdrop-blur-sm border border-gray-100 dark:border-slate-700"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </motion.button>

                        {/* Hero Header with Logo - Staggered exit animations */}
                        <div className="relative h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center overflow-hidden border-b border-gray-100 dark:border-slate-800">
                            <div className="absolute inset-0 opacity-[0.03]" style={{
                                backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)',
                                backgroundSize: '24px 24px'
                            }}></div>

                            <div className="relative z-10 p-6 text-center w-full max-w-lg">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, rotate: 180 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                    className="w-32 h-32 mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center p-4 mb-6 ring-4 ring-white/50 dark:ring-slate-700/50"
                                >
                                    {company.logo_url ? (
                                        <img
                                            src={company.logo_url}
                                            alt={company.company_name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">business</span>
                                    )}
                                </motion.div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">{company.company_name}</h2>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        transition={{ delay: 0.3, type: "spring" }}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${company.partner_type === 'diamond' ? 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800' :
                                                company.partner_type === 'platinum' ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' :
                                                    company.partner_type === 'gold' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
                                                        company.partner_type === 'silver' ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' :
                                                            company.partner_type === 'exhibitor_a' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' :
                                                                company.partner_type === 'exhibitor_b' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                                                    company.partner_type === 'student_activity_partner' ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800' :
                                                                        company.partner_type === 'community_partner' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                                                                            company.partner_type === 'catering_partner' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                                                                                company.partner_type === 'career_coaching_partner' ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' :
                                                                                    'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                            }`}>
                                            {company.partner_type.replace('_', ' ')} Partner
                                        </span>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8">
                            {/* Info Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: 0.4 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: 0.5 }}
                                    whileHover={{ y: -4 }}
                                    className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-start gap-4 transition-all"
                                >
                                    <motion.div
                                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                                        transition={{ delay: 0.6, duration: 0.5 }}
                                        className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm text-red-500 shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-2xl">storefront</span>
                                    </motion.div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Booth Number</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{company.booth_number || 'TBA'}</p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: 0.6 }}
                                    whileHover={{ y: -4 }}
                                    className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-start gap-4 transition-all"
                                >
                                    <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm text-red-500 shrink-0">
                                        <span className="material-symbols-outlined text-2xl">category</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Industry</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{company.industry || 'General'}</p>
                                    </div>
                                </motion.div>
                            </motion.div>

                            {/* Description */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: 0.7 }}
                            >
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <motion.span
                                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                                        transition={{ delay: 0.8, duration: 0.5 }}
                                        className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-1.5 rounded-lg"
                                    >
                                        <span className="material-symbols-outlined text-sm">info</span>
                                    </motion.span>
                                    About {company.company_name}
                                </h3>
                                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                                    {company.description ? (
                                        <p>{company.description}</p>
                                    ) : (
                                        <p className="text-gray-400 italic">No description provided.</p>
                                    )}
                                </div>
                            </motion.div>

                            {/* Contact/Action Details */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ delay: 0.9 }}
                                className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100 dark:border-slate-800"
                            >
                                {company.website && (
                                    <motion.a
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        href={company.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <motion.span
                                            className="material-symbols-outlined"
                                            whileHover={{ scale: 1.1 }}
                                        >
                                            language
                                        </motion.span>
                                        Visit Website
                                    </motion.a>
                                )}

                                {company.email && (
                                    <motion.a
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        href={`mailto:${company.email}`}
                                        className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/30 flex items-center justify-center gap-2 group"
                                    >
                                        <motion.span
                                            className="material-symbols-outlined"
                                            whileHover={{ rotate: -12 }}
                                        >
                                            mail
                                        </motion.span>
                                        Contact Company
                                    </motion.a>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CompanyDetailModal;