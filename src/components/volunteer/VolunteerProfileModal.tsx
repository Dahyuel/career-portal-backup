// components/volunteer/VolunteerProfileModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import LeaderboardModal from '../shared/LeaderboardModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, getActiveEvents, checkEventRegistration, FairEvent } from '../../lib/supabase';
import { getEmployerStatus, openEmployerEvent } from '../../lib/employer';
import { logger } from '../../utils/logger';

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
    const { profile: authProfile, user, refreshProfile, getRoleBasedRedirect } = useAuth();
    const qrRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'details'|'qrcode'>('details');
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const navigate = useNavigate();
    // Check if loading (no profile yet)
    const loading = !authProfile;
    const eventId = authProfile?.event_id ?? undefined;

    // Show leaderboard button for all roles except attendee
    const showLeaderboardButton = authProfile?.role && authProfile.role !== 'attendee';

    // ── Event switcher state ─────────────────────────────────────────────
    const [showEventSwitcher, setShowEventSwitcher] = useState(false);
    const [events, setEvents] = useState<FairEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState<string|null>(null);
    const [switchingEventId, setSwitchingEventId] = useState<string|null>(null);
    const [currentEventName, setCurrentEventName] = useState<string|null>(null);
    const [eventNameLoading, setEventNameLoading] = useState<boolean>(!!eventId);
    // Employer events where the company takes part but the user has no employers
    // row yet. Selecting one runs employer_open_event (mirrors EventSelection).
    const [employerOpenable, setEmployerOpenable] = useState<Set<string>>(new Set());

    // ── Load current event name (for the header chip) ────────────────────
    // The direct events select can come back empty (RLS / stale event_id), so
    // fall back to getActiveEvents(), the same source the switcher uses.
    useEffect(() => {
        let cancelled = false;
        if (!eventId) {
            setCurrentEventName(null);
            setEventNameLoading(false);
            return;
        }

        setEventNameLoading(true);
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('name')
                    .eq('id', eventId)
                    .maybeSingle();
                if (cancelled) return;
                if (!error && data?.name) {
                    setCurrentEventName(data.name);
                    return;
                }
                if (error) {
                    logger.warn('Failed to load current event name, falling back:', error);
                }

                const { data: events, error: eventsError } = await getActiveEvents();
                if (cancelled) return;
                if (eventsError) {
                    logger.warn('Failed to load active events for name:', eventsError);
                    return;
                }
                const match = (events|[]).find((e) => e.id === eventId);
                if (match?.name) setCurrentEventName(match.name);
            } catch (err) {
                logger.warn('Failed to load current event name:', err);
            } finally {
                if (!cancelled) setEventNameLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [eventId]);

    // ── Open the event switcher modal and load active events ────────────
    // Mirrors EventSelection.tsx: merges employer-only events (company
    // participates but the event isn't in get_active_events) and tracks which
    // ones need employer_open_event, so the ended/role logic matches exactly.
    const handleOpenEventSwitcher = async () => {
        setShowEventSwitcher(true);
        setEventsError(null);
        setEventsLoading(true);
        try {
            const [{ data, error }, employerStatus] = await Promise.all([
                getActiveEvents(),
                getEmployerStatus().catch(() => null),
            ]);
            if (error) {
                setEventsError(error.message);
                return;
            }

            const merged: FairEvent[] = [
                ...(Array.isArray(data) ? data : []),
            ];
            const seen = new Set(merged.map((e) => e.id));
            const openable = new Set<string>();

            if (employerStatus?.is_employer) {
                for (const ev of employerStatus.events) {
                    const existing = merged.find((m) => m.id === ev.event_id);
                    if (existing) {
                        // Company participates but the user has no employers row yet.
                        if (authProfile?.employer?.company_id !== ev.company_id) {
                            openable.add(ev.event_id);
                        }
                    } else if (!seen.has(ev.event_id)) {
                        seen.add(ev.event_id);
                        merged.push({
                            id: ev.event_id,
                            name: ev.event_name,
                            event_type: ev.event_type,
                            start_date: ev.start_date|undefined,
                            end_date: ev.end_date|undefined,
                            status: ev.status|undefined,
                            venue_name: ev.venue_name,
                            is_current: ev.is_current,
                            is_ended: ev.is_ended,
                            can_register: false,
                        });
                        openable.add(ev.event_id);
                    }
                }
            }

            merged.sort(
                (a, b) =>
                    new Date(b.start_date|0).getTime() -
                    new Date(a.start_date|0).getTime()
            );

            // Hide the currently-selected event from the list — no point
            // offering to switch to the one already bound.
            setEmployerOpenable(openable);
            setEvents(merged.filter((e) => e.id !== eventId));
        } catch (err: any) {
            logger.error('Failed to load events for switcher:', err);
            setEventsError('Could not load events. Please try again.');
        } finally {
            setEventsLoading(false);
        }
    };

    // ── Switch to a different event ─────────────────────────────────────
    const handleSwitchEvent = async (event: FairEvent) => {
        if (!authProfile?.id|!authProfile?.email) return;

        setSwitchingEventId(event.id);

        try {
            // 1. Check if the user is already registered for this event.
            const { data: registration, error: regError } = await checkEventRegistration(event.id);

            if (regError) {
                setEventsError(regError.message);
                setSwitchingEventId(null);
                return;
            }

            if (registration) {
                // 2a. Registered → rebind the profile to this event and
                //     reload the dashboard so all RPCs scope to it.
                const updated = await refreshProfile(
                    event.id,
                    authProfile.id,
                    authProfile.email,
                    true
                );

                if (!updated?.event_id) {
                    logger.error('Event switch did not bind event_id', {
                        eventId: event.id,
                        updated,
                    });
                    setEventsError('Could not activate this event. Please try again.');
                    setSwitchingEventId(null);
                    return;
                }

                setShowEventSwitcher(false);
                onClose();
                const role = updated.role|'attendee';
                navigate(getRoleBasedRedirect(role), { replace: true });
                return;
            }

            // 2b. Employer company event with no employers row: complete the
            //     profile first, then open the event (mirrors EventSelection).
            if (employerOpenable.has(event.id)) {
                if (!authProfile.profile_complete) {
                    setShowEventSwitcher(false);
                    onClose();
                    navigate(`/employer-start?eventId=${event.id}`, { replace: false });
                    return;
                }

                const opened = await openEmployerEvent(event.id);
                if (opened.success) {
                    const updated = await refreshProfile(
                        event.id,
                        authProfile.id,
                        authProfile.email,
                        true
                    );
                    if (updated?.roles?.includes('employer')) {
                        setShowEventSwitcher(false);
                        onClose();
                        navigate('/employer', { replace: true });
                        return;
                    }
                }
                // Otherwise fall through to ended handling / registration.
            }

            // 2c. Event has ended and the user has no role there → blocked.
            if (event.is_ended) {
                setEventsError('This event has ended and you cannot join it.');
                setSwitchingEventId(null);
                return;
            }

            // 2d. Not registered → send to registration form for that event.
            setShowEventSwitcher(false);
            onClose();
            navigate(`/register-event?eventId=${event.id}`, { replace: false });
        } catch (err: any) {
            logger.error('Error switching event:', err);
            setEventsError(err.message|'Something went wrong. Please try again.');
        } finally {
            setSwitchingEventId(null);
        }
    };

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
        const qrCanvas = qrRef.current?.querySelector('canvas');
        if (!qrCanvas) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const padding = 24;
        canvas.width = qrCanvas.width + padding * 2;
        canvas.height = qrCanvas.height + padding * 2;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(qrCanvas, padding, padding);

        canvas.toBlob((blob) => {
            if (blob) {
                const link = document.createElement('a');
                link.download = `volunteer-qr-${authProfile?.volunteer?.volunteer_id || 'code'}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
            }
        });
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

                                        {/* ── Switch event button (shows current event) ── */}
                                        <motion.button
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.25 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleOpenEventSwitcher}
                                            className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-sm">swap_horiz</span>
                                            Switch Event
                                            {eventNameLoading ? (
                                                <span className="inline-block w-24 h-3 rounded-full bg-white/30 animate-pulse" />
                                            ) : (
                                                <span className="font-normal opacity-90">
                                                    · {currentEventName || 'No event selected'}
                                                </span>
                                            )}
                                        </motion.button>
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
                                                        {authProfile.isVolunteer && authProfile.volunteer && (
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
                                                    {/* Go to Attendee Dashboard */}
                                                    {showLeaderboardButton && (
                                                        <button
                                                            onClick={() => {
                                                                onClose?.();
                                                                navigate('/attendee');
                                                            }}
                                                            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined">person</span>
                                                            Go to Attendee Dashboard
                                                        </button>
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
                                                        <QRCodeCanvas value={authProfile.id || user?.id || ''} size={200} level="H" />
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

            {/* ── Event Switcher Modal ─────────────────────────────────── */}
            <AnimatePresence>
                {showEventSwitcher && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => !switchingEventId && setShowEventSwitcher(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', duration: 0.4 }}
                            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-zinc-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">swap_horiz</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Switch Event</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Pick another active event to join
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => !switchingEventId && setShowEventSwitcher(false)}
                                    disabled={!!switchingEventId}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </motion.button>
                            </div>

                            {/* Body */}
                            <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {eventsError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
                                    >
                                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg flex-shrink-0">error</span>
                                        <p className="text-sm text-red-700 dark:text-red-300">{eventsError}</p>
                                    </motion.div>
                                )}

                                {eventsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="rounded-full h-10 w-10 border-b-2 border-red-600 mb-3"
                                        />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading events...</p>
                                    </div>
                                ) : events.length === 0 ? (
                                    <div className="text-center py-10">
                                        <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-2 block">event_busy</span>
                                        <p className="text-gray-600 dark:text-gray-400 font-medium">No other active events</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            You're already in the only active event.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {events.map((event, index) => (
                                            <motion.button
                                                key={event.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.05 * index }}
                                                onClick={() => handleSwitchEvent(event)}
                                                disabled={!!switchingEventId}
                                                className="w-full text-left group bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 hover:border-red-400 dark:hover:border-red-500 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                                {event.name}
                                                            </h4>
                                                            {event.is_current && (
                                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex-shrink-0">
                                                                    Current
                                                                </span>
                                                            )}
                                                            {event.is_ended && (
                                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-200 rounded-full flex-shrink-0 inline-flex items-center gap-0.5">
                                                                    <span className="material-symbols-outlined text-[12px]">lock</span>
                                                                    Ended
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                            {event.start_date && (
                                                                <span className="flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                                                    {new Date(event.start_date).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric',
                                                                    })}
                                                                </span>
                                                            )}
                                                            {event.venue_name && (
                                                                <span className="flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                                                    {event.venue_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 pt-0.5">
                                                        {switchingEventId === event.id ? (
                                                            <motion.div
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                                className="rounded-full h-5 w-5 border-b-2 border-red-600"
                                                            />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-gray-400 group-hover:text-red-600 transition-colors">
                                                                arrow_forward
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                                    <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">info</span>
                                    <span>
                                        Switching events reloads your dashboard with data for the selected event.
                                        If you're not yet registered for it, you'll be taken to the registration form.
                                    </span>
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
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