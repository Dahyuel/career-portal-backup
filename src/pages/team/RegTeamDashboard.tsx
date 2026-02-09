import React, { useState, useEffect } from "react";
import {
  Search,
  QrCode,
  CheckCircle,
  Camera,
  Calendar,
  Clock,
  User,
  X,
  AlertCircle,
  LogOut
} from "lucide-react";
import { AttendeeCard } from "../../components/shared/AttendeeCard";
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAttendeeByPersonalId,
  recordAttendeeAttendance,
  getTotalEntryCount,
  getRecentScansByVolunteer,
  getUserProfileByUUID,
  supabase
} from "../../lib/supabase";
import { mockActivities } from "../../mocks";

interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  personal_id: string;
  role: string;
  university?: string;
  faculty?: string;
  current_status?: 'inside' | 'outside';
  last_scan?: string;
  event_entry?: boolean;
  profile_complete?: boolean;
  authorized?: boolean;
  attendee_table_id?: string; // Debugging
}

const castToAttendee = (data: any): Attendee => {
  return {
    ...data,
    // Use passed current_status if available, otherwise derive from event_entry
    current_status: data.current_status || (data.event_entry ? 'inside' : 'outside'),
    event_entry: data.event_entry || false,
    profile_complete: data.profile_complete !== undefined ? data.profile_complete : true,
    authorized: data.authorized !== undefined ? data.authorized : true,
    attendee_table_id: data.attendee_table_id
  } as Attendee;
};

export const RegTeamDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'check-in', label: 'Check-In', icon: 'qr_code_scanner' }
  ];

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // Dynamic search state
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Attendee card state
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Validation state
  // const [validationError, setValidationError] = useState<string | null>(null);

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Mock stats for Home tab (reused from VolunteerDashboard)
  const userStats = {
    score: user?.score || 1250,
    rank: 12
  };

  // Total entry count state
  const [totalEntryCount, setTotalEntryCount] = useState<number>(0);

  // Recent Scans for Check-In tab (real data)
  const [recentScans, setRecentScans] = useState<{
    id: string;
    name: string;
    personalId: string;
    time: string;
    type: string;
  }[]>([]);

  // Dynamic search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        performDynamicSearch(searchTerm.trim());
      }, 300);

      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm]);

  // Fetch attendance data on mount and when user changes
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user?.id) return;

      // Fetch total entry count
      const { count } = await getTotalEntryCount();
      setTotalEntryCount(count);

      // Fetch recent scans by this volunteer
      const { data: scans } = await getRecentScansByVolunteer(user.id, 6);
      if (scans) {
        setRecentScans(scans.map((scan: any) => ({
          id: scan.id,
          name: scan.attendee?.name || 'Unknown',
          personalId: scan.attendee?.personalId || '',
          time: formatRelativeTime(scan.time),
          type: scan.type
        })));
      }
    };

    fetchAttendanceData();
  }, [user?.id]);

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const performDynamicSearch = async (query: string) => {
    try {
      setSearchLoading(true);
      // Search by personal ID directly in user_profiles like BuildTeamDashboard
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, personal_id')
        .ilike('personal_id', `%${query}%`)
        .limit(5);

      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else if (!data || data.length === 0) {
        setSearchResults([]);
        setShowSearchResults(false);
      } else {
        const attendees = data.map((d: { id: string; full_name: string | null; phone: string | null; email: string | null; personal_id: string | null }) => castToAttendee({
          id: d.id,
          full_name: d.full_name || 'Unknown',
          first_name: d.full_name?.split(' ')[0] || '',
          last_name: d.full_name?.split(' ').slice(1).join(' ') || '',
          phone: d.phone || 'N/A',
          email: d.email || 'N/A',
          personal_id: d.personal_id,

        }));
        setSearchResults(attendees);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Search exception:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const validateAttendee = (attendee: any): { isValid: boolean; error?: string } => {
    if (attendee.role !== 'attendee') {
      return { isValid: false, error: 'Only attendees can be processed through this system' };
    }
    const profileComplete = attendee.profile_complete === true;
    if (!profileComplete) {
      return { isValid: false, error: 'This attendee has not completed their profile and cannot enter the event' };
    }
    const isAuthorized = attendee.authorized === true;
    if (!isAuthorized) {
      return { isValid: false, error: 'This attendee is not authorized to enter the event' };
    }
    return { isValid: true };
  };

  const handleSearchByPersonalId = async () => {
    if (!searchTerm.trim()) {
      showFeedback('error', 'Please enter a Personal ID');
      return;
    }

    try {
      setSearchLoading(true);
      // setValidationError(null);

      const { data, error } = await getAttendeeByPersonalId(searchTerm.trim());

      if (error || !data) {
        showFeedback('error', 'Personal ID not found');
        return;
      }

      const validation = validateAttendee(data);
      if (!validation.isValid) {
        // setValidationError(validation.error || 'Validation failed');
        showFeedback('error', validation.error || 'Validation failed');
        return;
      }

      setSelectedAttendee(castToAttendee(data));
      setShowAttendeeCard(true);
      setSearchTerm("");
      setShowSearchResults(false);

    } catch (error) {
      console.error("Search exception:", error);
      showFeedback('error', 'Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = async (attendee: Attendee) => {
    try {
      setSearchLoading(true);
      // Fetch full profile with status and extra details
      const { data, error } = await getUserProfileByUUID(attendee.id);

      if (error || !data) {
        showFeedback('error', 'Failed to load attendee details');
        return;
      }

      // @ts-ignore
      const lastAttendance = data.last_attendance;
      const currentStatus: 'inside' | 'outside' = lastAttendance && lastAttendance.type === 'entry' ? 'inside' : 'outside';

      const fullAttendee = castToAttendee({
        id: data.id,
        full_name: data.full_name || 'Unknown',
        first_name: data.full_name?.split(' ')[0] || '',
        last_name: data.full_name?.split(' ').slice(1).join(' ') || '',
        phone: data.phone || 'N/A',
        email: data.email || 'N/A',
        personal_id: data.personal_id,
        university: (data as any).university,
        faculty: (data as any).faculty,
        current_status: currentStatus,
        attendee_table_id: (data as any).attendee_table_id, // Map debug ID
        role: 'attendee',
        profile_complete: true,
        authorized: true
      });

      const validation = validateAttendee(fullAttendee);
      if (!validation.isValid) {
        showFeedback('error', validation.error || 'Validation failed');
        return;
      }

      setSelectedAttendee(fullAttendee);
      setShowAttendeeCard(true);
      setSearchTerm("");
      setShowSearchResults(false);
      setSearchResults([]);
    } catch (error) {
      console.error("Error selecting attendee:", error);
      showFeedback('error', 'Failed to select attendee');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    setShowScanner(false);

    // Extract UUID from QR data (handles URLs, JSON, raw UUIDs - same as BuildTeamDashboard)
    let uuid = qrData.trim();

    // If QR data is a URL, extract last path segment as UUID
    if (qrData.includes('/')) {
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

    try {
      // Fetch attendee profile and last attendance record
      const { data, error } = await getUserProfileByUUID(uuid);

      if (error || !data) {
        showFeedback('error', 'This user doesn\'t have an account');
        return;
      }

      // Determine status from last_attendance
      // @ts-ignore - data has last_attendance from our updated query
      const lastAttendance = data.last_attendance;
      const currentStatus: 'inside' | 'outside' = lastAttendance && lastAttendance.type === 'entry' ? 'inside' : 'outside';

      // Cast to Attendee format - set defaults for validation fields
      const attendeeData = castToAttendee({
        id: data.id,
        full_name: data.full_name || 'Unknown',
        first_name: data.full_name?.split(' ')[0] || '',
        last_name: data.full_name?.split(' ').slice(1).join(' ') || '',
        phone: data.phone || 'N/A',
        email: data.email || 'N/A',
        personal_id: data.personal_id,
        university: (data as any).university,
        faculty: (data as any).faculty,
        current_status: currentStatus,
        // Set defaults so validation passes
        role: 'attendee',
        profile_complete: true,
        authorized: true
      });

      setSelectedAttendee(attendeeData);
      setShowAttendeeCard(true);

    } catch (error) {
      console.error("QR scan error:", error);
      showFeedback('error', 'Failed to process QR code');
    }
  };

  const handleScannerClose = () => {
    setShowScanner(false);
  };

  const handleAttendanceAction = async (action: 'enter' | 'exit') => {
    if (!selectedAttendee || !user?.id) {
      showFeedback('error', 'Unable to process. Please try again.');
      return;
    }

    try {
      setActionLoading(true);

      // Record attendance using the new function (matching BuildTeamDashboard pattern)
      const type = action === 'enter' ? 'entry' : 'exit';
      const { data, error } = await recordAttendeeAttendance({
        attendeeId: selectedAttendee.id,
        checkedInBy: user.id,
        type: type
      });

      if (error) {
        showFeedback('error', error.message || `Failed to process ${action}`);
        return;
      }

      showFeedback('success', `${action === 'enter' ? 'Check-in' : 'Check-out'} successful!`);

      const newStatus = action === 'enter' ? 'inside' : 'outside';
      const newEventEntry = action === 'enter';

      setSelectedAttendee(prev => prev ? {
        ...prev,
        current_status: newStatus,
        event_entry: newEventEntry,
        last_scan: new Date().toISOString()
      } : null);

      // Update recent scans with proper type structure
      setRecentScans(prev => [
        {
          id: data?.id || crypto.randomUUID(),
          name: `${selectedAttendee.first_name} ${selectedAttendee.last_name}`,
          personalId: selectedAttendee.personal_id,
          time: 'Just now',
          type: type
        },
        ...prev.slice(0, 5)
      ]);

      // Update total entry count if this was an entry
      if (action === 'enter') {
        setTotalEntryCount(prev => prev + 1);
      }

      setTimeout(() => {
        setShowAttendeeCard(false);
        setSelectedAttendee(null);
      }, 2000);

    } catch (error) {
      console.error("Attendance action error:", error);
      showFeedback('error', `Failed to process ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchInputBlur = () => {
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
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
                Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Volunteer'}
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
                {['check_in', 'qr_scan', 'session_booking'].map((type, index) => {
                  const activity = mockActivities[index];
                  return activity ? (
                    <div key={activity.id} className="relative flex gap-6 items-start group">
                      <div className="relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-orange-100 border-4 border-white">
                        <span className="material-symbols-outlined text-primary text-xl">
                          {type === 'check_in' ? 'check_circle' : type === 'qr_scan' ? 'qr_code_scanner' : 'event_available'}
                        </span>
                      </div>
                      <div className="flex-grow pt-1">
                        <h4 className="font-semibold text-slate-800">{activity.description}</h4>
                        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {new Date(activity.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ) : null;
                })}
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

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Upcoming For You</h3>
              <span className="material-symbols-outlined text-slate-400 text-lg">calendar_month</span>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-colors cursor-pointer group">
                <p className="text-xs font-bold text-primary mb-1 uppercase">1:00 PM Today</p>
                <p className="font-semibold text-sm text-slate-800 group-hover:text-primary transition-colors">Tech Interview Prep</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">location_on</span> Room 302
                </p>
              </div>
            </div>
            <button className="w-full mt-4 text-sm font-semibold text-primary hover:bg-orange-50 py-2 rounded-lg transition-colors">
              View Full Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCheckInTab = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendee Check-In</h2>
          <div className="hidden md:block h-6 w-px bg-gray-200 dark:border-zinc-800"></div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            <span>Spring Career Fair 2024</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            {searchLoading ? (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            )}
            <input
              className="w-80 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
              placeholder="Search by name or email"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
              onBlur={handleSearchInputBlur}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            />
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchResults.map((attendee) => (
                  <button
                    key={attendee.id}
                    onClick={() => handleSelectSearchResult(attendee)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{attendee.first_name} {attendee.last_name}</div>
                    <div className="text-xs text-gray-500">{attendee.personal_id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div
          onClick={() => setShowScanner(true)}
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
            placeholder="Search by name or email"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">Total Scanned In</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-slate-900 dark:text-white">{totalEntryCount.toLocaleString()}</span>
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
          {recentScans.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400">
              No recent scans. Start scanning to see activity here.
            </div>
          ) : (
            recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center gap-5 p-5 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${scan.type === 'entry' ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-orange-100 dark:bg-orange-500/10'}`}>
                  {scan.type === 'entry' ? (
                    <CheckCircle className="text-emerald-500 w-8 h-8" />
                  ) : (
                    <X className="text-orange-500 w-8 h-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{scan.name}</h4>
                  <p className="text-sm text-slate-500 dark:text-gray-400">ID: #{scan.personalId}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[12px] text-slate-400 font-medium">{scan.time}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scan.type === 'entry' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                      {scan.type === 'entry' ? 'IN' : 'OUT'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div >
  );

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="ASU Career Week"
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
      {activeTab === 'check-in' && renderCheckInTab()}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={handleScannerClose}
        onScan={handleQRScan}
        title="Scan Attendee QR Code"
        description="Point your camera at the attendee's QR code"
      />

      {/* Attendee Card Modal */}
      {showAttendeeCard && selectedAttendee && (
        <AttendeeCard
          attendee={selectedAttendee}
          onClose={() => {
            setShowAttendeeCard(false);
            setSelectedAttendee(null);
          }}
        >
          {/* Action Buttons */}

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => handleAttendanceAction('enter')}
              disabled={actionLoading || selectedAttendee.current_status === 'inside'}
              className={`flex items-center justify-center py-3 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${selectedAttendee.current_status === 'inside'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20'
                }`}
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Check In
                </>
              )}
            </button>

            <button
              onClick={() => handleAttendanceAction('exit')}
              disabled={actionLoading || selectedAttendee.current_status !== 'inside'}
              className={`flex items-center justify-center py-3 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${selectedAttendee.current_status !== 'inside'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
                }`}
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  Check Out
                </>
              )}
            </button>
          </div>
        </AttendeeCard>
      )}

    </SharedNavigation>
  );
};