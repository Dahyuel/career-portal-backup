import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, XCircle, Mail, AlertTriangle, Upload, RefreshCw, FileCheck } from '../components/icons';
import { supabase, uploadFile, getSignedUrl } from '../lib/supabase';
import { logger } from '../utils/logger';
import Toast from '../components/shared/Toast';

export const RejectedAttendee: React.FC = () => {
    const { profile, signOut } = useAuth();
    const fullName = profile?.full_name;
    const userId = profile?.id;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const closeToast = useCallback(() => setToast(null), []);

    const handleEnrollmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !userId) return;

        setUploading(true);
        setUploadError('');

        try {
            const { data: uploadData, error: uploadFileError } = await uploadFile(
                'Uni_ID',
                userId,
                file,
                profile?.event_id || undefined
            );

            if (uploadFileError || !uploadData) throw new Error(uploadFileError?.message || 'Upload failed');

            const { data: signedData, error: signedError } = await getSignedUrl(uploadData.path);
            if (signedError || !signedData) throw new Error(signedError?.message || 'Failed to get signed URL');

            const { error: updateError } = await supabase
                .rpc('update_attendee_enrollment_proof', { p_enrollment_proof_url: signedData.signedUrl });

            if (updateError) throw updateError;

            // Show success toast then sign out after a short delay so the user sees it
            setToast({
                message: 'Document uploaded! Please wait until your application is reviewed again.',
                type: 'info',
            });

            setTimeout(() => {
                signOut();
            }, 3500);

        } catch (error: any) {
            logger.error('Error uploading enrollment proof:', error);
            setUploadError(error.message || 'Failed to upload enrollment proof. Please try again.');
            setToast({ message: 'Upload failed. Please try again.', type: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        key="upload-toast"
                        message={toast.message}
                        type={toast.type}
                        duration={3500}
                        onClose={closeToast}
                    />
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
                {/* Header */}
                <div className="p-6 text-center bg-red-50 dark:bg-red-900/20">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-red-100 text-asu-red dark:bg-red-900/40 dark:text-red-400"
                    >
                        <XCircle className="w-10 h-10" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Application Not Approved
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {fullName ? `Sorry, ${fullName.split(' ')[0]}.` : 'Sorry.'} Your registration was not approved at this time.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm text-red-800 dark:text-red-200">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>
                                Unfortunately, your application did not meet the requirements for this event.
                                This may be due to incomplete information, eligibility criteria, or capacity limitations.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-600">
                            <Mail className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" />
                            <p>
                                If you believe this is a mistake or would like more information,
                                please contact the event team for clarification.
                            </p>
                        </div>
                    </div>

                    {/* Enrollment Proof Re-upload */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-5 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30 space-y-3"
                    >
                        <div className="flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Re-upload Enrollment Proof
                            </h3>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            If you know you uploaded a wrong or unclear document, please re-upload the correct one below
                            and wait to be re-reviewed by the team. Accepted formats: JPG, PNG, PDF (max 10MB).
                        </p>

                        <input
                            ref={fileInputRef}
                            id="enrollment-proof-input"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                            onChange={handleEnrollmentUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                        <label
                            htmlFor="enrollment-proof-input"
                            className={`cursor-pointer block ${uploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                        >
                            <motion.span
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium w-full justify-center
                                    bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors"
                            >
                                {uploading ? (
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="flex"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </motion.span>
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {uploading ? 'Uploading...' : 'Upload Enrollment Proof'}
                            </motion.span>
                        </label>

                        {/* Inline error only (success is handled by toast + signout) */}
                        <AnimatePresence>
                            {uploadError && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="text-xs font-medium text-red-500 dark:text-red-400"
                                >
                                    {uploadError}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => signOut()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};