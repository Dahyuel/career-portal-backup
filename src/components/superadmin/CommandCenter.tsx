// Command Center: what needs attention right now, at a glance.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  callSadmin,
  errorText,
  eventId,
  formatDateTime,
  formatTime,
  timeAgo,
  type CommandCenterData,
  type Notify,
  type TabKey
} from './sadminApi';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, MIcon, PageHeader, Panel, RefreshButton, Stat } from './ui';

const REFRESH_MS = 60_000;

const ALERT_STYLES = {
  critical: { box: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/60', icon: 'error', iconClass: 'text-red-600 dark:text-red-400', label: 'Critical' },
  warning: { box: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60', icon: 'warning', iconClass: 'text-amber-600 dark:text-amber-400', label: 'Warning' },
  info: { box: 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700', icon: 'info', iconClass: 'text-slate-500 dark:text-slate-400', label: 'Info' }
} as const;

const TAB_NAMES: Record<TabKey, string> = {
  command: 'Command Center', events: 'Events', people: 'People & Access', activity: 'Activity',
  controls: 'Event Controls', security: 'Security', health: 'Data Health'
};

interface Props {
  notify: Notify;
  onNavigate: (tab: TabKey) => void;
}

const CommandCenter: React.FC<Props> = ({ notify, onNavigate }) => {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(async (quiet = false) => {
    const id = ++requestId.current;
    if (!quiet) setLoading(true);
    try {
      const result = await callSadmin<CommandCenterData>('sadmin_command_center', { _event_id: eventId() }, 'Could not load the command center.');
      if (id !== requestId.current) return;
      hasData.current = true;
      setData(result);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      const message = errorText(err, 'Could not load the command center.');
      // Once the page shows data, a failed refresh keeps it on screen and just says so.
      if (hasData.current) notify(message, 'error');
      else setError(message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
    // Quiet refresh every minute while the page is visible.
    const timer = window.setInterval(() => {
      if (!document.hidden) load(true);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading && !data) return <LoadingBlock label="Loading the command center..." />;
  if (error && !data) return <ErrorBlock message={error} onRetry={() => load()} />;
  if (!data) return null;

  const { registrations, verification, checkins, staff, maintenance, controls, alerts, sessions_now: sessions, event } = data;
  const now = Date.now();

  const switches: { label: string; on: boolean; onText: string; offText: string }[] = [
    { label: 'Site', on: !maintenance.enabled, onText: 'Online', offText: 'Maintenance' },
    { label: 'Registration', on: controls.registration_open, onText: 'Open', offText: 'Closed' },
    { label: 'Session booking', on: controls.booking_open, onText: 'Open', offText: 'Closed' },
    { label: 'Feedback', on: controls.feedback_open, onText: 'Open', offText: 'Closed' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon="monitor_heart"
        title="Command Center"
        subtitle={
          <>
            {event.name} · {formatDateTime(event.start_date)} to {formatDateTime(event.end_date)} · Updated {timeAgo(data.generated_at)}
          </>
        }
        actions={<RefreshButton onClick={() => load(true)} loading={loading} />}
      />

      {/* Status strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {switches.map((s) => (
          <button
            key={s.label}
            onClick={() => onNavigate('controls')}
            className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left"
          >
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{s.label}</span>
            <Badge tone={s.on ? 'green' : s.label === 'Site' ? 'red' : 'amber'}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.on ? 'bg-emerald-500' : s.label === 'Site' ? 'bg-red-500' : 'bg-amber-500'}`} />
              {s.on ? s.onText : s.offText}
            </Badge>
          </button>
        ))}
      </div>

      {/* Alerts */}
      <Panel title="Needs attention" subtitle={alerts.length ? `${alerts.length} item${alerts.length === 1 ? '' : 's'}, most important first` : undefined}>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
            <MIcon name="task_alt" className="text-2xl" />
            <p className="font-semibold">All clear. Nothing needs your attention.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => {
              const style = ALERT_STYLES[alert.level] ?? ALERT_STYLES.info;
              return (
                <li key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${style.box}`}>
                  <MIcon name={style.icon} className={`text-xl mt-0.5 ${style.iconClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{alert.message}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{style.label}</p>
                  </div>
                  {alert.tab && (
                    <button
                      onClick={() => onNavigate(alert.tab as TabKey)}
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline whitespace-nowrap mt-1"
                    >
                      Open {TAB_NAMES[alert.tab as TabKey] ?? ''} →
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Key numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat
          label="Registered today"
          icon="how_to_reg"
          tone="blue"
          value={registrations.today.toLocaleString()}
          hint={`${registrations.total.toLocaleString()} attendees in total`}
        />
        <Stat
          label="Waiting for verification"
          icon="pending_actions"
          tone={verification.waiting_over_24h > 0 ? 'amber' : 'neutral'}
          value={verification.pending.toLocaleString()}
          hint={
            verification.pending === 0
              ? 'Queue is empty'
              : `${verification.waiting_over_24h} waiting over 24 h · oldest ${timeAgo(verification.oldest_pending_at)}`
          }
        />
        <Stat
          label="Check-ins in the last hour"
          icon="qr_code_scanner"
          tone="green"
          value={checkins.last_hour.toLocaleString()}
          hint={`${checkins.inside_now.toLocaleString()} checked in today and not checked out`}
        />
        <Stat
          label="Super admin seats"
          icon="shield_person"
          tone={staff.sadmins_without_2fa > 0 ? 'red' : 'neutral'}
          value={`${staff.sadmins} / ${staff.sadmin_limit}`}
          hint={
            staff.sadmins_without_2fa > 0
              ? `${staff.sadmins_without_2fa} without an authenticator app · ${staff.admins} admins`
              : `All protected by an authenticator app · ${staff.admins} admins`
          }
          onClick={() => onNavigate('people')}
        />
      </div>

      {/* Sessions */}
      <Panel title="Sessions now and in the next 2 hours" subtitle="Bookings exclude cancellations.">
        {sessions.length === 0 ? (
          <EmptyState icon="event_available" title="No sessions running or starting soon" />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 px-5 font-semibold">Session</th>
                  <th className="py-2 px-3 font-semibold">Time</th>
                  <th className="py-2 px-3 font-semibold">Booked</th>
                  <th className="py-2 px-5 font-semibold text-right">Checked in</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const live = new Date(s.start_time).getTime() <= now;
                  const capacity = s.capacity && s.capacity > 0 ? s.capacity : null;
                  const pct = capacity ? Math.min(100, Math.round((s.booked / capacity) * 100)) : null;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.room_name || 'No room set'}</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-200">{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                        <div className="mt-1">{live ? <Badge tone="green">Live</Badge> : <Badge tone="blue">Starts {formatTime(s.start_time)}</Badge>}</div>
                      </td>
                      <td className="py-3 px-3 min-w-[160px]">
                        <p className="text-slate-700 dark:text-slate-200">
                          {s.booked.toLocaleString()}{capacity ? ` / ${capacity.toLocaleString()}` : ''}
                          {pct !== null && pct >= 100 && <Badge tone="amber" className="ml-2">Full</Badge>}
                        </p>
                        {pct !== null && (
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden" aria-hidden="true">
                            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-900 dark:text-white">{s.checked_in.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default CommandCenter;
