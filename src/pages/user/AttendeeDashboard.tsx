import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import {
  mockSessions,
  mockCompanies,
  mockJobs,
  mockEvents,
  getEventsByDay,
  mockActivities
} from '../../mocks';

const AttendeeDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDay, setSelectedDay] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // User stats (mock data)
  const userScore = 1250;
  const userRank = 12;
  const userPercentile = 5;

  // Define navigation tabs
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar_month' },
    { key: 'sessions', label: 'Sessions', icon: 'event' },
    { key: 'jobs', label: 'Jobs', icon: 'work' },
    { key: 'companies', label: 'Companies', icon: 'business' }
  ];

  // Helper to get full name
  const getFullName = () => {
    if (!user) return 'Attendee';
    return `${user.first_name} ${user.last_name}`;
  };

  // Get upcoming events (next 3)
  const upcomingEvents = mockEvents.slice(0, 3);

  // Recent activities (last 3)
  const recentActivities = mockActivities.slice(0, 3);

  // Get events for selected day
  const dayEvents = getEventsByDay(selectedDay);

  // Booked sessions
  const bookedSessions = mockSessions.slice(0, 3);

  // Helper: Get type badge color
  const getTypeBadgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'Fair': 'bg-blue-100 text-blue-800',
      'Workshop': 'bg-purple-100 text-purple-800',
      'Seminar': 'bg-amber-100 text-amber-800',
      'Networking': 'bg-emerald-100 text-emerald-800',
      'Break': 'bg-slate-100 text-slate-600',
      'Full-Time': 'bg-blue-100 text-blue-800',
      'Internship': 'bg-amber-100 text-amber-800',
      'Part-Time': 'bg-emerald-100 text-emerald-800',
      'Co-op': 'bg-purple-100 text-purple-800',
      'Remote': 'bg-slate-100 text-slate-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const renderHomeTab = () => (
    <div className="space-y-6">
      {/* Welcome Banner with Gradient Fade */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white" style={{
        background: 'linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)'
      }}>
        <div className="relative z-10">
          <p className="uppercase tracking-widest text-orange-100 font-semibold text-xs mb-2">Dashboard</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome, {user?.first_name || 'Attendee'}
          </h1>
          <p className="text-lg text-orange-50 opacity-90 max-w-md mb-8">
            Let's make some meaningful connections today and level up your career profile.
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Current Score</p>
              <p className="text-4xl font-bold text-gray-900">{userScore.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-xl">
              <span className="material-symbols-outlined text-blue-600 text-3xl">star</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Current Rank</p>
              <p className="text-4xl font-bold text-gray-900">#{userRank}</p>
              <p className="text-green-600 text-sm font-medium mt-1">Top {userPercentile}%</p>
            </div>
            <div className="bg-green-100 p-4 rounded-xl">
              <span className="material-symbols-outlined text-green-600 text-3xl">trophy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500">history</span>
          Recent Activity
        </h3>
        <div className="space-y-4">
          {recentActivities.map((activity, idx) => (
            <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0">
                <span className="material-symbols-outlined text-orange-600">
                  {activity.type === 'session' ? 'event' : activity.type === 'volunteer' ? 'volunteer_activism' : 'check_circle'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} Activity</p>
                <p className="text-sm text-gray-600">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500">event</span>
          Upcoming Events
        </h3>
        <div className="space-y-3">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{event.title}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      {event.start_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {event.location}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(event.type)}`}>
                  {event.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-white text-5xl">person</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{getFullName()}</h2>
              <p className="text-gray-600 mb-1">{user?.email}</p>
              <p className="text-gray-600 mb-4">{user?.university || 'University'}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Score</p>
                  <p className="text-2xl font-bold text-gray-900">{userScore}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Rank</p>
                  <p className="text-2xl font-bold text-gray-900">#{userRank}</p>
                </div>
              </div>

              <button
                onClick={() => setShowQR(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold mb-3 hover:shadow-lg transition-shadow"
              >
                Show QR Code
              </button>

              <button
                onClick={() => setShowProfile(false)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-center mb-4">Your QR Code</h3>
            <div className="bg-gray-100 p-6 rounded-xl mb-4 flex items-center justify-center">
              <div className="w-48 h-48 bg-white p-4 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400 text-9xl">qr_code_2</span>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 mb-4">Scan this code at sessions and booths</p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderScheduleTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Event Schedule</h2>

      {/* Day Picker */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { day: 1, label: 'Mon', date: '22' },
          { day: 2, label: 'Tue', date: '23' },
          { day: 3, label: 'Wed', date: '24' },
          { day: 4, label: 'Thu', date: '25' },
          { day: 5, label: 'Fri', date: '26' }
        ].map(({ day, label, date }) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`flex-shrink-0 px-6 py-3 rounded-xl font-semibold transition-all ${selectedDay === day
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
              }`}
          >
            <div className="text-center">
              <p className="text-sm">{label}</p>
              <p className="text-lg font-bold">{date}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {dayEvents.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">event_busy</span>
            <p className="text-gray-500">No events scheduled for this day</p>
          </div>
        ) : (
          dayEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl px-4 py-3 text-center min-w-[80px]">
                    <p className="text-sm font-medium">{event.start_time}</p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getTypeBadgeColor(event.type)}`}>
                      {event.type}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-3">{event.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {event.location}
                    </span>
                    {event.speaker && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">person</span>
                        {event.speaker}
                      </span>
                    )}
                    {event.attendee_count > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">group</span>
                        {event.attendee_count} attending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderSessionsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Sessions</h2>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Search sessions..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button className="bg-white border border-gray-200 px-6 py-3 rounded-xl font-semibold hover:border-orange-300 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined">filter_list</span>
          Filter
        </button>
      </div>

      {/* My Booked Sessions */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">My Booked Sessions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bookedSessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-40 bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-6xl">event</span>
              </div>
              <div className="p-5">
                <div className="bg-orange-100 text-orange-800 rounded-lg px-3 py-1 text-xs font-semibold mb-3 inline-block">
                  {new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {new Date(session.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{session.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{session.speaker}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {session.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Sessions */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">All Sessions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockSessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-40 bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-6xl">event</span>
              </div>
              <div className="p-5">
                <div className="bg-orange-100 text-orange-800 rounded-lg px-3 py-1 text-xs font-semibold mb-3 inline-block">
                  {new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{session.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{session.speaker}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {session.location}
                </div>
                <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 rounded-lg font-semibold hover:shadow-md transition-shadow">
                  Book Session
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderJobsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Job Opportunities</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option>All Job Types</option>
          <option>Full-Time</option>
          <option>Internship</option>
          <option>Part-Time</option>
          <option>Co-op</option>
        </select>
        <select className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option>All Faculties</option>
          <option>Engineering</option>
          <option>Business</option>
          <option>Design</option>
        </select>
        <div className="flex-1 relative min-w-[200px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Search jobs or companies..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Job Listings */}
      <div className="space-y-4">
        {mockJobs.map((job) => (
          <div key={job.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl bg-${job.company_icon_color}-100 flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined text-${job.company_icon_color}-600 text-2xl`}>{job.company_icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{job.title}</h3>
                    <p className="text-gray-600 font-medium">{job.company}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getTypeBadgeColor(job.type)}`}>
                    {job.type}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-3">{job.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">location_on</span>
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    Posted {job.posted_ago}
                  </span>
                </div>

                <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-md transition-shadow">
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompaniesTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Companies</h2>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 relative min-w-[200px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Search companies..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option>All Partner Types</option>
          <option>Main Partner</option>
          <option>Tech Partner</option>
          <option>Exhibitor</option>
        </select>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCompanies.map((company) => (
          <div key={company.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-3xl">business</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 group-hover:text-orange-500 transition-colors">arrow_forward</span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{company.description}</p>

            <div className="flex items-center justify-between">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                {company.partner_type || 'Partner'}
              </span>
              <span className="text-sm text-gray-600 font-medium">
                {Math.floor(Math.random() * 5) + 1} jobs
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render current tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderHomeTab();
      case 'schedule': return renderScheduleTab();
      case 'sessions': return renderSessionsTab();
      case 'jobs': return renderJobsTab();
      case 'companies': return renderCompaniesTab();
      default: return renderHomeTab();
    }
  };

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </SharedNavigation>
  );
};

export default AttendeeDashboard;
