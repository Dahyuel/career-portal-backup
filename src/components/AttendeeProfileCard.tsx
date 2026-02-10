import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AttendeeProfile } from '../hooks/useAttendeeProfile';
import { supabase, uploadFile } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendeeProfileCardProps {
    profile: AttendeeProfile | null;
    hasActiveApplications: boolean;
    loading?: boolean;
    onClose: () => void;
    onProfileUpdate?: () => void;
}

const AttendeeProfileCard: React.FC<AttendeeProfileCardProps> = ({
    profile,
    hasActiveApplications,
    loading = false,
    onClose,
    onProfileUpdate
}) => {
    const qrRef = useRef<HTMLDivElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'qrcode'>('overview');
    const [showRestrictionModal, setShowRestrictionModal] = useState(false);

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
                    link.download = `attendee-qr-${profile?.personal_id}.png`;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    URL.revokeObjectURL(link.href);
                }
            });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    const handleCVUploadClick = (e: React.MouseEvent) => {
        if (hasActiveApplications) {
            e.preventDefault();
            setShowRestrictionModal(true);
        }
    };

    const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile) return;

        if (file.type !== 'application/pdf') {
            setUploadMessage('Please upload a PDF file');
            return;
        }

        setUploading(true);
        setUploadMessage('');

        try {
            const { data: uploadData, error: uploadError } = await uploadFile('CV', profile.id, file);

            if (uploadError || !uploadData) throw new Error(uploadError?.message || 'Upload failed');

            const { error: updateError } = await supabase
                .from('attendees')
                .update({ cv_url: uploadData.url })
                .eq('user_id', profile.id);

            if (updateError) throw updateError;

            setUploadMessage('CV uploaded successfully!');
            onProfileUpdate?.();
        } catch (error: any) {
            console.error('Error uploading CV:', error);
            setUploadMessage(error.message || 'Failed to upload CV');
        } finally {
            setUploading(false);
        }
    };

    if (loading || !profile) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"
                    />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading profile...</p>
                </motion.div>
            </div>
        );
    }

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
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Gradient */}
                <div className="relative h-32 bg-gradient-to-r from-red-700 to-red-600">
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </motion.button>

                    <motion.div
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.1, type: "spring" }}
                        className="absolute -bottom-12 left-8"
                    >
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 flex items-center justify-center shadow-md">
                            <span className="material-symbols-outlined text-red-600 text-5xl">person</span>
                        </div>
                    </motion.div>
                </div>

                {/* Profile Name & Tabs */}
                <div className="pt-14 px-8 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                        {profile.full_name}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-600 dark:text-gray-400 text-sm"
                    >
                        {profile.university || 'ASU Student'}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex gap-6 mt-6"
                    >
                        {['overview', 'documents', 'qrcode'].map((tab, index) => (
                            <motion.button
                                key={tab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-2 text-sm font-semibold transition-colors relative ${activeTab === tab
                                        ? 'text-red-600'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('qrcode', 'QR Code')}
                                {activeTab === tab && (
                                    <motion.span
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full"
                                    />
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                </div>

                {/* Content Area */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Personal Info */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500 text-lg">person</span>
                                            Personal Info
                                        </h3>
                                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                                            {[
                                                { label: 'Personal ID', value: profile.personal_id },
                                                { label: 'Phone', value: profile.phone },
                                                { label: 'Email', value: profile.email },
                                                { label: 'Nationality', value: profile.nationality || 'N/A' }
                                            ].map((item, index) => (
                                                <motion.div
                                                    key={item.label}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.2 + index * 0.1 }}
                                                >
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{item.value}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>

                                    {/* Academic Info */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500 text-lg">school</span>
                                            Academic Info
                                        </h3>
                                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                                            {[
                                                { label: 'Faculty', value: profile.faculty, show: true },
                                                { label: 'Department', value: profile.department, show: !!profile.department },
                                                { label: 'Student ID', value: profile.student_id, show: !!profile.student_id }
                                            ].filter(item => item.show).map((item, index) => (
                                                <motion.div
                                                    key={item.label}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 + index * 0.1 }}
                                                >
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                                                </motion.div>
                                            ))}
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.6 }}
                                            >
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Student Type</p>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${profile.is_asu_student
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                                    }`}>
                                                    {profile.is_asu_student ? 'ASU Student' : 'Non-ASU Student'}
                                                </span>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'documents' && (
                            <motion.div
                                key="documents"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <motion.h3
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-red-500 text-lg">description</span>
                                    Your Documents
                                </motion.h3>

                                <div className="grid grid-cols-1 gap-4">
                                    {/* CV Section */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        whileHover={{ y: -4 }}
                                        className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-100 dark:border-slate-700/50"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.2, type: "spring" }}
                                                    className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600 dark:text-blue-400"
                                                >
                                                    <span className="material-symbols-outlined text-2xl">description</span>
                                                </motion.div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">Curriculum Vitae (CV)</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {profile.cv_url ? "Uploaded and ready" : "Not uploaded yet"}
                                                    </p>
                                                </div>
                                            </div>
                                            {profile.cv_url && (
                                                <motion.a
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    href={profile.cv_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium hover:underline flex items-center gap-1"
                                                >
                                                    View
                                                    <span className="material-symbols-outlined text-base">open_in_new</span>
                                                </motion.a>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                                            <label className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onClick={handleCVUploadClick}
                                                    onChange={handleCVUpload}
                                                    disabled={uploading}
                                                    className="hidden"
                                                />
                                                <motion.span
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${profile.cv_url
                                                            ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700'
                                                            : 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow'
                                                        } ${hasActiveApplications ? 'opacity-70' : ''}`}
                                                >
                                                    <motion.span
                                                        animate={uploading ? { rotate: 360 } : {}}
                                                        transition={uploading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                                                        className="material-symbols-outlined text-lg"
                                                    >
                                                        {uploading ? 'progress_activity' : (profile.cv_url ? 'sync' : 'upload')}
                                                    </motion.span>
                                                    {uploading ? 'Uploading...' : (profile.cv_url ? 'Replace CV' : 'Upload CV')}
                                                </motion.span>
                                            </label>

                                            <AnimatePresence>
                                                {uploadMessage && (
                                                    <motion.span
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        className={`text-xs font-medium ${uploadMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}
                                                    >
                                                        {uploadMessage}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>

                                    {/* Enrollment Proof */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-100 dark:border-slate-700/50 opacity-80"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.3, type: "spring" }}
                                                    className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg text-purple-600 dark:text-purple-400"
                                                >
                                                    <span className="material-symbols-outlined text-2xl">badge</span>
                                                </motion.div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">Enrollment Proof</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">University ID / Document</p>
                                                </div>
                                            </div>
                                            {profile.enrollment_proof_url ? (
                                                <motion.a
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    href={profile.enrollment_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium hover:underline flex items-center gap-1"
                                                >
                                                    View
                                                    <span className="material-symbols-outlined text-base">open_in_new</span>
                                                </motion.a>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Not available</span>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'qrcode' && (
                            <motion.div
                                key="qrcode"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center justify-center space-y-6 py-4"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-center space-y-2"
                                >
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Personal QR Code</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                        Use this code to check in at sessions, workshops, and company booths.
                                    </p>
                                </motion.div>

                                <motion.div
                                    ref={qrRef}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mx-auto"
                                >
                                    <QRCodeSVG value={profile.id} size={200} level="H" />
                                </motion.div>

                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={downloadQRCode}
                                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-xl"
                                >
                                    <span className="material-symbols-outlined">download</span>
                                    Save to Gallery
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Restriction Modal */}
            <AnimatePresence>
                {showRestrictionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100 dark:border-red-900/30"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-4"
                                >
                                    <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">gpp_maybe</span>
                                </motion.div>
                                <motion.h3
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-xl font-bold text-gray-900 dark:text-white mb-2"
                                >
                                    CV Replacement Restricted
                                </motion.h3>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
                                >
                                    You cannot replace your CV while you have active job applications. Employers may have already reviewed your current CV.
                                </motion.p>
                            </motion.div>
                            <div className="p-6 bg-white dark:bg-slate-900 space-y-4">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 flex gap-3"
                                >
                                    <span className="material-symbols-outlined text-gray-400 flex-shrink-0">info</span>
                                    <p>To update your CV, please withdraw your active applications first, then upload your new CV and re-apply.</p>
                                </motion.div>
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowRestrictionModal(false)}
                                    className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors"
                                >
                                    Understood
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AttendeeProfileCard;