// pages/team/TeamLeaderDashboard.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { supabase } from '../../lib/supabase';
import { QRScanner } from '../../components/shared/QRScanner';
import VolunteerInfoModal from '../../components/teamleader/VolunteerInfoModal';
import Toast from '../../components/shared/Toast';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Define the dashboard tabs
type TabKey = 'home' | 'team' | 'announcements';

interface TeamMember {
  user_id: string;
  volunteer_id: string;
  full_name: string;
  total_points: number;
  hours_volunteered: number;
  email?: string;
  phone?: string;
  personal_id?: string;
  team_id?: string;
}

interface TeamInfo {
  team_id: string;
  team_name: string;
  team_leader_id: string;
}

export const TeamLeaderDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [leaderName, setLeaderName] = useState('');
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [eventEntriesCount, setEventEntriesCount] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<TeamMember | null>(null);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [loadingVolunteerDetails, setLoadingVolunteerDetails] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ show: false, message: '', type: 'info' });

  const MEMBERS_PER_PAGE = 50;

  // Navigation items
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'team', label: 'Team', icon: 'groups' },
    { key: 'announcements', label: 'Announcements', icon: 'campaign' }
  ];

  // Fetch team leader data on mount
  useEffect(() => {
    const fetchTeamLeaderData = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user found');
          return;
        }

        // Get user profile for name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          const firstName = profile.full_name.split(' ')[0];
          setLeaderName(firstName);
        }

        // Get volunteer record to find team
        const { data: volunteer } = await supabase
          .from('volunteers')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        if (!volunteer?.team_id) {
          console.error('No team assigned to leader');
          return;
        }

        // Get team info
        const { data: team } = await supabase
          .from('volunteer_teams')
          .select('id, team_name, team_leader_id')
          .eq('id', volunteer.team_id)
          .single();

        if (team) {
          setTeamInfo({
            team_id: team.id,
            team_name: team.team_name,
            team_leader_id: team.team_leader_id
          });

          // Fetch team members
          await fetchTeamMembers(team.id);

          // Fetch event entries count
          await fetchEventEntriesCount(team.id);
        }

      } catch (error) {
        console.error('Error fetching team leader data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamLeaderData();
  }, []);

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('user_id, volunteer_id, full_name, total_points, hours_volunteered')
        .eq('team_id', teamId)
        .order('full_name', { ascending: true });

      if (error) throw error;

      setTeamMembers(data || []);
      setFilteredMembers(data || []);
      setTeamMembersCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchEventEntriesCount = async (teamId: string) => {
    try {
      // Get all volunteers in the team
      const { data: volunteers } = await supabase
        .from('volunteers')
        .select('user_id')
        .eq('team_id', teamId);

      if (!volunteers) return;

      const userIds = volunteers.map(v => v.user_id);

      // Count users with event_entry = true
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds)
        .eq('event_entry', true);

      if (error) throw error;

      setEventEntriesCount(count || 0);
    } catch (error) {
      console.error('Error fetching event entries count:', error);
    }
  };

  // Search filter effect
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(teamMembers);
    } else {
      const filtered = teamMembers.filter(member =>
        member.volunteer_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, teamMembers]);

  // Fetch full volunteer data including user profile - using two queries for reliability
  const fetchFullVolunteer = async (volunteerId: string): Promise<TeamMember | null> => {
    setLoadingVolunteerDetails(true);
    try {
      // First, get the volunteer data
      const { data: volunteerData, error: volunteerError } = await supabase
        .from('volunteers')
        .select('user_id, volunteer_id, full_name, total_points, hours_volunteered, team_id')
        .or(`volunteer_id.eq.${volunteerId},user_id.eq.${volunteerId}`)
        .maybeSingle();

      if (volunteerError) {
        console.error('Error fetching volunteer:', volunteerError);
        return null;
      }

      if (!volunteerData) {
        return null;
      }

      // Then, get the user profile data using the user_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('email, phone, personal_id')
        .eq('id', volunteerData.user_id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      // Combine the data
      return {
        user_id: volunteerData.user_id,
        volunteer_id: volunteerData.volunteer_id,
        full_name: volunteerData.full_name,
        total_points: volunteerData.total_points,
        hours_volunteered: volunteerData.hours_volunteered,
        team_id: volunteerData.team_id,
        email: profileData?.email || '',
        phone: profileData?.phone || '',
        personal_id: profileData?.personal_id || ''
      };
    } catch (error) {
      console.error('Error in fetchFullVolunteer:', error);
      return null;
    } finally {
      setLoadingVolunteerDetails(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    try {
      setShowQRScanner(false);

      // Fetch full volunteer data
      const volunteerData = await fetchFullVolunteer(qrData);

      if (volunteerData) {
        // Check if volunteer is in the same team
        if (volunteerData.team_id === teamInfo?.team_id) {
          setSelectedVolunteer(volunteerData);
          setShowVolunteerModal(true);
        } else {
          setToast({ show: true, message: 'Volunteer not found in your team', type: 'warning' });
        }
      } else {
        setToast({ show: true, message: 'Volunteer not found', type: 'error' });
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setToast({ show: true, message: 'Error processing QR scan', type: 'error' });
    }
  };

  const handleSendAnnouncement = async () => {
    if (!teamInfo || !announcementTitle.trim() || !announcementContent.trim()) {
      setToast({ show: true, message: 'Please fill in both title and content', type: 'warning' });
      return;
    }

    setSendingAnnouncement(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setToast({ show: true, message: 'User not authenticated', type: 'error' });
        return;
      }

      // Insert notification with target_roles = ['volunteer'] and team_id
      const { error } = await supabase
        .from('notifications')
        .insert({
          event_id: 'aeddbdef-dc7b-406d-9a86-e3ed2e6b3ca5',
          title: announcementTitle.trim(),
          content: announcementContent.trim(),
          announcement_type: 'general',
          target_roles: ['volunteer'], // Only volunteers
          team_id: teamInfo.team_id, // Team's ID from volunteer_teams
          sender_id: user.id
        });

      if (error) {
        console.error('Error sending announcement:', error);
        setToast({ show: true, message: 'Failed to send announcement', type: 'error' });
        return;
      }

      // Success
      setToast({ show: true, message: 'Announcement sent successfully!', type: 'success' });
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (error) {
      console.error('Error in handleSendAnnouncement:', error);
      setToast({ show: true, message: 'An unexpected error occurred', type: 'error' });
    } finally {
      setSendingAnnouncement(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);
  const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + MEMBERS_PER_PAGE);

  const renderHomeTab = () => (
    <motion.div
      key="home"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Welcome Card */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 shadow-lg shadow-red-500/20 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-9xl text-white transform rotate-12">
            groups
          </span>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Welcome, {leaderName}!
          </h2>
          <p className="text-red-100 text-lg mb-6 max-w-xl">
            {teamInfo?.team_name} Team Leader - Ready to lead your team and ensure a seamless career fair experience today?
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQRScanner(true)}
            className="bg-white text-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            Scan Team Member
          </motion.button>
        </div>
      </motion.div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">group</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
          </div>
          <p className="text-4xl font-bold text-blue-600">{teamMembersCount}</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl">event_available</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Entries</h3>
          </div>
          <p className="text-4xl font-bold text-green-600">{eventEntriesCount}</p>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderTeamTab = () => (
    <motion.div
      key="team"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Team Management Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">groups</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Team Management</h2>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search by Volunteer ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQRScanner(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            QR Scanner
          </motion.button>
        </div>
      </motion.div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedMembers.map((member) => (
          <motion.div
            key={member.user_id}
            variants={itemVariants}
            onClick={async () => {
              setShowVolunteerModal(true); // Open modal immediately
              setSelectedVolunteer(null); // Clear previous data
              const fullData = await fetchFullVolunteer(member.user_id);
              if (fullData) {
                setSelectedVolunteer(fullData);
              } else {
                setShowVolunteerModal(false);
                setToast({ show: true, message: 'Failed to load volunteer details', type: 'error' });
              }
            }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{member.full_name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">ID: {member.volunteer_id || 'N/A'}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Points</p>
                <p className="font-semibold text-gray-900 dark:text-white">{member.total_points || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Hours</p>
                <p className="font-semibold text-gray-900 dark:text-white">{member.hours_volunteered || 0}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Next
          </button>
        </motion.div>
      )}
    </motion.div>
  );

  const renderAnnouncementsTab = () => (
    <motion.div
      key="announcements"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">campaign</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Send Announcement</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="Enter announcement title"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <textarea
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              placeholder="Enter announcement content"
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSendAnnouncement}
            disabled={sendingAnnouncement || !announcementTitle.trim() || !announcementContent.trim()}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sendingAnnouncement ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">send</span>
                Send to Team
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      <SharedNavigation
        navItems={navItems}
        activeItem={activeTab}
        onItemChange={(key) => setActiveTab(key as TabKey)}
        title="ASU Career Week"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'team' && renderTeamTab()}
          {activeTab === 'announcements' && renderAnnouncementsTab()}
        </AnimatePresence>
      </SharedNavigation>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
          title="Scan Team Member"
          description="Scan a team member's QR code to view their information"
        />
      )}

      {/* Volunteer Info Modal */}
      <VolunteerInfoModal
        isOpen={showVolunteerModal}
        onClose={() => {
          setShowVolunteerModal(false);
          setSelectedVolunteer(null);
        }}
        volunteer={selectedVolunteer}
        teamLeaderId={teamInfo?.team_leader_id || ''}
        loading={loadingVolunteerDetails}
        onSuccess={async () => {
          // Refresh team members data
          if (teamInfo) {
            await fetchTeamMembers(teamInfo.team_id);

            // Also refresh the selected volunteer's data so the card updates
            if (selectedVolunteer) {
              const updatedVolunteer = await fetchFullVolunteer(selectedVolunteer.volunteer_id || selectedVolunteer.user_id);
              if (updatedVolunteer) {
                setSelectedVolunteer(updatedVolunteer);
              }
            }
          }
        }}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
            duration={3000}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default TeamLeaderDashboard;