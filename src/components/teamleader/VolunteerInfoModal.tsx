// components/teamleader/VolunteerInfoModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AttendanceActionModal from './AttendanceActionModal';
import BonusActionModal from './BonusActionModal';

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
    teamLeaderId: string;
    onSuccess: () => void;
    loading?: boolean; // New loading prop
}

const VolunteerInfoModal: React.FC<VolunteerInfoModalProps> = ({
    isOpen,
    onClose,
    volunteer,
    teamLeaderId,
    onSuccess,
    loading = false
}) => {
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showBonusModal, setShowBonusModal] = useState(false);

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
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-7xl text-white">
                                        badge
                                    </span>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-2">
                                        <motion.h2
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-2xl font-bold text-white"
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
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-white">close</span>
                                        </motion.button>
                                    </div>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-red-100 text-sm"
                                    >
                                        ID: {volunteer?.volunteer_id || 'Loading...'}
                                    </motion.p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
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
                                        <div className="grid gap-4">
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600">badge</span>
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Volunteer ID</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{volunteer.volunteer_id || 'N/A'}</p>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600">email</span>
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white truncate">{volunteer.email || 'N/A'}</p>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600">phone</span>
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{volunteer.phone || 'N/A'}</p>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 }}
                                                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl"
                                            >
                                                <span className="material-symbols-outlined text-red-600">badge</span>
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">National ID</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{volunteer.personal_id || 'N/A'}</p>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.7 }}
                                                className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800"
                                            >
                                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">Total Points</p>
                                                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{volunteer.total_points || 0}</p>
                                            </motion.div>

                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.8 }}
                                                className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                                            >
                                                <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Hours Volunteered</p>
                                                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{volunteer.hours_volunteered || 0}</p>
                                            </motion.div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-4 pt-4">
                                            <motion.button
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.9 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setShowAttendanceModal(true)}
                                                className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">schedule</span>
                                                Attendance
                                            </motion.button>

                                            <motion.button
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 1.0 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setShowBonusModal(true)}
                                                className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">stars</span>
                                                Bonus
                                            </motion.button>
                                        </div>
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
                                teamLeaderId={teamLeaderId}
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
                        </>
                    )}
                </>
            )}
        </AnimatePresence>
    );
};

export default VolunteerInfoModal;
