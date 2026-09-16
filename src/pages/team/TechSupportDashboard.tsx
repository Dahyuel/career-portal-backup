import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import DashboardLoading from '../../components/DashboardLoading';
import Toast from '../../components/shared/Toast';
import VolunteerProfileModal from '../../components/volunteer/VolunteerProfileModal';
import { supabase, DEFAULT_EVENT_ID } from '../../lib/supabase';
import { logger } from '../../utils/logger';

// ─── Animation Variants ────────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  exit: { opacity: 0 },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Volunteer Role Options ────────────────────────────────────────────────────
const VOLUNTEER_ROLES = [
  { value: 'volunteer', label: 'Volunteer', icon: 'volunteer_activism', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'registration', label: 'Registration', icon: 'how_to_reg', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'building', label: 'Building', icon: 'construction', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'info_desk', label: 'Info Desk', icon: 'info', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'verification', label: 'Verification', icon: 'verified_user', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { value: 'team_leader', label: 'Team Leader', icon: 'manage_accounts', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserResult {
  id: string;
  full_name: string;
  email: string;
  role: string;
  roles?: string[];
  personal_id?: string;
  phone?: string;
  created_at?: string;
}

// ─── All Teams (must match volunteer_teams in DB) ─────────────────────────────
const TEAM_OPTIONS = [
  { id: '394b8631-7948-49f1-87ba-bc7e3ead12b9', name: 'Feedback' },
  { id: '481237b5-45ef-463f-8460-b6f848835756', name: 'Stage' },
  { id: '587e30ea-20b2-4292-81fe-02945f6d2a3f', name: 'Marketing' },
  { id: '8052492b-55bb-46d0-ab4c-52a6df81c4c9', name: 'Media' },
  { id: '9269ac6a-7b2c-4be5-ab72-3f8278eb8e33', name: 'Info Desk' },
  { id: '97ab5a37-557e-4a81-ae81-9dcc6bbae87a', name: 'Usher' },
  { id: 'a0abd4b7-7879-4a07-806d-fd0e2f4257f1', name: 'Verification' },
  { id: 'ae0e251c-81f5-4763-a9db-39ca511fd03c', name: 'Catering' },
  { id: 'be96f64f-6674-421d-84f3-791a27bd4121', name: 'ER' },
  { id: 'f9419a07-f974-4f59-bba2-b2f9a2b2fa7f', name: 'Building' },
  { id: 'fc15e3bb-ceed-4aa3-acf5-004a7af664ed', name: 'Registration' },
  { id: '9bfd710f-202d-4706-a9ee-5178d0fd7843', name: 'Technical Support' },
];

// Roles that have a fixed team (1-to-1 mapping)
const NAMED_ROLE_OPTIONS = [
  { role: 'building',      teamId: 'f9419a07-f974-4f59-bba2-b2f9a2b2fa7f', label: 'Building',          icon: 'construction' },
  { role: 'registration',  teamId: 'fc15e3bb-ceed-4aa3-acf5-004a7af664ed', label: 'Registration',       icon: 'how_to_reg' },
  { role: 'info_desk',     teamId: '9269ac6a-7b2c-4be5-ab72-3f8278eb8e33', label: 'Info Desk',          icon: 'info' },
  { role: 'verification',  teamId: 'a0abd4b7-7879-4a07-806d-fd0e2f4257f1', label: 'Verification',       icon: 'verified_user' },
  { role: 'tech_support',  teamId: '9bfd710f-202d-4706-a9ee-5178d0fd7843', label: 'Technical Support',  icon: 'support_agent' },
];

// Generic volunteer assignments (role = volunteer, different teams)
const VOLUNTEER_TEAM_OPTIONS = [
  { role: 'volunteer', teamId: 'ae0e251c-81f5-4763-a9db-39ca511fd03c', label: 'Catering',   icon: 'restaurant' },
  { role: 'volunteer', teamId: 'be96f64f-6674-421d-84f3-791a27bd4121', label: 'ER',         icon: 'local_hospital' },
  { role: 'volunteer', teamId: '394b8631-7948-49f1-87ba-bc7e3ead12b9', label: 'Feedback',   icon: 'rate_review' },
  { role: 'volunteer', teamId: '587e30ea-20b2-4292-81fe-02945f6d2a3f', label: 'Marketing',  icon: 'campaign' },
  { role: 'volunteer', teamId: '8052492b-55bb-46d0-ab4c-52a6df81c4c9', label: 'Media',      icon: 'camera' },
  { role: 'volunteer', teamId: '481237b5-45ef-463f-8460-b6f848835756', label: 'Stage',      icon: 'theater_comedy' },
  { role: 'volunteer', teamId: '97ab5a37-557e-4a81-ae81-9dcc6bbae87a', label: 'Usher',      icon: 'waving_hand' },
];

// ─── Confirmation Modal ────────────────────────────────────────────────────────
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  icon?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading = false, icon = 'warning'
}) => (
  <motion.div
    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-slate-800"
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
    >
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-red-600">{icon}</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${confirmClass}`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : confirmLabel}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── User Result Card ──────────────────────────────────────────────────────────
interface UserResultCardProps {
  user: UserResult;
  onChangeRole: (user: UserResult) => void;
  onDeleteUser: (user: UserResult) => void;
}

const UserResultCard: React.FC<UserResultCardProps> = ({ user, onChangeRole, onDeleteUser }) => {
  const getRoleBadge = (role: string) => {
    const found = VOLUNTEER_ROLES.find(r => r.value === role);
    if (found) return found.color;
    if (role === 'attendee') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (role === 'admin' || role === 'super_admin' || role === 'sadmin') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (role === 'tech_support') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">
            {user.full_name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">{user.full_name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map((r, i) => (
                <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${getRoleBadge(r)}`}>
                  {r?.replace('_', ' ') || 'Unknown'}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            {user.phone && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">phone</span>
                {user.phone}
              </span>
            )}
            {user.personal_id && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">badge</span>
                ID: {user.personal_id}
              </span>
            )}
            {user.created_at && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
        <button
          onClick={() => onChangeRole(user)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <span className="material-symbols-outlined text-base">manage_accounts</span>
          Change Role
        </button>
        <button
          onClick={() => onDeleteUser(user)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <span className="material-symbols-outlined text-base">delete</span>
          Delete User
        </button>
      </div>
    </motion.div>
  );
};

// ─── Main Dashboard Component ──────────────────────────────────────────────────
export const TechSupportDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // ── Search State ──────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<UserResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Delete State ──────────────────────────────────────────────────────────────
  const [userToDelete, setUserToDelete] = useState<UserResult | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Role Change State ─────────────────────────────────────────────────────────
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{ role: string; teamId: string; label: string } | null>(null);
  const [roleChangePending, setRoleChangePending] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  // We need volunteer info for the role change RPC
  const [volunteerInfo, setVolunteerInfo] = useState<{ volunteer_id?: string; team_id?: string; team_name?: string; role?: string } | null>(null);

  const firstName = profile?.full_name?.split(' ')[0] || 'Tech Support';

  // ── Search by Email, Phone, or Personal ID ────────────────────────────────────
  const handleSearch = async () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setHasSearched(true);
    setShowRoleChange(false);
    setSelectedOption(null);
    setVolunteerInfo(null);

    try {
      const { data, error } = await supabase
        .rpc('tech_support_search_user', { p_query: trimmed });
      if (error) throw error;

      if (!data?.success) {
        if (data?.error === 'not_found') {
          setSearchResult(null);
        } else {
          throw new Error(data?.error || 'Search failed');
        }
        return;
      }

      const u = data.user;
      setSearchResult({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        personal_id: u.personal_id,
        created_at: u.created_at,
        roles: u.roles || [],
        role: u.roles?.[0] || 'unknown',
      });
    } catch (err: any) {
      logger.error('Error searching user:', err);
      setSearchError(err?.message || 'Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Start Role Change (fetch volunteer info first) ────────────────────────────
  const handleStartRoleChange = async (user: UserResult) => {
    setShowRoleChange(true);
    setSelectedOption(null);
    setVolunteerInfo(null);

    // Fetch the volunteer details via the existing RPC
    try {
      const { data, error } = await supabase.rpc('tech_support_search_volunteer', {
        p_national_id: user.personal_id || '',
      });
      if (error) throw error;
      if (data?.success && data?.user) {
        setVolunteerInfo({
          volunteer_id: data.user.volunteer_id,
          team_id: data.user.team_id,
          team_name: data.user.team_name,
          role: data.user.role,
        });
      }
    } catch (err: any) {
      logger.error('Error fetching volunteer info:', err);
      setToast({ message: 'Could not fetch volunteer info. User may not be a volunteer.', type: 'warning' });
    }
  };

  // ── Confirm Role Change ───────────────────────────────────────────────────────
  const handleRoleChangeSubmit = () => {
    if (!selectedOption) {
      setToast({ message: 'Please select a role assignment.', type: 'warning' });
      return;
    }
    setShowRoleConfirm(true);
  };

    const handleRoleChangeConfirm = async () => {
        if (!searchResult || !selectedOption) return;
        setRoleChangePending(true);
        try {
            let data: any;
            let error: any;

            if (selectedOption.role === 'team_leader') {
                const result = await supabase.rpc('promote_to_team_leader', {
                    _user_id: searchResult.id,
                    _event_id: DEFAULT_EVENT_ID,
                    _team_id: selectedOption.teamId,
                });
                data = result.data;
                error = result.error;
            } else {
                const result = await supabase.rpc('change_volunteer_team', {
                    _user_id: searchResult.id,
                    _event_id: DEFAULT_EVENT_ID,
                    _team_id: selectedOption.teamId,
                });
                data = result.data;
                error = result.error;
            }

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Role change failed');

            const newTeamName = TEAM_OPTIONS.find(t => t.id === selectedOption.teamId)?.name || '';
            setVolunteerInfo(prev => prev ? {
                ...prev,
                role: selectedOption.role,
                team_id: selectedOption.teamId,
                team_name: newTeamName,
            } : null);

            setToast({ message: `Role changed to "${selectedOption.label}" successfully!`, type: 'success' });
            setShowRoleConfirm(false);
            setShowRoleChange(false);
            setSelectedOption(null);

            // Re-search to refresh roles
            handleSearch();
        } catch (err: any) {
            logger.error('Error changing role:', err);
            setToast({ message: err?.message || 'Failed to change role.', type: 'error' });
        } finally {
            setRoleChangePending(false);
        }
    };

  // ── Delete User ───────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('tech_support_delete_user', { p_user_id: userToDelete.id });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Delete failed');

      setToast({ message: `User "${userToDelete.full_name}" has been permanently deleted.`, type: 'success' });
      setUserToDelete(null);
      setSearchResult(null);
      setHasSearched(false);
      setSearchInput('');
      setShowRoleChange(false);
    } catch (err: any) {
      logger.error('Error deleting user:', err);
      setToast({ message: err?.message || 'Failed to delete user.', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Nav Items (only 2 tabs) ──────────────────────────────────────────────────
  const navItems: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'search', label: 'Search User', icon: 'manage_search' },
  ];

  // ─── TAB: Home ────────────────────────────────────────────────────────────────
  const renderHomeTab = () => (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible" exit="exit">

      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="relative rounded-2xl overflow-hidden shadow-xl shadow-red-500/10 p-8 md:p-12 min-h-[300px] flex flex-col justify-center text-white"
        style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
      >
        {/* Decorative icon */}
        <div className="absolute top-0 right-0 p-8 opacity-10 select-none pointer-events-none">
          <span className="material-symbols-outlined text-[140px] text-white transform rotate-12">
            support_agent
          </span>
        </div>
        {/* Glow blob */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mb-32 -mr-32 blur-3xl" />

        <div className="relative z-10">
          <p className="uppercase tracking-widest text-red-200 font-semibold text-xs mb-2">
            Technical Support Dashboard
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome, {firstName}!
          </h1>
          <p className="text-lg text-red-100 opacity-90 max-w-md mb-8">
            Your control panel for user management. Search users, modify roles, and manage accounts.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('search')}
              className="bg-white text-red-600 hover:bg-red-50 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined">manage_search</span>
              Search User
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Card */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => setActiveTab('search')}
          className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 text-left hover:shadow-md transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl text-asu-red dark:text-red-400">manage_search</span>
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Search User</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Find any user by their email, phone, or Personal ID, then change their role or delete their account</p>
          <div className="flex items-center gap-1 mt-4 text-sm font-semibold text-asu-red dark:text-red-400">
            Open
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </button>
      </motion.div>

      {/* Recent Actions empty state */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-asu-red">history</span>
          Recent Actions
        </h3>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-5xl text-gray-200 dark:text-slate-700 mb-2 block">history</span>
          <p className="text-sm">No recent actions yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Actions performed here will appear in this feed</p>
        </div>
      </motion.div>
    </motion.div>
  );

  // ─── TAB: Search User ─────────────────────────────────────────────────────────
  const renderSearchTab = () => (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <span className="material-symbols-outlined text-blue-600">manage_search</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Search User</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Find a user by their email, phone, or Personal ID</p>
        </div>
      </motion.div>

      {/* Search Box */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm"
      >
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Search Query</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">badge</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter email, phone, or personal ID"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchLoading || !searchInput.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
          >
            {searchLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined">search</span>
                Search
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {searchLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
              <motion.div
                className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Searching...</p>
          </motion.div>
        )}

        {!searchLoading && searchError && (
          <motion.div key="error" variants={itemVariants} initial="hidden" animate="visible" exit="exit"
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex items-start gap-4">
            <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">Search Error</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{searchError}</p>
            </div>
          </motion.div>
        )}

        {!searchLoading && !searchError && hasSearched && !searchResult && (
          <motion.div key="not-found" variants={itemVariants} initial="hidden" animate="visible" exit="exit" className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-700 block mb-3">person_off</span>
            <p className="font-bold text-gray-700 dark:text-gray-300">No user found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No user matching that query exists in the system.</p>
          </motion.div>
        )}

        {!searchLoading && searchResult && (
          <motion.div key="result" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
            <UserResultCard
              user={searchResult}
              onChangeRole={handleStartRoleChange}
              onDeleteUser={setUserToDelete}
            />

            {/* Inline Role Change Section */}
            <AnimatePresence>
              {showRoleChange && (
                <motion.div
                  key="role-change"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-asu-red">swap_horiz</span>
                        Assign New Role
                      </h3>
                      <button
                        onClick={() => { setShowRoleChange(false); setSelectedOption(null); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    {/* Current info */}
                    {volunteerInfo && (
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-bold">
                          Current: {volunteerInfo.role}
                        </span>
                        {volunteerInfo.team_name && (
                          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                            {volunteerInfo.team_name} Team
                          </span>
                        )}
                      </div>
                    )}

                    {/* Named Roles + Volunteer Teams */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Select New Role</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[...NAMED_ROLE_OPTIONS, ...VOLUNTEER_TEAM_OPTIONS]
                          .filter(opt =>
                            !(opt.role === volunteerInfo?.role && opt.teamId === volunteerInfo?.team_id)
                          )
                          .map((opt) => {
                            const isSelected = selectedOption?.role === opt.role && selectedOption?.teamId === opt.teamId;
                            return (
                              <button
                                key={opt.role + opt.teamId}
                                onClick={() => setSelectedOption({ role: opt.role, teamId: opt.teamId, label: opt.label })}
                                className={`flex items-center gap-2 p-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                                  isSelected
                                    ? 'border-asu-red bg-red-50 dark:bg-red-900/20 text-asu-red dark:text-red-400'
                                    : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300 hover:border-red-200 dark:hover:border-slate-600'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">{opt.icon}</span>
                                <span>{opt.label}</span>
                                {isSelected && <span className="material-symbols-outlined text-sm ml-auto">check_circle</span>}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Team Leader section */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Team Leader of</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {TEAM_OPTIONS
                          .filter(team =>
                            !(volunteerInfo?.role === 'team_leader' && team.id === volunteerInfo?.team_id)
                          )
                          .map((team) => {
                            const isSelected = selectedOption?.role === 'team_leader' && selectedOption?.teamId === team.id;
                            return (
                              <button
                                key={'leader-' + team.id}
                                onClick={() => setSelectedOption({ role: 'team_leader', teamId: team.id, label: `Leader · ${team.name}` })}
                                className={`flex items-center gap-2 p-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                                  isSelected
                                    ? 'border-asu-red bg-red-50 dark:bg-red-900/20 text-asu-red dark:text-red-400'
                                    : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-300 hover:border-red-200 dark:hover:border-slate-600'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">manage_accounts</span>
                                <span className="truncate">{team.name}</span>
                                {isSelected && <span className="material-symbols-outlined text-sm ml-auto flex-shrink-0">check_circle</span>}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Selected preview */}
                    {selectedOption && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                        <span className="material-symbols-outlined text-asu-red">published_with_changes</span>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                          Assigning: <span className="font-bold">{selectedOption.label}</span>
                        </p>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      onClick={handleRoleChangeSubmit}
                      disabled={!selectedOption}
                      className="w-full py-3 rounded-xl bg-asu-red text-white font-bold hover:bg-red-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined">published_with_changes</span>
                      Apply Role Change
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Confirm Modal */}
      <AnimatePresence>
        {showRoleConfirm && searchResult && (
          <ConfirmModal
            title="Confirm Role Change"
            message={`Change "${searchResult.full_name}" to "${selectedOption?.label}"?`}
            confirmLabel="Yes, Change Role"
            confirmClass="bg-asu-red hover:bg-red-700"
            icon="manage_accounts"
            onConfirm={handleRoleChangeConfirm}
            onCancel={() => setShowRoleConfirm(false)}
            loading={roleChangePending}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  // ─── Render Content ───────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return renderHomeTab();
      case 'search': return renderSearchTab();
      default: return renderHomeTab();
    }
  };

  if (!profile) {
    return <DashboardLoading message="Loading Tech Support Dashboard" subMessage="Verifying access..." />;
  }

  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="ASU Career Expo"
      hideDock={false}
      onProfileClick={() => setShowProfile(true)}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <ConfirmModal
            title="Delete User"
            message={`Are you sure you want to permanently delete "${userToDelete.full_name}"? This action CANNOT be undone and will remove all their data including their authentication account.`}
            confirmLabel="Delete Permanently"
            confirmClass="bg-red-600 hover:bg-red-700"
            icon="delete_forever"
            onConfirm={handleConfirmDelete}
            onCancel={() => setUserToDelete(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Volunteer Profile Modal */}
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
    </SharedNavigation>
  );
};

export default TechSupportDashboard;
