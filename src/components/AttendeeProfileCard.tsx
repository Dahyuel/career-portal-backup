import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AttendeeProfile } from '../hooks/useAttendeeProfile';
import { supabase } from '../lib/supabase';

interface AttendeeProfileCardProps {
    profile: AttendeeProfile | null;
    loading?: boolean;
    onClose: () => void;
    onProfileUpdate?: () => void;
}

const AttendeeProfileCard: React.FC<AttendeeProfileCardProps> = ({ profile, loading = false, onClose, onProfileUpdate }) => {
    const qrRef = useRef<HTMLDivElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');

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

    const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            setUploadMessage('Please upload a PDF file');
            return;
        }

        setUploading(true);
        setUploadMessage('');

        try {
            // Delete old CV if exists
            if (profile.cv_url) {
                const oldPath = profile.cv_url.split('/').pop();
                if (oldPath) {
                    await supabase.storage.from('cvs').remove([oldPath]);
                }
            }

            // Upload new CV
            const fileExt = 'pdf';
            const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('cvs')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('cvs')
                .getPublicUrl(fileName);

            // Update attendee record
            const { error: updateError } = await supabase
                .from('attendees')
                .update({ cv_url: publicUrl })
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

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Heading */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center clear-both">
                    Attendee Profile
                </h2>

                {/* Loading State */}
                {loading || !profile ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading profile data...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - QR Code (hidden on mobile) */}
                        <div className="hidden lg:block lg:col-span-1">
                            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-center sticky top-0">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Your QR Code</h3>
                                <div ref={qrRef} className="bg-white p-3 rounded-lg inline-block">
                                    <QRCodeSVG value={profile.id} size={150} level="H" />
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Scan at sessions & booths</p>
                                <button
                                    onClick={downloadQRCode}
                                    className="mt-3 w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:shadow-md transition-shadow flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-base">download</span>
                                    Download QR
                                </button>
                            </div>
                        </div>

                        {/* Right Column - Profile Info */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* User Header */}
                            <div className="text-center lg:text-left flex flex-col lg:flex-row items-center gap-3">
                                <div className="bg-gradient-to-r from-red-600 to-red-700 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-white text-3xl">person</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{profile.full_name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{profile.university || 'ASU Student'}</p>
                                </div>
                            </div>

                            {/* Profile Information Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Personal Information */}
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-red-600 text-sm">person</span>
                                        Personal Info
                                    </h4>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Personal ID</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.personal_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Language</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {profile.preferred_language === 'en' ? 'English' : 'Arabic'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Information */}
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-red-600 text-sm">school</span>
                                        Academic Info
                                    </h4>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Student Type</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {profile.is_asu_student ? 'ASU Student' : 'Non-ASU Student'}
                                            </p>
                                        </div>
                                        {profile.student_id && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Student ID</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.student_id}</p>
                                            </div>
                                        )}
                                        {profile.faculty && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Faculty</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.faculty}</p>
                                            </div>
                                        )}
                                        {profile.department && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile.department}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Status - Only for non-ASU students */}
                                {!profile.is_asu_student && (
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-red-600 text-sm">payments</span>
                                            Payment Status
                                        </h4>
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${profile.payment_status === 'paid'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}
                                        >
                                            {profile.payment_status?.toUpperCase() || 'PENDING'}
                                        </span>
                                    </div>
                                )}

                                {/* Documents */}
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 sm:col-span-2">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-red-600 text-sm">description</span>
                                        Documents
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Enrollment Proof */}
                                        <div>
                                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Enrollment Proof</h5>
                                            {profile.enrollment_proof_url ? (
                                                <a
                                                    href={profile.enrollment_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    <span className="material-symbols-outlined text-xs">article</span>
                                                    View Document
                                                </a>
                                            ) : (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Not uploaded</p>
                                            )}
                                        </div>

                                        {/* CV */}
                                        <div>
                                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Curriculum Vitae (CV)</h5>
                                            {profile.cv_url ? (
                                                <div className="space-y-2">
                                                    <a
                                                        href={profile.cv_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">description</span>
                                                        View CV
                                                    </a>
                                                    <div>
                                                        <label className="block">
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                onChange={handleCVUpload}
                                                                disabled={uploading}
                                                                className="hidden"
                                                            />
                                                            <span className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors">
                                                                <span className="material-symbols-outlined text-sm">sync</span>
                                                                {uploading ? 'Uploading...' : 'Replace CV'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="block">
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        onChange={handleCVUpload}
                                                        disabled={uploading}
                                                        className="hidden"
                                                    />
                                                    <span className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors">
                                                        <span className="material-symbols-outlined text-sm">upload</span>
                                                        {uploading ? 'Uploading...' : 'Upload CV'}
                                                    </span>
                                                </label>
                                            )}
                                            {uploadMessage && (
                                                <p className={`text-xs mt-1 ${uploadMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                                                    {uploadMessage}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile QR Code Section */}
                            <div className="lg:hidden bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Your QR Code</h3>
                                <div className="bg-white p-3 rounded-lg inline-block">
                                    <QRCodeSVG value={profile.id} size={150} level="H" />
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Scan at sessions & booths</p>
                                <button
                                    onClick={downloadQRCode}
                                    className="mt-3 w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:shadow-md transition-shadow flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-base">download</span>
                                    Download QR
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendeeProfileCard;
