import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    User, Search, Clock, X, Phone, Mail,
    GraduationCap, ShieldCheck, ShieldX, FileText, Building2, UserCircle,
    ChevronLeft, ChevronRight
} from '../../components/icons';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase, getVolunteerStatsRPC } from '../../lib/supabase';
// All data queries use secure RPC functions (SECURITY DEFINER + role checks)
// import { logUserActivity, incrementVolunteerPoints } from '../../lib/utils';
import SettingsModal from '../../components/shared/SettingsModal';
import VolunteerProfileModal from '../../components/volunteer/VolunteerProfileModal';
import ViewAllActivitiesModal from '../../components/attendee/ViewAllActivitiesModal';
import Toast from "../../components/shared/Toast";
import NotificationModal from '../../components/NotificationModal';
import { logger } from '../../utils/logger';

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
    const { profile, loading: authLoading, refreshProfile } = useAuth();
    useTheme();
    const [activeTab, setActiveTab] = useState('home');
    const [showProfile, setShowProfile] = useState(false);
    const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);

    // Settings State
    const [showSettings, setShowSettings] = useState(false);

    // Attendee data — server-side pagination
    const VERIFICATION_PAGE_SIZE = 20;

    // Currently displayed attendees (only 20 at a time, fetched from server)
    const [currentAttendees, setCurrentAttendees] = useState<AttendeeWithProfile[]>([]);

    // Total counts per status per tab (for sub-tab badges)
    const [asuTotals, setAsuTotals] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [otherTotals, setOtherTotals] = useState({ pending: 0, approved: 0, rejected: 0 });

    // Current page per status per tab
    const [asuPages, setAsuPages] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [otherPages, setOtherPages] = useState({ pending: 0, approved: 0, rejected: 0 });

    const [isLoading, setIsLoading] = useState(false);
    const [homeDataLoaded, setHomeDataLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusSubTab, setStatusSubTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);

    // Signed URLs for the currently-selected attendee's files (bucket is private)
    const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
    const [cvSignedUrl, setCvSignedUrl] = useState<string | null>(null);
    const [signedUrlLoading, setSignedUrlLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!profile?.id || !profile?.event_id) return;

        try {
            const { data, error } = await supabase.rpc(
                'verif_team_get_notifications',
                { p_event_id: profile.event_id }
            );

            if (error) throw error;

            if (data) {
                setNotifications(data);
            }
        } catch (error) {
            logger.error('Error fetching notifications:', error);
        }
    }, [profile?.id, profile?.event_id]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Navigation
    const navItems: NavItem[] = [
        { key: 'home', label: 'Home', icon: 'dashboard' },
        { key: 'verification-asu', label: 'ASU Students', icon: 'school' },
        { key: 'verification-others', label: 'Other Unis', icon: 'apartment' }
    ];

    // Popup state
    const [selectedAttendee, setSelectedAttendee] = useState<AttendeeWithProfile | null>(null);
    const [processingAction, setProcessingAction] = useState<'approved' | 'rejected' | null>(null);

    // Toast State
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        isVisible: boolean;
    }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    // logUserActivity + incrementVolunteerPoints are now handled server-side
    // by the update_attendee_verification_status RPC function

    // User Stats State (Volunteer Logic)
    const [userStats, setUserStats] = useState<{
        score: number;
        rank: number;
        teamSize: number;
        loading: boolean;
    }>({
        score: 0,
        rank: 0,
        teamSize: 0,
        loading: true
    });

    // User Activities State (Volunteer Logic)
    const [userActivities, setUserActivities] = useState<{
        id: string;
        activity_type: string;
        description: string;
        points_earned: number;
        activity_timestamp: string;
    }[]>([]);


    // Fetch Volunteer Stats & Activities (Volunteer Logic) - Using RPCs
    const fetchVolunteerData = useCallback(async () => {
        const userId = profile?.id;
        if (!userId || !profile?.event_id) return;

        try {
            const [statsResult, activitiesResult] = await Promise.all([
                getVolunteerStatsRPC(userId),
                supabase.rpc('get_my_activities', { p_limit: 3 })
            ]);

            // Process Stats
            if (!statsResult.error && statsResult.data) {
                setUserStats(prev => ({
                    ...prev,
                    score: statsResult.data.total_points,
                    rank: statsResult.data.team_rank,
                    teamSize: statsResult.data.team_size,
                    loading: false
                }));
            }

            // Process Activities
            if (!activitiesResult.error) {
                setUserActivities(activitiesResult.data || []);
            }

        } catch (error) {
            logger.error('Error fetching volunteer data:', error);
        } finally {
            setHomeDataLoaded(true);
        }
    }, [profile?.id, profile?.event_id]);
    useEffect(() => {
        fetchVolunteerData();
    }, [fetchVolunteerData]);

    // ── Generate signed URLs whenever a new attendee is opened ─────────────
    useEffect(() => {
        let cancelled = false;

        const loadSignedUrls = async () => {
            if (!selectedAttendee) {
                setProofSignedUrl(null);
                setCvSignedUrl(null);
                return;
            }

            setSignedUrlLoading(true);
            setProofSignedUrl(null);
            setCvSignedUrl(null);

            try {
                const tasks: Promise<void>[] = [];
                if (selectedAttendee.enrollment_proof_url) {
                    tasks.push(
                        supabase.storage
                            .from('ems-assets')
                            .createSignedUrl(selectedAttendee.enrollment_proof_url, 60 * 60, {
                                download: false,   // ← serve inline, don't force download
                            })
                            .then(({ data, error }) => {
                                if (cancelled) return;
                                if (error) {
                                    logger.error('Failed to sign enrollment proof URL:', error);
                                    return;
                                }
                                setProofSignedUrl(data?.signedUrl ?? null);
                            })
                    );
                }

                if (selectedAttendee.cv_url) {
                    tasks.push(
                        supabase.storage
                            .from('ems-assets')
                            .createSignedUrl(selectedAttendee.cv_url, 60 * 60, {
                                download: false,
                            })
                            .then(({ data, error }) => {
                                if (cancelled) return;
                                if (error) {
                                    logger.error('Failed to sign CV URL:', error);
                                    return;
                                }
                                setCvSignedUrl(data?.signedUrl ?? null);
                            })
                    );
                }

                await Promise.all(tasks);
            } finally {
                if (!cancelled) setSignedUrlLoading(false);
            }
        };

        loadSignedUrls();

        return () => {
            cancelled = true;
        };
    }, [selectedAttendee]);
    // Fetch attendees via server-side paginated RPC — fetches only 20 at a time
    // Also fetches total counts for all 3 statuses (for the sub-tab badges)
    const fetchAttendees = useCallback(async (pageOverride?: number) => {
        if (!profile?.event_id) return;

        setIsLoading(true);
        try {
            const isAsuTab = activeTab === 'verification-asu';
            const currentPages = isAsuTab ? asuPages : otherPages;
            const page = pageOverride !== undefined ? pageOverride : currentPages[statusSubTab];
            const offset = page * VERIFICATION_PAGE_SIZE;

            // Fetch the current page of the active sub-tab
            const { data: mainData, error: mainError } = await supabase.rpc('verif_team_get_attendees', {
                p_is_asu: isAsuTab,
                p_search_term: searchTerm.trim(),
                p_status_filter: statusSubTab,
                p_limit: VERIFICATION_PAGE_SIZE,
                p_offset: offset
            });

            if (mainError) {
                logger.error('Error fetching attendees:', mainError);
                showToast('Failed to fetch attendees', 'error');
                return;
            }

            // Parse the response (format: { attendees: [...], total: number })
            const parsed = mainData as { attendees: any[]; total: number };
            const attendeesData: AttendeeWithProfile[] = (parsed?.attendees || []).map((a: any) => ({
                ...a,
                user_profiles: typeof a.user_profiles === 'string' ? JSON.parse(a.user_profiles) : a.user_profiles
            }));
            setCurrentAttendees(attendeesData);

            // Fetch total counts for ALL 3 statuses in parallel (for sub-tab badges)
            // These are lightweight calls with limit=0 — they just return the total
            const otherStatuses = (['pending', 'approved', 'rejected'] as const).filter(s => s !== statusSubTab);
            const [countRes1, countRes2] = await Promise.all(
                otherStatuses.map(status =>
                    supabase.rpc('verif_team_get_attendees', {
                        p_is_asu: isAsuTab,
                        p_search_term: searchTerm.trim(),
                        p_status_filter: status,
                        p_limit: 1,
                        p_offset: 0
                    })
                )
            );

            const newTotals = {
                pending: 0,
                approved: 0,
                rejected: 0,
                [statusSubTab]: parsed?.total || 0
            };
            if (!countRes1.error) {
                const c1 = countRes1.data as { total: number };
                newTotals[otherStatuses[0]] = c1?.total || 0;
            }
            if (!countRes2.error) {
                const c2 = countRes2.data as { total: number };
                newTotals[otherStatuses[1]] = c2?.total || 0;
            }

            if (isAsuTab) {
                setAsuTotals(newTotals as { pending: number; approved: number; rejected: number });
            } else {
                setOtherTotals(newTotals as { pending: number; approved: number; rejected: number });
            }

        } catch (err) {
            logger.error('Error in fetchAttendees:', err);
            showToast('An unexpected error occurred', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, searchTerm, statusSubTab, asuPages, otherPages, profile?.event_id]);

    // OPTIMIZED: Search with debounce — also triggers on sub-tab and page changes
    useEffect(() => {
        if (activeTab === 'verification-asu' || activeTab === 'verification-others') {
            const timer = setTimeout(() => {
                fetchAttendees();
            }, 300); // Debounce search

            return () => clearTimeout(timer);
        }
    }, [activeTab, searchTerm, statusSubTab, asuPages, otherPages, fetchAttendees]);

    // Helper to change page for the current sub-tab
    const setCurrentPage = (newPage: number) => {
        const isAsuTab = activeTab === 'verification-asu';
        if (isAsuTab) {
            setAsuPages(prev => ({ ...prev, [statusSubTab]: newPage }));
        } else {
            setOtherPages(prev => ({ ...prev, [statusSubTab]: newPage }));
        }
    };

    // Reset pages when search term changes
    useEffect(() => {
        setAsuPages({ pending: 0, approved: 0, rejected: 0 });
        setOtherPages({ pending: 0, approved: 0, rejected: 0 });
    }, [searchTerm]);

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

    // JWT generator using HMAC-SHA256 (Web Crypto API — works in browser)
    const generateJWT = async (payload: object, secret: string): Promise<string> => {
        const toBase64Url = (str: string) =>
            btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const body = toBase64Url(JSON.stringify(payload));
        const data = encoder.encode(`${header}.${body}`);
        const sig = await crypto.subtle.sign('HMAC', key, data);

        const sigBase64Url = toBase64Url(
            String.fromCharCode(...new Uint8Array(sig))
        );

        return `${header}.${body}.${sigBase64Url}`;
    };

    const updateStatus = async (userId: string, status: 'approved' | 'rejected') => {
        if (!profile?.event_id) {
            showToast('No active event — please reload.', 'error');
            return;
        }

        try {
            setProcessingAction(status);

            const { data, error } = await supabase.rpc('verif_team_update_attendee_status', {
                p_attendee_user_id: userId,
                p_status: status,
                p_event_id: profile.event_id,
                p_attendee_name: selectedAttendee?.user_profiles.full_name || 'Unknown User'
            });

            if (error) throw new Error(error.message);

            const result = data as any;
            if (result && result.success === false) {
                showToast(result.error || 'Action failed', 'error');
                return;
            }

            // ✅ Call n8n webhook directly from the browser
            try {
                const JWT_SECRET = import.meta.env.VITE_N8N_JWT_SECRET;
                const WEBHOOK_URL = import.meta.env.VITE_N8N_VERIFICATION_WEBHOOK_URL;

                const webhookPayload = {
                    attendee_id: userId,
                    name: selectedAttendee?.user_profiles.full_name || 'Unknown User',
                    email: selectedAttendee?.user_profiles.email || '',
                    status: status,
                    is_asu_student: selectedAttendee?.is_asu_student ?? false,
                    event_id: profile.event_id,
                    iat: Math.floor(Date.now() / 1000)
                };

                const jwtToken = await generateJWT(webhookPayload, JWT_SECRET);

                await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify(webhookPayload)
                });
            } catch (webhookErr) {
                // Non-blocking — verification already succeeded
                logger.error('Webhook call failed (non-critical):', webhookErr);
            }

            if (profile?.event_id && profile?.id) {
                await refreshProfile(profile.event_id, profile.id, undefined, true);
            }

            showToast(
                `Attendee ${status === 'approved' ? 'verified' : 'rejected'} successfully`,
                'success'
            );
            setSelectedAttendee(null);
            fetchAttendees();
            fetchVolunteerData();
        } catch (err) {
            logger.error('Error updating status:', err);
            showToast('Failed to update status', 'error');
        } finally {
            setProcessingAction(null);
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
    const renderHomeTab = () => {
        if (!homeDataLoaded) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
                        <motion.div
                            className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading dashboard data...</p>
                </div>
            );
        }

        return (
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
                                    onClick={() => setShowProfile(true)}
                                    className="bg-white text-red-600 hover:bg-red-50 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit shadow-lg active:scale-95"
                                >
                                    <UserCircle className="w-5 h-5" />
                                    View My Profile
                                </button>
                            </div>
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mb-32 -mr-32 blur-3xl"></div>
                        </motion.div>

                        {/* Quick Stats - Mobile (Volunteer Style) */}
                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 lg:hidden">
                            {/* Score Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-amber-500 text-lg">emoji_events</span>
                                </div>
                                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Score</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{userStats.score}</p>
                            </div>

                            {/* Rank Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 relative">
                                {userStats.teamSize > 0 && (
                                    <div className="absolute top-3 right-3 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                        Top {Math.round((userStats.rank / userStats.teamSize) * 100)}%
                                    </div>
                                )}
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">bar_chart</span>
                                </div>
                                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Rank</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">#{userStats.rank}</p>
                            </div>
                        </motion.div>

                        {/* Recent Activity (Volunteer Style) */}
                        <motion.div variants={itemVariants}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Recent Activity</h2>
                                <button
                                    onClick={() => setShowAllActivitiesModal(true)}
                                    className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                                {userActivities.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                                        <p>No recent activities</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8 relative">
                                        {/* Activity Timeline Line */}
                                        <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"></div>

                                        {userActivities.map((activity) => (
                                            <div key={activity.id} className="relative flex gap-6 items-start group">
                                                <div className="relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/10 border-4 border-white dark:border-slate-900">
                                                    <span className="material-symbols-outlined text-primary text-xl">
                                                        {activity.activity_type.includes('scan') ? 'qr_code_scanner' : 'verified'}
                                                    </span>
                                                </div>
                                                <div className="flex-grow pt-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-semibold text-slate-800 dark:text-white">{activity.description}</h4>
                                                    </div>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-xs">schedule</span>
                                                        {new Date(activity.activity_timestamp).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column - Stats (Desktop Only - Volunteer Style) */}
                    <div className="hidden lg:block lg:col-span-4 space-y-6">
                        {/* Score Card */}
                        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-amber-500">emoji_events</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Score</p>
                            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{userStats.score}</p>
                        </motion.div>

                        {/* Rank Card */}
                        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
                            {userStats.teamSize > 0 && (
                                <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
                                    Top {Math.round((userStats.rank / userStats.teamSize) * 100)}%
                                </div>
                            )}
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">bar_chart</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Rank</p>
                            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">#{userStats.rank}</p>
                        </motion.div>

                        {/* System Stats (Optional: Keep original system stats as smaller cards below?) - User said "same as volunteer dashboard" so I will omit them for now to match exactly */}
                    </div>
                </div>
            </motion.div>
        );
    }

    // --- Render Verification Tab ---
    const renderVerificationTab = () => {
        const isAsuTab = activeTab === 'verification-asu';
        const totals = isAsuTab ? asuTotals : otherTotals;
        const currentPages = isAsuTab ? asuPages : otherPages;
        const currentPage = currentPages[statusSubTab];
        const currentTotal = totals[statusSubTab];
        const pages = Math.ceil(currentTotal / VERIFICATION_PAGE_SIZE);

        const title = isAsuTab ? 'ASU Students' : 'Other Universities';
        const tabKey = isAsuTab ? 'verification-asu' : 'verification-others';

        // Sub-tab config
        const subTabs: { key: 'pending' | 'approved' | 'rejected'; label: string; icon: React.ReactNode; count: number; activeClasses: string; badgeClasses: string }[] = [
            {
                key: 'pending',
                label: 'Pending',
                icon: <Clock className="w-4 h-4" />,
                count: totals.pending,
                activeClasses: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25',
                badgeClasses: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
            },
            {
                key: 'approved',
                label: 'Approved',
                icon: <ShieldCheck className="w-4 h-4" />,
                count: totals.approved,
                activeClasses: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
                badgeClasses: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
            },
            {
                key: 'rejected',
                label: 'Rejected',
                icon: <ShieldX className="w-4 h-4" />,
                count: totals.rejected,
                activeClasses: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
                badgeClasses: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            },
        ];

        const emptyIconMap = {
            pending: <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-700" />,
            approved: <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-700" />,
            rejected: <ShieldX className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-700" />,
        };

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
                <motion.header
                    variants={itemVariants}
                    className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${isAsuTab ? 'bg-red-100 dark:bg-red-900/20' : 'bg-purple-100 dark:bg-purple-900/20'} flex items-center justify-center shrink-0`}>
                            {isAsuTab ? (
                                <GraduationCap className="w-6 h-6 text-red-600 dark:text-red-400" />
                            ) : (
                                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                <span>Verify and manage student registrations</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
                                placeholder="Search by name or ID..."
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </motion.header>

                {/* Sub-Tabs: Pending / Approved / Rejected */}
                <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
                    {subTabs.map((tab) => {
                        const isActive = statusSubTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setStatusSubTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive
                                    ? tab.activeClasses
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : tab.badgeClasses
                                    }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
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
                            <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
                                {currentAttendees.length > 0 ? (
                                    currentAttendees.map((attendee, i) => (
                                        <AttendeeRow key={attendee.user_id} attendee={attendee} index={i} />
                                    ))
                                ) : (
                                    <div className="text-center py-20 text-gray-500 dark:text-slate-400">
                                        {emptyIconMap[statusSubTab]}
                                        <p className="text-lg font-medium">
                                            {searchTerm ? 'No matching students found' : `No ${statusSubTab} students`}
                                        </p>
                                        <p className="text-sm mt-2 opacity-70">
                                            {statusSubTab === 'pending' ? 'Queue is clear! 🎉' : `No ${statusSubTab} registrations yet`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {pages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Page {currentPage + 1} of {pages} · {currentTotal} total
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            disabled={currentPage === 0}
                                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            disabled={currentPage >= pages - 1}
                                            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-sm font-semibold"
                                        >
                                            Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        );
    };

    // Loading State - Top Level
    return (
        <SharedNavigation
            navItems={navItems}
            activeItem={activeTab}
            onItemChange={setActiveTab}
            title="ASU Career Expo"
            onProfileClick={() => setShowProfile(true)}
            notifications={notifications}
            onNotificationClick={(notification) => setSelectedNotification(notification)}
        >
            {/* Feedback Toast */}
            <AnimatePresence>
                {toast.isVisible && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                    />
                )}
            </AnimatePresence>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} className="h-full">
                    {activeTab === 'home' && renderHomeTab()}
                    {(activeTab === 'verification-asu' || activeTab === 'verification-others') && renderVerificationTab()}
                </motion.div>
            </AnimatePresence>

            {/* View All Activities Modal */}
            {showAllActivitiesModal && (
                <ViewAllActivitiesModal
                    onClose={() => setShowAllActivitiesModal(false)}
                />
            )}

            {/* Attendee Detail Popup Card */}
            {createPortal(
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
                                                {signedUrlLoading ? (
                                                    <div className="flex items-center justify-center p-8 text-slate-400">
                                                        <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
                                                    </div>
                                                ) : !proofSignedUrl ? (
                                                    <div className="flex items-center justify-center p-8 text-slate-400">
                                                        <div className="text-center">
                                                            <FileText className="w-10 h-10 mx-auto mb-2" />
                                                            <p className="text-sm">Could not load proof</p>
                                                        </div>
                                                    </div>
                                                ) : isPdf(selectedAttendee.enrollment_proof_url) ? (
                                                    <div
                                                        className="relative cursor-pointer"
                                                        onClick={() => setPreviewImage(proofSignedUrl)}
                                                    >
                                                        <iframe
                                                            src={proofSignedUrl}
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
                                                    <>
                                                        <img
                                                            src={proofSignedUrl}
                                                            alt="Enrollment Proof"
                                                            className="w-full h-auto max-h-64 object-contain bg-white dark:bg-slate-900 cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() => setPreviewImage(proofSignedUrl)}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                const fallback = e.currentTarget.nextElementSibling;
                                                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                                            }}
                                                        />
                                                        <div className="hidden items-center justify-center p-8 text-slate-400">
                                                            <div className="text-center">
                                                                <FileText className="w-10 h-10 mx-auto mb-2" />
                                                                <p className="text-sm">Unable to load image</p>
                                                                <a
                                                                    href={proofSignedUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-red-600 text-sm font-medium hover:underline mt-1 inline-block"
                                                                >
                                                                    Open in new tab →
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
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
                                            disabled={selectedAttendee.registration_status === 'approved' || processingAction !== null}
                                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white py-3.5 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                                        >
                                            {processingAction === 'approved' ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="w-5 h-5" />
                                                    Verify
                                                </>
                                            )}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => updateStatus(selectedAttendee.user_id, 'rejected')}
                                            disabled={selectedAttendee.registration_status === 'rejected' || processingAction !== null}
                                            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white py-3.5 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/20"
                                        >
                                            {processingAction === 'rejected' ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldX className="w-5 h-5" />
                                                    Reject
                                                </>
                                            )}
                                        </motion.button>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Image Lightbox */}
            {createPortal(
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
                                        src={`${previewImage}${previewImage.includes('?') ? '&' : '?'}response-content-disposition=inline`}
                                        className="w-full h-[85vh] bg-white rounded-lg shadow-2xl"
                                        title="Full Size Proof"
                                    />
                                ) : (
                                    <img
                                        src={previewImage}
                                        alt="Enlarged Proof"
                                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                    />
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <SettingsModal onClose={() => setShowSettings(false)} />
                )}
            </AnimatePresence>

            {/* Volunteer Profile Modal */}
            <VolunteerProfileModal
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
                profile={profile?.volunteer || null}
                loading={authLoading}
            />

            {/* Notification Modal */}
            <AnimatePresence>
                {selectedNotification && (
                    <NotificationModal
                        notification={selectedNotification}
                        onClose={() => setSelectedNotification(null)}
                    />
                )}
            </AnimatePresence>
        </SharedNavigation>
    );
};


export default VerificationDashboard;