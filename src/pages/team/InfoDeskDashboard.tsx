// src/pages/infodesk/InfoDeskDashboard.tsx
import React, { useState } from "react";
import {
  Calendar,
  QrCode,
  Search,
  Clock,
  User,
  AlertCircle,
  X,
  CheckCircle,
  Building2,
} from "lucide-react";
import SharedNavigation, { NavItem } from "../../components/shared/SharedNavigation";
import { useAuth } from "../../contexts/AuthContext";

interface Session {
  id: string;
  title: string;
  description: string;
  speaker: string;
  speaker_photo_url?: string;
  speaker_linkedin_url?: string;
  start_time: string;
  end_time: string;
  location: string;
  current_attendees: number;
  max_attendees: number;
  current_bookings: number;
  session_type: string;
  capacity?: number;
  status?: 'open' | 'waitlist' | 'full';
}

// Mock data for sessions
const mockSessions: Session[] = [
  {
    id: '1',
    title: 'Career Planning 101',
    description: 'Learn the fundamentals of career planning',
    speaker: 'Dr. Sarah Johnson',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    location: 'Memorial Union, Rm 202',
    capacity: 50,
    current_bookings: 45,
    current_attendees: 45,
    max_attendees: 50,
    session_type: 'workshop',
    status: 'open'
  },
  {
    id: '2',
    title: 'Resume Building Workshop',
    description: 'Learn to craft the perfect resume',
    speaker: 'Michael Chen',
    start_time: new Date(Date.now() + 10800000).toISOString(),
    end_time: new Date(Date.now() + 14400000).toISOString(),
    location: 'Student Pavillion, Main Hall',
    capacity: 30,
    current_bookings: 30,
    current_attendees: 30,
    max_attendees: 30,
    session_type: 'workshop',
    status: 'waitlist'
  },
  {
    id: '3',
    title: 'Intel: Future of Tech Talk',
    description: 'Explore the future of technology with Intel',
    speaker: 'Tech Leaders',
    start_time: new Date(Date.now() + 18000000).toISOString(),
    end_time: new Date(Date.now() + 21600000).toISOString(),
    location: 'Memorial Union, Rm 242',
    capacity: 120,
    current_bookings: 85,
    current_attendees: 85,
    max_attendees: 120,
    session_type: 'keynote',
    status: 'open'
  }
];

const mockActivities = [
  {
    id: '1',
    description: 'Registered attendee for workshop',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'session_booking'
  },
  {
    id: '2',
    description: 'Scanned attendee QR code',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'qr_scan'
  },
  {
    id: '3',
    description: 'Added attendee to session',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    type: 'session'
  }
];

export const InfoDeskDashboard: React.FC = () => {
  const { profile } = useAuth();

  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'sessions', label: 'Sessions', icon: 'calendar_month' }
  ];
  const [activeTab, setActiveTab] = useState('home');
  const [sessions] = useState<Session[]>(mockSessions);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const userStats = {
    score: 1250,
    rank: 12,
    first_name: profile?.first_name || 'Volunteer'
  };


  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };


  const getCapacityDisplay = (session: Session) => {
    return `${session.current_bookings || 0}/${session.capacity || 'Unlimited'}`;
  };

  const getCapacityPercentage = (session: Session) => {
    if (!session.capacity || session.capacity <= 0) return 0;
    return (session.current_bookings / session.capacity) * 100;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400';
      case 'waitlist':
        return 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400';
      case 'full':
        return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

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

  // --- Renderers ---
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
              <p className="uppercase tracking-widest text-orange-100 font-semibold text-xs mb-2">Info Desk Dashboard</p>
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
            <div className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-amber-500 text-lg">emoji_events</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Score</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{userStats.score}</p>
            </div>
            <div className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 relative">
              <div className="absolute top-3 right-3 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold">
                Top 5%
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-blue-600 text-lg">bar_chart</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Rank</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">#{userStats.rank}</p>
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
                    <div className={`relative z-10 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border-4 border-white dark:border-card-dark ${getActivityColor(activity.type)}`}>
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
          <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-amber-500">emoji_events</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Score</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">{userStats.score}</p>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
              Top 5%
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-blue-600">bar_chart</span>
            </div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Rank</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white mt-1">#{userStats.rank}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSessionsTab = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12">
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          className="w-full bg-white dark:bg-card-dark border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary/20 text-sm dark:text-white placeholder:text-gray-400"
          placeholder="Search sessions..."
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-gray-800 dark:text-white">Event Sessions</h3>
        <button className="text-primary text-xs font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">filter_list</span>
          Filter
        </button>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions
          .filter(session =>
            session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.location.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-card-dark p-5 rounded-3xl shadow-sm border border-gray-50 dark:border-zinc-800 group active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-base font-bold text-gray-800 dark:text-white flex-1 pr-4">
                  {session.title}
                </h4>
                <span className={`${getStatusColor(session.status)} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                  {session.status}
                </span>
              </div>

              {/* Time and Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span className="text-xs font-medium">
                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="text-xs font-medium">{session.location}</span>
                </div>
              </div>

              {/* Capacity */}
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Capacity</span>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {getCapacityDisplay(session)} <span className="text-gray-400 font-medium">Registered</span>
                  </p>
                </div>
                <div className="w-24 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${getCapacityPercentage(session)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="Info Desk"
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
      {activeTab === 'sessions' && renderSessionsTab()}
    </SharedNavigation>
  );
};