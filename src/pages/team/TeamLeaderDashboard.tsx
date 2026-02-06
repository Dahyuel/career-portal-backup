import React, { useState } from 'react';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';

export const TeamLeaderDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'team' | 'announcements'>('home');

  // Mock data for UI
  const teamMembers = [
    { id: '1', name: 'Sarah Jenkins', role: 'Info Booth A', avatar: 'SJ', status: 'active', score: 245 },
    { id: '2', name: 'David Lawson', role: 'Main Entrance', avatar: 'DL', status: 'active', score: 198 },
    { id: '3', name: 'Michael Reed', role: 'Sponsor VIP Lounge', avatar: 'MR', status: 'active', score: 312 },
    { id: '4', name: 'Elena Sokolova', role: 'On Break', avatar: 'ES', status: 'break', score: 156 },
    { id: '5', name: 'James Wilson', role: 'Tech Support', avatar: 'JW', status: 'active', score: 289 },
    { id: '6', name: 'Anna Klein', role: 'Media Relations', avatar: 'AK', status: 'active', score: 223 },
  ];

  const recentActivity = [
    { id: '1', type: 'announcement', title: 'Broadcasted new announcement', time: '10:45 AM', detail: 'All Volunteers', icon: 'campaign', color: 'orange' },
    { id: '2', type: 'assignment', title: 'Assigned 5 volunteers to Hall B', time: '09:30 AM', detail: 'Coordination', icon: 'group_add', color: 'blue' },
    { id: '3', type: 'approval', title: 'Approved morning shift logs', time: 'Yesterday', detail: '', icon: 'task_alt', color: 'gray' },
  ];

  const announcementHistory = [
    { id: '1', title: 'Lunch Break Rotation', content: 'Shift A starts at 11:30 AM, Shift B at 12:15 PM.', target: 'Entire Team', time: '2h ago', priority: 'info', icon: 'info', color: 'blue' },
    { id: '2', title: 'Entrance Crowding Issue', content: 'Security team please assist at North entrance immediately.', target: 'Security', time: '4h ago', priority: 'urgent', icon: 'warning', color: 'red' },
    { id: '3', title: 'Morning Success', content: 'Great job everyone on the morning registration flow!', target: 'Entire Team', time: '6h ago', priority: 'normal', icon: 'celebration', color: 'green' },
  ];

  // Navigation items
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'team', label: 'Team', icon: 'group' },
    { key: 'announcements', label: 'Announcements', icon: 'campaign' }
  ];

  // Render Home Tab
  const renderHomeTab = () => (
    <div className="space-y-6 lg:space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl lg:rounded-[32px] overflow-hidden shadow-xl shadow-primary/10 p-6 lg:p-12 text-white" style={{ background: 'linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)' }}>
        <div className="relative z-10 max-w-2xl">
          <p className="uppercase tracking-widest text-orange-100 font-semibold text-xs mb-2">Team Leader Dashboard</p>
          <h1 className="text-3xl lg:text-5xl font-bold mb-3 lg:mb-4">Welcome, Alex</h1>
          <p className="text-sm lg:text-lg text-orange-50 mb-6 lg:mb-8 leading-relaxed">
            Ready to lead your team and ensure a seamless career fair experience today?
          </p>
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-6 lg:px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 w-fit shadow-lg">
            <span className="material-symbols-outlined text-xl">account_circle</span>
            Show Profile
          </button>
        </div>
        <div className="absolute bottom-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-white/20 rounded-full -mb-24 lg:-mb-32 -mr-24 lg:-mr-32 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          {/* Recent Activity */}
          <div>
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white">Recent Activity</h2>
              <a href="#" className="text-primary font-semibold hover:underline flex items-center gap-1 text-sm">
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>
            <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 lg:p-6">
              <div className="space-y-6 lg:space-y-8 relative">
                {/* Timeline line */}
                <div className="absolute left-[1.35rem] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700 hidden lg:block"></div>

                {recentActivity.map((activity) => (
                  <div key={activity.id} className="relative flex gap-4 lg:gap-6 items-start">
                    <div className={`relative z-10 w-10 lg:w-11 h-10 lg:h-11 flex-shrink-0 flex items-center justify-center rounded-xl ${activity.color === 'orange' ? 'bg-orange-100 dark:bg-orange-500/10' :
                      activity.color === 'blue' ? 'bg-blue-50 dark:bg-blue-500/10' :
                        'bg-slate-100 dark:bg-slate-700'
                      } lg:border-4 border-white dark:border-card-dark`}>
                      <span className={`material-symbols-outlined text-lg lg:text-xl ${activity.color === 'orange' ? 'text-primary' :
                        activity.color === 'blue' ? 'text-blue-500' :
                          'text-slate-500 dark:text-slate-300'
                        }`}>{activity.icon}</span>
                    </div>
                    <div className="flex-grow pt-1">
                      <h4 className="font-semibold text-slate-800 dark:text-white text-sm lg:text-base">{activity.title}</h4>
                      <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        {activity.time}{activity.detail && ` • ${activity.detail}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Right Side */}
        <div className="lg:col-span-4 space-y-4 lg:space-y-6">
          {/* Team Score Card */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-3 lg:mb-4">
              <span className="material-symbols-outlined text-amber-500">emoji_events</span>
            </div>
            <p className="text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team Score</p>
            <p className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-white mt-1">1,250</p>
          </div>

          {/* Team Members Card */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-5 lg:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mb-3 lg:mb-4">
              <span className="material-symbols-outlined text-orange-500">group</span>
            </div>
            <p className="text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team Members</p>
            <p className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-white mt-1">15</p>
          </div>

          {/* Live Capacity */}
          <div className="space-y-4 lg:space-y-6">
            <h2 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-white px-1">Live Capacity</h2>

            {/* Building Occupancy */}
            <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 lg:p-6">
              <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-500">domain</span>
                </div>
                <span className="px-2.5 lg:px-3 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-full">262 / 350</span>
              </div>
              <div>
                <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs lg:text-sm uppercase tracking-wider">Building Occupancy</h3>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-white">75%</span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs lg:text-sm mb-1.5 font-medium">of total</span>
                </div>
              </div>
              <div className="mt-4 lg:mt-6">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>

            {/* Event Capacity */}
            <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 lg:p-6">
              <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500">groups</span>
                </div>
                <span className="px-2.5 lg:px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-full uppercase">1320 / 1500</span>
              </div>
              <div>
                <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs lg:text-sm uppercase tracking-wider">Event Capacity</h3>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-white">88%</span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs lg:text-sm mb-1.5 font-medium">of max</span>
                </div>
              </div>
              <div className="mt-4 lg:mt-6">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Team Tab
  const renderTeamTab = () => (
    <div className="space-y-6 lg:space-y-8">
      {/* QR Scanner Banner */}
      <div className="rounded-2xl lg:rounded-[32px] p-6 lg:p-8 shadow-xl shadow-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)' }}>
        <div className="relative z-10 space-y-3 lg:space-y-4 max-w-lg">
          <h2 className="text-2xl lg:text-4xl font-extrabold text-white leading-tight">Scan Team Member QR</h2>
          <p className="text-white/80 font-medium text-sm lg:text-base">Instantly check-in members or update their shift assignments by scanning their badge.</p>
          <button className="bg-white text-primary px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-lg active:scale-95">
            <span className="material-symbols-outlined">qr_code_scanner</span>
            Open Scanner
          </button>
        </div>
        <div className="relative z-10 w-40 lg:w-56 h-40 lg:h-56 bg-white/10 backdrop-blur-sm rounded-3xl border-2 border-white/30 flex items-center justify-center transition-transform hover:scale-105">
          <span className="material-symbols-outlined text-6xl lg:text-8xl text-white">qr_code_2</span>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 lg:w-96 h-64 lg:h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Search team members..."
            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl py-3 lg:py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 lg:px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button className="flex items-center gap-2 px-4 lg:px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <span className="material-symbols-outlined text-sm">sort</span>
            <span className="hidden sm:inline">Sort</span>
          </button>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white dark:bg-zinc-900 p-4 lg:p-5 rounded-2xl lg:rounded-3xl border border-gray-100 dark:border-zinc-800 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                <div className="w-12 lg:w-14 h-12 lg:h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-100 dark:from-primary/10 dark:to-orange-900/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <span className="text-primary font-bold text-base lg:text-lg">{member.avatar}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm lg:text-base truncate">{member.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-tight truncate">{member.role}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Score: <span className="font-bold text-primary">{member.score}</span></p>
                </div>
              </div>
              <button className="w-9 lg:w-10 h-9 lg:h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-lg">info</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Announcements Tab
  const renderAnnouncementsTab = () => (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Create Announcement Form */}
        <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          <div className="bg-white dark:bg-card-dark rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-6 lg:mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">add_comment</span>
              </div>
              <h2 className="text-lg lg:text-xl font-bold dark:text-white tracking-tight">Create New Announcement</h2>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Recipient Group</label>
                <div className="relative">
                  <select className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-2xl py-3 lg:py-4 px-4 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer">
                    <option value="entire">Entire Team</option>
                    <option value="volunteers">Specific Roles: Volunteers</option>
                    <option value="security">Specific Roles: Security</option>
                    <option value="custom">Custom Selection...</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Priority Level</label>
                <div className="relative">
                  <select className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-2xl py-3 lg:py-4 px-4 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer">
                    <option value="normal">Normal Priority</option>
                    <option value="urgent">Urgent / High Priority</option>
                    <option value="info">Information Only</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">priority_high</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4 lg:mb-6">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Message Title</label>
              <input
                type="text"
                placeholder="e.g. Lunch Break Schedule Update"
                className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-2xl py-3 lg:py-4 px-4 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2 mb-6 lg:mb-8">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Message Content</label>
              <textarea
                placeholder="Enter the details of your announcement here..."
                rows={6}
                className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-2xl py-3 lg:py-4 px-4 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              ></textarea>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="material-symbols-outlined text-sm">info</span>
                <span className="text-xs">Your team will receive push notifications instantly.</span>
              </div>
              <button className="w-full sm:w-auto text-white font-bold py-3 lg:py-4 px-8 lg:px-10 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3" style={{ background: 'linear-gradient(135deg, #FF7E47 0%, #FF7E47 60%, #ffffff 130%)' }}>
                <span className="material-symbols-outlined text-xl">send</span>
                Send Announcement
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1 space-y-4 lg:space-y-6">
          {/* Recent History */}
          <div className="bg-white dark:bg-card-dark rounded-2xl lg:rounded-3xl p-5 lg:p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white text-base lg:text-lg">Recent History</h3>
              <button className="text-primary text-xs font-bold hover:underline">View All</button>
            </div>
            <div className="space-y-3 lg:space-y-4">
              {announcementHistory.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-3 lg:p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-transparent hover:border-gray-100 dark:hover:border-zinc-800 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 lg:w-10 h-9 lg:h-10 rounded-full flex items-center justify-center shrink-0 ${announcement.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                      announcement.color === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                        'bg-green-100 dark:bg-green-900/30 text-green-600'
                      }`}>
                      <span className="material-symbols-outlined text-lg">{announcement.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{announcement.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{announcement.content}</p>
                      <div className="flex items-center gap-3 mt-2 lg:mt-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{announcement.target}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{announcement.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 lg:mt-6 py-3 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-gray-400 hover:text-primary hover:border-primary/50 transition-all">
              Load More History
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={(key) => setActiveTab(key as 'home' | 'team' | 'announcements')}
      title="ASU Career Week"
    >
      <div className="max-w-7xl mx-auto">
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'announcements' && renderAnnouncementsTab()}
      </div>
    </SharedNavigation>
  );
};

export default TeamLeaderDashboard;