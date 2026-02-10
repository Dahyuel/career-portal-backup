import React from 'react';
import { motion } from 'framer-motion';

interface Session {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
}

interface BookingConfirmationModalProps {
    session: Session;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
    session,
    onConfirm,
    onCancel,
    loading
}) => {
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center mb-4"
                >
                    <motion.div
                        animate={{ rotate: [0, -5, 5, -5, 0] }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400">
                            event_available
                        </span>
                    </motion.div>
                </motion.div>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2"
                >
                    Confirm Session Booking
                </motion.h2>

                {/* Message */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-600 dark:text-gray-400 text-center mb-4"
                >
                    Are you sure you want to book this session?
                </motion.p>

                {/* Session Details */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6"
                >
                    <motion.p
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="font-semibold text-gray-900 dark:text-white mb-2"
                    >
                        {session.title}
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>{formatTime(session.start_time)}</span>
                    </motion.div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex gap-3"
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg shadow-red-600/20 active:scale-95 transform disabled:opacity-70"
                    >
                        No
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg shadow-green-600/20 active:scale-95 transform disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="material-symbols-outlined"
                            >
                                progress_activity
                            </motion.span>
                        ) : (
                            'Yes'
                        )}
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default BookingConfirmationModal;