import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search,
  QrCode,
  Camera,
  User
} from '../../components/icons';

import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  recordAttendeeAttendance,
  searchAttendeesByPersonalId,
  getAttendeeByPersonalIdOptimized,
  getUserProfileByUUID,
  getVolunteerStatsRPC,
  getBuildingNotificationsRPC,
  getBuildingActivitiesRPC,
  getMyScanCountRPC
} from "../../lib/supabase";
import Toast from "../../components/shared/Toast";
import VolunteerProfileModal from '../../components/volunteer/VolunteerProfileModal';
import DashboardLoading from "../../components/DashboardLoading";
import ViewAllActivitiesModal from "../../components/attendee/ViewAllActivitiesModal";
import { RegTeamAttendeeCard } from "../../components/team/RegTeamAttendeeCard";
import NotificationModal from "../../components/NotificationModal";
import { logger } from '../../utils/logger';
import { sanitizeSearchQuery } from '../../utils/sanitize';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================
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

// ============================================================================
// TYPES
// ============================================================================
interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
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
  attendee_table_id?: string;
  registration_status?: string; // 'approved' | 'pending' | 'rejected' | etc.
}

const castToAttendee = (data: any): Attendee => {
  return {
    ...data,
    current_status: data.current_status || (data.event_entry ? 'inside' : 'outside'),
    event_entry: data.event_entry || false,
    profile_complete: data.profile_complete !== undefined ? data.profile_complete : true,
    authorized: data.authorized !== undefined ? data.authorized : data.registration_status === 'approved',
    registration_status: data.registration_status || 'pending',
    attendee_table_id: data.attendee_table_id
  } as Attendee;
};

// ============================================================================
// HELPER: DEBOUNCE
// ============================================================================
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };

  return debounced;
};


// ============================================================================
// COMPONENT
// ============================================================================
export const RegTeamDashboard: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for background refreshes

  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'check-in', label: 'Check-In', icon: 'qr_code_scanner' }
  ];

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

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

  // Dynamic search state
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);

  // Attendee card state
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false); // New state for card loading
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);

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

  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !profile?.event_id) return;
    try {
      const { data, error } = await getBuildingNotificationsRPC(profile.event_id);
      if (error) throw new Error(error.message);
      if (data) setNotifications(data);
    } catch (error) {
      console.error('[NOTIFICATIONS] caught error:', error);
    }
  }, [user?.id, profile?.event_id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);


  // Volunteer profile from AuthContext
  const volunteerProfile = useMemo(() => {
    if (!profile) return null;

    return {
      id: profile.id,
      full_name: profile.full_name,
      total_points: profile.volunteer?.total_points || 0,
      hours_volunteered: profile.volunteer?.hours_volunteered || 0,
      volunteer_id: profile.volunteer?.user_id,
      team_id: profile.volunteer?.team_id
    };
  }, [profile]);

  const [showProfile, setShowProfile] = useState(false);


  // Dashboard data - Lazy loaded for check-in tab
  const [myScanCount, setMyScanCount] = useState<number>(0); // Changed from totalEntryCount

  // User activities from database
  const [userActivities, setUserActivities] = useState<{
    activity_type: string;
    description: string;
    points_earned: number;
    activity_timestamp: string;
  }[]>([]);

  // ============================================================================
  // OPTIMIZED: Dynamic Search with Debouncing
  // ============================================================================
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setSearchLoading(true);
      try {
        const { data, error } = await searchAttendeesByPersonalId(query);

        if (error) {
          logger.error('Search error:', error);
          setSearchResults([]);
          return;
        }

        setSearchResults(data || []);
        setShowSearchResults(true);
      } catch (error) {
        logger.error('Search exception:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length >= 2) {
      setSearchLoading(true);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
    debouncedSearch(term);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  // Focus mobile search when opened
  useEffect(() => {
    if (showMobileSearch && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [showMobileSearch]);

  // Fetch volunteer stats on mount
  useEffect(() => {
    const fetchVolunteerStats = async () => {
      if (!user?.id) return;

      // Only show loading on initial load (score 0 acts as proxy for "needs first load" or use a separate flag if needed)
      // We don't want to show full loading screen on background refreshes
      if (userStats.loading && userStats.score === 0 && userStats.rank === 0) {
        logger.log('📊 [DASHBOARD] Fetching volunteer stats (Initial)...');
      } else {
        logger.log('📊 [DASHBOARD] Refreshing volunteer stats (Background)...');
      }

      try {
        const { data, error } = await getVolunteerStatsRPC(user.id);

        if (error || !data) {
          logger.error('❌ [DASHBOARD] Failed to fetch stats:', error);
          setUserStats({
            score: volunteerProfile?.total_points || 0,
            rank: 0,
            teamSize: 0,
            loading: false
          });
          return;
        }

        logger.log('✅ [DASHBOARD] Stats loaded:', data);
        setUserStats({
          score: data.total_points,
          rank: data.team_rank,
          teamSize: data.team_size,
          loading: false
        });
      } catch (error) {
        logger.error('💥 [DASHBOARD] Exception fetching stats:', error);
        setUserStats({
          score: volunteerProfile?.total_points || 0,
          rank: 0,
          teamSize: 0,
          loading: false
        });
      }
    };

    fetchVolunteerStats();
  }, [user?.id, volunteerProfile?.total_points, refreshTrigger]);
  // ============================================================================
  // OPTIMIZED: Parallel Data Fetch on Mount
  // ============================================================================
  useEffect(() => {
    const fetchActivities = async () => {
      if (!user?.id || profile?.role === 'attendee') return;
      try {
        const { data, error } = await getBuildingActivitiesRPC(3);

        if (error) {
          logger.error('Error fetching activities:', error);
        } else {
          setUserActivities((data as any[]) || []);
        }
      } catch (error) {
        logger.error('Error fetching activities:', error);
      }
    };
    fetchActivities();
  }, [user?.id, refreshTrigger]);

  // Lazy load check-in stats (My Scans Count)
  useEffect(() => {
    if (user?.id) {
      const fetchCheckInStats = async () => {
        try {
          const { count, error } = await getMyScanCountRPC();

          if (error) {
            logger.error("Error loading check-in stats:", error);
          } else {
            setMyScanCount(count);
          }
        } catch (err) {
          logger.error("Error loading check-in stats", err);
        }
      };
      fetchCheckInStats();
    }
  }, [user?.id, refreshTrigger]);

  // ============================================================================
  // HELPERS
  // ============================================================================


  const getActivityIcon = (activityType: string): string => {
    const iconMap: Record<string, string> = {
      'recruit_attendee': 'person_add',
      'check_in': 'check_circle',
      'check_out': 'logout',
      'qr_scan': 'qr_code_scanner',
      'session_attendance': 'event_available',
      'session_booking': 'event',
      'profile_complete': 'badge',
      'default': 'verified'
    };
    return iconMap[activityType] || iconMap['default'];
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const validateAttendee = (attendee: any): { isValid: boolean; error?: string } => {
    if (attendee.role !== 'attendee') {
      return { isValid: false, error: 'Only attendees can be processed through this system' };
    }
    // Registration status check — must be 'approved' to enter
    const regStatus = attendee.registration_status || 'pending';
    if (regStatus !== 'approved') {
      const label = regStatus.charAt(0).toUpperCase() + regStatus.slice(1);
      return {
        isValid: false,
        error: `Entry denied: attendee registration status is "${label}". Only approved attendees may enter.`
      };
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

  // ============================================================================
  // OPTIMIZED: Search by Personal ID
  // ============================================================================
  const handleSearchByPersonalId = async () => {
    if (!searchTerm.trim()) {
      showToast('Please enter a Personal ID', 'error');
      return;
    }

    try {
      setSearchLoading(true);

      const { data, error } = await getAttendeeByPersonalIdOptimized(sanitizeSearchQuery(searchTerm.trim()));

      if (error || !data) {
        showToast('Personal ID not found', 'error');
        return;
      }

      const validation = validateAttendee(data);
      if (!validation.isValid) {
        showToast(validation.error || 'Validation failed', 'error');
        return;
      }

      setSelectedAttendee(castToAttendee(data));
      setShowAttendeeCard(true);
      setSearchTerm("");
      setShowSearchResults(false);

    } catch (error) {
      logger.error("Search exception:", error);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  // ============================================================================
  // OPTIMIZED: Select Search Result
  // ============================================================================
  // ============================================================================
  // OPTIMIZED: Select Search Result
  // ============================================================================
  const handleSelectSearchResult = async (attendee: Attendee) => {
    try {
      // Clear search UI immediately
      setSearchTerm("");
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchLoading(true);

      // Fetch full data (includes registration_status from RPC)
      const { data, error } = await getUserProfileByUUID(attendee.id);

      if (error || !data) {
        showToast('Failed to load attendee details', 'error');
        return;
      }

      // Validate role
      if (data.role !== 'attendee') {
        showToast(`Only attendees can be checked in. This user is a ${data.role || 'unknown role'}`, 'error');
        return;
      }

      const fullAttendee = castToAttendee(data);

      // Validate (registration_status, profile_complete, authorized)
      const validation = validateAttendee(fullAttendee);
      if (!validation.isValid) {
        // Show card anyway so the volunteer sees the status banner,
        // but the Enter button will be disabled by the card itself
        setSelectedAttendee(fullAttendee);
        setShowAttendeeCard(true);
        return;
      }

      // Show card only after successful validation
      setSelectedAttendee(fullAttendee);
      setShowAttendeeCard(true);
    } catch (error) {
      logger.error("Error selecting attendee:", error);
      showToast('Failed to select attendee', 'error');
    } finally {
      setSearchLoading(false);
      setCardLoading(false);
    }
  };



  // ============================================================================
  // OPTIMIZED: QR Scan Handler
  // ============================================================================
  const handleQRScan = async (qrData: string) => {
    setShowScanner(false);

    // Extract UUID from QR data
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      showToast('Invalid QR code format. Expected UUID.', 'error');
      return;
    }

    try {
      // Use inline function
      const { data, error } = await getUserProfileByUUID(uuid);

      if (error || !data) {
        showToast('This user doesn\'t have an account', 'error');
        return;
      }

      // Validate role
      if (data.role !== 'attendee') {
        showToast(`Only attendees can be checked in. This user is a ${data.role || 'unknown role'}`, 'error');
        return;
      }

      const attendeeData = castToAttendee(data);

      // Check registration_status before showing card
      const validation = validateAttendee(attendeeData);
      if (!validation.isValid) {
        showToast(validation.error || 'Validation failed', 'error');
        return;
      }

      setSelectedAttendee(attendeeData);
      setShowAttendeeCard(true);

    } catch (error) {
      logger.error("QR scan error:", error);
      showToast('Failed to process QR code', 'error');
    }
  };

  const handleScannerClose = () => {
    setShowScanner(false);
  };

  // ============================================================================
  // ATTENDANCE ACTION
  // ============================================================================
  const handleAttendanceAction = async (action: 'enter' | 'exit') => {
    if (!selectedAttendee || !user?.id) {
      showToast('Unable to process. Please try again.', 'error');
      return;
    }

    try {
      setActionLoading(true);

      const type = action === 'enter' ? 'entry' : 'exit';
      const { error } = await recordAttendeeAttendance({
        attendeeId: selectedAttendee.id,
        checkedInBy: user.id,
        type: type
      });

      if (error) {
        showToast(error.message || `Failed to process ${action}`, 'error');
        return;
      }

      showToast(`${action === 'enter' ? 'Check-in' : 'Check-out'} successful!`, 'success');

      const newStatus = action === 'enter' ? 'inside' : 'outside';
      const newEventEntry = action === 'enter';

      setSelectedAttendee(prev => prev ? {
        ...prev,
        current_status: newStatus,
        event_entry: newEventEntry,
        last_scan: new Date().toISOString()
      } : null);

      // Update total count
      if (action === 'enter' || action === 'exit') {
        setMyScanCount(prev => prev + 1);
        // Trigger background refresh for Home tab stats
        setRefreshTrigger(prev => prev + 1);
        // Refresh Auth Profile (Global Score)
        if (profile?.event_id && profile?.id) {
          refreshProfile(profile.event_id, profile.id, undefined, true);
        }
      }



      setTimeout(() => {
        setShowAttendeeCard(false);
        setSelectedAttendee(null);
      }, 2000);

    } catch (error) {
      logger.error("Attendance action error:", error);
      showToast(`Failed to process ${action}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchInputBlur = () => {
    setTimeout(() => {
      setShowSearchResults(false);
    }, 3000);
  };

  // ============================================================================
  // RENDER: HOME TAB
  // ============================================================================
  // Loading State - Top Level
  if (userStats.loading) {
    return <DashboardLoading message="Loading RegTeam Dashboard" subMessage="Fetching your stats and recent activity..." />;
  }

  const renderHomeTab = () => {
    return (
      <motion.div
        key="home"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12"
      >
        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            {/* Welcome Banner */}
            <motion.div
              variants={itemVariants}
              className="relative rounded-2xl overflow-hidden shadow-xl shadow-primary/10 p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white"
              style={{
                background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
              }}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
                  how_to_reg
                </span>
              </div>
              <div className="relative z-10">
                <p className="uppercase tracking-widest text-red-100 font-semibold text-xs mb-2">Registration Dashboard</p>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Welcome, {volunteerProfile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Volunteer'}
                </h1>
                <p className="text-lg text-red-100 opacity-90 max-w-md mb-8">
                  Your support makes this event possible. Thank you for your dedication!
                </p>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setShowProfile(true)}
                    className="bg-white text-red-600 hover:bg-red-50 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit shadow-lg active:scale-95"
                  >
                    <User className="w-5 h-5" />
                    Show Profile
                  </button>

                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/20 rounded-full -mb-32 -mr-32 blur-3xl"></div>
            </motion.div>

            {/* Stats Cards - Mobile Only */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 lg:hidden">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-amber-500 text-lg">emoji_events</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Score</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {userStats.score}
                </p>
              </div>

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
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  #{userStats.rank}
                </p>
              </div>
            </motion.div>

            {/* Recent Activity */}
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
                {userActivities.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                    <p>No recent activities</p>
                  </div>
                ) : (
                  <div className="space-y-8 relative">
                    <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"></div>
                    {userActivities.map((activity, index) => (
                      <div key={`${activity.activity_timestamp}-${index}`} className="relative flex gap-6 items-start group">
                        <div className="relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/10 border-4 border-white dark:border-slate-900">
                          <span className="material-symbols-outlined text-primary text-xl">
                            {getActivityIcon(activity.activity_type)}
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

          {/* Right Column - Stats (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-amber-500">emoji_events</span>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Score</p>
              <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">
                {userStats.score}
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
              {/* Removed top badge as requested */}
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">bar_chart</span>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Rank</p>
              <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">
                #{userStats.rank}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ============================================================================
  // RENDER: CHECK-IN TAB
  // ============================================================================
  const renderCheckInTab = () => (
    <motion.div
      key="check-in"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col"
    >
      <motion.header variants={itemVariants} className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-2xl">
              <QrCode className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Check-In System</h2>
              <p className="text-slate-500 dark:text-slate-400">Scan QR codes or search manually</p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              {searchLoading ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              )}
              <input
                className="w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white transition-all focus:w-96"
                placeholder="Search by Personal ID..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
                onBlur={handleSearchInputBlur}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              />
              {/* Desktop Search Results Dropdown */}
              {showSearchResults && (searchResults.length > 0 || searchLoading) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchLoading && (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-2" />
                      Searching...
                    </div>
                  )}
                  {!searchLoading && searchResults.map((attendee) => (
                    <button
                      key={attendee.id}
                      onClick={() => handleSelectSearchResult(attendee)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{attendee.first_name} {attendee.last_name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{attendee.personal_id}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 active:scale-95"
            >
              <QrCode className="w-5 h-5" />
              Scan QR
            </button>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6">

        {/* Mobile Action Buttons */}
        <div className="md:hidden grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-red-600 active:bg-red-700 text-white p-6 rounded-2xl shadow-lg shadow-red-500/20 flex flex-col items-center justify-center gap-3 transition-transform active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg">Scan QR</span>
          </button>

          <button
            onClick={() => {
              setShowMobileSearch(prev => !prev);
            }}
            className={`bg-white dark:bg-slate-800 active:bg-gray-50 dark:active:bg-slate-700 text-slate-800 dark:text-white p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3 transition-transform active:scale-95 ${showMobileSearch ? 'ring-2 ring-primary border-transparent' : ''}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${showMobileSearch ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
              <Search className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg">{showMobileSearch ? 'Close' : 'Search'}</span>
          </button>
        </div>

        {/* Mobile Search Input (Visible always on mobile for now to keep it simple, or toggleable) */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="relative flex items-center gap-2">
                {searchLoading ? (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin z-10" />
                ) : (
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
                )}
                <input
                  ref={mobileInputRef}
                  id="mobile-search-input"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
                  placeholder="Search by Personal ID"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
                  onBlur={handleSearchInputBlur}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                />
                <button
                  onClick={handleSearchByPersonalId}
                  disabled={searchLoading}
                  className="shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white p-4 rounded-2xl transition-colors shadow-sm active:scale-95"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
              {/* Mobile Search Results Dropdown */}
              {showSearchResults && (searchResults.length > 0 || searchLoading) && (
                <div className="relative mt-1">
                  <div className="absolute top-0 left-0 right-0 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchLoading && (
                      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-2" />
                        Searching...
                      </div>
                    )}
                    {!searchLoading && searchResults.map((attendee) => (
                      <button
                        key={attendee.id}
                        onClick={() => handleSelectSearchResult(attendee)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{attendee.first_name} {attendee.last_name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{attendee.personal_id}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>


        <motion.div
          variants={itemVariants}
          className="hidden md:flex lg:col-span-2 relative overflow-hidden rounded-[32px] shadow-xl shadow-primary/20 flex-col md:flex-row items-center gap-8 group cursor-pointer hover:scale-[1.01] transition-transform p-10"
          style={{
            background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
          }}
          onClick={() => setShowScanner(true)}
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
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col">
          <div>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Current Status</h3>
              <div className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                LIVE
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">My Scans (Processed)</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-slate-900 dark:text-white">{myScanCount.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </div>


    </motion.div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
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

      {/* Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} className="h-full">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'check-in' && renderCheckInTab()}
        </motion.div>
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={handleScannerClose}
        onScan={handleQRScan}
        title="Scan Attendee QR Code"
        description="Point your camera at the attendee's QR code"
      />

      {/* View All Activities Modal */}
      <AnimatePresence>
        {showAllActivitiesModal && (
          <ViewAllActivitiesModal onClose={() => setShowAllActivitiesModal(false)} />
        )}
      </AnimatePresence>

      {/* Attendee Card Modal */}
      <AnimatePresence>
        {showAttendeeCard && (
          <RegTeamAttendeeCard
            attendee={selectedAttendee}
            onClose={() => {
              setShowAttendeeCard(false);
              setSelectedAttendee(null);
            }}
            onAction={(action) => handleAttendanceAction(action)}
            isLoading={cardLoading}
            actionLoading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Volunteer Profile Modal */}
      <VolunteerProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={volunteerProfile}
        loading={!profile}
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
    </SharedNavigation >
  );
};