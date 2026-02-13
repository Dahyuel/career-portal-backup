import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
    rank: number;
    full_name: string;
    total_points: number;
    volunteer_id: string; // for identifying "me"
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
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

    // Admin state
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');

    useEffect(() => {
        if (isOpen && user) {
            fetchData();
        }
    }, [isOpen, user, selectedTeamId]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (['volunteer', 'registration', 'building', 'info_desk', 'verification'].includes(user.role || '')) {
                // VOLUNTEER LOGIC
                // 1. Get user's team
                const { data: volunteerData, error: vError } = await supabase
                    .from('volunteers')
                    .select('team_id, volunteer_id')
                    .eq('user_id', user.id)
                    .single();

                if (vError || !volunteerData?.team_id) throw vError || new Error("No team found");

                // 2. Fetch all volunteers in team to calculate ranks
                // fetching all is safer for small teams < 1000, 
                // if robust scaling needed, we'd use a postgres view or window function.
                // For now, client side ranking for "My Rank" if outside top 10 is acceptable.
                const { data: teamMembers, error: tError } = await supabase
                    .from('volunteers')
                    .select('volunteer_id, full_name, total_points')
                    .eq('team_id', volunteerData.team_id)
                    .order('total_points', { ascending: false });

                if (tError) throw tError;

                const processedData = (teamMembers || []).map((m, index) => ({
                    ...m,
                    rank: index + 1,
                    full_name: m.full_name,
                    total_points: m.total_points || 0,
                    volunteer_id: m.volunteer_id
                }));

                setLeaderboardData(processedData.slice(0, 10)); // Top 10

                // Find user's rank
                const myRank = processedData.find(m => m.volunteer_id === volunteerData.volunteer_id);
                setUserRank(myRank || null);

            } else if (user.role === 'team_leader') {
                // TEAM LEADER LOGIC
                // 1. Get team led by this user
                const { data: teamData, error: tError } = await supabase
                    .from('volunteer_teams')
                    .select('id')
                    .eq('team_leader_id', user.id)
                    .single();

                if (tError || !teamData) throw tError || new Error("No team found for leader");

                // 2. Fetch all members
                const { data: teamMembers, error: mError } = await supabase
                    .from('volunteers')
                    .select('volunteer_id, full_name, total_points')
                    .eq('team_id', teamData.id)
                    .order('total_points', { ascending: false });

                if (mError) throw mError;
                const processedData = (teamMembers || []).map((m, index) => ({
                    ...m,
                    rank: index + 1,
                    full_name: m.full_name,
                    total_points: m.total_points || 0,
                    volunteer_id: m.volunteer_id
                }));
                setLeaderboardData(processedData); // Show all
                setUserRank(null); // Leader isn't ranked in this list usually

            } else if (['admin', 'super_admin', 'sadmin'].includes(user.role || '')) {
                // ADMIN LOGIC
                // 1. Fetch teams for dropdown if not loaded
                if (teams.length === 0) {
                    const { data: allTeams, error: teamsError } = await supabase
                        .from('volunteer_teams')
                        .select('id, team_name')
                        .order('team_name');

                    if (teamsError) throw teamsError;
                    setTeams(allTeams || []);
                    // Default to first team if none selected
                    if (!selectedTeamId && allTeams && allTeams.length > 0) {
                        setSelectedTeamId(allTeams[0].id);
                        return; // Effect will re-run with selectedTeamId
                    }
                }

                if (selectedTeamId) {
                    const { data: teamMembers, error: mError } = await supabase
                        .from('volunteers')
                        .select('volunteer_id, full_name, total_points')
                        .eq('team_id', selectedTeamId)
                        .order('total_points', { ascending: false });

                    if (mError) throw mError;

                    const processedData = (teamMembers || []).map((m, index) => ({
                        ...m,
                        rank: index + 1,
                        full_name: m.full_name,
                        total_points: m.total_points || 0,
                        volunteer_id: m.volunteer_id
                    }));
                    setLeaderboardData(processedData);
                }
            }
        } catch (err) {
            console.error("Error fetching leaderboard:", err);
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
                                            {user?.role === 'team_leader' ? 'Your Team Performance' :
                                                ['admin', 'super_admin', 'sadmin'].includes(user?.role || '') ? 'Global Team Performance' :
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

                                {/* Admin Selector */}
                                {['admin', 'super_admin', 'sadmin'].includes(user?.role || '') && (
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
                                                const isMe = userRank?.volunteer_id === entry.volunteer_id;
                                                return (
                                                    <tr
                                                        key={entry.volunteer_id}
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
                                                                    {entry.full_name.charAt(0)}
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

                            {/* Footer for Volunteer's own rank if not in list */}
                            {userRank && !leaderboardData.find(d => d.volunteer_id === userRank.volunteer_id) && (
                                <div className="border-t border-gray-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-900/10 p-4">
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
