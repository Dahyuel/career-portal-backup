import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, ShieldX, AlertTriangle, Mail } from '../components/icons';

export const NotEligibleAttendee: React.FC = () => {
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
                <div className="p-6 text-center bg-red-50 dark:bg-red-900/20">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-100 text-asu-red dark:bg-red-900/40 dark:text-red-400"
                    >
                        <ShieldX className="w-10 h-10" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Registration Not Available
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {fullName ? `Sorry, ${fullName.split(' ')[0]}.` : 'Sorry.'} This event is not open to your registration type.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm text-red-800 dark:text-red-200">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>
                                This event is exclusively for <strong>Ain Shams University</strong> students and alumni. Since your registration was not from Ain Shams University, your attendance for this event has been rejected.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-600">
                            <Mail className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" />
                            <p>
                                If you believe this is a mistake, please contact the event team for clarification.
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
