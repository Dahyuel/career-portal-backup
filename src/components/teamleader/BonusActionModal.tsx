// components/teamleader/BonusActionModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import Toast from '../shared/Toast';

const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';
const POINT_OPTIONS = [5, 10, 15, 20];

interface VolunteerInfo {
    user_id: string;
    volunteer_id: string;
    full_name: string;
}

interface BonusActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    volunteer: VolunteerInfo | null;
    onSuccess: () => void;
}

interface ToastState {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

const BonusActionModal: React.FC<BonusActionModalProps> = ({
    isOpen,
    onClose,
    volunteer,
    onSuccess
}) => {
    const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
    const [description, setDescription] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

    if (!volunteer) return null;

    const showToast = (message: string, type: ToastState['type']) => {
        setToast({ show: true, message, type });
    };

    const handleSubmit = async () => {
        if (!selectedPoints) {
            showToast('Please select points amount', 'warning');
            return;
        }

        setProcessing(true);
        try {
            const finalDescription = description.trim() || 'Completed bonus task';

            const { error: insertError } = await supabase
                .from('user_activities')
                .insert({
                    user_id: volunteer.user_id,
                    event_id: EVENT_ID,
                    activity_type: 'bonus',
                    description: finalDescription,
                    points_earned: selectedPoints
                });

            if (insertError) {
                console.error('Error inserting bonus activity:', insertError);
                showToast('Failed to award bonus points', 'error');
                setProcessing(false);
                return;
            }

            showToast(`Awarded ${selectedPoints} bonus points to ${volunteer.full_name}!`, 'success');

            // Reset form
            setSelectedPoints(null);
            setDescription('');

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error awarding bonus:', error);
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
                                <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <span className="material-symbols-outlined text-7xl text-white">
                                            star
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
                                                Award Bonus
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
                                            className="text-amber-100 text-sm"
                                        >
                                            {volunteer.full_name}
                                        </motion.p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-6">
                                    {/* Point Selection */}
                                    <div>
                                        <motion.label
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
                                        >
                                            Select Points *
                                        </motion.label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {POINT_OPTIONS.map((points, index) => (
                                                <motion.button
                                                    key={points}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.4 + index * 0.1 }}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setSelectedPoints(points)}
                                                    className={`p-6 rounded-2xl border-2 transition-all font-bold text-2xl ${selectedPoints === points
                                                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 shadow-lg'
                                                        : 'border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>{points}</span>
                                                        <span className="material-symbols-outlined text-xl">
                                                            star
                                                        </span>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description Input */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.8 }}
                                    >
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="e.g., Event setup assistance, outstanding work..."
                                            rows={3}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none text-sm"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Leave empty for default: "Completed bonus task"
                                        </p>
                                    </motion.div>

                                    {/* Submit Button */}
                                    <motion.button
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.9 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSubmit}
                                        disabled={!selectedPoints || processing}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">check_circle</span>
                                                Award Bonus
                                            </>
                                        )}
                                    </motion.button>
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

export default BonusActionModal;
