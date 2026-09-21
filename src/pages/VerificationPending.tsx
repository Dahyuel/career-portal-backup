import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock, Mail, BadgeCheck } from '../components/icons';

export const VerificationPending: React.FC = () => {
    const { profile, signOut } = useAuth();
    const fullName = profile?.full_name;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
                <div className="p-6 text-center bg-amber-50 dark:bg-amber-900/20">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                    >
                        <Clock className="w-10 h-10" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Verification Pending
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {fullName ? `Thanks, ${fullName.split(' ')[0]}.` : 'Thanks.'} Your registration is being reviewed.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                            <BadgeCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>
                                Your registration has been received and is awaiting verification by the event team. You will be notified once your account is reviewed.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-600">
                            <Mail className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" />
                            <p>
                                If you have any questions, please contact the event team for assistance.
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => signOut()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default VerificationPending;
