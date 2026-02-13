// components/teamleader/AttendanceActionModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import Toast from '../shared/Toast';

const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

interface VolunteerInfo {
    user_id: string;
    volunteer_id: string;
    full_name: string;
}

interface AttendanceActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    volunteer: VolunteerInfo | null;
    teamLeaderId: string;
    onSuccess: () => void;
}

interface ToastState {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

const AttendanceActionModal: React.FC<AttendanceActionModalProps> = ({
    isOpen,
    onClose,
    volunteer,
    teamLeaderId,
    onSuccess
}) => {
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

    if (!volunteer) return null;

    const showToast = (message: string, type: ToastState['type']) => {
        setToast({ show: true, message, type });
    };

    const handleCheckIn = async () => {
        setProcessing(true);
        try {
            // Check if there's already attendance for today
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

            const { data: existingAttendance, error: checkError } = await supabase
                .from('volunteer_attendance')
                .select('*')
                .eq('volunteer_id', volunteer.user_id)
                .eq('attendance_date', today)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking attendance:', checkError);
                showToast('Failed to check attendance records', 'error');
                setProcessing(false);
                return;
            }

            if (existingAttendance) {
                // Check if already checked in and out (fully attended)
                if (existingAttendance.check_in_time && existingAttendance.check_out_time) {
                    showToast('Already attended today (checked in and out)', 'warning');
                } else {
                    // Already checked in but not out (currently inside)
                    showToast('Already checked in today', 'warning');
                }
                setProcessing(false);
                return;
            }

            // Insert new attendance entry
            const { error: insertError } = await supabase
                .from('volunteer_attendance')
                .insert({
                    volunteer_id: volunteer.user_id,
                    event_id: EVENT_ID,
                    attendance_date: today,
                    check_in_time: new Date().toISOString(),
                    check_out_time: null,
                    hours_worked: null,
                    validated_by: teamLeaderId
                });

            if (insertError) {
                console.error('Error inserting attendance:', insertError);
                showToast('Failed to check in', 'error');
                setProcessing(false);
                return;
            }

            showToast(`${volunteer.full_name} checked in successfully!`, 'success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error in check-in:', error);
            showToast('An unexpected error occurred', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleCheckOut = async () => {
        setProcessing(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Find today's attendance record with null check_out_time
            const { data: attendanceRecord, error: fetchError } = await supabase
                .from('volunteer_attendance')
                .select('*')
                .eq('volunteer_id', volunteer.user_id)
                .eq('attendance_date', today)
                .is('check_out_time', null)
                .maybeSingle();

            if (fetchError) {
                console.error('Error fetching attendance:', fetchError);
                showToast('Failed to fetch attendance record', 'error');
                setProcessing(false);
                return;
            }

            if (!attendanceRecord) {
                showToast('No active check-in found for today', 'warning');
                setProcessing(false);
                return;
            }

            // Update check_out_time
            const { error: updateError } = await supabase
                .from('volunteer_attendance')
                .update({
                    check_out_time: new Date().toISOString()
                })
                .eq('id', attendanceRecord.id);

            if (updateError) {
                console.error('Error updating attendance:', updateError);
                showToast('Failed to check out', 'error');
                setProcessing(false);
                return;
            }

            showToast(`${volunteer.full_name} checked out successfully!`, 'success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error in check-out:', error);
            showToast('An unexpected error occurred', 'error');
        } finally {
            setProcessing(false);
        }
    };

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
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            variants={backdropVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
                            onClick={onClose}
                        />

                        {/* Modal */}
                        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                            <motion.div
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-md overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <span className="material-symbols-outlined text-7xl text-white">
                                            schedule
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
                                                Attendance
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
                                            className="text-blue-100 text-sm"
                                        >
                                            {volunteer.full_name}
                                        </motion.p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2"
                                    >
                                        Record attendance for this volunteer
                                    </motion.p>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        <motion.button
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleCheckIn}
                                            disabled={processing}
                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-2xl">login</span>
                                            <div className="text-left">
                                                <div className="font-bold">Check In (Entry)</div>
                                                <div className="text-xs text-green-100">Mark arrival</div>
                                            </div>
                                        </motion.button>

                                        <motion.button
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleCheckOut}
                                            disabled={processing}
                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-2xl">logout</span>
                                            <div className="text-left">
                                                <div className="font-bold">Check Out (Exit)</div>
                                                <div className="text-xs text-orange-100">Mark departure</div>
                                            </div>
                                        </motion.button>
                                    </div>

                                    {processing && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            Processing...
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast.show && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast({ ...toast, show: false })}
                        duration={3000}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default AttendanceActionModal;
