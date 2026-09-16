import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Calendar, CheckCircle } from '../components/icons';

export const RegistrationConfirmed: React.FC = () => {
    const { signOut } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-red-100 dark:border-red-900/30"
            >
                {/* Header */}
                <div className="bg-red-50 dark:bg-red-900/20 p-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-asu-red dark:text-red-400"
                    >
                        <CheckCircle className="w-10 h-10" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Registration Confirmed
                    </h1>
                    <p className="text-red-700 dark:text-red-300 font-medium">
                        You're all set!
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    <div className="bg-white dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg text-asu-red dark:text-red-400">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Mark Your Calendar</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Please wait for the event to start to access the portal features.
                                    We will notify you when the dashboard becomes active.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Keep an eye on your email for updates and the event schedule.
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => signOut()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-gray-200 dark:shadow-none"
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
