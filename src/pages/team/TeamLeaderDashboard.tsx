// pages/team/TeamLeaderDashboard.tsx
import FeedbackTab from '../../components/shared/FeedbackTab';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { QRScanner } from '../../components/shared/QRScanner';
import VolunteerInfoModal from '../../components/teamleader/VolunteerInfoModal';
import VolunteerProfileModal from '../../components/volunteer/VolunteerProfileModal';
import Toast from '../../components/shared/Toast';
import DashboardLoading from '../../components/DashboardLoading';
import { logger } from '../../utils/logger';
import { getActiveEventId } from '../../lib/currentEvent';

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
type TabKey = 'home' | 'team' | 'announcements' | 'feedback';

interface TeamInfo {
  team_id: string;
  team_name: string;
  team_leader_ids: string[];
  event_id: string;
}

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

export const TeamLeaderDashboard: React.FC = () => {
  // The team leader's own event. Without it the database falls back to whichever
  // event is current, which is the wrong team when two events are live.
  const { profile } = useAuth();
  const EVENT_ID = profile?.event_id || getActiveEventId();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [isTeamListLoaded, setIsTeamListLoaded] = useState(false);
  const [loadingTeamList, setLoadingTeamList] = useState(false);
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
  const [showProfile, setShowProfile] = useState(false);
  const MEMBERS_PER_PAGE = 50;

  // Navigation items
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'team', label: 'Team', icon: 'groups' },
    { key: 'announcements', label: 'Announcements', icon: 'campaign' },
    { key: 'feedback', label: 'Feedback', icon: 'rate_review' }
  ];

  // Fetch team leader data on mount
  useEffect(() => {
    // Admins legitimately have no event of their own, and this RPC allows them.
    // Passing null lets the database fall back to the current event, as before.
    const eventId = profile?.event_id ?? null;

    const fetchTeamLeaderData = async () => {
      try {
        setLoading(true);

        // Single RPC call to get team info, leader name, and member count
        const { data, error } = await supabase.rpc('get_team_leader_data', {
          p_event_id: eventId
        });

        if (error || !data) {
          logger.error('Error fetching team leader data:', error);
          return;
        }

        // Set leader name
        if (data.leader_name) {
          const firstName = data.leader_name.split(' ')[0];
          setLeaderName(firstName);
        }

        // Set team info
        setTeamInfo({
          team_id: data.team_id,
          team_name: data.team_name,
          team_leader_ids: data.team_leader_ids || [],
          event_id: data.event_id
        });

        // Set members count from RPC response
        setTeamMembersCount(data.members_count || 0);

        // Fetch event entries count
        await fetchEventEntriesCount(data.event_id);

      } catch (error) {
        logger.error('Error fetching team leader data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamLeaderData();
  }, [profile?.event_id]);

  // fetchInitialTeamStats is now handled by get_team_leader_data RPC

  const fetchTeamMembers = useCallback(async (teamId: string) => {
    if (isTeamListLoaded) return;

    setLoadingTeamList(true);
    try {
      const { data, error } = await supabase.rpc('get_team_members_list', {
        p_team_id: teamId
      });

      if (error) throw error;

      const members = data || [];
      setTeamMembers(members);
      setFilteredMembers(members);
      setTeamMembersCount(members.length);
      setIsTeamListLoaded(true);
    } catch (error) {
      logger.error('Error fetching team members:', error);
    } finally {
      setLoadingTeamList(false);
    }
  }, [isTeamListLoaded]);

  const fetchEventEntriesCount = async (eventId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_event_entries_count', {
        p_event_id: eventId
      });

      if (error) throw error;
      setEventEntriesCount(data || 0);
    } catch (error) {
      logger.error('Error fetching event entries count:', error);
    }
  };

  // Search filter effect
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(teamMembers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = teamMembers.filter(member =>
        member.volunteer_id?.toLowerCase().includes(query) ||
        member.personal_id?.toLowerCase().includes(query)
      );
      setFilteredMembers(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, teamMembers]);

  // Load team members when tab changes
  useEffect(() => {
    if (activeTab === 'team' && !isTeamListLoaded && teamInfo) {
      fetchTeamMembers(teamInfo.team_id);
    }
  }, [activeTab, isTeamListLoaded, teamInfo, fetchTeamMembers]);

  const fetchFullVolunteer = async (volunteerId: string): Promise<TeamMember | null> => {
    setLoadingVolunteerDetails(true);
    try {
      const { data, error } = await supabase.rpc('get_full_volunteer_details', {
        p_volunteer_identifier: volunteerId,
        p_event_id: profile?.event_id ?? null
      });

      if (error) {
        logger.error('Error in fetchFullVolunteer:', error);
        return null;
      }

      if (!data) return null;

      return {
        user_id: data.user_id,
        volunteer_id: data.volunteer_id,
        full_name: data.full_name,
        total_points: data.total_points,
        hours_volunteered: data.hours_volunteered,
        team_id: data.team_id,
        email: data.email || '',
        phone: data.phone || '',
        personal_id: data.personal_id || ''
      };
    } catch (error) {
      logger.error('Error in fetchFullVolunteer:', error);
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
      logger.error('Error processing QR scan:', error);
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
      const { error } = await supabase.rpc('send_team_announcement', {
        p_event_id: teamInfo.event_id,
        p_team_id: teamInfo.team_id,
        p_title: announcementTitle.trim(),
        p_content: announcementContent.trim(),
        p_announcement_type: 'team'
      });
      if (error) {
        logger.error('Error sending announcement:', error);
        setToast({ show: true, message: 'Failed to send announcement', type: 'error' });
        return;
      }

      setToast({ show: true, message: 'Announcement sent successfully!', type: 'success' });
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (error) {
      logger.error('Error in handleSendAnnouncement:', error);
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
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">group</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
          </div>
          <p className="text-4xl font-bold text-blue-600">{teamMembersCount}</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
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
      <motion.header variants={itemVariants} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">groups</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Manage your team members and view their performance</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search by Personal ID or Volunteer ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
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
      {loadingTeamList ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
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
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-xl transition-shadow"
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">campaign</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Send Announcement</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Broadcast important messages to your team</span>
            </div>
          </div>
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
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
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
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
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
      <DashboardLoading message="Loading Team Dashboard" subMessage="Fetching your team stats..." />
    );
  }

  return (
    <>
      <SharedNavigation
        navItems={navItems}
        activeItem={activeTab}
        onItemChange={(key) => setActiveTab(key as TabKey)}
        title="ASU Career Expo"
        onProfileClick={() => setShowProfile(true)}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'team' && renderTeamTab()}
          {activeTab === 'announcements' && renderAnnouncementsTab()}
          {activeTab === 'feedback' && <FeedbackTab eventId={EVENT_ID} subtitle="Tell us how the event went for you as a volunteer. Your answers help us improve." />}
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

      {/* Volunteer Profile Modal */}
      <VolunteerProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
};

export default TeamLeaderDashboard;