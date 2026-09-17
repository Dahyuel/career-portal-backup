// Activity: the audit trail of privileged changes, and when staff last signed in.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from '../icons';
import {
  buttonClass,
  callSadmin,
  errorText,
  eventId,
  formatDateTime,
  fromLocalInput,
  inputClass,
  labelClass,
  roleLabel,
  timeAgo,
  type AuditEntry,
  type Notify,
  type SignInEvent,
  type StaffSignIn
} from './sadminApi';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Panel, RefreshButton } from './ui';

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  role_insert: 'Role added',
  role_update: 'Role changed',
  role_delete: 'Role removed',
  role_change: 'Role changed from dashboard',
  user_delete: 'Profile deleted',
  account_deleted: 'Account deleted',
  account_disabled: 'Account disabled',
  account_enabled: 'Account enabled',
  sessions_revoked: 'Signed out everywhere',
  config_insert: 'Setting created',
  config_update: 'Setting changed',
  config_delete: 'Setting removed',
  event_settings_updated: 'Event details changed',
  data_fix: 'Data cleaned up'
};

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action.replace(/_/g, ' ');

const actionTone = (action: string) =>
  /delete|disabled|revoked/.test(action) ? 'red' : /role|config|settings/.test(action) ? 'amber' : action === 'data_fix' ? 'blue' : 'neutral';

const text = (v: unknown) => (v === null || v === undefined || v === '' ? null : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** One readable line per entry; the raw keys are available on hover. */
const describe = (e: AuditEntry): string => {
  const d = e.details ?? {};
  const k = e.target_key ?? {};
  const parts: string[] = [];
  if ('old_role' in d || 'new_role' in d) parts.push(`${roleLabel(text(d.old_role) ?? 'none')} → ${roleLabel(text(d.new_role) ?? 'none')}`);
  if (e.target_table === 'system_config' && k.key) parts.push(`Setting "${text(k.key)}"`);
  if (e.action === 'event_settings_updated' && d.changes && typeof d.changes === 'object') {
    parts.push(`Changed: ${Object.keys(d.changes as object).join(', ').replace(/_/g, ' ')}`);
  }
  if (e.action === 'data_fix') parts.push(`${text(d.rows_deleted) ?? 0} record(s) removed (${text(k.check)?.replace(/_/g, ' ')})`);
  if (e.action === 'sessions_revoked') parts.push(`${text(d.sessions) ?? 0} session(s) ended`);
  if (d.email) parts.push(String(d.email));
  if (d.note) parts.push(String(d.note));
  if (k.user_id && !d.email) parts.push(`Account …${String(k.user_id).slice(-6)}`);
  if (d.reason) parts.push(`Reason: ${text(d.reason)}`);
  return parts.join(' · ') || '—';
};

interface AuditResult {
  data: AuditEntry[];
  total: number;
  actions: string[];
}

const AuditLog: React.FC = () => {
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const data = await callSadmin<AuditResult>('sadmin_get_audit_log', {
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
        _action: action || null,
        _search: debouncedSearch || null,
        _from: fromLocalInput(from),
        _to: fromLocalInput(to)
      }, 'Could not load the activity log.');
      if (id !== requestId.current) return;
      setResult(data);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(errorText(err, 'Could not load the activity log.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [action, debouncedSearch, from, to, page]);

  useEffect(() => { load(); }, [load]);

  const rows = result?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));
  const hasFilters = !!(action || search || from || to);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="xl:col-span-1">
            <label className={labelClass}>Search</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Email, setting, reason..." className={`${inputClass} pl-10`} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} className={inputClass}>
              <option value="">All activity</option>
              {(result?.actions ?? []).slice().sort().map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>From</label>
            <input type="datetime-local" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input type="datetime-local" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={inputClass} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recorded by the database itself, so changes made from the SQL editor appear too (shown as “SQL editor / system”).
          </p>
          <div className="flex gap-2">
            {hasFilters && (
              <button className={buttonClass.ghost} onClick={() => { setAction(''); setSearch(''); setFrom(''); setTo(''); setPage(0); }}>Clear filters</button>
            )}
            <RefreshButton onClick={load} loading={loading} />
          </div>
        </div>
      </Panel>

      {error && !result ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : loading && !result ? (
        <LoadingBlock label="Loading activity..." />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="history" title={hasFilters ? 'No activity matches these filters' : 'No activity recorded yet'} /></Panel>
      ) : (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-left text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4 font-semibold">When</th>
                  <th className="py-3 px-4 font-semibold">Who</th>
                  <th className="py-3 px-4 font-semibold">What</th>
                  <th className="py-3 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 align-top">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-200" title={formatDateTime(e.created_at)}>
                      {formatDateTime(e.created_at)}
                      <p className="text-xs text-slate-400">{timeAgo(e.created_at)}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                      {e.actor_email || <span className="text-slate-400 italic">SQL editor / system</span>}
                    </td>
                    <td className="py-3 px-4"><Badge tone={actionTone(e.action)}>{actionLabel(e.action)}</Badge></td>
                    <td
                      className="py-3 px-4 text-slate-600 dark:text-slate-300 break-words max-w-md"
                      title={JSON.stringify({ target: e.target_key, details: e.details })}
                    >
                      {describe(e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">Page {page + 1} of {totalPages} · {result?.total.toLocaleString()} entries</p>
              <div className="flex gap-2">
                <button className={buttonClass.ghost} disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /> Previous</button>
                <button className={buttonClass.ghost} disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SignIns: React.FC = () => {
  const [data, setData] = useState<{ staff: StaffSignIn[]; events: SignInEvent[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await callSadmin<{ staff: StaffSignIn[]; events: SignInEvent[] }>('sadmin_get_signin_activity', { _event_id: eventId(), _limit: 50 }, 'Could not load sign-in activity.');
      setData(r);
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Could not load sign-in activity.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error && !data) return <ErrorBlock message={error} onRetry={load} />;
  if (loading && !data) return <LoadingBlock label="Loading sign-ins..." />;
  if (!data) return null;

  const neverSignedIn = data.staff.filter((s) => !s.last_sign_in_at).length;

  return (
    <div className="space-y-4">
      <Panel
        title="Staff last sign-in"
        subtitle={`${data.staff.length} staff accounts${neverSignedIn ? ` · ${neverSignedIn} never signed in` : ''}. Accounts nobody uses are worth disabling.`}
        actions={<RefreshButton onClick={load} loading={loading} />}
      >
        {data.staff.length === 0 ? (
          <EmptyState icon="group" title="No staff accounts" />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 px-5 font-semibold">Person</th>
                  <th className="py-2 px-3 font-semibold">Role</th>
                  <th className="py-2 px-3 font-semibold">Last sign-in</th>
                  <th className="py-2 px-5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr key={s.user_id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                    <td className="py-2.5 px-5">
                      <p className="font-semibold text-slate-900 dark:text-white">{s.full_name || '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.email || '—'}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">{roleLabel(s.role)}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200" title={formatDateTime(s.last_sign_in_at)}>{timeAgo(s.last_sign_in_at)}</td>
                    <td className="py-2.5 px-5">
                      <div className="flex flex-wrap gap-1.5">
                        {s.disabled && <Badge tone="red">Disabled</Badge>}
                        {s.has_2fa && <Badge tone="green">Authenticator</Badge>}
                        {!s.disabled && !s.has_2fa && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Recent sign-in events" subtitle="Sign-ins, sign-outs and failed attempts by staff accounts.">
        {data.events.length === 0 ? (
          <EmptyState
            icon="travel_explore"
            title="No sign-in history available here"
            text="This project does not keep detailed sign-in events in the database. See Supabase Dashboard → Authentication → Logs."
          />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 px-5 font-semibold">When</th>
                  <th className="py-2 px-3 font-semibold">Account</th>
                  <th className="py-2 px-3 font-semibold">Event</th>
                  <th className="py-2 px-5 font-semibold">IP address</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((ev, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                    <td className="py-2.5 px-5 whitespace-nowrap text-slate-700 dark:text-slate-200">{formatDateTime(ev.created_at)}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">{ev.email || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">{(ev.action || '—').replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-5 font-mono text-xs text-slate-500 dark:text-slate-400">{ev.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

const ActivityLog: React.FC<{ notify: Notify }> = () => {
  const [view, setView] = useState<'audit' | 'signins'>('audit');

  return (
    <div className="space-y-6">
      <PageHeader
        icon="history"
        title="Activity"
        subtitle="Who changed what, and when staff accounts were last used."
        actions={
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1" role="tablist">
            {([['audit', 'Change log'], ['signins', 'Staff sign-ins']] as const).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {view === 'audit' ? <AuditLog /> : <SignIns />}
    </div>
  );
};

export default ActivityLog;
