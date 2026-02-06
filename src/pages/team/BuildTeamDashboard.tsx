import React, { useState } from "react";
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
  AlertCircle
} from "lucide-react";
import SharedNavigation, { NavItem } from "../../components/shared/SharedNavigation";

interface Session {
  id: string;
  title: string;
  description: string;
  speaker: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  current_attendees: number;
  session_type: string;
  created_at: string;
}



// Mock data for UI display
const mockSessions: Session[] = [
  {
    id: '1',
    title: 'Career Fair Kickoff',
    description: 'Opening session for the career fair',
    speaker: 'Dr. Sarah Johnson',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    location: 'Main Hall A',
    capacity: 200,
    current_attendees: 45,
    session_type: 'keynote',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Resume Workshop',
    description: 'Learn to craft the perfect resume',
    speaker: 'Michael Chen',
    start_time: new Date(Date.now() + 7200000).toISOString(),
    end_time: new Date(Date.now() + 10800000).toISOString(),
    location: 'Room 201',
    capacity: 50,
    current_attendees: 32,
    session_type: 'workshop',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Networking Mixer',
    description: 'Meet industry professionals',
    speaker: 'Various',
    start_time: new Date(Date.now() + 14400000).toISOString(),
    end_time: new Date(Date.now() + 18000000).toISOString(),
    location: 'Courtyard',
    capacity: 150,
    current_attendees: 78,
    session_type: 'networking',
    created_at: new Date().toISOString()
  }
];

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

  // Data State
  const [sessions] = useState<Session[]>(mockSessions);
  const [recentScans] = useState([
    { name: 'Sarah Jenkins', id: '#88294-A', time: 'Just now', status: 'success' },
    { name: 'Marcus Wright', id: '#92210-B', time: '2m ago', status: 'success' },
    { name: 'Elena Rodriguez', id: '#77103-S', time: '5m ago', status: 'success' },
  ]);

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

  // --- Handlers ---

  const handleSearchByPersonalId = () => {
    if (!searchTerm.trim()) {
      showFeedback('error', 'Please enter a Personal ID');
      return;
    }
    // UI only - show feedback
    showFeedback('success', 'Search feature demo - UI only');
    setSearchTerm("");
  };

  const handleQRScan = (qrData: string) => {
    // UI only - show feedback
    showFeedback('success', `QR Code scanned: ${qrData.substring(0, 10)}...`);
    setShowScanner(false);
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
              placeholder="Search by name or email"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
            />
          </div>
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
              <span className="text-6xl font-black text-slate-900 dark:text-white">1,482</span>
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
          {recentScans.map((scan, idx) => (
            <div key={idx} className="flex items-center gap-5 p-5 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle className="text-emerald-500 w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white truncate">{scan.name}</h4>
                <p className="text-sm text-slate-500 dark:text-gray-400">ID: {scan.id}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[12px] text-slate-400 font-medium">{scan.time}</span>
                </div>
              </div>
            </div>
          ))}
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sessions.map(session => (
          <div key={session.id} className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all flex flex-col justify-between h-full group bg-white">
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
                  <span className="text-sm font-medium">{session.location}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-50 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{session.current_attendees} checked-in</span>
              </div>
              <button
                onClick={() => {
                  setScannerContext('session');
                  setSelectedSessionForScan(session);
                  setShowScanner(true);
                }}
                className="bg-primary text-white p-2.5 rounded-xl shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
              >
                <QrCode className="w-5 h-5" />
              </button>
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

      {/* Mock QR Scanner - UI Only */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {scannerContext === 'session' ? `Scan for ${selectedSessionForScan?.title || 'Session'}` : "Scan Attendee QR Code"}
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-4">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Camera view (UI only)</p>
              </div>
            </div>
            <button
              onClick={() => handleQRScan('demo-qr-code-12345')}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Simulate Scan
            </button>
          </div>
        </div>
      )}
    </SharedNavigation>
  );
};