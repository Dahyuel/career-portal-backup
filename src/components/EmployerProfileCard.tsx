import { motion } from 'framer-motion';
import { EmployerProfile } from '../hooks/useEmployerProfile';

interface EmployerProfileCardProps {
    profile: EmployerProfile | null;
    onClose: () => void;
}

const EmployerProfileCard: React.FC<EmployerProfileCardProps> = ({ profile, onClose }) => {
    if (!profile) return null;

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
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Cover */}
                <div className="relative h-32 bg-gradient-to-br from-red-600 to-red-700">
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-all backdrop-blur-sm"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </motion.button>

                    {/* Profile Image / Initials */}
                    <motion.div
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="absolute -bottom-10 left-8"
                    >
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
                    </motion.div>
                </div>

                {/* Content */}
                <div className="pt-12 px-8 pb-8">
                    <div className="mb-6">
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-bold text-slate-800 dark:text-white"
                        >
                            {profile.full_name}
                        </motion.h2>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mt-1"
                        >
                            <span className="material-symbols-outlined text-lg opacity-70">badge</span>
                            <p className="font-medium">{profile.job_title || 'Employer'}</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-2 text-slate-600 dark:text-slate-400"
                        >
                            <span className="material-symbols-outlined text-lg opacity-70">apartment</span>
                            <p>{profile.company_name || 'No Company Linked'}</p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-1 gap-4 mb-6"
                    >
                        {/* Contact Info */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                Contact Information
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Email Address', value: profile.email || 'N/A', icon: 'mail', color: 'blue' },
                                    { label: 'Phone Number', value: profile.phone, icon: 'call', color: 'purple' },
                                    { label: 'Website', value: profile.company_website, icon: 'language', color: 'emerald', isLink: true }
                                ].filter(item => item.value).map((item, index) => (
                                    <motion.div
                                        key={item.label}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 + index * 0.1 }}
                                        className="flex items-center gap-3"
                                    >
                                        <div className={`w-8 h-8 rounded-full bg-${item.color}-50 dark:bg-${item.color}-900/20 flex items-center justify-center shrink-0`}>
                                            <span className={`material-symbols-outlined text-${item.color}-600 text-sm`}>{item.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                                            {item.isLink ? (
                                                <a
                                                    href={item.value}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                                >
                                                    {item.value}
                                                </a>
                                            ) : (
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {item.value}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex justify-end pt-2"
                    >
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg active:scale-95"
                        >
                            Close
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default EmployerProfileCard;
