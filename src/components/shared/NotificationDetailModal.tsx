import React from 'react';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type?: string;
    created_at?: string;
    is_read?: boolean;
}

interface NotificationDetailModalProps {
    notification: Notification | null;
    onClose: () => void;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ notification, onClose }) => {
    if (!notification) return null;

    // Helper to get styling based on notification type
    const getNotificationStyle = (type?: string) => {
        switch (type) {
            case 'success':
                return {
                    icon: 'check_circle',
                    color: 'text-green-600',
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800'
                };
            case 'urgent':
            case 'error':
                return {
                    icon: 'error',
                    color: 'text-red-600',
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800'
                };
            case 'warning':
                return {
                    icon: 'warning',
                    color: 'text-yellow-600',
                    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                    border: 'border-yellow-200 dark:border-yellow-800'
                };
            case 'info':
            default:
                return {
                    icon: 'info',
                    color: 'text-blue-600',
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800'
                };
        }
    };

    const style = getNotificationStyle(notification.type);

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 border border-slate-200 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${style.bg}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm`}>
                            <span className={`material-symbols-outlined text-2xl ${style.color}`}>
                                {style.icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {notification.type || 'Notification'}
                            </p>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Just now'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                        {notification.title}
                    </h2>

                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {notification.message}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg shadow-slate-200/50 dark:shadow-none active:scale-95"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationDetailModal;
