import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Building2,
  User,
  Search,
  QrCode,
  Camera,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
  Phone,
  Mail,
  LogIn,
  LogOut
} from "lucide-react";
import SharedNavigation, { NavItem } from "../../components/shared/SharedNavigation";
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

// Constants
const DEFAULT_EVENT_ID = 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5';

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

interface RecentScan {
  id: string;
  name: string;
  type: string;
  time: string;
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Fixed: Using string icon names instead of React components
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'building', label: 'Building', icon: 'apartment' },
    { key: 'sessions', label: 'Sessions', icon: 'calendar_month' }
  ];

  // Scanner & Search State
  const [showScanner, setShowScanner] = useState(false);
  const [scannerContext, setScannerContext] = useState<'building' | 'session'>('building');
  const [selectedSessionForScan, setSelectedSessionForScan] = useState<Session | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ScannedAttendee[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Scanned Attendee State
  const [scannedAttendee, setScannedAttendee] = useState<ScannedAttendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats State
  const [todayCount, setTodayCount] = useState(0);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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

  // Get today's start timestamp
  const getTodayStart = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  };

  // Fetch today's scan count
  const fetchTodayCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('attendee_attendance')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', getTodayStart())
        .like('type', 'building_%');

      if (error) {
        console.error('Error fetching today count:', error);
        return;
      }

      setTodayCount(count || 0);
    } catch (err) {
      console.error('Error fetching today count:', err);
    }
  }, []);

  // Fetch recent scans (last 3)
  const fetchRecentScans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attendee_attendance')
        .select('id, attendee_id, type, created_at')
        .like('type', 'building_%')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching recent scans:', error);
        return;
      }

      if (!data || data.length === 0) {
        setRecentScans([]);
        return;
      }

      // Fetch names for each attendee
      const attendeeIds = data.map(scan => scan.attendee_id);
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', attendeeIds);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
      }

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const formattedScans: RecentScan[] = data.map(scan => ({
        id: scan.id,
        name: profileMap.get(scan.attendee_id) || 'Unknown',
        type: scan.type === 'building_entry' ? 'Entry' : 'Exit',
        time: formatRelativeTime(new Date(scan.created_at))
      }));

      setRecentScans(formattedScans);
    } catch (err) {
      console.error('Error fetching recent scans:', err);
    }
  }, []);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
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

  // Load stats on mount and when tab changes to building
  useEffect(() => {
    if (activeTab === 'building') {
      setIsLoadingStats(true);
      Promise.all([fetchTodayCount(), fetchRecentScans()])
        .finally(() => setIsLoadingStats(false));
    }
  }, [activeTab, fetchTodayCount, fetchRecentScans]);

  // Load sessions when tab changes to sessions
  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);


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

  // Search by personal ID
  const handleSearchByPersonalId = async () => {
    if (!searchTerm.trim()) {
      showFeedback('error', 'Please enter a Personal ID');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, personal_id')
        .ilike('personal_id', `%${searchTerm.trim()}%`)
        .limit(5);

      if (error) {
        console.error('Error searching:', error);
        showFeedback('error', 'Search failed. Please try again.');
        return;
      }

      if (!data || data.length === 0) {
        showFeedback('error', 'No attendee found with this Personal ID');
        setSearchResults([]);
        return;
      }

      const results: ScannedAttendee[] = data.map(d => ({
        id: d.id,
        full_name: d.full_name || 'Unknown',
        phone: d.phone || 'N/A',
        email: d.email || 'N/A',
        personal_id: d.personal_id
      }));

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      showFeedback('error', 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (attendee: ScannedAttendee) => {
    setScannedAttendee(attendee);
    setShowAttendeeCard(true);
    setSearchResults([]);
    setSearchTerm('');
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
            current_bookings: (s.current_bookings || 0) + 1 // Assuming current_bookings is check-in count, or just trigger refresh
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
      // 1. Fetch attendee info first
      const attendee = await fetchAttendeeByUUID(uuid);
      if (!attendee) {
        showFeedback('error', 'Attendee not found');
        return;
      }

      // 2. Check for confirmed booking
      const { data: booking, error } = await supabase
        .from('session_bookings')
        .select('*')
        .eq('session_id', selectedSessionForScan.id)
        .eq('attendee_id', uuid)
        .eq('booking_status', 'confirmed') // Ensure 'confirmed' matches your DB enum/text
        .single();

      if (error || !booking) {
        showFeedback('error', 'No confirmed booking found for this session');
        return;
      }

      if (booking.checked_in) {
        showFeedback('error', 'Attendee already checked in');
        return;
      }

      // 3. Show confirmation card
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

    // Extract UUID from QR data (assume QR contains raw UUID or parse it)
    let uuid = qrData.trim();

    // If QR data is a URL or JSON, try to extract UUID
    if (qrData.includes('/')) {
      // Extract last path segment as UUID
      const parts = qrData.split('/');
      uuid = parts[parts.length - 1];
    } else if (qrData.startsWith('{')) {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(qrData);
        uuid = parsed.id || parsed.uuid || parsed.user_id || qrData;
      } catch {
        // Use raw data
      }
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      showFeedback('error', 'Invalid QR code format. Expected UUID.');
      return;
    }

    if (scannerContext === 'session') {
      await handleSessionQRScan(uuid);
    } else {
      // Fetch attendee info
      const attendee = await fetchAttendeeByUUID(uuid);
      if (!attendee) {
        showFeedback('error', 'Attendee not found');
        return;
      }

      setScannedAttendee(attendee);
      setShowAttendeeCard(true);
    }
  };

  // Handle entry/exit
  const handleAttendanceAction = async (type: 'building_entry' | 'building_exit') => {
    if (!scannedAttendee || !user) {
      showFeedback('error', 'Unable to process. Please try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('attendee_attendance')
        .insert({
          attendee_id: scannedAttendee.id,
          event_id: DEFAULT_EVENT_ID,
          checked_in_by: user.id,
          type: type,
          check_in_time: type === 'building_entry' ? new Date().toISOString() : null,
          check_out_time: type === 'building_exit' ? new Date().toISOString() : null
        });

      if (error) {
        console.error('Error recording attendance:', error);
        showFeedback('error', 'Failed to record attendance. Please try again.');
        return;
      }

      const actionLabel = type === 'building_entry' ? 'Entry' : 'Exit';
      showFeedback('success', `${scannedAttendee.full_name} - ${actionLabel} recorded successfully!`);

      // Close card and refresh stats
      setShowAttendeeCard(false);
      setScannedAttendee(null);
      fetchTodayCount();
      fetchRecentScans();
    } catch (err) {
      console.error('Error recording attendance:', err);
      showFeedback('error', 'Failed to record attendance. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
    // Use the existing logic to verify booking and show check-in card
    // We need to set the context correctly if it's not already
    if (selectedSession) {
      setSelectedSessionForScan(selectedSession);
      await handleSessionQRScan(attendee.id);
    }
  };

  // Close attendee card
  const closeAttendeeCard = () => {
    setShowAttendeeCard(false);
    setScannedAttendee(null);
  };

  // --- Renderers ---

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      'check_in': 'bg-orange-100 dark:bg-orange-500/10 text-primary',
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
      'booth_visit': Building2
    };
    const Icon = icons[type] || CheckCircle;
    return <Icon className="w-5 h-5" />;
  };

  const renderHomeTab = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12">
      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          {/* Welcome Banner */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-primary/10 p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white" style={{
            background: 'linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)'
          }}>
            <div className="relative z-10">
              <p className="uppercase tracking-widest text-orange-100 font-semibold text-xs mb-2">Volunteer Dashboard</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome, {userStats.first_name}
              </h1>
              <p className="text-lg text-orange-50 opacity-90 max-w-md mb-8">
                Your support makes this event possible. Thank you for your dedication!
              </p>
              <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit">
                <User className="w-5 h-5" />
                Show Profile
              </button>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/20 rounded-full -mb-32 -mr-32 blur-3xl"></div>
          </div>

          {/* Stats Cards - Mobile Only */}
          <div className="grid grid-cols-2 gap-4 lg:hidden">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-amber-500 text-lg">emoji_events</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Score</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{userStats.score}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative">
              <div className="absolute top-3 right-3 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold">
                Top 5%
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-blue-600 text-lg">bar_chart</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Rank</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">#{userStats.rank}</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Recent Activity</h2>
              <button className="text-primary font-semibold hover:underline flex items-center gap-1">
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="space-y-8 relative">
                <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"></div>
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="relative flex gap-6 items-start group">
                    <div className={`relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border-4 border-white ${getActivityColor(activity.type)}`}>
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
          </div>
        </div>

        {/* Right Column - Stats (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative group overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-amber-500">emoji_events</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Score</p>
            <p className="text-4xl font-bold text-slate-800 mt-1">{userStats.score}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative group overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
              Top 5%
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-blue-600">bar_chart</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Rank</p>
            <p className="text-4xl font-bold text-slate-800 mt-1">#{userStats.rank}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBuildingTab = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Building Operations</h2>
          <div className="hidden md:block h-6 w-px bg-gray-200 dark:border-zinc-800"></div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            <span>Spring Career Fair 2024</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              className="w-80 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
              placeholder="Search by Personal ID"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
            />
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 overflow-hidden">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{result.full_name}</p>
                      <p className="text-sm text-slate-500">{result.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {isSearching && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div
          onClick={() => {
            setScannerContext('building');
            setShowScanner(true);
          }}
          className="lg:col-span-2 relative overflow-hidden rounded-[32px] shadow-xl shadow-primary/20 flex flex-col md:flex-row items-center gap-8 group cursor-pointer hover:scale-[1.01] transition-transform p-10"
          style={{
            background: 'linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)'
          }}
        >
          <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 shrink-0">
            <QrCode className="text-white w-16 h-16 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-white text-center md:text-left">
            <h3 className="text-3xl font-black mb-2 uppercase tracking-tight">Scan Attendee QR Code</h3>
            <p className="text-white/90 text-lg max-w-md">Position the attendee's ticket code within the camera frame for instant verification and check-in.</p>
            <button className="mt-6 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-3.5 rounded-full font-bold transition-all flex items-center gap-2 w-fit mx-auto md:mx-0 shadow-lg">
              <Camera className="w-5 h-5" />
              Start Scanner
            </button>
          </div>
        </div>

        {/* Mobile Search - Visible only on mobile, placed after scan card */}
        <div className="md:hidden relative mb-6 col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            className="w-full bg-white dark:bg-card-dark border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
            placeholder="Search by Personal ID"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
          />
          {/* Mobile Search Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{result.full_name}</p>
                    <p className="text-sm text-slate-500">{result.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-card-dark rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col">
          <div>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Current Status</h3>
              <div className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                LIVE
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">Total Scanned Today</p>
            <div className="flex items-baseline gap-3">
              {isLoadingStats ? (
                <div className="animate-pulse bg-slate-200 h-16 w-24 rounded"></div>
              ) : (
                <span className="text-6xl font-black text-slate-900 dark:text-white">{todayCount.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-card-dark rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-zinc-800 mt-8 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Scans</h3>
            <span className="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-bold">Today</span>
          </div>
          <button className="text-primary font-bold text-sm hover:underline">View All History</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingStats ? (
            Array(3).fill(0).map((_, idx) => (
              <div key={idx} className="animate-pulse bg-slate-100 dark:bg-zinc-800 rounded-2xl h-24"></div>
            ))
          ) : recentScans.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-slate-500">
              No scans recorded today
            </div>
          ) : (
            recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center gap-5 p-5 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${scan.type === 'Entry'
                  ? 'bg-emerald-100 dark:bg-emerald-500/10'
                  : 'bg-red-100 dark:bg-red-500/10'
                  }`}>
                  {scan.type === 'Entry' ? (
                    <LogIn className={`w-8 h-8 text-emerald-500`} />
                  ) : (
                    <LogOut className={`w-8 h-8 text-red-500`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{scan.name}</h4>
                  <p className={`text-sm font-medium ${scan.type === 'Entry' ? 'text-emerald-600' : 'text-red-600'
                    }`}>{scan.type}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[12px] text-slate-400 font-medium">{scan.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderSessionsTab = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-zinc-800 px-8 py-4 flex items-center justify-between mb-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Management</h1>
        <div className="flex items-center gap-4">
          <div className="relative w-72 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg w-5 h-5" />
            <input className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all dark:text-white" placeholder="Search sessions..." type="text" />
          </div>
        </div>
      </header>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Current Schedule</h2>
            <p className="text-sm text-gray-500">Managing active and upcoming sessions for the career fair</p>
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
      </div>

      {/* Grid View */}
      {isLoadingSessions ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, idx) => (
            <div key={idx} className="animate-pulse bg-white dark:bg-zinc-900 rounded-2xl h-64 border border-gray-100 dark:border-zinc-800"></div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No sessions scheduled for today
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => {
                setSelectedSession(session);
                setShowSessionDetails(true);
              }}
              className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all flex flex-col justify-between h-full group bg-white cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 dark:text-white text-xl leading-tight group-hover:text-primary transition-colors">{session.title}</h3>
                  <CheckCircle className="text-primary/40 group-hover:text-primary transition-colors w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <Building2 className="w-5 h-5" />
                    <span className="text-sm font-medium">{session.room_name || 'TBA'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-50 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{session.current_bookings || 0} checked-in</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScannerContext('session');
                    setSelectedSessionForScan(session);
                    setShowScanner(true);
                  }}
                  className="bg-red-500 text-white p-2.5 rounded-xl shadow-lg shadow-red-500/30 hover:scale-105 transition-transform"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="Build Team"
    >
      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${feedback.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
          }`}>
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
        </div>
      )}

      {activeTab === 'home' && renderHomeTab()}
      {activeTab === 'building' && renderBuildingTab()}
      {activeTab === 'sessions' && renderSessionsTab()}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
        title={scannerContext === 'session' ? `Scan for ${selectedSessionForScan?.title || 'Session'}` : "Scan Attendee QR Code"}
        description="Position the QR code within the frame"
      />

      {/* Attendee Card Modal */}
      {showAttendeeCard && scannedAttendee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Attendee Details</h3>
              <button
                onClick={closeAttendeeCard}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Attendee Info */}
            <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">{scannedAttendee.full_name}</h4>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{scannedAttendee.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{scannedAttendee.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleAttendanceAction('building_entry')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/30"
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Enter
                  </>
                )}
              </button>

              <button
                onClick={() => handleAttendanceAction('building_exit')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/30"
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogOut className="w-5 h-5" />
                    Exit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Session Details Modal */}
      {showSessionDetails && selectedSession && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSession.title}</h3>
              <button
                onClick={() => setShowSessionDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(selectedSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSession.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                  <Building2 className="w-4 h-4" />
                  <span>{selectedSession.room_name || 'TBA'}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                  <User className="w-4 h-4" />
                  <span>{selectedSession.current_bookings || 0} / {selectedSession.max_attendees || '-'}</span>
                </div>
              </div>

              {selectedSession.description && (
                <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedSession.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                <button
                  onClick={() => {
                    setShowSessionDetails(false);
                    setScannerContext('session');
                    setSelectedSessionForScan(selectedSession);
                    setShowScanner(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/30"
                >
                  <QrCode className="w-5 h-5" />
                  Scan QR Code
                </button>
                <button
                  onClick={() => {
                    // Keep details open or close? User didn't specify, but usually search is on top or separate.
                    // Let's close details to focus on search, or open search on top.
                    // Setting showSessionSearch(true) will open another modal on top if z-index is handled, 
                    // or we can close generic details. Let's keep details open and show search on top.
                    setShowSessionSearch(true);
                    setSelectedSessionForScan(selectedSession); // Ensure context is set
                  }}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-blue-500/30"
                >
                  <Search className="w-5 h-5" />
                  Search Attendee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Search Modal */}
      {showSessionSearch && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Search Attendee</h3>
              <button
                onClick={() => {
                  setShowSessionSearch(false);
                  setSessionSearchResults([]);
                  setSessionSearchTerm('');
                }}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl py-4 pl-12 pr-4 text-lg focus:ring-2 focus:ring-primary shadow-sm"
                placeholder="Enter Personal ID"
                value={sessionSearchTerm}
                onChange={(e) => setSessionSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSessionSearch()}
                autoFocus
              />
              {isSessionSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sessionSearchResults.map(result => (
                <button
                  key={result.id}
                  onClick={() => handleSessionSearchResultClick(result)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{result.full_name}</p>
                    <p className="text-sm text-gray-500">{result.personal_id || result.email}</p>
                  </div>
                </button>
              ))}
              {sessionSearchResults.length === 0 && sessionSearchTerm && !isSessionSearching && (
                <p className="text-center text-gray-500 py-4">No results found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Attendee Card Modal */}
      {showSessionCard && sessionAttendee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Session Check-in</h3>
              <button
                onClick={() => setShowSessionCard(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Attendee Info */}
            <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">{sessionAttendee.full_name}</h4>
                  <p className="text-sm text-green-600 font-medium mt-1">Booking Confirmed</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{sessionAttendee.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSessionCheckIn}
              disabled={isSessionProcessing}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white py-4 px-6 rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/30"
            >
              {isSessionProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm Check-in
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </SharedNavigation>
  );
};