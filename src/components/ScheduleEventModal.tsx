import React from 'react';

interface ScheduleEvent {
    id: string;
    title: string;
    description: string | null;
    schedule_type: 'session' | 'workshop' | 'keynote' | 'break' | 'ceremony' | 'networking' | 'other';
    start_time: string;
    end_time: string;
    location: string | null;
    related_session_id: string | null;
}

interface ScheduleEventModalProps {
    event: ScheduleEvent;
    onClose: () => void;
}

const ScheduleEventModal: React.FC<ScheduleEventModalProps> = ({ event, onClose }) => {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'keynote':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'workshop':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'networking':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'ceremony':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'break':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
            default:
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
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
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    };

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
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(event.schedule_type)}`}>
                        {event.schedule_type}
                    </span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 clear-both">
                    {event.title}
                </h2>

                {/* Description */}
                {event.description && (
                    <div className="mb-6">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                            {event.description}
                        </p>
                    </div>
                )}

                {/* Event Details */}
                <div className="space-y-4 bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                    {/* Time */}
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5">
                            schedule
                        </span>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Time</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {formatTime(event.start_time)}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                to {formatTime(event.end_time)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Duration: {getDuration()}
                            </p>
                        </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5">
                                location_on
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Location</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{event.location}</p>
                            </div>
                        </div>
                    )}

                    {/* Related Session ID */}
                    {event.related_session_id && (
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5">
                                link
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Related Session</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{event.related_session_id}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleEventModal;
