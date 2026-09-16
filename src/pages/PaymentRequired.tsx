import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, CreditCard, AlertCircle } from '../components/icons';

export const PaymentRequired: React.FC = () => {
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
                        <CreditCard className="w-10 h-10" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Payment Required
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Complete payment to proceed with your application.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm text-red-800 dark:text-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>
                            As a non-ASU student, a registration fee is required to attend the event.
                            Please proceed to payment to finalize your application.
                        </p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p>
                                After completing registration you should have been <strong>redirected to the payment page</strong>. If the redirection didn't work, a <strong>payment link has also been sent to your email</strong>.
                            </p>
                            <p>
                                After completing the payment, please allow <strong>1–3 business days</strong> to receive your confirmation email.
                            </p>
                            <p>
                                <strong>Note:</strong> Emails are most likely sent to your <strong>spam/junk folder</strong>. Please check there if you don't see them in your inbox.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider font-semibold">Payment Link</p>

                        <a
                            href="https://www.ticketsmercato.com/events/asu-career-expo-2026/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full px-4 py-3 bg-asu-red hover:bg-asu-red-dark text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <CreditCard className="w-5 h-5 mr-2" />
                            Proceed to Payment
                        </a>
                        <p className="text-xs text-gray-400 mt-2">
                            Once payment is confirmed, your status will be updated automatically.
                        </p>
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