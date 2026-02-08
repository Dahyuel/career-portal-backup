import React from 'react';

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
}

const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
    session,
    onConfirm,
    onCancel,
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
        <div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[10000]"
            onClick={onCancel}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400">
                            event_available
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                    Confirm Session Booking
                </h2>

                {/* Message */}
                <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                    Are you sure you want to book this session?
                </p>

                {/* Session Details */}
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">{session.title}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>{formatTime(session.start_time)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                        No
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingConfirmationModal;
