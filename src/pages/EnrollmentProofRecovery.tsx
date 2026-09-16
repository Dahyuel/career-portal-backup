// pages/EnrollmentProofRecovery.tsx
// Checks if enrollment proof is missing and prompts re-upload
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Upload, CheckCircle, FileText, X, Loader2 } from '../components/icons';
import { supabase, uploadFile, getSignedUrl } from '../lib/supabase';
import { logger } from '../utils/logger';
import Toast from '../components/shared/Toast';
import DashboardLoading from '../components/DashboardLoading';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const EnrollmentProofRecovery: React.FC = () => {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);

    const showToast = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
        setToast({ message, type });
    }, []);

    // Check if enrollment proof already exists
    useEffect(() => {
        const checkProof = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    navigate('/login', { replace: true });
                    return;
                }

                const { data: attendee } = await supabase
                    .from('attendees')
                    .select('enrollment_proof_url, event_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (attendee?.enrollment_proof_url) {
                    // Proof already exists — redirect to attendee (ProtectedRoute handles final destination)
                    navigate('/attendee', { replace: true });
                    return;
                }

                setChecking(false);
            } catch (err) {
                logger.error('Error checking enrollment proof:', err);
                setChecking(false);
            }
        };

        checkProof();
    }, [navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        const selected = e.target.files?.[0];
        e.target.value = '';

        if (!selected) return;

        if (!ALLOWED_TYPES.includes(selected.type)) {
            setFileError('Invalid file type. Allowed: JPG, PNG, PDF');
            return;
        }

        if (selected.size > MAX_SIZE) {
            setFileError(`File too large (${(selected.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
            return;
        }

        setFile(selected);
    };

    const handleUpload = async () => {
        if (!file) {
            showToast('Please select a file first', 'error');
            return;
        }

        setUploading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast('Session expired. Please log in again.', 'error');
                navigate('/login', { replace: true });
                return;
            }

            const { data: uploadData, error: uploadError } = await uploadFile(
                'Uni_ID',
                user.id,
                file,
                attendee?.event_id || undefined
            );

            if (uploadError || !uploadData) {
                showToast(uploadError?.message || 'Upload failed. Please try again.', 'error');
                setUploading(false);
                return;
            }

            const { data: signedData, error: signedError } = await getSignedUrl(uploadData.path);
            if (signedError || !signedData) {
                showToast(signedError?.message || 'Upload failed. Please try again.', 'error');
                setUploading(false);
                return;
            }

            // Update attendee record
            const { error: updateError } = await supabase
                .from('attendees')
                .update({ enrollment_proof_url: signedData.signedUrl })
                .eq('user_id', user.id);

            if (updateError) {
                showToast('File uploaded but failed to update record. Please contact support.', 'error');
                setUploading(false);
                return;
            }

            showToast('Enrollment proof uploaded successfully!', 'success');

            // Redirect — ProtectedRoute handles the correct destination based on status
            setTimeout(() => {
                navigate('/attendee', { replace: true });
            }, 1500);

        } catch (err: any) {
            logger.error('Enrollment proof upload error:', err);
            showToast(err.message || 'An unexpected error occurred', 'error');
            setUploading(false);
        }
    };

    if (checking) {
        return <DashboardLoading message="Checking enrollment proof..." subMessage="Please wait" />;
    }

    return (
        <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                style={{ backgroundImage: 'url("/images/careercenter.png")' }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-60"></div>
            </div>

            <div className="relative z-10 min-h-screen flex items-center justify-center py-8 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-red-100 dark:border-gray-700 transition-colors duration-300"
                >
                    {/* Warning Icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center"
                    >
                        Enrollment Proof Required
                    </motion.h1>

                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-600 dark:text-gray-300 text-center mb-8"
                    >
                        There was an issue uploading your enrollment proof during registration.
                        Please upload it now to complete your registration.
                    </motion.p>

                    {/* File Upload Area */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-6"
                    >
                        <AnimatePresence mode="wait">
                            {file ? (
                                <motion.div
                                    key="file-selected"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-xl p-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => { setFile(null); setFileError(null); }}
                                            className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                                            disabled={uploading}
                                        >
                                            <X className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="file-picker"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <label
                                        htmlFor="enrollment-proof-upload"
                                        className={`cursor-pointer block border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${fileError
                                            ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                                            : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                    >
                                        <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Click to upload enrollment proof
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            JPG, PNG, or PDF — Max 10 MB
                                        </p>
                                    </label>
                                    <input
                                        id="enrollment-proof-upload"
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* File Error */}
                        {fileError && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-1.5 mt-3 text-sm text-red-600 dark:text-red-400"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {fileError}
                            </motion.p>
                        )}
                    </motion.div>

                    {/* Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-3"
                    >
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className={`w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-lg hover:shadow-red-500/25 transition-all duration-300 font-semibold ${(!file || uploading) ? 'opacity-60 cursor-not-allowed' : ''
                                }`}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Upload & Continue
                                </>
                            )}
                        </motion.button>

                    </motion.div>

                    {/* Info Note */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                    >
                        <div className="flex items-start">
                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                Your enrollment proof is required for registration verification.
                                You can skip this step, but your registration may be delayed.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default EnrollmentProofRecovery;
