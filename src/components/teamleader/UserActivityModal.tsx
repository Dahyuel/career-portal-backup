// components/teamleader/UserActivityModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

interface Activity {
    id: string;
    activity_type: string;
    description: string;
    points_earned: number | null;
    activity_timestamp: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    targetUserId: string;
    volunteerName: string;
}

// Map activity_type → icon + colour
const ACTIVITY_META: Record<string, { icon: string; colour: string }> = {
    event_entry: { icon: 'login', colour: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
    event_exit: { icon: 'logout', colour: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' },
    event_checkin_staff: { icon: 'how_to_reg', colour: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    event_checkout_staff: { icon: 'person_remove', colour: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
    session_attendance: { icon: 'event_available', colour: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400' },
    session_checkin_staff: { icon: 'meeting_room', colour: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
    bonus: { icon: 'stars', colour: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
    volunteer_hours: { icon: 'schedule', colour: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400' },
    job_application: { icon: 'work', colour: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400' },
    job_application_applied: { icon: 'send', colour: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400' },
    job_application_withdrawn: { icon: 'undo', colour: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
    booking: { icon: 'bookmark_added', colour: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
    unbooking: { icon: 'bookmark_remove', colour: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400' },
    verification_approved: { icon: 'verified', colour: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
    verification_rejected: { icon: 'cancel', colour: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
};

function getActivityMeta(type: string) {
    return ACTIVITY_META[type] ?? { icon: 'info', colour: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' };
}

function formatType(type: string) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const UserActivityModal: React.FC<Props> = ({ isOpen, onClose, targetUserId, volunteerName }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('team_leader_get_user_activities', {
                p_target_user_id: targetUserId
            });
            if (rpcError) throw rpcError;
            setActivities((data as Activity[]) || []);
        } catch (err: any) {
            logger.error('Error fetching user activities:', err);
            setError(err?.message || 'Failed to load activities.');
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

    useEffect(() => {
        if (isOpen) fetchActivities();
        else { setActivities([]); setError(null); }
    }, [isOpen, fetchActivities]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-br from-red-600 to-red-700 p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl relative overflow-hidden flex-shrink-0">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-7xl text-white">history</span>
                                </div>
                                <div className="relative z-10 flex items-start justify-between">
                                    <div className="min-w-0">
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">User Activity</h2>
                                        <p className="text-red-100 text-xs sm:text-sm mt-1 truncate">{volunteerName}</p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose}
                                        className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors ml-4 flex-shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-white text-xl sm:text-2xl">close</span>
                                    </motion.button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading activities...</p>
                                    </div>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                        <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                                        <p className="text-sm text-red-500">{error}</p>
                                        <button
                                            onClick={fetchActivities}
                                            className="text-xs text-red-600 font-semibold underline"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : activities.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">history_toggle_off</span>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No activities recorded yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activities.map((act) => {
                                            const meta = getActivityMeta(act.activity_type);
                                            return (
                                                <motion.div
                                                    key={act.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="flex items-start gap-3 p-3 sm:p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl"
                                                >
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.colour}`}>
                                                        <span className="material-symbols-outlined text-lg">{meta.icon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                            {formatType(act.activity_type)}
                                                        </p>
                                                        <p className="text-sm font-medium text-slate-800 dark:text-white mt-0.5 leading-snug">
                                                            {act.description}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            {act.activity_timestamp && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(act.activity_timestamp).toLocaleString(undefined, {
                                                                        month: 'short', day: 'numeric',
                                                                        hour: '2-digit', minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            )}
                                                            {act.points_earned != null && act.points_earned !== 0 && (
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${act.points_earned > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                    {act.points_earned > 0 ? '+' : ''}{act.points_earned} pts
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default UserActivityModal;
