import React from 'react';
import { motion } from 'framer-motion';
import { User, X, CheckCircle, LogOut, QrCode } from 'lucide-react';

interface Attendee {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone?: string;
    personal_id: string;
    role: string;
    university?: string;
    faculty?: string;
    current_status?: 'inside' | 'outside';
    last_scan?: string;
    event_entry?: boolean;
    profile_complete?: boolean;
    authorized?: boolean;
}

interface Props {
    attendee: Attendee | null;
    onClose: () => void;
    onAction: (action: 'enter' | 'exit') => void;
    isLoading: boolean;
    actionLoading: boolean;
}

export const RegTeamAttendeeCard: React.FC<Props> = ({ attendee, onClose, onAction, isLoading, actionLoading }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {isLoading || !attendee ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Loading attendee details...</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <motion.h3
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-bold text-gray-900 dark:text-white"
                            >
                                Attendee Details
                            </motion.h3>
                            <motion.button
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </motion.button>
                        </div>

                        {/* Attendee Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-6"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0"
                                >
                                    <User className="w-8 h-8 text-red-600 dark:text-red-500" />
                                </motion.div>
                                <div className="min-w-0">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                        {attendee.full_name}
                                    </h4>
                                    <p className={`text-sm font-medium mt-1 ${attendee.current_status === 'inside' ? "text-green-600" : "text-orange-600"
                                        }`}>
                                        {attendee.current_status === 'inside' ? "Currently Inside" : "Currently Outside"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* University & Faculty */}
                                {(attendee.university || attendee.faculty) && (
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {attendee.university && (
                                            <div className="bg-white dark:bg-slate-700/50 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">University</p>
                                                <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={attendee.university}>
                                                    {attendee.university}
                                                </p>
                                            </div>
                                        )}
                                        {attendee.faculty && (
                                            <div className="bg-white dark:bg-slate-700/50 p-3 rounded-xl">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Faculty</p>
                                                <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={attendee.faculty}>
                                                    {attendee.faculty}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Personal ID */}
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <QrCode className="w-5 h-5 text-red-500" />
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Personal ID</p>
                                            <p className="font-mono font-bold text-slate-700 dark:text-slate-200">{attendee.personal_id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Email */}
                                {attendee.email && (
                                    <div className="p-3 bg-white dark:bg-slate-700/50 rounded-xl overflow-hidden">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Email</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={attendee.email}>
                                            {attendee.email}
                                        </p>
                                    </div>
                                )}

                                {/* Phone */}
                                {attendee.phone && (
                                    <div className="p-3 bg-white dark:bg-slate-700/50 rounded-xl overflow-hidden">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Phone</p>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                            {attendee.phone}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Action Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="grid grid-cols-2 gap-4"
                        >
                            <button
                                onClick={() => onAction('enter')}
                                disabled={actionLoading || attendee.current_status === 'inside'}
                                className={`flex items-center justify-center py-4 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${attendee.current_status === 'inside'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'
                                    }`}
                            >
                                {actionLoading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Check In
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => onAction('exit')}
                                disabled={actionLoading || attendee.current_status !== 'inside'}
                                className={`flex items-center justify-center py-4 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${attendee.current_status !== 'inside'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30'
                                    }`}
                            >
                                {actionLoading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogOut className="w-5 h-5 mr-2" />
                                        Check Out
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </>
                )}
            </motion.div>
        </div>
    );
};
