// src/pages/team/InfoDeskDashboard.tsx
// OPTIMIZED VERSION with improved queries and event filtering
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Calendar, QrCode, Search, Clock, User, X,
  CheckCircle, BookOpen, BookX, Phone, Mail, GraduationCap, Building2, UserCircle,
} from "lucide-react";
import SharedNavigation, { NavItem } from "../../components/shared/SharedNavigation";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase, searchAttendeesByPersonalId, getAttendeeByUUID } from "../../lib/supabase";
import { QRScanner } from "../../components/shared/QRScanner";
import VolunteerProfileModal from "../../components/volunteer/VolunteerProfileModal";
import Toast from "../../components/shared/Toast";
import DashboardLoading from "../../components/DashboardLoading";
import ViewAllActivitiesModal from "../../components/attendee/ViewAllActivitiesModal";
import NotificationModal from "../../components/NotificationModal";
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
  const { profile, refreshProfile } = useAuth();
  useTheme();

  const navItems: NavItem[] = [
    { key: "home", label: "Home", icon: "home" },
    { key: "sessions", label: "Sessions", icon: "calendar_month" },
  ];

  const [activeTab, setActiveTab] = useState("home");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalBookings: 0,
    actionsToday: 0
  });

  // Refresh Trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Session selection
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [selectedSessionForScan, setSelectedSessionForScan] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
  const [isCardLoading, setIsCardLoading] = useState(false);

  // Volunteer Profile Modal State
  const [showVolunteerProfile, setShowVolunteerProfile] = useState(false);

  // Loading State
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  // Activity
  const [recentActivity, setRecentActivity] = useState<{ id: string; description: string; timestamp: string; type: string }[]>([]);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id || !profile?.roles) return;
    try {
      const { data: volunteerData } = await supabase
        .from('volunteers')
        .select('team_id')
        .eq('user_id', profile.id)
        .maybeSingle();
      const teamId = volunteerData?.team_id;

      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, content, publish_at, target_roles, team_id, announcement_type')
        .eq('event_id', EVENT_ID)
        .contains('target_roles', profile.roles)
        .or(teamId ? `team_id.is.null,team_id.eq.${teamId}` : 'team_id.is.null')
        .order('publish_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (data) setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [profile?.id, profile?.roles]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Get current event ID from profile (assuming it's cached there)
  const currentEventId = profile?.event_id;

  // Get volunteer name from AuthContext profile
  const firstName = profile?.volunteer?.full_name?.split(" ")[0] || profile?.full_name?.split(" ")[0] || "Volunteer";

  // --- Helpers ---
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const addActivity = (description: string, type: string) => {
    setRecentActivity((prev) => [
      { id: crypto.randomUUID(), description, timestamp: new Date().toISOString(), type },
      ...prev.slice(0, 19),
    ]);
  };

  const logUserActivity = async (
    activityType: string,
    description: string,
    points: number = 1
  ) => {
    try {
      if (!profile?.id || !currentEventId) return;

      const { error } = await supabase
        .from("user_activities")
        .insert({
          user_id: profile.id,
          event_id: currentEventId,
          activity_type: activityType,
          description: description,
          points_earned: points,
          activity_timestamp: new Date().toISOString()
        });

      if (error) throw error;

      // Also add to local recent activity state
      addActivity(description, activityType);

    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  const incrementVolunteerPoints = async (points: number) => {
    try {
      if (!profile?.id) return;

      // First get current points
      const { data: volunteerData, error: fetchError } = await supabase
        .from('volunteers')
        .select('points, id')
        .eq('user_id', profile.id)
        .single();

      if (fetchError || !volunteerData) return;

      // Update points
      const { error: updateError } = await supabase
        .from('volunteers')
        .update({ points: (volunteerData.points || 0) + points })
        .eq('id', volunteerData.id);

      if (updateError) {
        console.error('Error updating points:', updateError);
      }
    } catch (err) {
      console.error('Error in incrementVolunteerPoints:', err);
    }
  };

  // --- Initial Data Load ---
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (!currentEventId) return;

        // 1. Get Sessions Count
        const { count: sessionsCount } = await supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .eq("event_id", currentEventId);

        // 2. Get Bookings Count (Valid confirmed bookings for this event)
        // First get session IDs for this event to filter bookings
        const { data: eventSessions } = await supabase
          .from("sessions")
          .select("id")
          .eq("event_id", currentEventId);

        let bookingsCount = 0;
        if (eventSessions && eventSessions.length > 0) {
          const sessionIds = eventSessions.map(s => s.id);
          const { count } = await supabase
            .from("session_bookings")
            .select("*", { count: "exact", head: true })
            .in("session_id", sessionIds)
            .eq("booking_status", "confirmed");
          bookingsCount = count || 0;
        }

        // 3. Get Actions Today Count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: actionsCount } = await supabase
          .from("user_activities")
          .select("*", { count: "exact", head: true })
          .gte("activity_timestamp", today.toISOString())
          .eq("user_id", profile?.id);

        setStats({
          totalSessions: sessionsCount || 0,
          totalBookings: bookingsCount,
          actionsToday: actionsCount || 0
        });

        // 4. Fetch Recent Activity for display (Last 3)
        const { data: activityData } = await supabase.from("user_activities")
          .select("id, description, activity_timestamp, activity_type")
          .eq("user_id", profile?.id)
          .order("activity_timestamp", { ascending: false })
          .limit(3);

        if (activityData) {
          setRecentActivity(activityData.map((a: any) => ({
            id: a.id,
            description: a.description,
            timestamp: a.activity_timestamp,
            type: a.activity_type
          })));
        }
      } catch (e) {
        console.error("Initial load error", e);
        showToast("Failed to load dashboard statistics", "error");
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadInitialData();
  }, [currentEventId, refreshTrigger]);
  // --- OPTIMIZED: Fetch sessions with event filter ---
  const fetchSessions = useCallback(async () => {
    if (!currentEventId) {
      console.warn("No event ID available");
      return;
    }

    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id, title, description, session_type, start_time, end_time, room_name,
          max_attendees, current_bookings, is_full, status,
          speaker:speaker_id (id, first_name, last_name, title)
        `)
        .eq("event_id", currentEventId) // CRITICAL: Filter by event
        .order("start_time", { ascending: true });

      if (error) throw error;

      const normalised = (data || []).map((s: any) => ({
        ...s,
        speaker: Array.isArray(s.speaker) ? s.speaker[0] : s.speaker,
      }));

      setSessions(normalised);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      showToast("Failed to load sessions", "error");
    } finally {
      setIsLoadingSessions(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    if (activeTab === "sessions") fetchSessions();
  }, [activeTab, fetchSessions]);

  useEffect(() => { window.scrollTo(0, 0); }, [activeTab]);

  // --- OPTIMIZED: Fetch attendee by UUID with helper ---
  const fetchAttendeeByUUID = async (uuid: string): Promise<ScannedAttendee | null> => {
    try {
      const { data, error } = await getAttendeeByUUID(uuid);

      if (error || !data) {
        console.error("Error fetching attendee:", error);
        return null;
      }

      // Debug log confirmed data has user_id, not id
      console.log("fetchAttendeeByUUID data:", data);

      return {
        id: data.id || data.user_id, // Fix: Use user_id if id is missing
        full_name: data.full_name || "Unknown",
        phone: data.phone || "N/A",
        email: data.email || "N/A",
        personal_id: data.personal_id,
        university: data.university,
        faculty: data.faculty
      };
    } catch (err) {
      console.error("Exception fetching attendee:", err);
      return null;
    }
  };

  // --- OPTIMIZED: Live search with better query approach ---
  useEffect(() => {
    if (!sessionSearchTerm.trim()) {
      setSessionSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSessionSearching(true);
      try {
        const { data, error } = await searchAttendeesByPersonalId(sessionSearchTerm.trim());

        if (error) {
          console.error("Search error:", error);
          setSessionSearchResults([]);
        } else if (data) {
          // Helper returns data in correct format, but we need to map to local state shape if strictly needed.
          // The helper returns: id, full_name, etc.
          // Local state expects: id, full_name, phone, email, personal_id
          setSessionSearchResults(data.map((d: any) => ({
            id: d.id,
            full_name: d.full_name || "Unknown",
            phone: d.phone || "N/A",
            email: d.email || "N/A",
            personal_id: d.personal_id,
          })));
        }
      } catch (err) {
        console.error("Search exception:", err);
        setSessionSearchResults([]);
      } finally {
        setIsSessionSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [sessionSearchTerm]);

  // --- OPTIMIZED: Check booking & show attendee card ---
  const lookupAndShowCard = async (uuid: string) => {
    if (!selectedSessionForScan || !currentEventId) return;

    // 1. Show card immediately in loading state
    setIsCardLoading(true);
    setShowSessionCard(true);
    setShowSessionSearch(false);
    setShowScanner(false);
    // Reset previous data
    setSessionAttendee(null);
    setHasBooking(false);
    setBookingId(null);

    try {
      // 2. Parallelize fetches: Attendee details + Booking status
      // getAttendeeByUUID already validates the user exists and has 'attendee' role
      const [attendee, { data: bookings }] = await Promise.all([
        fetchAttendeeByUUID(uuid),
        supabase
          .from("session_bookings")
          .select("id")
          .eq("session_id", selectedSessionForScan.id)
          .eq("attendee_id", uuid)
          .eq("booking_status", "confirmed")
          .maybeSingle()
      ]);

      if (!attendee) {
        showToast("Attendee not found", "error");
        setShowSessionCard(false); // Hide if not found
        return;
      }

      setSessionAttendee(attendee);
      setHasBooking(!!bookings);
      setBookingId(bookings?.id || null);
    } catch (err) {
      console.error("Error looking up attendee:", err);
      showToast("Failed to load attendee details", "error");
      setShowSessionCard(false);
    } finally {
      setIsCardLoading(false);
    }
  };

  // --- QR Scan handler ---
  const handleQRScan = async (qrData: string) => {
    setShowScanner(false);
    let uuid = qrData.trim();

    // Parse QR data
    if (qrData.includes("/")) {
      const parts = qrData.split("/");
      uuid = parts[parts.length - 1];
    } else if (qrData.startsWith("{")) {
      try {
        const parsed = JSON.parse(qrData);
        uuid = parsed.id || parsed.uuid || qrData;
      } catch {
        // Use raw data
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      showToast("Invalid QR code format", "error");
      return;
    }

    // addActivity("Scanned QR code", "qr_scan"); // Removed local-only activity
    await lookupAndShowCard(uuid);
  };

  // --- Search result click ---
  const handleSearchResultClick = async (attendee: ScannedAttendee) => {
    setSessionSearchResults([]);
    setSessionSearchTerm("");
    // addActivity(`Searched: ${attendee.personal_id || attendee.full_name}`, "search"); // Removed local-only activity
    await lookupAndShowCard(attendee.id);
  };

  const handleBook = async () => {
    if (!sessionAttendee || !selectedSessionForScan) return;

    setIsProcessing(true);
    try {
      // 1. Verify capacity
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("current_bookings, max_attendees, title")
        .eq("id", selectedSessionForScan.id)
        .single();

      if (sessionError) throw sessionError;

      const currentBookings = sessionData.current_bookings || 0;
      const maxAttendees = sessionData.max_attendees;

      if (maxAttendees && currentBookings >= maxAttendees) {
        showToast("This session is full", "error");
        setIsProcessing(false);
        return;
      }

      // 2. Check for existing booking (cancelled or not)
      const { data: existingBooking, error: checkError } = await supabase
        .from("session_bookings")
        .select("id, booking_status")
        .eq("session_id", selectedSessionForScan.id)
        .eq("attendee_id", sessionAttendee.id)
        .maybeSingle();

      if (checkError) throw checkError;

      let bookingSuccess = false;

      if (existingBooking) {
        if (existingBooking.booking_status === "confirmed") {
          showToast("Already booked", "error");
          setIsProcessing(false);
          return;
        }

        // Reactivate cancelled booking
        const { error: updateError } = await supabase
          .from("session_bookings")
          .update({
            booking_status: "confirmed",
            booked_at: new Date().toISOString()
          })
          .eq("id", existingBooking.id);

        if (updateError) throw updateError;
        bookingSuccess = true;
      } else {
        // Create new booking
        const { error: insertError } = await supabase
          .from("session_bookings")
          .insert({
            session_id: selectedSessionForScan.id,
            attendee_id: sessionAttendee.id,
            booking_status: "confirmed",
            checked_in: false
          });

        if (insertError) throw insertError;
        bookingSuccess = true;
      }

      if (bookingSuccess) {
        // Log the activity with 1 point
        await logUserActivity(
          "booking",
          `Booked ${sessionAttendee.full_name} for session: ${selectedSessionForScan.title}`,
          1
        );

        // Optional: Update volunteer points if you want to track points for volunteer profiles
        await incrementVolunteerPoints(1);

        // Refresh Auth Profile (Global Score)
        // Refresh Auth Profile (Global Score)
        if (profile?.event_id && profile?.id) {
          await refreshProfile(profile.event_id, profile.id, undefined, true);
        }

        showToast(`${sessionAttendee.full_name} booked successfully!`, "success");
        setShowSessionCard(false);
        setSelectedSessionForScan(null);
        setSessionAttendee(null);
        // Refresh sessions to update counts
        fetchSessions();
        // Refresh Home stats
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error("Booking error:", err);
      showToast("Failed to book attendee", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnbook = async () => {
    if (!sessionAttendee || !selectedSessionForScan || !bookingId) return;

    setIsProcessing(true);
    try {
      // 1. Check if user is checked in
      const { data: bookingData, error: checkError } = await supabase
        .from("session_bookings")
        .select("checked_in")
        .eq("id", bookingId)
        .single();

      if (checkError) throw checkError;

      if (bookingData.checked_in) {
        showToast("Cannot cancel: User is already checked in!", "error");
        setIsProcessing(false);
        return;
      }

      // 2. Cancel booking
      const { error: updateError } = await supabase
        .from("session_bookings")
        .update({ booking_status: "cancelled" })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Log the activity with 1 point
      await logUserActivity(
        "unbooking",
        `Cancelled booking for ${sessionAttendee.full_name} from session: ${selectedSessionForScan.title}`,
        1
      );

      // Optional: Update volunteer points (you might want different point values for cancellation)
      await incrementVolunteerPoints(1);

      // Refresh Auth Profile (Global Score)
      // Refresh Auth Profile (Global Score)
      if (profile?.event_id && profile?.id) {
        await refreshProfile(profile.event_id, profile.id, undefined, true);
      }

      showToast("Booking cancelled", "success");
      setShowSessionCard(false);
      setSelectedSessionForScan(null);
      setSessionAttendee(null);
      fetchSessions();
      // Refresh Home stats
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Cancellation error:", err);
      showToast("Failed to cancel booking", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Activity helpers ---
  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      booking: "bg-green-100 dark:bg-green-500/10 text-green-600",
      unbooking: "bg-red-100 dark:bg-red-500/10 text-red-600",
      qr_scan: "bg-blue-50 dark:bg-blue-500/10 text-blue-500",
      search: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300",
    };
    return colors[type] || "bg-gray-100 dark:bg-gray-800 text-gray-500";
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      booking: BookOpen,
      unbooking: BookX,
      qr_scan: QrCode,
      search: Search
    };
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
          <motion.div
            variants={itemVariants}
            className="relative rounded-2xl overflow-hidden shadow-xl shadow-red-500/10 p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white"
            style={{
              background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
            }}
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
                support_agent
              </span>
            </div>
            <div className="relative z-10">
              <p className="uppercase tracking-widest text-red-100 font-semibold text-xs mb-2">Info Desk Dashboard</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome, {firstName}
              </h1>
              <p className="text-lg text-red-50 opacity-90 max-w-md mb-8">
                Your support makes this event possible. Thank you for your dedication!
              </p>
              <button
                onClick={() => setShowVolunteerProfile(true)}
                className="bg-white text-red-600 hover:bg-red-50 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit shadow-lg active:scale-95"
              >
                <UserCircle className="w-5 h-5" />
                Show Profile
              </button>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/20 rounded-full -mb-32 -mr-32 blur-3xl"></div>
          </motion.div>

          {/* Quick Stats - Mobile */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 lg:hidden">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sessions</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.totalSessions}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">history</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.actionsToday}</p>
            </div>
          </motion.div>

          {/* Recent Activity */}
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
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No recent activity yet. Select a session to get started.</p>
              ) : (
                <div className="space-y-8 relative">
                  <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700" />
                  {recentActivity.map((activity) => (
                    <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative flex gap-6 items-start">
                      <div className={`relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border-4 border-white dark:border-slate-900 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-grow pt-1">
                        <h4 className="font-semibold text-slate-800 dark:text-white">{activity.description}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{stats.totalSessions}</p>
          </motion.div>
          {/* Total Bookings Removed as requested */}

          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-amber-500">history</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions Today</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{stats.actionsToday}</p>
          </motion.div>
        </div>
      </div>
    </motion.div >
  );

  // ===================================================================
  // RENDER: Sessions tab
  // ===================================================================
  const renderSessionsTab = () => (
    <motion.div key="sessions" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <motion.header variants={itemVariants} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Session Management</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Manage & Check-in</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
              placeholder="Search sessions by title or room..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
      ) : sessions.filter(session => {
        const query = searchQuery.toLowerCase();
        return (
          session.title.toLowerCase().includes(query) ||
          (session.room_name && session.room_name.toLowerCase().includes(query))
        );
      }).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-700" />
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">No sessions found</p>
          <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">Try adjusting your search terms</p>
        </div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.filter(session => {
            const query = searchQuery.toLowerCase();
            return (
              session.title.toLowerCase().includes(query) ||
              (session.room_name && session.room_name.toLowerCase().includes(query))
            );
          }).map((session) => (
            <motion.div
              key={session.id}
              whileHover={{ y: -5 }}
              onClick={() => {
                setSelectedSession(session);
                setShowSessionDetails(true);
              }}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSessionForScan(session);
                    setShowScanner(true);
                  }}
                  className="bg-red-600 text-white p-2.5 rounded-xl shadow-lg shadow-red-600/30 hover:bg-red-700 hover:scale-105 transition-all"
                >
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

  if (isInitialLoading) {
    return <DashboardLoading message="Loading Info Desk" subMessage="Preparing your dashboard..." />;
  }

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="Info Desk"
      onProfileClick={() => setShowVolunteerProfile(true)}
      notifications={notifications}
      onNotificationClick={(notification) => setSelectedNotification(notification)}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Toast Notification */}
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
            {activeTab === "home" && renderHomeTab()}
            {activeTab === "sessions" && renderSessionsTab()}
          </motion.div>
        </AnimatePresence>

        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleQRScan}
          title={`Scan for ${selectedSessionForScan?.title || "Session"}`}
          description="Position the QR code within the frame"
        />
      </div>

      {/* Session Details Modal */}
      <AnimatePresence>
        {showSessionDetails && selectedSession && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSessionDetails(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] relative z-10 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                >
                  {selectedSession.title}
                </motion.h3>
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSessionDetails(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-6"
              >
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(selectedSession.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                    {new Date(selectedSession.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6"
                >
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedSession.description}</p>
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <button
                  onClick={() => {
                    setShowSessionDetails(false);
                    setSelectedSessionForScan(selectedSession);
                    setShowScanner(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-600/30"
                >
                  <QrCode className="w-5 h-5" /> Scan QR Code
                </button>
                <button
                  onClick={() => {
                    setSelectedSessionForScan(selectedSession);
                    setShowSessionSearch(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-green-600/30"
                >
                  <Search className="w-5 h-5" /> Search Attendee
                </button>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Search Modal */}
      <AnimatePresence>
        {showSessionSearch && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowSessionSearch(false);
                setSessionSearchResults([]);
                setSessionSearchTerm("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold text-gray-900 dark:text-white"
                >
                  Search Attendee
                </motion.h3>
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowSessionSearch(false);
                    setSessionSearchResults([]);
                    setSessionSearchTerm("");
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative mb-6"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-lg focus:ring-2 focus:ring-orange-500 shadow-sm dark:text-white placeholder:text-slate-400"
                  placeholder="Enter Personal ID"
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                  autoFocus
                />
                {isSessionSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="rounded-full h-5 w-5 border-b-2 border-orange-500"
                    />
                  </div>
                )}
              </motion.div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessionSearchResults.map((result, index) => (
                  <motion.button
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
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

      {/* Attendee Card Modal */}
      <AnimatePresence>
        {showSessionCard && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSessionCard(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                >
                  Session Booking
                </motion.h3>
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSessionCard(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {isCardLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
                    <motion.div
                      className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Loading attendee details...</p>
                </div>
              ) : sessionAttendee ? (
                <>
                  {/* Attendee Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-6"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center"
                      >
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
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 }}
                              className="bg-white dark:bg-slate-700/50 p-3 rounded-xl"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <GraduationCap className="w-4 h-4 text-red-500" />
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">University</span>
                              </div>
                              <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={sessionAttendee.university}>
                                {sessionAttendee.university}
                              </p>
                            </motion.div>
                          )}
                          {sessionAttendee.faculty && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 }}
                              className="bg-white dark:bg-slate-700/50 p-3 rounded-xl"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Building2 className="w-4 h-4 text-purple-500" />
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Faculty</span>
                              </div>
                              <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={sessionAttendee.faculty}>
                                {sessionAttendee.faculty}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Phone</p>
                          <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.phone}</p>
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Email</p>
                          <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.email}</p>
                        </div>
                      </motion.div>
                      {sessionAttendee.personal_id && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 }}
                          className="flex items-center gap-3"
                        >
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
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-orange-500/5 dark:bg-orange-500/10 rounded-xl p-4 mb-6 flex items-center gap-3"
                    >
                      <Calendar className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Session</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{selectedSessionForScan.title}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <button
                      onClick={() => setShowSessionCard(false)}
                      className="py-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    {hasBooking ? (
                      <button
                        disabled={isProcessing}
                        onClick={handleUnbook}
                        className="bg-red-100 hover:bg-red-200 text-red-600 py-4 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? "Processing..." : (
                          "Cancel Booking"
                        )}
                      </button>
                    ) : (
                      <button
                        disabled={isProcessing}
                        onClick={handleBook}
                        className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? "Processing..." : (
                          "Confirm Booking"
                        )}
                      </button>
                    )}
                  </motion.div>
                </>
              ) : null}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Volunteer Profile Modal */}
      <VolunteerProfileModal
        isOpen={showVolunteerProfile}
        onClose={() => setShowVolunteerProfile(false)}
        profile={profile?.volunteer || null}
        loading={false}
      />

      {/* View All Activities Modal */}
      {showAllActivitiesModal && (
        <ViewAllActivitiesModal
          onClose={() => setShowAllActivitiesModal(false)}
        />
      )}

      {/* Notification Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <NotificationModal
            notification={selectedNotification}
            onClose={() => setSelectedNotification(null)}
          />
        )}
      </AnimatePresence>
    </SharedNavigation >
  );
};