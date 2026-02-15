import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, DEFAULT_EVENT_ID } from '../../lib/supabase';

interface LeaderboardEntry {
    rank: number;
    full_name: string;
    total_points: number;
    user_id: string;
}

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Team {
    id: string;
    team_name: string;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

    // Admin state
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');

    useEffect(() => {
        if (isOpen && user && profile) {
            fetchData();
        }
    }, [isOpen, user, profile, selectedTeamId]);

    const fetchData = async () => {
        if (!user || !profile) return;

        setLoading(true);
        try {
            const userRole = profile.role;

            if (['volunteer', 'registration', 'building', 'info_desk', 'verification'].includes(userRole)) {
                // ================================================================
                // VOLUNTEER LOGIC - Show team leaderboard
                // ================================================================

                console.log('🎯 [LEADERBOARD] Fetching for volunteer with role:', userRole);

                // 1. Get user's volunteer record to find their team
                const { data: volunteerData, error: vError } = await supabase
                    .from('volunteers')
                    .select('team_id, user_id')
                    .eq('user_id', user.id)
                    .single();

                if (vError || !volunteerData?.team_id) {
                    console.error('❌ [LEADERBOARD] Error fetching volunteer team:', vError);
                    throw new Error("Could not find your team");
                }

                console.log('✅ [LEADERBOARD] Found team:', volunteerData.team_id);

                // 2. Fetch all volunteers in the same team
                const { data: teamMembers, error: tError } = await supabase
                    .from('volunteers')
                    .select('user_id, full_name, total_points')
                    .eq('team_id', volunteerData.team_id)
                    .order('total_points', { ascending: false });

                if (tError) {
                    console.error('❌ [LEADERBOARD] Error fetching team members:', tError);
                    throw tError;
                }

                console.log('📊 [LEADERBOARD] Found team members:', teamMembers?.length || 0);

                if (!teamMembers || teamMembers.length === 0) {
                    console.warn('⚠️ [LEADERBOARD] No team members found');
                    setLeaderboardData([]);
                    setUserRank(null);
                    return;
                }

                // 3. Get user_roles to verify they're actually volunteer roles
                // This filters out any attendees or employers who might be mistakenly in the volunteers table
                const userIds = teamMembers.map(m => m.user_id);

                const { data: rolesData, error: rolesError } = await supabase
                    .from('user_roles')
                    .select('user_id, role')
                    .eq('event_id', DEFAULT_EVENT_ID)
                    .in('user_id', userIds)
                    .in('role', ['volunteer', 'registration', 'building', 'info_desk', 'verification']);

                if (rolesError) {
                    console.error('❌ [LEADERBOARD] Error fetching roles:', rolesError);
                    // Continue without role filtering if this fails
                }

                // Create a Set of valid volunteer user IDs
                const validVolunteerIds = new Set(rolesData?.map(r => r.user_id) || userIds);

                console.log('✅ [LEADERBOARD] Valid volunteer IDs:', validVolunteerIds.size);

                // 4. Filter and process the data
                const filteredMembers = teamMembers.filter(m => validVolunteerIds.has(m.user_id));

                const processedData = filteredMembers.map((m, index) => ({
                    rank: index + 1,
                    full_name: m.full_name,
                    total_points: m.total_points || 0,
                    user_id: m.user_id
                }));

                console.log('✅ [LEADERBOARD] Processed data:', processedData.length, 'members');

                // 5. Set top 10 for display
                setLeaderboardData(processedData.slice(0, 10));

                // 6. Find current user's rank (if outside top 10)
                const myRank = processedData.find(m => m.user_id === user.id);
                setUserRank(myRank || null);

            } else if (userRole === 'team_leader') {
                // ================================================================
                // TEAM LEADER LOGIC - Show their team's full leaderboard
                // ================================================================

                console.log('👑 [LEADERBOARD] Fetching for team leader');

                // 1. Find the team this user leads
                const { data: teamData, error: tError } = await supabase
                    .from('volunteer_teams')
                    .select('id')
                    .eq('team_leader_id', user.id)
                    .single();

                if (tError || !teamData) {
                    console.error('❌ [LEADERBOARD] Error fetching team for leader:', tError);
                    throw new Error("Could not find your team");
                }

                console.log('✅ [LEADERBOARD] Found team:', teamData.id);

                // 2. Fetch all members of that team
                const { data: teamMembers, error: mError } = await supabase
                    .from('volunteers')
                    .select('user_id, full_name, total_points')
                    .eq('team_id', teamData.id)
                    .order('total_points', { ascending: false });

                if (mError) {
                    console.error('❌ [LEADERBOARD] Error fetching team members:', mError);
                    throw mError;
                }

                // 3. Verify volunteer roles
                const userIds = teamMembers?.map(m => m.user_id) || [];

                const { data: rolesData } = await supabase
                    .from('user_roles')
                    .select('user_id')
                    .eq('event_id', DEFAULT_EVENT_ID)
                    .in('user_id', userIds)
                    .in('role', ['volunteer', 'registration', 'building', 'info_desk', 'verification']);

                const validVolunteerIds = new Set(rolesData?.map(r => r.user_id) || userIds);

                // 4. Filter and process
                const filteredMembers = (teamMembers || []).filter(m => validVolunteerIds.has(m.user_id));

                const processedData = filteredMembers.map((m, index) => ({
                    rank: index + 1,
                    full_name: m.full_name,
                    total_points: m.total_points || 0,
                    user_id: m.user_id
                }));

                console.log('✅ [LEADERBOARD] Processed data:', processedData.length, 'members');

                // Team leaders see the full list
                setLeaderboardData(processedData);
                setUserRank(null);

            } else if (['admin', 'super_admin', 'sadmin'].includes(userRole)) {
                // ================================================================
                // ADMIN LOGIC - Select any team to view
                // ================================================================

                console.log('🔐 [LEADERBOARD] Fetching for admin');

                // 1. Load teams dropdown (only once)
                if (teams.length === 0) {
                    const { data: allTeams, error: teamsError } = await supabase
                        .from('volunteer_teams')
                        .select('id, team_name')
                        .order('team_name');

                    if (teamsError) {
                        console.error('❌ [LEADERBOARD] Error fetching teams:', teamsError);
                        throw teamsError;
                    }

                    setTeams(allTeams || []);

                    // Auto-select first team if none selected
                    if (!selectedTeamId && allTeams && allTeams.length > 0) {
                        setSelectedTeamId(allTeams[0].id);
                        setLoading(false);
                        return;
                    }
                }

                // 2. Fetch members of selected team
                if (selectedTeamId) {
                    const { data: teamMembers, error: mError } = await supabase
                        .from('volunteers')
                        .select('user_id, full_name, total_points')
                        .eq('team_id', selectedTeamId)
                        .order('total_points', { ascending: false });

                    if (mError) {
                        console.error('❌ [LEADERBOARD] Error fetching team members:', mError);
                        throw mError;
                    }

                    // 3. Verify volunteer roles
                    const userIds = teamMembers?.map(m => m.user_id) || [];

                    const { data: rolesData } = await supabase
                        .from('user_roles')
                        .select('user_id')
                        .eq('event_id', DEFAULT_EVENT_ID)
                        .in('user_id', userIds)
                        .in('role', ['volunteer', 'registration', 'building', 'info_desk', 'verification']);

                    const validVolunteerIds = new Set(rolesData?.map(r => r.user_id) || userIds);

                    // 4. Filter and process
                    const filteredMembers = (teamMembers || []).filter(m => validVolunteerIds.has(m.user_id));

                    const processedData = filteredMembers.map((m, index) => ({
                        rank: index + 1,
                        full_name: m.full_name,
                        total_points: m.total_points || 0,
                        user_id: m.user_id
                    }));

                    console.log('✅ [LEADERBOARD] Processed data:', processedData.length, 'members');

                    setLeaderboardData(processedData);
                    setUserRank(null);
                }
            } else {
                // Other roles (attendee, employer) - no leaderboard
                console.warn('⚠️ [LEADERBOARD] Leaderboard not available for role:', userRole);
                setLeaderboardData([]);
            }

        } catch (err) {
            console.error("❌ [LEADERBOARD] Error fetching leaderboard:", err);
            setLeaderboardData([]);
        } finally {
            setLoading(false);
        }
    };

    const modalVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 25 }
        },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 relative flex-shrink-0">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-8xl text-white">leaderboard</span>
                                </div>
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">Team Leaderboard</h2>
                                        <p className="text-amber-100 text-sm">
                                            {profile?.role === 'team_leader' ? 'Your Team Performance' :
                                                ['admin', 'super_admin', 'sadmin'].includes(profile?.role || '') ? 'Global Team Performance' :
                                                    'Top Performers & My Rank'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                {/* Admin Team Selector */}
                                {['admin', 'super_admin', 'sadmin'].includes(profile?.role || '') && (
                                    <div className="mt-4">
                                        <select
                                            value={selectedTeamId}
                                            onChange={(e) => setSelectedTeamId(e.target.value)}
                                            className="w-full bg-white/20 text-white placeholder-white/60 border border-white/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
                                        >
                                            <option value="" disabled>Select a team</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.team_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-0">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading rankings...</p>
                                    </div>
                                ) : leaderboardData.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                        <span className="material-symbols-outlined text-5xl mb-2 opacity-50">format_list_bulleted</span>
                                        <p>No leaderboard data available</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 dark:bg-zinc-800/50 sticky top-0 z-10">
                                            <tr>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Rank</th>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volunteer</th>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {leaderboardData.map((entry) => {
                                                const isMe = user?.id === entry.user_id;
                                                return (
                                                    <tr
                                                        key={entry.user_id}
                                                        className={`${isMe ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'} transition-colors`}
                                                    >
                                                        <td className="py-4 px-6">
                                                            <div className={`
                                                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                                                ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                                                                    entry.rank === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400' :
                                                                        entry.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' :
                                                                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
                                                            `}>
                                                                {entry.rank}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                                                    {entry.full_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className={`font-medium ${isMe ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                                                        {entry.full_name} {isMe && "(You)"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <span className="font-bold text-gray-900 dark:text-white">{entry.total_points}</span>
                                                            <span className="text-xs text-gray-500 ml-1">pts</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Footer - Show user's rank if they're outside top 10 */}
                            {userRank && !leaderboardData.find(d => d.user_id === userRank.user_id) && (
                                <div className="border-t border-gray-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-900/10 p-4 flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center font-bold text-amber-700 dark:text-amber-200">
                                                {userRank.rank}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Your Rank</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Keep up the good work!</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{userRank.total_points}</p>
                                            <p className="text-xs text-gray-500">points</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default LeaderboardModal;