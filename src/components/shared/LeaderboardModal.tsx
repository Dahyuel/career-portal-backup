import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

interface LeaderboardEntry {
    rank: number;
    full_name: string;
    total_points: number;
}

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId?: string;
}

interface Team {
    id: string;
    team_name: string;
}

const ADMIN_ROLES = ['admin', 'super_admin', 'sadmin'] as const;

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, eventId }) => {
    const { user, profile } = useAuth();
    const currentEventId = eventId || profile?.event_id;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [myRow, setMyRow] = useState<LeaderboardEntry | null>(null);

    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');

    const isAdmin = ADMIN_ROLES.includes(profile?.role as any);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setLeaderboardData([]);
            setMyRow(null);
            setError(null);
            setSelectedTeamId('');
        }
    }, [isOpen]);

    // Fetch teams for admins
    useEffect(() => {
        if (!isOpen || !isAdmin || !currentEventId) return;
        (async () => {
            const { data, error } = await supabase
                .rpc('get_volunteer_teams_admin', { p_event_id: currentEventId });

            if (error) {
                logger.error('❌ [LEADERBOARD] Error fetching teams:', error);
                return;
            }
            const list = (data as Team[]) || [];
            setTeams(list);
            if (list.length) {
                setSelectedTeamId(prev => prev || list[0].id);
            }
        })();
    }, [isOpen, isAdmin, currentEventId]);

    // Fetch leaderboard
    useEffect(() => {
        if (!isOpen || !user || !profile || !currentEventId) return;
        if (isAdmin && !selectedTeamId) return;
        fetchLeaderboard(isAdmin ? selectedTeamId : null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, user, profile, isAdmin, selectedTeamId, currentEventId]);

    const fetchLeaderboard = async (teamId: string | null = null) => {
        if (!user || !profile || !currentEventId) return;

        setLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('get_event_leaderboard', {
                _event_id: currentEventId,
                _limit: 10,
                _team_id: teamId,
            });

            if (rpcError) {
                logger.error('❌ [LEADERBOARD] RPC error:', rpcError);
                const m = rpcError.message || '';
                if (m.includes('FORBIDDEN') || m.includes('UNAUTHORIZED')) {
                    setError('You do not have permission to view the leaderboard.');
                } else if (m.includes('NO_TEAM')) {
                    setError('You are not assigned to a team yet.');
                } else if (m.includes('MISSING_TEAM')) {
                    setError('Please select a team.');
                } else if (m.includes('UNAUTHENTICATED')) {
                    setError('Please sign in again.');
                } else {
                    setError(`Failed to load leaderboard: ${m}`);
                }
                setLeaderboardData([]);
                setMyRow(null);
                return;
            }

            const payload = data as {
                rows: any[];
                my_row: any | null;
                team_id: string;
                is_admin: boolean;
                is_leader: boolean;
            } | null;

            if (!payload || !Array.isArray(payload.rows) || payload.rows.length === 0) {
                setLeaderboardData([]);
                setMyRow(null);
                return;
            }

            setLeaderboardData(
                payload.rows.map((r: any) => ({
                    rank: Number(r.rank),
                    full_name: r.full_name,
                    total_points: Number(r.total_points ?? 0),
                }))
            );

            setMyRow(
                payload.my_row
                    ? {
                        rank: Number(payload.my_row.rank),
                        full_name: payload.my_row.full_name,
                        total_points: Number(payload.my_row.total_points ?? 0),
                    }
                    : null
            );
        } catch (err) {
            logger.error('❌ [LEADERBOARD] Unexpected error:', err);
            setError('An unexpected error occurred.');
            setLeaderboardData([]);
            setMyRow(null);
        } finally {
            setLoading(false);
        }
    };

    const modalVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    };

    const headerSubtitle =
        profile?.role === 'team_leader'
            ? 'Your Team Performance'
            : isAdmin
                ? 'Global Team Performance'
                : 'Top 10 of Your Team + Your Rank';

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                        onClick={onClose}
                    />

                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 relative flex-shrink-0">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-8xl text-white">leaderboard</span>
                                </div>
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">Team Leaderboard</h2>
                                        <p className="text-amber-100 text-sm">{headerSubtitle}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                {isAdmin && (
                                    <div className="mt-4">
                                        <select
                                            value={selectedTeamId}
                                            onChange={e => setSelectedTeamId(e.target.value)}
                                            className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
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
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
                                        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading rankings...</p>
                                    </div>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-red-500 px-6 text-center">
                                        <span className="material-symbols-outlined text-5xl mb-2 opacity-50">error</span>
                                        <p>{error}</p>
                                    </div>
                                ) : leaderboardData.length === 0 && !myRow ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                        <span className="material-symbols-outlined text-5xl mb-2 opacity-50">format_list_bulleted</span>
                                        <p>No leaderboard data available</p>
                                    </div>
                                ) : (
                                    <div className="pb-4">
                                        {/* ── MY RANK CARD (volunteers only) ── */}
                                        {myRow && !isAdmin && profile?.role !== 'team_leader' && (
                                            <div className="px-6 pt-6 pb-2">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                                    Your Rank
                                                </p>
                                                <motion.div
                                                    initial={{ opacity: 0, y: -8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20"
                                                >
                                                    {/* decorative blob */}
                                                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

                                                    <div className="relative z-10 flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
                                                            <span className="text-2xl font-bold text-white">
                                                                #{myRow.rank}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-white font-bold text-lg truncate">
                                                                {myRow.full_name}
                                                            </p>
                                                            <p className="text-amber-100 text-sm mt-0.5">
                                                                Your current standing on the team
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-3xl font-bold text-white leading-none">
                                                                {myRow.total_points}
                                                            </p>
                                                            <p className="text-amber-100 text-xs uppercase tracking-wider mt-1">
                                                                points
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        )}

                                        {/* ── TOP 10 TABLE ── */}
                                        <div className="px-6 pt-4 pb-2">
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {isAdmin || profile?.role === 'team_leader'
                                                    ? 'Team Rankings'
                                                    : 'Top 10 of Your Team'}
                                            </p>
                                        </div>
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 dark:bg-zinc-800/50">
                                                <tr>
                                                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Rank</th>
                                                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volunteer</th>
                                                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                                {leaderboardData.map(entry => {
                                                    const isMe =
                                                        myRow
                                                        && myRow.rank === entry.rank
                                                        && myRow.full_name === entry.full_name;

                                                    return (
                                                        <tr
                                                            key={`${entry.rank}-${entry.full_name}`}
                                                            className={`
                                                                transition-colors
                                                                ${isMe
                                                                    ? 'bg-amber-50 dark:bg-amber-900/20'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}
                                                            `}
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
                                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                                        {entry.full_name}
                                                                        {isMe && (
                                                                            <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-300">
                                                                                (You)
                                                                            </span>
                                                                        )}
                                                                    </p>
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
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default LeaderboardModal;