import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock, AlertCircle } from '../components/icons';

export const PendingApproval: React.FC = () => {
    const { signOut } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
                <div className="p-6 text-center bg-red-50 dark:bg-red-900/20">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-100 text-asu-red dark:bg-red-900/40 dark:text-red-400"
                    >
                        <Clock className="w-10 h-10" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Application Pending
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Your registration is currently under review.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm text-red-800 dark:text-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>
                            Thank you for registering! Our team is reviewing your details.
                            You will receive a notification once your application is approved.
                            Please check back later using this portal.
                        </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p>
                                As an <strong>ASU student</strong>, your enrollment proof (university ID) will be verified by our team. Once verified, you will receive an email confirming that you can attend the event. Please make sure you uploaded a <strong>clear and correct university ID</strong>.
                            </p>
                            <p>
                                <strong>Note:</strong> The confirmation email is most likely sent to your <strong>spam/junk folder</strong>. Please check there if you don't see it in your inbox.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
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