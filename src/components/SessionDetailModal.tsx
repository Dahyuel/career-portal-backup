import React from 'react';

interface Session {
    id: string;
    title: string;
    description: string | null;
    session_type: 'keynote' | 'workshop' | 'panel' | 'networking' | 'competition' | 'other';
    start_time: string;
    end_time: string;
    room_name: string | null;
    room_capacity: number | null;
    max_attendees: number | null;
    current_bookings: number;
    is_full: boolean;
    speaker?: {
        first_name: string;
        last_name: string;
        title: string;
        photo_url: string | null;
    };
}

interface SessionDetailModalProps {
    session: Session;
    onClose: () => void;
    onBook?: () => void;
    onCancel?: () => void;
    isBooked: boolean;
    bookingId?: string;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
    session,
    onClose,
    onBook,
    onCancel,
    isBooked,
}) => {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'keynote':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'workshop':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'panel':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'networking':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'competition':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDuration = () => {
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    };

    const availableSeats = session.max_attendees
        ? session.max_attendees - session.current_bookings
        : null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
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
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(session.session_type)}`}>
                        {session.session_type}
                    </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 clear-both">
                    {session.title}
                </h2>

                {/* Speaker Info */}
                {session.speaker && (
                    <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        {session.speaker.photo_url ? (
                            <img
                                src={session.speaker.photo_url}
                                alt={`${session.speaker.first_name} ${session.speaker.last_name}`}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400">person</span>
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {session.speaker.first_name} {session.speaker.last_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{session.speaker.title}</p>
                        </div>
                    </div>
                )}

                {/* Description */}
                {session.description && (
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                            {session.description}
                        </p>
                    </div>
                )}

                {/* Session Details */}
                <div className="space-y-4 bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
                    {/* Time */}
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5">
                            schedule
                        </span>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Time</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Duration: {getDuration()}
                            </p>
                        </div>
                    </div>

                    {/* Room */}
                    {session.room_name && (
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5">
                                meeting_room
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Room</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{session.room_name}</p>
                                {session.room_capacity && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Capacity: {session.room_capacity} people
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Availability */}
                    {session.max_attendees && (
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5">
                                groups
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Availability</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {session.current_bookings} / {session.max_attendees} booked
                                </p>
                                {availableSeats !== null && (
                                    <p className={`text-xs mt-1 ${session.is_full ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {session.is_full ? 'Session Full' : `${availableSeats} seats available`}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {isBooked ? (
                        <button
                            onClick={onCancel}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">cancel</span>
                            Cancel Booking
                        </button>
                    ) : (
                        <button
                            onClick={onBook}
                            disabled={session.is_full}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">event_available</span>
                            {session.is_full ? 'Session Full' : 'Book Session'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionDetailModal;
