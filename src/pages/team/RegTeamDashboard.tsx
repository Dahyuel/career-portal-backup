import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Search,
  QrCode,
  CheckCircle,
  Camera,
  Calendar,
  Clock,
  User,
  X,
  LogOut
} from "lucide-react";

import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  recordAttendeeAttendance,
  getRegTeamDashboardData,
  searchAttendeesByPersonalId,
  getAttendeeByPersonalIdOptimized,
  getUserProfileByUUID,  // ✅ ADD THIS
  supabase,
  getVolunteerStatsRPC
} from "../../lib/supabase";
import Toast from "../../components/shared/Toast";
import VolunteerProfileModal from '../../components/volunteer/VolunteerProfileModal';
import DashboardLoading from "../../components/DashboardLoading";

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
}

const castToAttendee = (data: any): Attendee => {
  return {
    ...data,
    current_status: data.current_status || (data.event_entry ? 'inside' : 'outside'),
    event_entry: data.event_entry || false,
    profile_complete: data.profile_complete !== undefined ? data.profile_complete : true,
    authorized: data.authorized !== undefined ? data.authorized : true,
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
  const { user, profile } = useAuth();
  useTheme();
  const [activeTab, setActiveTab] = useState('home');

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

  // Attendee card state
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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


  // Dashboard data
  const [totalEntryCount, setTotalEntryCount] = useState<number>(0);
  const [recentScans, setRecentScans] = useState<{
    id: string;
    name: string;
    personalId: string;
    time: string;
    check_in_time?: string;
    check_out_time?: string;
    type: string;
  }[]>([]);

  // User activities from database
  const [userActivities, setUserActivities] = useState<{
    id: string;
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
          console.error('Search error:', error);
          setSearchResults([]);
          return;
        }

        setSearchResults(data || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search exception:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm.trim());
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  // Fetch volunteer stats on mount
  useEffect(() => {
    const fetchVolunteerStats = async () => {
      if (!user?.id) return;

      console.log('📊 [DASHBOARD] Fetching volunteer stats...');
      setUserStats(prev => ({ ...prev, loading: true }));

      try {
        const { data, error } = await getVolunteerStatsRPC(user.id);

        if (error || !data) {
          console.error('❌ [DASHBOARD] Failed to fetch stats:', error);
          setUserStats({
            score: volunteerProfile?.total_points || 0,
            rank: 0,
            teamSize: 0,
            loading: false
          });
          return;
        }

        console.log('✅ [DASHBOARD] Stats loaded:', data);
        setUserStats({
          score: data.total_points,
          rank: data.team_rank,
          teamSize: data.team_size,
          loading: false
        });
      } catch (error) {
        console.error('💥 [DASHBOARD] Exception fetching stats:', error);
        setUserStats({
          score: volunteerProfile?.total_points || 0,
          rank: 0,
          teamSize: 0,
          loading: false
        });
      }
    };

    fetchVolunteerStats();
  }, [user?.id, volunteerProfile?.total_points]);
  // ============================================================================
  // OPTIMIZED: Parallel Data Fetch on Mount
  // ============================================================================
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user?.id) return;

      try {
        // Single function call fetches both in parallel
        const { data, error } = await getRegTeamDashboardData(user.id);

        if (error) {
          console.error('Error fetching dashboard data:', error);
          return;
        }

        setTotalEntryCount(data.totalEntryCount);
        setRecentScans(data.recentScans.map((scan: any) => ({
          id: scan.id,
          name: scan.attendee?.name || 'Unknown',
          personalId: scan.attendee?.personalId || '',
          time: formatRelativeTime(scan.time),
          check_in_time: scan.check_in_time,
          check_out_time: scan.check_out_time,
          type: scan.type
        })));

        // Fetch user activities
        const { data: activities, error: activitiesError } = await supabase
          .from('user_activities')
          .select('id, activity_type, description, points_earned, activity_timestamp')
          .eq('user_id', user.id)
          .order('activity_timestamp', { ascending: false })
          .limit(3);

        if (activitiesError) {
          console.error('Error fetching activities:', activitiesError);
        } else {
          setUserActivities(activities || []);
        }
      } catch (error) {
        console.error('Error in fetchAttendanceData:', error);
      }
    };

    fetchAttendanceData();
  }, [user?.id]);

  // ============================================================================
  // HELPERS
  // ============================================================================
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

      const { data, error } = await getAttendeeByPersonalIdOptimized(searchTerm.trim());

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
      console.error("Search exception:", error);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  // ============================================================================
  // OPTIMIZED: Select Search Result
  // ============================================================================
  const handleSelectSearchResult = async (attendee: Attendee) => {
    try {
      setSearchLoading(true);

      // Use inline function
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

      const validation = validateAttendee(fullAttendee);
      if (!validation.isValid) {
        showToast(validation.error || 'Validation failed', 'error');
        return;
      }

      setSelectedAttendee(fullAttendee);
      setShowAttendeeCard(true);
      setSearchTerm("");
      setShowSearchResults(false);
      setSearchResults([]);
    } catch (error) {
      console.error("Error selecting attendee:", error);
      showToast('Failed to select attendee', 'error');
    } finally {
      setSearchLoading(false);
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
      setSelectedAttendee(attendeeData);
      setShowAttendeeCard(true);

    } catch (error) {
      console.error("QR scan error:", error);
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
      const { data, error } = await recordAttendeeAttendance({
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

      // Update recent scans
      setRecentScans(prev => {
        const now = new Date().toISOString();
        let newScans = [...prev];

        if (action === 'exit') {
          const index = newScans.findIndex(s => s.personalId === selectedAttendee.personal_id && !s.check_out_time);

          if (index !== -1) {
            newScans[index] = {
              ...newScans[index],
              check_out_time: now,
              type: 'visit'
            };
            const updatedItem = newScans.splice(index, 1)[0];
            newScans.unshift(updatedItem);
          } else {
            newScans.unshift({
              id: data?.id || crypto.randomUUID(),
              name: `${selectedAttendee.first_name} ${selectedAttendee.last_name}`,
              personalId: selectedAttendee.personal_id,
              time: 'Just now',
              check_in_time: undefined,
              check_out_time: now,
              type: 'visit'
            });
          }
        } else {
          newScans.unshift({
            id: data?.id || crypto.randomUUID(),
            name: `${selectedAttendee.first_name} ${selectedAttendee.last_name}`,
            personalId: selectedAttendee.personal_id,
            time: 'Just now',
            check_in_time: now,
            type: 'entry'
          });
        }

        return newScans.slice(0, 3);
      });

      if (action === 'enter') {
        setTotalEntryCount(prev => prev + 1);
      }

      setTimeout(() => {
        setShowAttendeeCard(false);
        setSelectedAttendee(null);
      }, 2000);

    } catch (error) {
      console.error("Attendance action error:", error);
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
              <div className="relative z-10">
                <p className="uppercase tracking-widest text-red-100 font-semibold text-xs mb-2">Registration Dashboard</p>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Welcome, {volunteerProfile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Volunteer'}
                </h1>
                <p className="text-lg text-red-50 opacity-90 max-w-md mb-8">
                  Your support makes this event possible. Thank you for your dedication!
                </p>
                <button
                  onClick={() => setShowProfile(true)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit"
                >
                  <User className="w-5 h-5" />
                  Show Profile
                </button>
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
            <motion.div variants={itemVariants}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Recent Activity</h2>
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
                    {userActivities.map((activity) => (
                      <div key={activity.id} className="relative flex gap-6 items-start group">
                        <div className="relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/10 border-4 border-white dark:border-slate-900">
                          <span className="material-symbols-outlined text-primary text-xl">
                            {getActivityIcon(activity.activity_type)}
                          </span>
                        </div>
                        <div className="flex-grow pt-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-slate-800 dark:text-white">{activity.description}</h4>
                            {activity.points_earned > 0 && (
                              <span className="ml-2 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                +{activity.points_earned} pts
                              </span>
                            )}
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
              {userStats.teamSize > 0 && (
                <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
                  Top {Math.round((userStats.rank / userStats.teamSize) * 100)}%
                </div>
              )}
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
      <motion.header variants={itemVariants} className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendee Check-In</h2>
          <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-slate-700"></div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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
              className="w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
              placeholder="Search by Personal ID"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
              onBlur={handleSearchInputBlur}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            />
            {/* Desktop Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {searchResults.map((attendee) => (
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
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          variants={itemVariants}
          onClick={() => setShowScanner(true)}
          className="lg:col-span-2 relative overflow-hidden rounded-[32px] shadow-xl shadow-primary/20 flex flex-col md:flex-row items-center gap-8 group cursor-pointer hover:scale-[1.01] transition-transform p-10"
          style={{
            background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
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
        </motion.div>

        {/* Mobile Search - Visible only on mobile */}
        <div className="md:hidden relative col-span-1 z-30">
          {searchLoading ? (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          ) : (
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          )}
          <input
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm dark:text-white"
            placeholder="Search by Personal ID"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
            onBlur={handleSearchInputBlur}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
          />
          {/* Mobile Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map((attendee) => (
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

        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col">
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
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 mt-8 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Scans</h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-bold">Today</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentScans.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400">
              No recent scans. Start scanning to see activity here.
            </div>
          ) : (
            recentScans.map((scan) => {
              const isVisit = scan.type === 'visit' || (scan.check_in_time && scan.check_out_time);
              let duration = '';
              if (isVisit && scan.check_in_time && scan.check_out_time) {
                const diff = new Date(scan.check_out_time).getTime() - new Date(scan.check_in_time).getTime();
                const mins = Math.floor(diff / 60000);
                duration = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
              }

              return (
                <div key={scan.id} className="flex items-center gap-5 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isVisit ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-emerald-100 dark:bg-emerald-500/10'}`}>
                    {isVisit ? (
                      <span className="material-symbols-outlined text-blue-600 text-2xl">history</span>
                    ) : (
                      <CheckCircle className="text-emerald-500 w-8 h-8" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{scan.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-gray-400">ID: #{scan.personalId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />

                      {isVisit && scan.check_in_time && scan.check_out_time ? (
                        <div className="flex flex-col">
                          <span className="text-[12px] text-slate-500 font-medium">
                            {new Date(scan.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(scan.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {duration && <span className="text-[10px] text-slate-400">Duration: {duration}</span>}
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-400 font-medium">{scan.time}</span>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isVisit ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'}`}>
                        {isVisit ? 'VISIT' : 'IN'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
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
      title="Registration Team"
      onProfileClick={() => setShowProfile(true)}
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

      {/* Attendee Card Modal */}
      <AnimatePresence>
        {showAttendeeCard && selectedAttendee && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowAttendeeCard(false);
                setSelectedAttendee(null);
              }}
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
                  Attendee Details
                </motion.h3>
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowAttendeeCard(false);
                    setSelectedAttendee(null);
                  }}
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
                    className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0"
                  >
                    <User className="w-8 h-8 text-red-600 dark:text-red-500" />
                  </motion.div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                      {selectedAttendee?.full_name}
                    </h4>
                    <p className={`text-sm font-medium mt-1 ${selectedAttendee?.current_status === 'inside' ? "text-green-600" : "text-orange-600"
                      }`}>
                      {selectedAttendee?.current_status === 'inside' ? "Currently Inside" : "Currently Outside"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* University & Faculty */}
                  {(selectedAttendee?.university || selectedAttendee?.faculty) && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {selectedAttendee?.university && (
                        <div className="bg-white dark:bg-slate-700/50 p-3 rounded-xl">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">University</p>
                          <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={selectedAttendee?.university}>
                            {selectedAttendee?.university}
                          </p>
                        </div>
                      )}
                      {selectedAttendee?.faculty && (
                        <div className="bg-white dark:bg-slate-700/50 p-3 rounded-xl">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Faculty</p>
                          <p className="font-semibold text-slate-800 dark:text-white text-xs truncate" title={selectedAttendee?.faculty}>
                            {selectedAttendee?.faculty}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Personal ID */}
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <QrCode className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Personal ID</p>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-200">{selectedAttendee?.personal_id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  {selectedAttendee?.email && (
                    <div className="p-3 bg-white dark:bg-slate-700/50 rounded-xl overflow-hidden">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={selectedAttendee?.email}>
                        {selectedAttendee?.email}
                      </p>
                    </div>
                  )}

                  {/* Phone */}
                  {selectedAttendee?.phone && (
                    <div className="p-3 bg-white dark:bg-slate-700/50 rounded-xl overflow-hidden">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {selectedAttendee?.phone}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 gap-4"
              >
                <button
                  onClick={() => handleAttendanceAction('enter')}
                  disabled={actionLoading || selectedAttendee?.current_status === 'inside'}
                  className={`flex items-center justify-center py-4 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${selectedAttendee?.current_status === 'inside'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'
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
                  disabled={actionLoading || selectedAttendee?.current_status !== 'inside'}
                  className={`flex items-center justify-center py-4 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${selectedAttendee?.current_status !== 'inside'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30'
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
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Volunteer Profile Modal */}
      <VolunteerProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={volunteerProfile}
        loading={!profile}
      />
    </SharedNavigation>
  );
};