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
  AlertCircle,
  Phone,
  Mail,
} from "lucide-react";
import SharedNavigation, { NavItem } from "../../components/shared/SharedNavigation";
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabase";
import SettingsModal from "../../components/shared/SettingsModal";



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

const mockActivities = [
  {
    id: '1',
    description: 'Checked in at Main Building',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'check_in'
  },
  {
    id: '2',
    description: 'Scanned attendee QR code',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'qr_scan'
  },
  {
    id: '3',
    description: 'Registered attendee for workshop',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    type: 'session_booking'
  }
];

export const BuildTeamDashboard: React.FC = () => {
  useAuth();
  useTheme();
  const [activeTab, setActiveTab] = useState('home');

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

  // Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const userStats = {
    score: 1250,
    rank: 12,
    first_name: 'Volunteer'
  };

  // --- Helpers ---

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Fetch sessions from backend
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

  // Fetch attendee by UUID
  const fetchAttendeeByUUID = async (uuid: string): Promise<ScannedAttendee | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, personal_id')
        .eq('id', uuid)
        .single();

      if (error) {
        console.error('Error fetching attendee:', error);
        return null;
      }

      return {
        id: data.id,
        full_name: data.full_name || 'Unknown',
        phone: data.phone || 'N/A',
        email: data.email || 'N/A',
        personal_id: data.personal_id
      };
    } catch (err) {
      console.error('Error fetching attendee:', err);
      return null;
    }
  };

  // Handle Session Check-in
  const handleSessionCheckIn = async () => {
    if (!sessionBooking || !sessionAttendee) {
      showFeedback('error', 'Unable to process check-in');
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

      showFeedback('success', `${sessionAttendee.full_name} checked in successfully!`);
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
      showFeedback('error', 'Failed to check in attendee');
    } finally {
      setIsSessionProcessing(false);
    }
  };

  // Handle Session QR Scan
  const handleSessionQRScan = async (uuid: string) => {
    if (!selectedSessionForScan) return;

    try {
      const attendee = await fetchAttendeeByUUID(uuid);
      if (!attendee) {
        showFeedback('error', 'Attendee not found');
        return;
      }

      const { data: booking, error } = await supabase
        .from('session_bookings')
        .select('*')
        .eq('session_id', selectedSessionForScan.id)
        .eq('attendee_id', uuid)
        .eq('booking_status', 'confirmed')
        .single();

      if (error || !booking) {
        showFeedback('error', 'No confirmed booking found for this session');
        return;
      }

      if (booking.checked_in) {
        showFeedback('error', 'Attendee already checked in');
        return;
      }

      setSessionAttendee(attendee);
      setSessionBooking(booking);
      setShowSessionCard(true);

    } catch (err) {
      console.error('Session scan error:', err);
      showFeedback('error', 'Error verifying booking');
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
      showFeedback('error', 'Invalid QR code format. Expected UUID.');
      return;
    }

    await handleSessionQRScan(uuid);
  };

  // Handle Session Search by Personal ID
  const handleSessionSearch = async () => {
    if (!sessionSearchTerm.trim()) {
      showFeedback('error', 'Please enter a Personal ID');
      return;
    }

    setIsSessionSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, personal_id')
        .ilike('personal_id', `%${sessionSearchTerm.trim()}%`)
        .limit(5);

      if (error) {
        console.error('Error searching:', error);
        showFeedback('error', 'Search failed. Please try again.');
        return;
      }

      if (!data || data.length === 0) {
        showFeedback('error', 'No attendee found');
        setSessionSearchResults([]);
        return;
      }

      const results: ScannedAttendee[] = data.map(d => ({
        id: d.id,
        full_name: d.full_name || 'Unknown',
        phone: d.phone || 'N/A',
        email: d.email || 'N/A',
        personal_id: d.personal_id
      }));

      setSessionSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      showFeedback('error', 'Search failed');
    } finally {
      setIsSessionSearching(false);
    }
  };

  // Handle Session Search Result Click
  const handleSessionSearchResultClick = async (attendee: ScannedAttendee) => {
    setSessionSearchResults([]);
    setSessionSearchTerm('');
    setShowSessionSearch(false);
    if (selectedSession) {
      setSelectedSessionForScan(selectedSession);
      await handleSessionQRScan(attendee.id);
    }
  };

  // --- Renderers ---

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      'check_in': 'bg-red-100 dark:bg-red-500/10 text-red-600',
      'qr_scan': 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
      'session_booking': 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
      'session': 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
      'volunteer': 'bg-green-100 dark:bg-green-500/10 text-green-500',
      'profile_complete': 'bg-green-100 dark:bg-green-500/10 text-green-500',
      'booth_visit': 'bg-purple-100 dark:bg-purple-500/10 text-purple-500'
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
              <p className="uppercase tracking-widest text-red-200 font-semibold text-xs mb-2">Volunteer Dashboard</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome, {userStats.first_name}
              </h1>
              <p className="text-lg text-red-100 opacity-90 max-w-md mb-8">
                Your support makes this event possible. Thank you for your dedication!
              </p>
              <button className="bg-white text-red-600 hover:bg-red-50 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit shadow-lg active:scale-95">
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
              <button className="text-red-600 font-semibold hover:underline flex items-center gap-1">
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="space-y-8 relative">
                <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"></div>
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="relative flex gap-6 items-start group">
                    <div className={`relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border-4 border-white dark:border-slate-900 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-grow pt-1">
                      <h4 className="font-semibold text-slate-800 dark:text-white">{activity.description}</h4>
                      <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(activity.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
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
            <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
              Top 5%
            </div>
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
      <motion.header
        variants={itemVariants}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between rounded-2xl"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Management</h1>
        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg w-5 h-5" />
            <input className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-red-600/50 transition-all dark:text-white" placeholder="Search sessions..." type="text" />
          </div>
        </div>
      </motion.header>

      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Current Schedule</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Managing active and upcoming sessions for the career fair</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              {sessions.filter(s => {
                const now = new Date();
                return new Date(s.start_time) <= now && new Date(s.end_time) >= now;
              }).length} LIVE NOW
            </span>
          </div>
        </div>
      </motion.div>

      {/* Grid View */}
      {isLoadingSessions ? (
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
          {sessions.map(session => (
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
      )}
    </motion.div>
  );

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="Build Team"
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
            className={`fixed top-4 right-4 z-[9999] flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${feedback.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
              }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="font-medium">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="ml-2 hover:bg-black hover:bg-opacity-20 rounded p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
    </SharedNavigation>
  );
};