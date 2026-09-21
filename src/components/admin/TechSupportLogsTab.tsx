import React, { useState, useEffect, useCallback } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { getActiveEventId } from '../../lib/currentEvent';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  exit: { opacity: 0 }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0 }
};

interface AuditLogEntry {
  id: string;
  created_at: string;
  action: 'change_role' | 'delete_user';
  target_user_name: string | null;
  target_user_email: string | null;
  old_role: string | null;
  new_role: string | null;
  actor: { email: string; full_name: string } | null;
}

interface TechSupportLogsTabProps {
  eventId?: string;
}

export const TechSupportLogsTab: React.FC<TechSupportLogsTabProps> = ({ eventId = getActiveEventId() }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    if (!eventId) return;
    setLogsLoading(true);
    setLogsError(null);
    try {
      const { data, error } = await supabase
        .rpc('admin_get_tech_support_logs', { p_event_id: eventId, p_limit: 100 });

      if (error) throw error;
      setAuditLogs(((data as any[]) || []).map((l: any) => ({
        id: l.id, created_at: l.created_at, action: l.action,
        old_role: l.old_role, new_role: l.new_role,
        target_user_name: l.target_user_name, target_user_email: l.target_user_email,
        actor: l.actor_email || l.actor_full_name ? { email: l.actor_email, full_name: l.actor_full_name } : null,
      })));
    } catch (err: any) {
      logger.error('Error fetching audit logs:', err);
      setLogsError(err.message || 'Could not load tech support logs');
    } finally {
      setLogsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <motion.div className="space-y-6 p-4 sm:p-6" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
          <span className="material-symbols-outlined text-red-600">manage_history</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tech Support Logs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Audit trail of actions performed by the Technical Support team
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          disabled={logsLoading}
          className="ml-auto px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <span className={`material-symbols-outlined text-sm ${logsLoading ? 'animate-spin' : ''}`}>refresh</span>
          Refresh
        </button>
      </motion.div>

      {logsLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading logs...</p>
        </div>
      )}

      {!logsLoading && logsError && (
        <motion.div
          variants={itemVariants}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex items-start gap-4"
        >
          <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Could not load logs</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{logsError}</p>
          </div>
        </motion.div>
      )}

      {!logsLoading && !logsError && auditLogs.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-700 block mb-3">history</span>
          <p className="font-bold text-gray-700 dark:text-gray-300">No actions recorded yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Actions performed in the Tech Support dashboard will appear here.</p>
        </motion.div>
      )}

      {!logsLoading && !logsError && auditLogs.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800"
        >
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {auditLogs.map((log) => {
              const isRoleChange = log.action === 'change_role';
              const timeAgo = (() => {
                const diff = Date.now() - new Date(log.created_at).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'just now';
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                const days = Math.floor(hrs / 24);
                return `${days}d ago`;
              })();

              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className="flex flex-col border border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-800/60 overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isRoleChange
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <span className={`material-symbols-outlined text-xl ${
                        isRoleChange ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {isRoleChange ? 'swap_horiz' : 'person_remove'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                          {isRoleChange ? (
                            <>Role changed for <span className="text-blue-600 dark:text-blue-400">{log.target_user_name || log.target_user_email}</span></>
                          ) : (
                            <>Deleted user <span className="text-red-600 dark:text-red-400">{log.target_user_name || log.target_user_email}</span></>
                          )}
                        </p>
                        <span className={`material-symbols-outlined text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                      {isRoleChange && (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-1">
                          <span className="text-gray-400 line-through mr-2">{log.old_role}</span>
                          <span className="material-symbols-outlined text-xs align-middle mx-1 text-gray-400">arrow_forward</span>
                          <span className="text-emerald-600 dark:text-emerald-400 ml-1">{log.new_role}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">person</span>
                          By: {log.actor?.full_name || log.actor?.email || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {new Date(log.created_at).toLocaleString()} ({timeAgo})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-gray-200 dark:border-slate-700/50"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-white dark:bg-slate-900/50">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider mb-2">Actor (Admin / Tech Support)</p>
                            <p className="text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-800 dark:text-gray-200">Name:</span> {log.actor?.full_name || 'N/A'}</p>
                            <p className="text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-800 dark:text-gray-200">Email:</span> {log.actor?.email || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider mb-2">Target User</p>
                            <p className="text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-800 dark:text-gray-200">Name:</span> {log.target_user_name || 'N/A'}</p>
                            <p className="text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-800 dark:text-gray-200">Email:</span> {log.target_user_email || 'N/A'}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
export default TechSupportLogsTab;
