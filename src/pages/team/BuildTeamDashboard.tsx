import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Calendar,
  User,
  Search,
  QrCode,
  CheckCircle,
  Clock,
  X,
  Phone,
  Mail,
} from "lucide-react";
import SharedNavigation, { NavItem } from "../../components/shared/SharedNavigation";
import { QRScanner } from "../../components/shared/QRScanner";

import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  supabase,
  getUserProfileByUUID,
  getVolunteerStatsRPC,
  searchSessionBookings
} from "../../lib/supabase";
import Toast from "../../components/shared/Toast";
import SettingsModal from "../../components/shared/SettingsModal";
import VolunteerProfileModal from "../../components/volunteer/VolunteerProfileModal";
import DashboardLoading from "../../components/DashboardLoading";

// --- Animation Variants (matching EmployerDashboard / tabsanimation.md) ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0 }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

interface Session {
  id: string;
  title: string;
  description: string | null;
  speaker_id: string;
  start_time: string;
  end_time: string;
  room_name: string | null;
  room_capacity: number | null;
  max_attendees: number | null;
  current_bookings: number | null;
  session_type: string;
  status: string;
  created_at: string;
}

interface ScannedAttendee {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  personal_id?: string;
}

interface SessionBooking {
  id: string;
  session_id: string;
  attendee_id: string;
  booking_status: string;
  checked_in: boolean;
  checked_in_at: string | null;
}



export const BuildTeamDashboard: React.FC = () => {
  useTheme();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showProfile, setShowProfile] = useState(false);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);

  // Navigation items (Building tab removed)
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'sessions', label: 'Sessions', icon: 'calendar_month' }
  ];

  // Scanner & Search State
  const [showScanner, setShowScanner] = useState(false);
  const [selectedSessionForScan, setSelectedSessionForScan] = useState<Session | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Session Check-in State
  const [sessionBooking, setSessionBooking] = useState<SessionBooking | null>(null);
  const [sessionAttendee, setSessionAttendee] = useState<ScannedAttendee | null>(null);
  const [showSessionCard, setShowSessionCard] = useState(false);
  const [isSessionProcessing, setIsSessionProcessing] = useState(false);

  // Session Details & Search
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showSessionSearch, setShowSessionSearch] = useState(false);
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const [sessionSearchResults, setSessionSearchResults] = useState<ScannedAttendee[]>([]);
  const [isSessionSearching, setIsSessionSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback State
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

  const [userStats, setUserStats] = useState<{
    score: number;
    rank: number;
    teamSize: number;
    loading: boolean;
    first_name: string;
  }>({
    score: 0,
    rank: 0,
    teamSize: 0,
    loading: true,
    first_name: profile?.full_name?.split(' ')[0] || 'Volunteer'
  });

  // User activities from database
  const [userActivities, setUserActivities] = useState<{
    id: string;
    activity_type: string;
    description: string;
    points_earned: number;
    activity_timestamp: string;
  }[]>([]);

  // --- Helpers ---

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  // Fetch volunteer stats on mount
  useEffect(() => {
    const fetchVolunteerStats = async () => {
      // Use profile.id directly if user is not available from useAuth immediately, though useAuth ensures user is loaded
      // We'll use a local ID variable to be safe
      const userId = profile?.id;

      if (!userId) return;

      console.log('📊 [DASHBOARD] Fetching stats for:', userId);
      setUserStats(prev => ({ ...prev, loading: true }));

      try {
        // Parallel fetch: Stats + Activities
        const [statsResult, activitiesResult] = await Promise.all([
          getVolunteerStatsRPC(userId),
          supabase
            .from('user_activities')
            .select('id, activity_type, description, points_earned, activity_timestamp')
            .eq('user_id', userId)
            .order('activity_timestamp', { ascending: false })
            .limit(3)
        ]);

        // Process Stats
        if (statsResult.error || !statsResult.data) {
          console.error('❌ [DASHBOARD] Failed to fetch stats:', statsResult.error);
        } else {
          setUserStats(prev => ({
            ...prev,
            score: statsResult.data.total_points,
            rank: statsResult.data.team_rank,
            teamSize: statsResult.data.team_size,
          }));
        }

        // Process Activities
        if (activitiesResult.error) {
          console.error('Error fetching activities:', activitiesResult.error);
        } else {
          setUserActivities(activitiesResult.data || []);
        }

      } catch (error) {
        console.error('💥 [DASHBOARD] Exception fetching data:', error);
      } finally {
        setUserStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchVolunteerStats();
  }, [profile?.id]);

  // Fetch sessions from backend - Uses index: idx_sessions_event_time_status
  const fetchSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, description, speaker_id, start_time, end_time, room_name, room_capacity, max_attendees, current_bookings, session_type, status, created_at')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }

      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Load sessions when tab changes to sessions
  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // --- Handlers ---

  // Handle Session Check-in
  const handleSessionCheckIn = async () => {
    if (!sessionBooking || !sessionAttendee) {
      showToast('Unable to process check-in', 'error');
      return;
    }

    setIsSessionProcessing(true);
    try {
      const { error } = await supabase
        .from('session_bookings')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString()
        })
        .eq('id', sessionBooking.id);

      if (error) {
        throw error;
      }

      showToast(`${sessionAttendee.full_name} checked in successfully!`, 'success');
      setShowSessionCard(false);
      setSessionBooking(null);
      setSessionAttendee(null);

      // Update local session list count
      setSessions(prev => prev.map(s => {
        if (s.id === sessionBooking.session_id) {
          return {
            ...s,
            current_bookings: (s.current_bookings || 0) + 1
          };
        }
        return s;
      }));
      fetchSessions(); // Refresh data for accuracy
    } catch (err) {
      console.error('Check-in error:', err);
      showToast('Failed to check in attendee', 'error');
    } finally {
      setIsSessionProcessing(false);
    }
  };

  // Handle Session QR Scan - Uses getUserProfileByUUID (optimized with PK lookup)
  const handleSessionQRScan = async (uuid: string) => {
    if (!selectedSessionForScan) return;

    try {
      // Use optimized function from supabase.ts
      const { data: attendeeData, error: attendeeError } = await getUserProfileByUUID(uuid);

      if (attendeeError || !attendeeData) {
        showToast(attendeeError?.message || 'Attendee not found', 'error');
        return;
      }

      // Check if user has attendee role
      if (attendeeData?.role !== 'attendee') {
        showToast('This user is not registered as an attendee', 'error');
        return;
      }

      // Check for booking - Uses composite index: session_bookings_session_id_attendee_id_key
      const { data: booking, error } = await supabase
        .from('session_bookings')
        .select('*')
        .eq('session_id', selectedSessionForScan.id)
        .eq('attendee_id', uuid)
        .eq('booking_status', 'confirmed')
        .single();

      if (error || !booking) {
        showToast('No confirmed booking found for this session', 'error');
        return;
      }

      if (booking.checked_in) {
        showToast('Attendee already checked in', 'error');
        return;
      }

      // Map to ScannedAttendee interface
      const scannedAttendee: ScannedAttendee = {
        id: attendeeData.id,
        full_name: attendeeData.full_name,
        phone: attendeeData.phone || 'N/A',
        email: attendeeData.email || 'N/A',
        personal_id: attendeeData.personal_id
      };

      setSessionAttendee(scannedAttendee);
      setSessionBooking(booking);
      setShowSessionCard(true);

    } catch (err) {
      console.error('Session scan error:', err);
      showToast('Error verifying booking', 'error');
    }
  };

  // Handle QR scan
  const handleQRScan = async (qrData: string) => {
    setShowScanner(false);

    let uuid = qrData.trim();

    if (qrData.includes('/')) {
      const parts = qrData.split('/');
      uuid = parts[parts.length - 1];
    } else if (qrData.startsWith('{')) {
      try {
        const parsed = JSON.parse(qrData);
        uuid = parsed.id || parsed.uuid || parsed.user_id || qrData;
      } catch {
        // Use raw data
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      showToast('Invalid QR code format. Expected UUID.', 'error');
      return;
    }

    await handleSessionQRScan(uuid);
  };

  // Handle Session Search - scoped to current session bookings
  const handleSessionSearch = async () => {
    if (!sessionSearchTerm.trim() || !selectedSessionForScan) {
      showToast('Please enter a Personal ID', 'error');
      return;
    }

    setIsSessionSearching(true);
    try {
      // Use optimized function from supabase.ts - Scoped to session bookings (2-step)
      const { data, error } = await searchSessionBookings(selectedSessionForScan.id, sessionSearchTerm.trim());

      if (error) {
        console.error('Error searching:', error);
        showToast('Search failed. Please try again.', 'error');
        return;
      }

      if (!data || data.length === 0) {
        showToast('No booking found for this ID in this session', 'error');
        setSessionSearchResults([]);
        return;
      }

      setSessionSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
      showToast('Search failed', 'error');
    } finally {
      setIsSessionSearching(false);
    }
  };

  // Handle Session Search Result Click
  const handleSessionSearchResultClick = async (attendee: ScannedAttendee) => {
    setSessionSearchResults([]);
    setSessionSearchTerm('');
    setShowSessionSearch(false);
    if (selectedSessionForScan) {
      // If we have booking info in attendee object (from searchSessionBookings), use it
      // But handleSessionQRScan expects UUID and fetches profile again.
      // We can bypass that if we already have the data, but for consistency let's just trigger the scan logic
      // which validates booking anyway.
      // However, handleSessionQRScan is designed for QR code which is just UUID.
      // We should check if handleSessionQRScan handles booking validation.
      // Checking handleSessionQRScan implementation... it calls getUserProfileByUUID then checks if user is attendee.
      // It DOES NOT seem to check if they are booked for the session currently.
      // We should probably invoke check-in logic directly if we know they are booked.
      // But let's reuse handleSessionQRScan for now as it sets up the Session Card.

      // WAIT: The searchSessionBookings returns result having booking_id.
      // We can set relevant state directly to avoid re-fetching if we want optimization.
      // Let's call handleSessionQRScan(attendee.id) for now to keep flow unified.
      await handleSessionQRScan(attendee.id);
    }
  };

  // --- Renderers ---

  // Loading State - Top Level
  if (userStats.loading && activeTab === 'home') {
    return <DashboardLoading message="Loading Building Dashboard" subMessage="Fetching your stats and recent activity..." />;
  }

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {

      'check_in': 'bg-red-100 dark:bg-red-500/10 text-red-600',
      'qr_scan': 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
      'session_booking': 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
      'session': 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
      'volunteer': 'bg-green-100 dark:bg-green-500/10 text-green-500',
      'profile_complete': 'bg-green-100 dark:bg-green-500/10 text-green-500',
      'booth_visit': 'bg-purple-100 dark:bg-purple-500/10 text-purple-500',
      'recruit_attendee': 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      'session_attendance': 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-500';
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      'check_in': CheckCircle,
      'qr_scan': QrCode,
      'session_booking': Calendar,
      'session': Calendar,
      'volunteer': User,
      'profile_complete': User,
      'recruit_attendee': User,
      'session_attendance': Clock,
    };
    const Icon = icons[type] || CheckCircle;
    return <Icon className="w-5 h-5" />;
  };

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
            style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
            }}
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
                volunteer_activism
              </span>
            </div>
            <div className="relative z-10">
              <p className="uppercase tracking-widest text-red-200 font-semibold text-xs mb-2">Building Dashboard</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome, {userStats.first_name}
              </h1>
              <p className="text-lg text-red-100 opacity-90 max-w-md mb-8">
                Your support makes this event possible. Thank you for your dedication!
              </p>
              <button
                onClick={() => setShowProfile(true)}
                className="bg-white text-red-600 hover:bg-red-50 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit shadow-lg active:scale-95"
              >
                <User className="w-5 h-5" />
                Show Profile
              </button>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mb-32 -mr-32 blur-3xl"></div>
          </motion.div>

          {/* Stats Cards - Mobile Only */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 lg:hidden">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-amber-500 text-lg">emoji_events</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Score</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{userStats.score}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 relative">
              <div className="absolute top-3 right-3 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[9px] font-bold">
                Top 5%
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">bar_chart</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Rank</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">#{userStats.rank}</p>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Recent Activity</h2>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="space-y-8 relative">
                <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"></div>
                {userActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No recent activity yet.</p>
                  </div>
                ) : (
                  userActivities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-6 items-start group">
                      <div className={`relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border-4 border-white dark:border-slate-900 ${getActivityColor(activity.activity_type)}`}>
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-grow pt-1">
                        <h4 className="font-semibold text-slate-800 dark:text-white">{activity.description}</h4>
                        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.activity_timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {activity.points_earned > 0 && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded ml-2">
                              +{activity.points_earned} pts
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Stats (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-amber-500">emoji_events</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Score</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{userStats.score}</p>
          </motion.div>

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
        </div>
      </div>
    </motion.div>
  );

  const renderSessionsTab = () => (
    <motion.div
      key="sessions"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
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



      {/* Grid View */}
      {
        isLoadingSessions ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
              <motion.div
                className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-700 mb-3 block">
              search_off
            </span>
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">No sessions scheduled for today</p>
            <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">Check back later for updated schedule</p>
          </div>
        ) : (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sessions.filter(session => {
              const query = searchQuery.toLowerCase();
              return (
                session.title.toLowerCase().includes(query) ||
                (session.room_name && session.room_name.toLowerCase().includes(query))
              );
            }).map(session => (
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
                    <h3 className="font-bold text-gray-900 dark:text-white text-xl leading-tight group-hover:text-red-600 transition-colors">{session.title}</h3>
                    <CheckCircle className="text-red-600/40 group-hover:text-red-600 transition-colors w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                      <span className="material-symbols-outlined text-xl">meeting_room</span>
                      <span className="text-sm font-medium">{session.room_name || 'TBA'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-50 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{session.current_bookings || 0} checked-in</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSessionForScan(session);
                      setShowScanner(true);
                    }}
                    className="bg-red-600 text-white p-2.5 rounded-xl shadow-lg shadow-red-600/30 hover:scale-105 transition-transform"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )
      }
    </motion.div >
  );

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="Build Team"
      onProfileClick={() => setShowProfile(true)}
    >
      {/* Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} className="h-full">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'sessions' && renderSessionsTab()}
        </motion.div>
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
        title={`Scan for ${selectedSessionForScan?.title || 'Session'}`}
        description="Position the QR code within the frame"
      />

      {/* Session Details Modal (cardanimation.md pattern) */}
      <AnimatePresence>
        {showSessionDetails && selectedSession && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            {/* Animated Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSessionDetails(false)}
            />

            {/* Animated Card */}
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

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300"
                >
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(selectedSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSession.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">meeting_room</span>
                    <span>{selectedSession.room_name || 'TBA'}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <User className="w-4 h-4" />
                    <span>{selectedSession.current_bookings || 0} / {selectedSession.max_attendees || '-'}</span>
                  </div>
                </motion.div>

                {selectedSession.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl"
                  >
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedSession.description}</p>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8"
                >
                  <button
                    onClick={() => {
                      setShowSessionDetails(false);
                      setSelectedSessionForScan(selectedSession);
                      setShowScanner(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-600/30"
                  >
                    <QrCode className="w-5 h-5" />
                    Scan QR Code
                  </button>
                  <button
                    onClick={() => {
                      setShowSessionSearch(true);
                      setSelectedSessionForScan(selectedSession);
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-blue-500/30"
                  >
                    <Search className="w-5 h-5" />
                    Search Attendee
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Search Modal (cardanimation.md pattern) */}
      <AnimatePresence>
        {showSessionSearch && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            {/* Animated Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowSessionSearch(false);
                setSessionSearchResults([]);
                setSessionSearchTerm('');
              }}
            />

            {/* Animated Card */}
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
                  Search Booked Attendee
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
                    setSessionSearchTerm('');
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-lg focus:ring-2 focus:ring-red-600 shadow-sm dark:text-white"
                  placeholder="Enter Personal ID"
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSessionSearch()}
                  autoFocus
                />
                {isSessionSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="rounded-full h-5 w-5 border-b-2 border-red-600"
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
                    onClick={() => handleSessionSearchResultClick(result)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-red-600" />
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

      {/* Session Attendee Card Modal (cardanimation.md pattern) */}
      <AnimatePresence>
        {showSessionCard && sessionAttendee && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            {/* Animated Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSessionCard(false)}
            />

            {/* Animated Card */}
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
                  Session Check-in
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
                    className="w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center"
                  >
                    <User className="w-8 h-8 text-red-600" />
                  </motion.div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">{sessionAttendee.full_name}</h4>
                    <p className="text-sm text-green-600 font-medium mt-1">Booking Confirmed</p>
                  </div>
                </div>

                <div className="space-y-4">
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
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
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
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.email}</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSessionCheckIn}
                disabled={isSessionProcessing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/30"
              >
                {isSessionProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="rounded-full h-5 w-5 border-b-2 border-white"
                  />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Check-in
                  </>
                )}
              </motion.button>
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

      {/* Volunteer Profile Modal */}
      <VolunteerProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile?.volunteer ? {
          user_id: profile.id,
          team_id: profile.volunteer.team_id,
          full_name: profile.volunteer.full_name,
          volunteer_id: profile.volunteer.volunteer_id,
          total_points: profile.volunteer.total_points,
          hours_volunteered: profile.volunteer.hours_volunteered
        } : null}
        loading={false}
      />
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
    </SharedNavigation>
  );
};