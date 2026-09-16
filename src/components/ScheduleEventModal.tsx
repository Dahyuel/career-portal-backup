import React from 'react';
import { motion } from 'framer-motion';

interface ScheduleEvent {
    id: string;
    title: string;
    description: string | null;
    schedule_type: 'session' | 'workshop' | 'keynote' | 'break' | 'ceremony' | 'networking' | 'other';
    start_time: string;
    end_time: string;
    location: string | null;
    speaker_id?: string | null;
    speaker?: {
        id: string;
        first_name: string;
        last_name: string;
        title: string;
        photo_url: string | null;
        linkedin_url: string | null;
    } | null;
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

    const heroImage = event.speaker?.photo_url
        || 'https://images.unsplash.com/photo-1544531320-98514ea28924?auto=format&fit=crop&w=800&q=80';

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
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
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden relative z-10"
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
                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </motion.button>

                {/* Hero Image Section */}
                <div className="relative h-64 w-full overflow-hidden">
                    <motion.img
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        src={heroImage}
                        alt={event.speaker ? `${event.speaker.first_name} ${event.speaker.last_name}` : event.title}
                        className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                        {/* Type Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-3"
                        >
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTypeColor(event.schedule_type)} shadow-sm`}>
                                {event.schedule_type}
                            </span>
                        </motion.div>

                        {/* Title */}
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-3xl font-bold text-white mb-2 leading-tight"
                        >
                            {event.title}
                        </motion.h2>

                        {/* Speaker Name in hero */}
                        {event.speaker && (
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-white/90 font-medium text-lg"
                            >
                                with {event.speaker.first_name} {event.speaker.last_name}
                            </motion.p>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Speaker Info */}
                    {event.speaker && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 p-5"
                        >
                            <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <motion.span
                                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                                    transition={{ delay: 0.7, duration: 0.5 }}
                                    className="material-symbols-outlined text-red-600"
                                >
                                    person
                                </motion.span>
                                About the Speaker
                            </h3>
                            <div className="flex items-center gap-4">
                                {event.speaker.photo_url && (
                                    <img
                                        src={event.speaker.photo_url}
                                        alt={`${event.speaker.first_name} ${event.speaker.last_name}`}
                                        className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md flex-shrink-0"
                                    />
                                )}
                                <div className="flex flex-col gap-1">
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                                        {event.speaker.first_name} {event.speaker.last_name}
                                    </h4>
                                    {event.speaker.title && (
                                        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                                            {event.speaker.title}
                                        </p>
                                    )}
                                    {event.speaker.linkedin_url && (
                                        <a
                                            href={event.speaker.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-[#0A66C2] hover:text-[#004182] dark:text-[#70B5F9] dark:hover:text-white font-semibold mt-1 inline-flex items-center gap-1.5 transition-colors"
                                        >
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                            </svg>
                                            LinkedIn Profile
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-600">description</span>
                                About this Event
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                {event.description}
                            </p>
                        </motion.div>
                    )}

                    {/* Logistics Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {/* Time */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                        >
                            <div className="flex items-start gap-3">
                                <motion.span
                                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                                    transition={{ delay: 0.9, duration: 0.5 }}
                                    className="material-symbols-outlined text-red-600 mt-1"
                                >
                                    schedule
                                </motion.span>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Time & Duration</p>
                                    <p className="font-semibold text-slate-900 dark:text-white mt-1 text-sm">
                                        {formatTime(event.start_time)}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        to {formatTime(event.end_time)}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Duration: {getDuration()}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Location */}
                        {event.location && (
                            <motion.div
                                whileHover={{ y: -4 }}
                                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-red-600 mt-1">location_on</span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Location</p>
                                        <p className="font-semibold text-slate-900 dark:text-white mt-1">
                                            {event.location}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default ScheduleEventModal;