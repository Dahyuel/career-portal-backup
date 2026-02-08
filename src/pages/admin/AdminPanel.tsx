import React, { useState } from 'react';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { useAttendeeProfile } from '../../hooks/useAttendeeProfile';
import AttendeeProfileCard from '../../components/AttendeeProfileCard';
import {
  Plus,
  TrendingUp,
  Building2,
  Calendar,
  Megaphone,
  ArrowRight,
  UserCheck
} from 'lucide-react';

// Mock Data
const mockStats = {
  currentInEvent: 1124,
  maxInEvent: 1500,
  currentInBuilding: 312,
  maxInBuilding: 350,
  totalRegistrations: 4850,
  students: 3200,
  graduates: 1650,
  todayEntries: 2418,
  peakHour: '10:00 AM',
  peakCheckIns: 450
};

const mockSessions = [
  {
    id: '1',
    title: 'Career Growth Strategies',
    speaker: 'Dr. Sarah Johnson',
    time: '10:00 AM - 11:30 AM',
    location: 'Hall A',
    attendees: 145,
    capacity: 200
  },
  {
    id: '2',
    title: 'Tech Industry Insights',
    speaker: 'Ahmed Hassan',
    time: '2:00 PM - 3:30 PM',
    location: 'Hall B',
    attendees: 98,
    capacity: 150
  }
];

const mockEvents = [
  {
    id: '1',
    title: 'Opening Ceremony',
    date: '2025-10-19',
    time: '9:00 AM',
    location: 'Main Hall',
    description: 'Official opening of ASU Career Week 2025'
  },
  {
    id: '2',
    title: 'Networking Night',
    date: '2025-10-20',
    time: '6:00 PM',
    location: 'Garden Area',
    description: 'Meet professionals and build connections'
  }
];

const mockCompanies = [
  {
    id: '1',
    name: 'Tech Corp',
    logo: '🏢',
    industry: 'Technology',
    positions: 15,
    website: 'www.techcorp.com'
  },
  {
    id: '2',
    name: 'Finance Solutions',
    logo: '💼',
    industry: 'Finance',
    positions: 8,
    website: 'www.financesolutions.com'
  },
  {
    id: '3',
    name: 'Marketing Pro',
    logo: '📱',
    industry: 'Marketing',
    positions: 12,
    website: 'www.marketingpro.com'
  }
];

const mockJobs = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    applicants: 45,
    postedDate: '2025-10-15'
  },
  {
    id: '2',
    title: 'Marketing Manager',
    company: 'Marketing Pro',
    location: 'Remote',
    type: 'Full-time',
    applicants: 32,
    postedDate: '2025-10-14'
  },
  {
    id: '3',
    title: 'Financial Analyst',
    company: 'Finance Solutions',
    location: 'Alexandria, Egypt',
    type: 'Full-time',
    applicants: 28,
    postedDate: '2025-10-13'
  },
  {
    id: '4',
    title: 'UX Designer',
    company: 'Tech Corp',
    location: 'Cairo, Egypt',
    type: 'Contract',
    applicants: 51,
    postedDate: '2025-10-12'
  },
  {
    id: '5',
    title: 'Data Scientist',
    company: 'Tech Corp',
    location: 'Hybrid',
    type: 'Full-time',
    applicants: 67,
    postedDate: '2025-10-11'
  }
];

export function AdminPanel() {
  const { user } = useAuth();
  const { attendeeProfile } = useAttendeeProfile(user?.id);
  const [showProfile, setShowProfile] = useState(false);

  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'statistics', label: 'Statistics', icon: 'bar_chart' },
    { key: 'sessions', label: 'Sessions', icon: 'event' },
    { key: 'events', label: 'Events', icon: 'campaign' },
    { key: 'companies', label: 'Companies', icon: 'business' },
    { key: 'jobs', label: 'Jobs', icon: 'work' }
  ];

  const [activeTab, setActiveTab] = useState('dashboard');
  const [statisticsView, setStatisticsView] = useState<'general' | 'filter' | 'day'>('general');
  const [selectedDay, setSelectedDay] = useState(1);

  // Modal states
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // ===== DASHBOARD TAB =====
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-8 md:p-10 text-white shadow-xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome, Admin</h1>
        <p className="text-orange-50 text-lg mb-6 max-w-2xl">
          Monitor and manage all aspects of the career fair event from one central hub.
        </p>
        <button
          onClick={() => setShowProfile(true)}
          className="bg-white text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-50 transition-all flex items-center gap-2 shadow-lg"
        >
          <UserCheck className="h-5 w-5" />
          Show Profile
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Add Company</span>
          </div>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => setShowAddSessionModal(true)}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Add Session</span>
          </div>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => setShowAnnouncementModal(true)}
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Megaphone className="h-6 w-6" />
            </div>
            <span className="font-semibold text-lg">Send Announcement</span>
          </div>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current in Event */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-3xl">
                location_city
              </span>
            </div>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full">
              Good
            </span>
          </div>
          <div className="mb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              CURRENT IN EVENT
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">
                {mockStats.currentInEvent.toLocaleString()}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                / {mockStats.maxInEvent.toLocaleString()} max
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                style={{ width: `${(mockStats.currentInEvent / mockStats.maxInEvent) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Current in Building */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">
                business
              </span>
            </div>
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
              Warning
            </span>
          </div>
          <div className="mb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              CURRENT IN BUILDING
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">
                {mockStats.currentInBuilding.toLocaleString()}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                / {mockStats.maxInBuilding.toLocaleString()} max
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                style={{ width: `${(mockStats.currentInBuilding / mockStats.maxInBuilding) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Registrations */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">
                person_add
              </span>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-400 text-xs font-bold">12%</span>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              TOTAL REGISTRATIONS
            </p>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">
              {mockStats.totalRegistrations.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Students</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {mockStats.students.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Graduates</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {mockStats.graduates.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Entries */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-3xl">
                login
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">schedule</span>
              Last entry: 2m ago
            </span>
          </div>
          <div className="mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
              TODAY'S ENTRIES
            </p>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">
              {mockStats.todayEntries.toLocaleString()}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Peak Hour Volume
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {mockStats.peakCheckIns} check-ins
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== STATISTICS TAB =====
  const renderStatistics = () => (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-200 dark:border-slate-700 inline-flex gap-2">
        <button
          onClick={() => setStatisticsView('general')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === 'general'
            ? 'bg-orange-500 text-white shadow-md'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
        >
          General Analytics
        </button>
        <button
          onClick={() => setStatisticsView('filter')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === 'filter'
            ? 'bg-orange-500 text-white shadow-md'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
        >
          By Filter
        </button>
        <button
          onClick={() => setStatisticsView('day')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === 'day'
            ? 'bg-orange-500 text-white shadow-md'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
        >
          By Day
        </button>
      </div>

      {/* Content based on selected view */}
      {statisticsView === 'general' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">General Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Overall event statistics and trends will be displayed here.
          </p>
        </div>
      )}

      {statisticsView === 'filter' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Filter Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Filter by faculty, university, degree level, and more.
          </p>
        </div>
      )}

      {statisticsView === 'day' && (
        <div className="space-y-6">
          {/* Day Selector */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${selectedDay === day
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-orange-300'
                  }`}
              >
                Day {day}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Day {selectedDay} Statistics
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Detailed statistics for Day {selectedDay} will be displayed here.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ===== SESSIONS TAB =====
  const renderSessions = () => (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sessions</h2>
        <button
          onClick={() => setShowAddSessionModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="h-5 w-5" />
          Add Session
        </button>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockSessions.map((session) => (
          <div
            key={session.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{session.time}</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{session.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Speaker: {session.speaker}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{session.location}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {session.attendees}/{session.capacity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== EVENTS TAB =====
  const renderEvents = () => (
    <div className="space-y-6">
      {/* Header with Add Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Events</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddMapModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <span className="material-symbols-outlined">map</span>
            Add Map
          </button>
          <button
            onClick={() => setShowAddEventModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <Plus className="h-5 w-5" />
            Add Event
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((event) => (
          <div
            key={event.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{event.date}</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{event.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{event.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{event.location}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{event.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== COMPANIES TAB =====
  const renderCompanies = () => (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Companies</h2>
        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="h-5 w-5" />
          Add Company
        </button>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCompanies.map((company) => (
          <div
            key={company.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl">{company.logo}</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                  {company.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{company.industry}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {company.positions} positions
              </span>
              <button className="text-orange-600 dark:text-orange-400 text-sm font-semibold hover:underline">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== JOBS TAB =====
  const renderJobs = () => (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Job Opportunities</h2>
        <button
          onClick={() => setShowAddJobModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="h-5 w-5" />
          Add Job
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl">
                  work
                </span>
              </div>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-3 py-1 rounded-full">
                {job.type}
              </span>
            </div>

            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{job.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{job.company}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {job.location}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                  people
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {job.applicants} applicants
                </span>
              </div>
              <button className="text-orange-600 dark:text-orange-400 text-sm font-semibold hover:underline">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== SIMPLE MODALS (Placeholder) =====
  const SimpleModal: React.FC<{ show: boolean; onClose: () => void; title: string }> = ({
    show,
    onClose,
    title
  }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This modal is a placeholder. Add your form content here.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="ASU Career Week"
      onProfileClick={() => setShowProfile(true)}
      hideDock={showProfile}
    >
      <div className="max-w-7xl mx-auto">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'statistics' && renderStatistics()}
        {activeTab === 'sessions' && renderSessions()}
        {activeTab === 'events' && renderEvents()}
        {activeTab === 'companies' && renderCompanies()}
        {activeTab === 'jobs' && renderJobs()}
      </div>

      {/* Modals */}
      <SimpleModal
        show={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
        title="Add Company"
      />
      <SimpleModal
        show={showAddSessionModal}
        onClose={() => setShowAddSessionModal(false)}
        title="Add Session"
      />
      <SimpleModal
        show={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        title="Add Event"
      />
      <SimpleModal
        show={showAddMapModal}
        onClose={() => setShowAddMapModal(false)}
        title="Add Map"
      />
      <SimpleModal
        show={showAddJobModal}
        onClose={() => setShowAddJobModal(false)}
        title="Add Job"
      />
      <SimpleModal
        show={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        title="Send Announcement"
      />

      {/* Profile Card */}
      {showProfile && attendeeProfile && (
        <AttendeeProfileCard
          profile={attendeeProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </SharedNavigation>
  );
}
