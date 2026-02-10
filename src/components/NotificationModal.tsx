import React from 'react';
import { motion } from 'framer-motion';

interface Notification {
    id: string;
    title: string;
    content: string;
    announcement_type: 'general' | 'urgent' | 'update' | 'reminder';
    publish_at: string;
    created_at: string;
}

interface NotificationModalProps {
    notification: Notification;
    onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose }) => {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'urgent':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'update':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'reminder':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'urgent':
                return 'warning';
            case 'update':
                return 'info';
            case 'reminder':
                return 'notifications_active';
            default:
                return 'campaign';
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]">
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
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </motion.button>

                {/* Type Badge */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-4"
                >
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(notification.announcement_type)}`}>
                        <span className="material-symbols-outlined text-sm">{getTypeIcon(notification.announcement_type)}</span>
                        {notification.announcement_type}
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-gray-900 dark:text-white mb-4 clear-both"
                >
                    {notification.title}
                </motion.h2>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="prose prose-sm dark:prose-invert mb-6"
                >
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {notification.content}
                    </p>
                </motion.div>

                {/* Date/Time */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="border-t border-gray-200 dark:border-gray-700 pt-4"
                >
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <motion.span
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="material-symbols-outlined text-lg"
                        >
                            schedule
                        </motion.span>
                        <span>
                            {new Date(notification.publish_at || notification.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default NotificationModal;