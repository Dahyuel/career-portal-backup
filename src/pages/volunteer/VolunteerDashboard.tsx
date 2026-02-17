import React, { useState, useEffect, useCallback } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import SharedNavigation from '../../components/shared/SharedNavigation';
import VolunteerProfileModal from '../../components/volunteer/VolunteerProfileModal';
import DashboardLoading from '../../components/DashboardLoading';
import ViewAllActivitiesModal from '../../components/attendee/ViewAllActivitiesModal';
import NotificationModal from '../../components/NotificationModal';
import { getVolunteerStatsRPC, supabase } from '../../lib/supabase';

// --- Animation Variants ---
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

export const VolunteerDashboard: React.FC = () => {
  useTheme();
  const { profile } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
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

  // User Stats State
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

  // User Activities State
  const [userActivities, setUserActivities] = useState<{
    id: string;
    activity_type: string;
    description: string;
    points_earned: number;
    activity_timestamp: string;
  }[]>([]);

  // Fetch Volunteer Stats & Activities
  useEffect(() => {
    const fetchVolunteerData = async () => {
      const userId = profile?.id;
      if (!userId) return;

      console.log('📊 [VOLUNTEER] Fetching stats for:', userId);
      setUserStats(prev => ({ ...prev, loading: true }));

      try {
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
          console.error('❌ [VOLUNTEER] Failed to fetch stats:', statsResult.error);
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
        console.error('💥 [VOLUNTEER] Exception fetching data:', error);
      } finally {
        setUserStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchVolunteerData();
  }, [profile?.id]);

  // Loading State
  if (userStats.loading) {
    return <DashboardLoading message="Loading Volunteer Dashboard" subMessage="Fetching your stats..." />;
  }

  return (
    <SharedNavigation
      navItems={[]} // No extra nav items for basic volunteer view
      activeItem=""
      onItemChange={() => { }}
      title="Volunteer"
      onProfileClick={() => setShowProfile(true)}
      notifications={notifications}
      onNotificationClick={(notification) => setSelectedNotification(notification)}
      hideDock={false} // Standard mobile nav
    >
      <motion.div
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

          {/* Right Column - Stats (Desktop Only) */}
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
          </div>

        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAllActivitiesModal && (
          <ViewAllActivitiesModal onClose={() => setShowAllActivitiesModal(false)} />
        )}
      </AnimatePresence>

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

export default VolunteerDashboard;