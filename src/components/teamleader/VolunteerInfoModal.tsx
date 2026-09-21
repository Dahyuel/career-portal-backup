// components/teamleader/VolunteerInfoModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AttendanceActionModal from './AttendanceActionModal';
import BonusActionModal from './BonusActionModal';
import UserActivityModal from './UserActivityModal';

interface VolunteerInfo {
    user_id: string;
    volunteer_id: string;
    full_name: string;
    email?: string;
    phone?: string;
    personal_id?: string;
    total_points: number;
    hours_volunteered: number;
    team_id?: string;
}

interface VolunteerInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    volunteer: VolunteerInfo | null;
    onSuccess: () => void;
    loading?: boolean; // New loading prop
    eventId: string; // Required: passed down to UserActivityModal
}

const VolunteerInfoModal: React.FC<VolunteerInfoModalProps> = ({
    isOpen,
    onClose,
    volunteer,
    onSuccess,
    loading = false,
    eventId
}) => {
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);

    if (!volunteer && !loading) return null;

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 25
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-br from-red-600 to-red-700 p-4 sm:p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 sm:p-4 opacity-10">
                                    <span className="material-symbols-outlined text-5xl sm:text-7xl text-white">
                                        badge
                                    </span>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-1 sm:mb-2">
                                        <motion.h2
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-xl sm:text-2xl font-bold text-white"
                                        >
                                            Volunteer Information
                                        </motion.h2>
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.2 }}
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={onClose}
                                            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-white text-xl sm:text-2xl">close</span>
                                        </motion.button>
                                    </div>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-red-100 text-xs sm:text-sm truncate"
                                    >
                                        ID: {volunteer?.volunteer_id || 'Loading...'}
                                    </motion.p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {loading ? (
                                    // Loading State
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading volunteer details...</p>
                                    </div>
                                ) : volunteer ? (
                                    // Loaded Content
                                    <>
                                        {/* Details Grid */}
                                        <div className="grid gap-3 sm:gap-4">
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600 text-xl sm:text-2xl">badge</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Volunteer ID</p>
                                                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{volunteer.volunteer_id || 'N/A'}</p>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600 text-xl sm:text-2xl">email</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{volunteer.email || 'N/A'}</p>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600 text-xl sm:text-2xl">phone</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{volunteer.phone || 'N/A'}</p>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 }}
                                                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600 text-xl sm:text-2xl">badge</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">National ID</p>
                                                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{volunteer.personal_id || 'N/A'}</p>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.7 }}
                                                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600 text-xl sm:text-2xl">star</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Points</p>
                                                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{volunteer.total_points || 0}</p>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.8 }}
                                                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600 text-xl sm:text-2xl">schedule</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Hours Volunteered</p>
                                                    <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{volunteer.hours_volunteered || 0}</p>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2 sm:pt-4">
                                            <motion.button
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.9 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setShowAttendanceModal(true)}
                                                className="px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                            >
                                                <span className="material-symbols-outlined text-lg sm:text-xl">schedule</span>
                                                <span className="hidden xs:inline">Attendance</span>
                                                <span className="xs:hidden">Attend</span>
                                            </motion.button>

                                            <motion.button
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 1.0 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setShowBonusModal(true)}
                                                className="px-4 sm:px-6 py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                            >
                                                <span className="material-symbols-outlined text-lg sm:text-xl">stars</span>
                                                Bonus
                                            </motion.button>
                                        </div>

                                        {/* Show User Activity button - full width */}
                                        <motion.button
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1.1 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowActivityModal(true)}
                                            className="w-full mt-3 px-4 sm:px-6 py-3 sm:py-4 bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                        >
                                            <span className="material-symbols-outlined text-lg sm:text-xl">history</span>
                                            Show User Activity
                                        </motion.button>
                                    </>
                                ) : null}
                            </div>
                        </motion.div>
                    </div>

                    {/* Nested Modals */}
                    {volunteer && (
                        <>
                            <AttendanceActionModal
                                isOpen={showAttendanceModal}
                                onClose={() => setShowAttendanceModal(false)}
                                volunteer={volunteer}
                                onSuccess={() => {
                                    setShowAttendanceModal(false);
                                    onSuccess();
                                }}
                            />

                            <BonusActionModal
                                isOpen={showBonusModal}
                                onClose={() => setShowBonusModal(false)}
                                volunteer={volunteer}
                                onSuccess={() => {
                                    setShowBonusModal(false);
                                    onSuccess();
                                }}
                            />

                            <UserActivityModal
                                isOpen={showActivityModal}
                                onClose={() => setShowActivityModal(false)}
                                targetUserId={volunteer.user_id}
                                volunteerName={volunteer.full_name}
                                eventId={eventId}
                            />
                        </>
                    )}
                </>
            )}
        </AnimatePresence>
    );
};

export default VolunteerInfoModal;