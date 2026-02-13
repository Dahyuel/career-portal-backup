import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    User, Search, CheckCircle, Clock, X, AlertCircle, Phone, Mail,
    GraduationCap, Shield, ShieldCheck, ShieldX, FileText, Building2
} from 'lucide-react';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import SettingsModal from '../../components/shared/SettingsModal';

// --- Animation Variants ---
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0 }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// --- Types ---
interface AttendeeWithProfile {
    user_id: string;
    is_asu_student: boolean;
    student_id: string | null;
    university: string | null;
    faculty: string | null;
    department: string | null;
    cv_url: string | null;
    enrollment_proof_url: string | null;
    registration_status: string | null;
    payment_status: string | null;
    registered_at: string | null;
    // from user_profiles join
    user_profiles: {
        id: string;
        full_name: string;
        phone: string;
        personal_id: string;
        email: string | null;
    };
}

export const VerificationDashboard: React.FC = () => {
    const { profile } = useAuth();
    useTheme();
    const [activeTab, setActiveTab] = useState('home');
    const [showSettings, setShowSettings] = useState(false);

    // Attendee data
    const [asuAttendees, setAsuAttendees] = useState<AttendeeWithProfile[]>([]);
    const [nonAsuAttendees, setNonAsuAttendees] = useState<AttendeeWithProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Navigation
    const navItems: NavItem[] = [
        { key: 'home', label: 'Home', icon: 'dashboard' },
        { key: 'verification-asu', label: 'ASU Students', icon: 'school' },
        { key: 'verification-others', label: 'Other Unis', icon: 'apartment' }
    ];

    // Popup state
    const [selectedAttendee, setSelectedAttendee] = useState<AttendeeWithProfile | null>(null);

    // Feedback state
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 5000);
    };

    // Stats
    const [stats, setStats] = useState({ total: 0, asu: 0, nonAsu: 0, verified: 0, pending: 0 });

    // Fetch attendees with user_profiles join
    // Fetch attendees with separate queries (robust approach)
    const fetchAttendees = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Attendees
            const { data: attendeesData, error: attendeesError } = await supabase
                .from('attendees')
                .select(`
          user_id,
          is_asu_student,
          student_id,
          university,
          faculty,
          department,
          cv_url,
          enrollment_proof_url,
          registration_status,
          payment_status,
          registered_at
        `)
                .order('registered_at', { ascending: false });

            if (attendeesError) {
                console.error('Error fetching attendees table:', attendeesError);
                showFeedback('error', 'Failed to fetch attendees list');
                return;
            }

            const rawAttendees = (attendeesData || []);
            if (rawAttendees.length === 0) {
                setAsuAttendees([]);
                setNonAsuAttendees([]);
                setStats({ total: 0, asu: 0, nonAsu: 0, verified: 0, pending: 0 });
                return;
            }

            // 2. Fetch User Profiles
            const userIds = rawAttendees.map((a: any) => a.user_id);
            const { data: profilesData, error: profilesError } = await supabase
                .from('user_profiles')
                .select('id, full_name, phone, personal_id, email')
                .in('id', userIds);

            if (profilesError) {
                console.error('Error fetching user profiles:', profilesError);
                showFeedback('error', 'Failed to fetch user details');
                return;
            }

            // 3. Merge Data in Memory
            const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

            const combinedAttendees: AttendeeWithProfile[] = rawAttendees.map((attendee: any) => {
                const profile = profilesMap.get(attendee.user_id) || {
                    id: attendee.user_id,
                    full_name: 'Unknown User',
                    phone: 'N/A',
                    personal_id: 'N/A',
                    email: null
                };
                return {
                    ...attendee,
                    user_profiles: profile
                };
            });

            // 4. Classify (All)
            const allAsu = combinedAttendees.filter(a =>
                a.university != null &&
                a.university.toLowerCase().trim() === 'ain shams university'
            );
            const allNonAsu = combinedAttendees.filter(a =>
                a.university == null ||
                a.university.toLowerCase().trim() !== 'ain shams university'
            );

            // Set Lists (Store ALL to allow searching)
            setAsuAttendees(allAsu);
            setNonAsuAttendees(allNonAsu);

            const verified = combinedAttendees.filter(a => a.registration_status === 'approved').length;
            const pending = combinedAttendees.filter(a => a.registration_status === 'pending').length;

            setStats({
                total: combinedAttendees.length,
                asu: allAsu.length,
                nonAsu: allNonAsu.length,
                verified,
                pending
            });

        } catch (err) {
            console.error('Error in fetchAttendees:', err);
            showFeedback('error', 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'verification-asu' || activeTab === 'verification-others') {
            fetchAttendees();
        }
    }, [activeTab, fetchAttendees]);

    // Filter attendees by search
    const filterBySearch = (attendees: AttendeeWithProfile[]) => {
        if (!searchTerm.trim()) return attendees;
        const q = searchTerm.toLowerCase();
        return attendees.filter(a =>
            a.user_profiles.full_name.toLowerCase().includes(q) ||
            a.user_profiles.personal_id.toLowerCase().includes(q) ||
            (a.student_id && a.student_id.toLowerCase().includes(q))
        );
    };

    // Helper: Check if URL is PDF
    const isPdf = (url: string | null) => url?.toLowerCase().includes('.pdf');

    // Status badge
    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        <ShieldX className="w-3 h-3" /> Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        <Clock className="w-3 h-3" /> Pending
                    </span>
                );
        }
    };

    // Update registration status
    const updateStatus = async (userId: string, status: 'approved' | 'rejected') => {
        try {
            let updates: any = { registration_status: status };

            // Auto-update payment to 'paid' for non-ASU students when verifying
            if (status === 'approved' && selectedAttendee) {
                if (!selectedAttendee.is_asu_student) {
                    updates.payment_status = 'paid';
                }
            }

            const { error } = await supabase
                .from('attendees')
                .update(updates)
                .eq('user_id', userId);

            if (error) throw error;

            showFeedback('success', `Attendee ${status === 'approved' ? 'verified' : 'rejected'} successfully`);
            setSelectedAttendee(null);
            fetchAttendees();
        } catch (err) {
            console.error('Error updating status:', err);
            showFeedback('error', 'Failed to update status');
        }
    };

    // --- Attendee Row Component ---
    const AttendeeRow: React.FC<{ attendee: AttendeeWithProfile; index: number }> = ({ attendee, index }) => (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => setSelectedAttendee(attendee)}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors text-left border-b border-slate-100 dark:border-slate-800 last:border-0"
        >
            <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">{attendee.user_profiles.full_name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                    ID: {attendee.user_profiles.personal_id} · {attendee.faculty || 'N/A'}
                </p>
            </div>
            <div className="hidden sm:block">
                {getStatusBadge(attendee.registration_status)}
            </div>
            <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
        </motion.button>
    );

    // --- Render Home Tab ---
    const renderHomeTab = () => (
        <motion.div
            key="home"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12 space-y-6"
        >
            <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                    {/* Welcome Banner */}
                    <motion.div
                        variants={itemVariants}
                        className="relative rounded-2xl overflow-hidden shadow-xl shadow-red-500/10 p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white"
                        style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
                                verified_user
                            </span>
                        </div>
                        <div className="relative z-10">
                            <p className="uppercase tracking-widest text-red-200 font-semibold text-xs mb-2">Verification Team</p>
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                Welcome, {profile?.full_name?.split(' ')[0] || 'Verifier'}
                            </h1>
                            <p className="text-lg text-red-100 opacity-90 max-w-md mb-8">
                                Verify attendee registrations and ensure smooth event check-in.
                            </p>
                            <button
                                onClick={() => setActiveTab('verification-asu')}
                                className="bg-white text-red-600 hover:bg-red-50 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit shadow-lg active:scale-95"
                            >
                                <Shield className="w-5 h-5" />
                                Start Verifying
                            </button>
                        </div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mb-32 -mr-32 blur-3xl"></div>
                    </motion.div>

                    {/* Quick Stats - Mobile */}
                    <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 lg:hidden">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
                                <ShieldCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verified</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.verified}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.pending}</p>
                        </div>
                    </motion.div>

                    {/* Info Cards */}
                    <motion.div variants={itemVariants}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Overview</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total</p>
                                </div>
                                <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.total}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5 text-red-600" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">ASU Students</p>
                                </div>
                                <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.asu}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Other Unis</p>
                                </div>
                                <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.nonAsu}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Desktop Stats */}
                <div className="hidden lg:block lg:col-span-4 space-y-6">
                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                            <ShieldCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verified</p>
                        <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{stats.verified}</p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Review</p>
                        <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{stats.pending}</p>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );

    // --- Render Verification Tab ---
    const renderVerificationTab = () => {
        const isAsuTab = activeTab === 'verification-asu';
        const attendees = isAsuTab ? asuAttendees : nonAsuAttendees;

        // Filter by search (checks full list)
        const searchResults = filterBySearch(attendees);

        // If searching, show matches from ALL statuses.
        // If NOT searching, show only PENDING.
        const filteredAttendees = searchTerm.trim()
            ? searchResults
            : searchResults.filter(a => a.registration_status === 'pending');

        const title = isAsuTab ? 'ASU Students' : 'Other Universities';
        const emptyMessage = isAsuTab ? 'No pending ASU students' : 'No pending external students';
        const tabKey = isAsuTab ? 'verification-asu' : 'verification-others';

        return (
            <motion.div
                key={tabKey}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
            >
                {/* Header with Search */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl"
                >
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        {isAsuTab ? <GraduationCap className="w-8 h-8 text-red-600" /> : <Building2 className="w-8 h-8 text-purple-600" />}
                        {title}
                    </h1>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600/50 transition-all dark:text-white"
                            placeholder="Search by name or ID..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </motion.div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="relative w-16 h-16 mb-4">
                            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
                            <motion.div
                                className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading attendees...</p>
                    </div>
                ) : (
                    <motion.div variants={itemVariants}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                                {filteredAttendees.length > 0 ? (
                                    filteredAttendees.map((attendee, i) => (
                                        <AttendeeRow key={attendee.user_id} attendee={attendee} index={i} />
                                    ))
                                ) : (
                                    <div className="text-center py-20 text-gray-500 dark:text-slate-400">
                                        {isAsuTab ? (
                                            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-700" />
                                        ) : (
                                            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-700" />
                                        )}
                                        <p className="text-lg font-medium">{searchTerm ? 'No matching students found' : emptyMessage}</p>
                                        <p className="text-sm mt-2 opacity-70">Queue is clear! 🎉</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        );
    };

    return (
        <SharedNavigation
            navItems={navItems}
            activeItem={activeTab}
            onItemChange={setActiveTab}
            title="Verification"
            onProfileClick={() => setShowSettings(true)}
        >
            {/* Feedback Toast */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", duration: 0.4 }}
                        className={`fixed top-4 right-4 z-[9999] flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                    >
                        {feedback.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        <span className="font-medium">{feedback.message}</span>
                        <button onClick={() => setFeedback(null)} className="ml-2 hover:bg-black hover:bg-opacity-20 rounded p-1">
                            <X className="h-4 w-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} className="h-full">
                    {activeTab === 'home' && renderHomeTab()}
                    {(activeTab === 'verification-asu' || activeTab === 'verification-others') && renderVerificationTab()}
                </motion.div>
            </AnimatePresence>

            {/* Attendee Detail Popup Card */}
            <AnimatePresence>
                {selectedAttendee && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedAttendee(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-0 max-w-lg w-full shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Card Header */}
                            <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 text-white relative">
                                <motion.button
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedAttendee(null)}
                                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </motion.button>

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: "spring" }}
                                    className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4"
                                >
                                    <User className="w-8 h-8 text-white" />
                                </motion.div>
                                <motion.h3
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-bold"
                                >
                                    {selectedAttendee.user_profiles.full_name}
                                </motion.h3>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center gap-2 mt-2"
                                >
                                    {getStatusBadge(selectedAttendee.registration_status)}
                                    <span className="text-red-200 text-sm">
                                        {selectedAttendee.is_asu_student ? 'ASU Student' : 'External Student'}
                                    </span>
                                </motion.div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 space-y-5">
                                {/* Personal Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="space-y-3"
                                >
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Personal Information</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Personal ID</p>
                                                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{selectedAttendee.user_profiles.personal_id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                                                <Phone className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Phone</p>
                                                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{selectedAttendee.user_profiles.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 sm:col-span-2">
                                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                                                <Mail className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Email</p>
                                                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{selectedAttendee.user_profiles.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Academic Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="space-y-3"
                                >
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Academic Information</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                                <GraduationCap className="w-4 h-4 text-red-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">University</p>
                                                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{selectedAttendee.university || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                                                <Building2 className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Faculty</p>
                                                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{selectedAttendee.faculty || 'N/A'}</p>
                                            </div>
                                        </div>
                                        {selectedAttendee.department && (
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 sm:col-span-2">
                                                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-lg">school</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Department</p>
                                                    <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{selectedAttendee.department}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Enrollment Proof (Faculty ID) */}
                                {selectedAttendee.enrollment_proof_url && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="space-y-3"
                                    >
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faculty ID / Enrollment Proof</p>
                                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 relative group">
                                            {isPdf(selectedAttendee.enrollment_proof_url) ? (
                                                <div
                                                    className="relative cursor-pointer"
                                                    onClick={() => setPreviewImage(selectedAttendee.enrollment_proof_url)}
                                                >
                                                    <iframe
                                                        src={`${selectedAttendee.enrollment_proof_url}#toolbar=0&navpanes=0&scrollbar=0`}
                                                        className="w-full h-64 bg-white pointer-events-none"
                                                        title="Enrollment Proof Preview"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                        <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Click to expand
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={selectedAttendee.enrollment_proof_url}
                                                    alt="Enrollment Proof"
                                                    className="w-full h-auto max-h-64 object-contain bg-white dark:bg-slate-900 cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => setPreviewImage(selectedAttendee.enrollment_proof_url)}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const fallback = e.currentTarget.nextElementSibling;
                                                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                                    }}
                                                />
                                            )}
                                            <div className="hidden items-center justify-center p-8 text-slate-400">
                                                <div className="text-center">
                                                    <FileText className="w-10 h-10 mx-auto mb-2" />
                                                    <p className="text-sm">Unable to load image</p>
                                                    <a
                                                        href={selectedAttendee.enrollment_proof_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-red-600 text-sm font-medium hover:underline mt-1 inline-block"
                                                    >
                                                        Open in new tab →
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Payment Status (non-ASU) */}
                                {!selectedAttendee.is_asu_student && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.55 }}
                                        className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Payment Status</p>
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm capitalize">{selectedAttendee.payment_status || 'N/A'}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Action Buttons */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="grid grid-cols-2 gap-3 pt-2"
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => updateStatus(selectedAttendee.user_id, 'approved')}
                                        disabled={selectedAttendee.registration_status === 'approved'}
                                        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white py-3.5 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        <ShieldCheck className="w-5 h-5" />
                                        Verify
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => updateStatus(selectedAttendee.user_id, 'rejected')}
                                        disabled={selectedAttendee.registration_status === 'rejected'}
                                        className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white py-3.5 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        <ShieldX className="w-5 h-5" />
                                        Reject
                                    </motion.button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Lightbox */}
            <AnimatePresence>
                {previewImage && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-black/90 backdrop-blur-xl" onClick={() => setPreviewImage(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            {isPdf(previewImage) ? (
                                <iframe
                                    src={previewImage}
                                    className="w-full h-[85vh] bg-white rounded-lg shadow-2xl"
                                    title="Full Size Proof"
                                />
                            ) : (
                                <img
                                    src={previewImage}
                                    alt="Full size proof"
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                />
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <SettingsModal onClose={() => setShowSettings(false)} />
                )}
            </AnimatePresence>
        </SharedNavigation>
    );
};

export default VerificationDashboard;
