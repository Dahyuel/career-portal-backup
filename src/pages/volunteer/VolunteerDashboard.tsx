import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAttendeeProfile } from '../../hooks/useAttendeeProfile';
import { useVolunteerProfile } from '../../hooks/useVolunteerProfile';
import { mockActivities } from '../../mocks';
import SharedNavigation from '../../components/shared/SharedNavigation';
import VolunteerProfileModal from '../../components/volunteer/VolunteerProfileModal';


export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { attendeeProfile } = useAttendeeProfile(user?.id);
  const { profile: volunteerProfile, loading: loadingProfile } = useVolunteerProfile();
  const [showProfile, setShowProfile] = useState(false);

  // Get user stats from mock data
  const userStats = {
    score: attendeeProfile?.score || 1250,
    rank: 12
  };

  // Get recent activities
  const recentActivities = mockActivities.slice(0, 3);

  // Activity type to icon mapping
  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      'check_in': 'check_circle',
      'qr_scan': 'qr_code_scanner',
      'session_booking': 'event_available',
      'session': 'event_available',
      'volunteer': 'volunteer_activism',
      'profile_complete': 'account_circle',
      'booth_visit': 'store'
    };
    return icons[type] || 'check_circle';
  };

  // Activity type to color mapping
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

  return (
    <SharedNavigation
      navItems={[]}
      activeItem=""
      onItemChange={() => { }}
      onProfileClick={() => setShowProfile(true)}
      hideDock={showProfile}
    >
      {/* Main Content */}
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
                  Welcome, {attendeeProfile?.full_name?.split(' ')[0] || 'Volunteer'}
                </h1>
                <p className="text-lg text-orange-50 opacity-90 max-w-md mb-8">
                  Your support makes this event possible. Thank you for your dedication!
                </p>
                <button
                  onClick={() => setShowProfile(true)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit"
                >
                  <span className="material-symbols-outlined text-xl">account_circle</span>
                  Show Profile
                </button>
              </div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/20 rounded-full -mb-32 -mr-32 blur-3xl"></div>
            </div>

            {/* Stats Cards - Mobile Only */}
            <div className="grid grid-cols-2 gap-4 lg:hidden">
              {/* Score Card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-amber-500 text-lg">emoji_events</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Score</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{userStats.score}</p>
              </div>

              {/* Rank Card */}
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
                <h2 className="text-2xl font-bold text-slate-800">Recent Activity</h2>
                <a className="text-primary font-semibold hover:underline flex items-center gap-1" href="#">
                  View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="space-y-8 relative">
                  {/* Activity Timeline Line */}
                  <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100"></div>

                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-6 items-start">
                      <div className={`relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border-4 border-white ${getActivityColor(activity.type)}`}>
                        <span className="material-symbols-outlined text-xl">{getActivityIcon(activity.type)}</span>
                      </div>
                      <div className="flex-grow pt-1">
                        <h4 className="font-semibold text-slate-800">{activity.description}</h4>
                        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs">schedule</span>
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
            {/* Score Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative group overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-amber-500">emoji_events</span>
              </div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Score</p>
              <p className="text-4xl font-bold text-slate-800 mt-1">{userStats.score}</p>
            </div>

            {/* Rank Card */}
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

      {/* Profile Modal */}
      <VolunteerProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={volunteerProfile}
        loading={loadingProfile}
      />
    </SharedNavigation>
  );
};

export default VolunteerDashboard;