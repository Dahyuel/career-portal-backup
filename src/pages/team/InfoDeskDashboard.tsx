// src/pages/team/InfoDeskDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Calendar, QrCode, Search, Clock, User, AlertCircle, X,
  CheckCircle, BookOpen, BookX, Phone, Mail, GraduationCap, Building2,
} from "lucide-react";
import SharedNavigation, { NavItem } from "../../components/shared/SharedNavigation";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabase";
import { QRScanner } from "../../components/shared/QRScanner";
import { useAttendeeProfile } from "../../hooks/useAttendeeProfile";
import AttendeeProfileCard from "../../components/AttendeeProfileCard";
import { useVolunteerProfile } from "../../hooks/useVolunteerProfile";
import VolunteerProfileModal from "../../components/volunteer/VolunteerProfileModal";

// --- Animation Variants (matching BuildTeamDashboard) ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0 },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// --- Types ---
interface Session {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  room_name: string | null;
  max_attendees: number | null;
  current_bookings: number;
  session_type: string;
  status: string;
  is_full: boolean;
  speaker: { id: string; first_name: string; last_name: string; title: string } | null;
}

interface ScannedAttendee {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  personal_id?: string;
  university?: string;
  faculty?: string;
}

// --- Component ---
export const InfoDeskDashboard: React.FC = () => {
  const { profile } = useAuth();
  useTheme();

  const navItems: NavItem[] = [
    { key: "home", label: "Home", icon: "home" },
    { key: "sessions", label: "Sessions", icon: "calendar_month" },
  ];

  const [activeTab, setActiveTab] = useState("home");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Session selection
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [selectedSessionForScan, setSelectedSessionForScan] = useState<Session | null>(null);

  // Scanner & Search
  const [showScanner, setShowScanner] = useState(false);
  const [showSessionSearch, setShowSessionSearch] = useState(false);
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const [sessionSearchResults, setSessionSearchResults] = useState<ScannedAttendee[]>([]);
  const [isSessionSearching, setIsSessionSearching] = useState(false);

  // Attendee card
  const [sessionAttendee, setSessionAttendee] = useState<ScannedAttendee | null>(null);
  const [showSessionCard, setShowSessionCard] = useState(false);
  const [hasBooking, setHasBooking] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileAttendeeId, setProfileAttendeeId] = useState<string | null>(null);

  // Hook for fetching full profile details
  const { attendeeProfile, loading: profileLoading } = useAttendeeProfile(profileAttendeeId || undefined, !!profileAttendeeId);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Activity
  const [recentActivity, setRecentActivity] = useState<{ id: string; description: string; timestamp: string; type: string }[]>([]);

  const { profile: volunteerProfile, loading: loadingProfile } = useVolunteerProfile();
  const [showVolunteerProfile, setShowVolunteerProfile] = useState(false);

  const firstName = volunteerProfile?.full_name?.split(" ")[0] || profile?.full_name?.split(" ")[0] || "Volunteer";

  // --- Helpers ---
  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const addActivity = (description: string, type: string) => {
    setRecentActivity((prev) => [
      { id: crypto.randomUUID(), description, timestamp: new Date().toISOString(), type },
      ...prev.slice(0, 19),
    ]);
  };

  // --- Fetch sessions ---
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select(`id, title, description, session_type, start_time, end_time, room_name,
          max_attendees, current_bookings, is_full, status,
          speaker:speaker_id (id, first_name, last_name, title)`)
        .order("start_time", { ascending: true });
      if (error) throw error;
      const normalised = (data || []).map((s: any) => ({
        ...s,
        speaker: Array.isArray(s.speaker) ? s.speaker[0] : s.speaker,
      }));
      setSessions(normalised);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "sessions") fetchSessions();
  }, [activeTab, fetchSessions]);

  useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);

  // --- Fetch attendee by UUID ---
  const fetchAttendeeByUUID = async (uuid: string): Promise<ScannedAttendee | null> => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, full_name, phone, email, personal_id")
        .eq("id", uuid)
        .single();

      if (profileError || !profileData) return null;

      // 2. Fetch Education Info (University/Faculty) from attendees table
      const { data: attendeeData } = await supabase
        .from("attendees")
        .select("university, faculty")
        .eq("user_id", uuid)
        .maybeSingle();

      return {
        id: profileData.id,
        full_name: profileData.full_name || "Unknown",
        phone: profileData.phone || "N/A",
        email: profileData.email || "N/A",
        personal_id: profileData.personal_id,
        university: attendeeData?.university || undefined,
        faculty: attendeeData?.faculty || undefined
      };
    } catch { return null; }
  };

  // --- Live search as user types (attendees only) ---
  useEffect(() => {
    if (!sessionSearchTerm.trim()) {
      setSessionSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSessionSearching(true);
      try {
        // First get attendee user_ids from user_roles
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "attendee");
        const attendeeIds = (roleData || []).map((r: any) => r.user_id);

        if (attendeeIds.length === 0) {
          setSessionSearchResults([]);
          setIsSessionSearching(false);
          return;
        }

        const { data } = await supabase
          .from("user_profiles")
          .select("id, full_name, phone, email, personal_id")
          .in("id", attendeeIds)
          .ilike("personal_id", `%${sessionSearchTerm.trim()}%`)
          .limit(5);
        if (data) {
          setSessionSearchResults(data.map((d: any) => ({
            id: d.id, full_name: d.full_name || "Unknown", phone: d.phone || "N/A", email: d.email || "N/A", personal_id: d.personal_id,
          })));
        }
      } catch { /* ignore */ }
      finally { setIsSessionSearching(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [sessionSearchTerm]);

  // --- Check booking & show attendee card ---
  const lookupAndShowCard = async (uuid: string) => {
    if (!selectedSessionForScan) return;
    const attendee = await fetchAttendeeByUUID(uuid);
    if (!attendee) { showFeedback("error", "Attendee not found"); return; }

    // Check role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", uuid).order("assigned_at", { ascending: false }).limit(1).single();
    if (roleData?.role !== "attendee") { showFeedback("error", "Only attendees can be booked"); return; }

    // Check booking - Robust check for duplicates
    const { data: bookings } = await supabase
      .from("session_bookings")
      .select("id, booking_status")
      .eq("attendee_id", uuid)
      .eq("session_id", selectedSessionForScan.id)
      .eq("booking_status", "confirmed")
      .limit(1);

    const booking = bookings && bookings.length > 0 ? bookings[0] : null;

    setSessionAttendee(attendee);
    setHasBooking(!!booking);
    setBookingId(booking?.id || null);
    setShowSessionSearch(false);
    setShowSessionDetails(false);
    setShowSessionCard(true);
  };

  // --- QR Scan handler ---
  const handleQRScan = async (qrData: string) => {
    setShowScanner(false);
    let uuid = qrData.trim();
    if (qrData.includes("/")) { const parts = qrData.split("/"); uuid = parts[parts.length - 1]; }
    else if (qrData.startsWith("{")) { try { const p = JSON.parse(qrData); uuid = p.id || p.uuid || qrData; } catch { /* raw */ } }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) { showFeedback("error", "Invalid QR code format"); return; }
    addActivity("Scanned QR code", "qr_scan");
    await lookupAndShowCard(uuid);
  };

  // --- Search result click ---
  const handleSearchResultClick = async (attendee: ScannedAttendee) => {
    setSessionSearchResults([]);
    setSessionSearchTerm("");
    addActivity(`Searched: ${attendee.personal_id || attendee.full_name}`, "search");
    await lookupAndShowCard(attendee.id);
  };

  // --- Book / Unbook ---
  const handleBook = async () => {
    if (!sessionAttendee || !selectedSessionForScan) return;
    setIsProcessing(true);
    try {
      // 1. Check for existing booking (cancelled or not) - Robust check
      const { data: existingBookings, error: checkError } = await supabase
        .from("session_bookings")
        .select("id, booking_status")
        .eq("session_id", selectedSessionForScan.id)
        .eq("attendee_id", sessionAttendee.id)
        .limit(1);

      if (checkError) throw checkError;

      const existingBooking = existingBookings && existingBookings.length > 0 ? existingBookings[0] : null;

      if (existingBooking) {
        // Update existing booking
        const { error: updateError } = await supabase
          .from("session_bookings")
          .update({ booking_status: "confirmed" })
          .eq("id", existingBooking.id);

        if (updateError) throw updateError;
      } else {
        // Insert new booking
        const { error: insertError } = await supabase.from("session_bookings").insert({
          session_id: selectedSessionForScan.id, attendee_id: sessionAttendee.id, booking_status: "confirmed",
        });
        if (insertError) throw insertError;
      }

      await supabase.from("sessions").update({ current_bookings: (selectedSessionForScan.current_bookings || 0) + 1 }).eq("id", selectedSessionForScan.id);
      showFeedback("success", `${sessionAttendee.full_name} booked successfully!`);
      addActivity(`Booked ${sessionAttendee.full_name} for "${selectedSessionForScan.title}"`, "booking");
      setShowSessionCard(false);
      fetchSessions();
    } catch { showFeedback("error", "Failed to book attendee"); }
    finally { setIsProcessing(false); }
  };

  const handleUnbook = async () => {
    if (!sessionAttendee || !selectedSessionForScan || !bookingId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from("session_bookings").update({ booking_status: "cancelled" }).eq("id", bookingId);
      if (error) throw error;
      await supabase.from("sessions").update({ current_bookings: Math.max((selectedSessionForScan.current_bookings || 1) - 1, 0) }).eq("id", selectedSessionForScan.id);
      showFeedback("success", `${sessionAttendee.full_name} unbooked successfully!`);
      addActivity(`Unbooked ${sessionAttendee.full_name} from "${selectedSessionForScan.title}"`, "unbooking");
      setShowSessionCard(false);
      fetchSessions();
    } catch { showFeedback("error", "Failed to unbook attendee"); }
    finally { setIsProcessing(false); }
  };

  // --- Activity helpers ---
  const getActivityColor = (type: string) => {
    const c: Record<string, string> = {
      booking: "bg-green-100 dark:bg-green-500/10 text-green-600",
      unbooking: "bg-red-100 dark:bg-red-500/10 text-red-600",
      qr_scan: "bg-blue-50 dark:bg-blue-500/10 text-blue-500",
      search: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300",
    };
    return c[type] || "bg-gray-100 dark:bg-gray-800 text-gray-500";
  };
  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = { booking: BookOpen, unbooking: BookX, qr_scan: QrCode, search: Search };
    const Icon = icons[type] || CheckCircle;
    return <Icon className="w-5 h-5" />;
  };

  // ===================================================================
  // RENDER: Home tab
  // ===================================================================
  const renderHomeTab = () => (
    <motion.div key="home" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12 space-y-6">
      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          {/* Welcome Banner */}
          <motion.div variants={itemVariants} className="relative rounded-2xl overflow-hidden shadow-xl shadow-red-500/10 p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white" style={{ background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)" }}>
            <div className="relative z-10">
              <p className="uppercase tracking-widest text-red-100 font-semibold text-xs mb-2">Info Desk Dashboard</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome, {firstName}</h1>
              <p className="text-lg text-red-50 opacity-90 max-w-md mb-8">Your support makes this event possible. Thank you for your dedication!</p>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mb-32 -mr-32 blur-3xl" />
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Recent Activity</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No recent activity yet. Select a session to get started.</p>
              ) : (
                <div className="space-y-8 relative">
                  <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700" />
                  {recentActivity.map((a) => (
                    <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative flex gap-6 items-start">
                      <div className={`relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border-4 border-white dark:border-slate-900 ${getActivityColor(a.type)}`}>
                        {getActivityIcon(a.type)}
                      </div>
                      <div className="flex-grow pt-1">
                        <h4 className="font-semibold text-slate-800 dark:text-white">{a.description}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(a.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right column stats */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Sessions</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{sessions.length}</p>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Bookings</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{sessions.reduce((s, x) => s + (x.current_bookings || 0), 0)}</p>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-amber-500">history</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions Today</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{recentActivity.length}</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  // ===================================================================
  // RENDER: Sessions tab (matching BuildTeamDashboard grid style)
  // ===================================================================
  const renderSessionsTab = () => (
    <motion.div key="sessions" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <motion.header variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between rounded-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Management</h1>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {sessions.filter(s => { const n = new Date(); return new Date(s.start_time) <= n && new Date(s.end_time) >= n; }).length} LIVE
          </span>
        </div>
      </motion.header>

      {isLoadingSessions ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-700" />
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">No sessions scheduled</p>
        </div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <motion.div key={session.id} whileHover={{ y: -5 }}
              onClick={() => { setSelectedSession(session); setShowSessionDetails(true); }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full group cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 dark:text-white text-xl leading-tight group-hover:text-orange-500 transition-colors">{session.title}</h3>
                </div>
                {session.speaker && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{session.speaker.first_name} {session.speaker.last_name}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(session.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <span className="material-symbols-outlined text-xl">meeting_room</span>
                    <span className="text-sm font-medium">{session.room_name || "TBA"}</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-50 dark:border-slate-800">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{session.current_bookings || 0}/{session.max_attendees || "∞"} booked</span>
                <button onClick={(e) => { e.stopPropagation(); setSelectedSessionForScan(session); setShowScanner(true); }}
                  className="bg-red-600 text-white p-2.5 rounded-xl shadow-lg shadow-red-600/30 hover:bg-red-700 hover:scale-105 transition-all">
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );

  // ===================================================================
  // MAIN RETURN
  // ===================================================================
  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="Info Desk"
      onProfileClick={() => setShowVolunteerProfile(true)}
    >
      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={`fixed top-4 right-4 z-[9999] flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${feedback.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
            {feedback.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="font-medium">{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="ml-2 hover:bg-black hover:bg-opacity-20 rounded p-1"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} className="h-full">
          {activeTab === "home" && renderHomeTab()}
          {activeTab === "sessions" && renderSessionsTab()}
        </motion.div>
      </AnimatePresence>

      {/* QR Scanner */}
      <QRScanner isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={handleQRScan}
        title={`Scan for ${selectedSessionForScan?.title || "Session"}`} description="Position the QR code within the frame" />

      {/* Session Details Modal (matching BuildTeamDashboard) */}
      <AnimatePresence>
        {showSessionDetails && selectedSession && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSessionDetails(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] relative z-10 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <motion.h3 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSession.title}</motion.h3>
                <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSessionDetails(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-6">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(selectedSession.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(selectedSession.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="material-symbols-outlined text-base">meeting_room</span>
                  <span>{selectedSession.room_name || "TBA"}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <User className="w-4 h-4" />
                  <span>{selectedSession.current_bookings || 0} / {selectedSession.max_attendees || "∞"}</span>
                </div>
              </motion.div>
              {selectedSession.description && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedSession.description}</p>
                </motion.div>
              )}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => { setShowSessionDetails(false); setSelectedSessionForScan(selectedSession); setShowScanner(true); }}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-600/30">
                  <QrCode className="w-5 h-5" /> Scan QR Code
                </button>
                <button onClick={() => { setSelectedSessionForScan(selectedSession); setShowSessionSearch(true); }}
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-slate-800/30">
                  <Search className="w-5 h-5" /> Search Attendee
                </button>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Search Modal (matching BuildTeamDashboard with live dropdown) */}
      <AnimatePresence>
        {showSessionSearch && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowSessionSearch(false); setSessionSearchResults([]); setSessionSearchTerm(""); }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <motion.h3 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="text-xl font-bold text-gray-900 dark:text-white">Search Attendee</motion.h3>
                <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowSessionSearch(false); setSessionSearchResults([]); setSessionSearchTerm(""); }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-lg focus:ring-2 focus:ring-orange-500 shadow-sm dark:text-white placeholder:text-slate-400"
                  placeholder="Enter Personal ID" value={sessionSearchTerm} onChange={(e) => setSessionSearchTerm(e.target.value)} autoFocus />
                {isSessionSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="rounded-full h-5 w-5 border-b-2 border-orange-500" />
                  </div>
                )}
              </motion.div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessionSearchResults.map((result, index) => (
                  <motion.button key={result.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.1 }}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{result.full_name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{result.personal_id || result.email}</p>
                    </div>
                  </motion.button>
                ))}
                {sessionSearchResults.length === 0 && sessionSearchTerm && !isSessionSearching && (
                  <p className="text-center text-gray-500 dark:text-slate-400 py-4">No results found</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendee Card Modal (matching BuildTeamDashboard style with Book/Unbook) */}
      <AnimatePresence>
        {showSessionCard && sessionAttendee && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSessionCard(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <motion.h3 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="text-2xl font-bold text-gray-900 dark:text-white">Session Booking</motion.h3>
                <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSessionCard(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Attendee Info (matching BuildTeamDashboard pattern) */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-orange-500" />
                  </motion.div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">{sessionAttendee.full_name}</h4>
                    <p className={`text-sm font-medium mt-1 ${hasBooking ? "text-green-600" : "text-slate-500 dark:text-slate-400"}`}>
                      {hasBooking ? "Booking Confirmed" : "Not Booked"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {(sessionAttendee.university || sessionAttendee.faculty) && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {sessionAttendee.university && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-slate-700/50 p-3 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <GraduationCap className="w-4 h-4 text-red-500" />
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">University</span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={sessionAttendee.university}>{sessionAttendee.university}</p>
                        </motion.div>
                      )}
                      {sessionAttendee.faculty && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-slate-700/50 p-3 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-purple-500" />
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Faculty</span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={sessionAttendee.faculty}>{sessionAttendee.faculty}</p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.phone}</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.email}</p>
                    </div>
                  </motion.div>
                  {sessionAttendee.personal_id && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-600 text-xl">badge</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Personal ID</p>
                        <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.personal_id}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Session context */}
              {selectedSessionForScan && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="bg-orange-500/5 dark:bg-orange-500/10 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Session</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{selectedSessionForScan.title}</p>
                  </div>
                </motion.div>
              )}



              {/* Book / Unbook buttons */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="grid grid-cols-2 gap-4">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleBook} disabled={hasBooking || isProcessing}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800/40 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/30">
                  {isProcessing && !hasBooking ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (<><BookOpen className="w-5 h-5" /> Book</>)}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleUnbook} disabled={!hasBooking || isProcessing}
                  className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-800/40 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/30">
                  {isProcessing && hasBooking ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (<><BookX className="w-5 h-5" /> Unbook</>)}
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendee Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <AttendeeProfileCard
            profile={attendeeProfile}
            hasActiveApplications={false} // Not relevant for Info Desk view
            loading={profileLoading}
            onClose={() => {
              setShowProfileModal(false);
              setProfileAttendeeId(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Volunteer Profile Modal */}
      <VolunteerProfileModal
        isOpen={showVolunteerProfile}
        onClose={() => setShowVolunteerProfile(false)}
        profile={volunteerProfile}
        loading={loadingProfile}
      />
    </SharedNavigation>
  );
};