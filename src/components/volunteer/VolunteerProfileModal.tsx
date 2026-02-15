// components/volunteer/VolunteerProfileModal.tsx
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import LeaderboardModal from '../shared/LeaderboardModal';
import { useAuth } from '../../contexts/AuthContext';

interface VolunteerProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile?: any; // Legacy prop - ignored
    loading?: boolean; // Legacy prop - ignored
}

const VolunteerProfileModal: React.FC<VolunteerProfileModalProps> = ({
    isOpen,
    onClose
}) => {
    // Get profile directly from AuthContext
    const { profile: authProfile, user } = useAuth();
    const qrRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'qrcode'>('details');
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Check if loading (no profile yet)
    const loading = !authProfile;

    // Show leaderboard button for all roles except attendee
    const showLeaderboardButton = authProfile?.role && authProfile.role !== 'attendee';

    if (!isOpen) return null;

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

    const downloadQRCode = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) {
                    const link = document.createElement('a');
                    link.download = `volunteer-qr-${authProfile?.volunteer?.volunteer_id || 'code'}.png`;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    URL.revokeObjectURL(link.href);
                }
            });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    // Volunteer ID display - use volunteer_id (not UUID)
    const volunteerId = authProfile?.volunteer?.volunteer_id || 'N/A';

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
                                className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 relative overflow-hidden flex-shrink-0">
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
                                                My Profile
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
                                            ID: {volunteerId}
                                        </motion.p>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex items-center gap-4 mt-6">
                                        {['details', 'qrcode'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab as any)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === tab
                                                    ? 'bg-white text-red-600 shadow-md'
                                                    : 'bg-red-800/30 text-red-100 hover:bg-red-800/50'
                                                    }`}
                                            >
                                                {tab === 'details' ? 'Profile Details' : 'QR Code'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
                                        </div>
                                    ) : authProfile ? (
                                        <AnimatePresence mode="wait">
                                            {activeTab === 'details' ? (
                                                <motion.div
                                                    key="details"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="space-y-6"
                                                >
                                                    {/* Details Grid */}
                                                    <div className="grid gap-4">
                                                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                                            <span className="material-symbols-outlined text-red-600">person</span>
                                                            <div className="flex-1">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                                                                <p className="font-semibold text-gray-900 dark:text-white">{authProfile.full_name || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                                            <span className="material-symbols-outlined text-red-600">email</span>
                                                            <div className="flex-1">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                                                <p className="font-semibold text-gray-900 dark:text-white truncate">{authProfile.email || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                                            <span className="material-symbols-outlined text-red-600">phone</span>
                                                            <div className="flex-1">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                                                <p className="font-semibold text-gray-900 dark:text-white">{authProfile.phone || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                                            <span className="material-symbols-outlined text-red-600">badge</span>
                                                            <div className="flex-1">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">National ID</p>
                                                                <p className="font-semibold text-gray-900 dark:text-white">{authProfile.personal_id || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        {/* Role Badge */}
                                                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                                            <span className="material-symbols-outlined text-red-600">work</span>
                                                            <div className="flex-1">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                                                                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                                                    {authProfile.role?.replace(/_/g, ' ') || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Stats - Only for volunteers */}
                                                        {authProfile.isVolunteer && (
                                                            <>
                                                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                                                    <span className="material-symbols-outlined text-red-600">emoji_events</span>
                                                                    <div className="flex-1">
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Points</p>
                                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                                            {authProfile.volunteer?.total_points || 0} pts
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                                                    <span className="material-symbols-outlined text-red-600">schedule</span>
                                                                    <div className="flex-1">
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Hours Volunteered</p>
                                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                                            {authProfile.volunteer?.hours_volunteered || 0} hrs
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Company Info - Only for employers */}
                                                    {authProfile.employer && authProfile.company && (
                                                        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="material-symbols-outlined text-purple-600">business</span>
                                                                <p className="text-xs text-purple-700 dark:text-purple-300">Company</p>
                                                            </div>
                                                            <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                                                                {authProfile.company.company_name}
                                                            </p>
                                                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                                                                {authProfile.employer.job_title}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Leaderboard Button */}
                                                    {showLeaderboardButton && (
                                                        <button
                                                            onClick={() => setShowLeaderboard(true)}
                                                            className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined">leaderboard</span>
                                                            View Leaderboard
                                                        </button>
                                                    )}
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="qrcode"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="flex flex-col items-center justify-center space-y-6 py-4"
                                                >
                                                    <div className="text-center space-y-2">
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your ID QR Code</h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                                            Use this QR code for check-ins and verification.
                                                        </p>
                                                    </div>

                                                    <div
                                                        ref={qrRef}
                                                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mx-auto"
                                                    >
                                                        <QRCodeSVG value={authProfile.id || user?.id || ''} size={200} level="H" />
                                                    </div>

                                                    <motion.button
                                                        whileHover={{ scale: 1.05, y: -2 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={downloadQRCode}
                                                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-xl"
                                                    >
                                                        <span className="material-symbols-outlined">download</span>
                                                        Save QR Code
                                                    </motion.button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                                            <span className="material-symbols-outlined text-5xl text-gray-400">error</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Unable to load profile</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Leaderboard Modal */}
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
            />
        </>
    );
};

export default VolunteerProfileModal;