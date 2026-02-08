import React from 'react';

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

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Type Badge */}
                <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(notification.announcement_type)}`}>
                        {notification.announcement_type}
                    </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 clear-both">
                    {notification.title}
                </h2>

                {/* Content */}
                <div className="prose prose-sm dark:prose-invert mb-6">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {notification.content}
                    </p>
                </div>

                {/* Date/Time */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="material-symbols-outlined text-lg">schedule</span>
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
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;
