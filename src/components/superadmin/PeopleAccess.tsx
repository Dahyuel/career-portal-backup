// People & Access: who has which role, and account actions (all audited, all need a reason).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from '../icons';
import { supabase } from '../../lib/supabase';
import {
  buttonClass,
  callSadmin,
  errorText,
  eventId,
  formatDateTime,
  inputClass,
  isSuperAdminRole,
  labelClass,
  maskId,
  roleLabel,
  ROLE_OPTIONS,
  timeAgo,
  type AccountRow,
  type EventDetail,
  type EventSummary,
  type Notify
} from './sadminApi';
import { Badge, ConfirmDialog, EmptyState, ErrorBlock, LoadingBlock, MIcon, PageHeader, Panel, RefreshButton } from './ui';

const PAGE_SIZE = 20;

type Scope = 'staff' | 'all';
type Action = 'role' | 'signout' | 'disable' | 'enable' | 'delete';

interface ListResult {
  data: AccountRow[];
  total: number;
  seats: { count: number; limit: number };
}

const roleTone = (role: string) =>
  isSuperAdminRole(role) ? 'red' : role === 'admin' ? 'amber' : role === 'attendee' || role === 'employer' || role === 'none' ? 'neutral' : 'blue';

const PeopleAccess: React.FC<{ notify: Notify }> = ({ notify }) => {
  const [scope, setScope] = useState<Scope>('staff');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: Action; account: AccountRow } | null>(null);
  const [newRole, setNewRole] = useState('');
  const [busy, setBusy] = useState(false);
  // Roles are stored per event, so a super admin can manage any event from here —
  // not only the one that happens to be current.
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [targetEventId, setTargetEventId] = useState<string>(eventId());
  const requestId = useRef(0);

  // Employers need a company and volunteers may get a team in the chosen event
  const [roleCompanies, setRoleCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [roleTeams, setRoleTeams] = useState<{ id: string; team_name: string }[]>([]);
  const [roleCompanyId, setRoleCompanyId] = useState('');
  const [roleTeamId, setRoleTeamId] = useState('');
  const [roleOptionsLoading, setRoleOptionsLoading] = useState(false);

  const roleDialogOpen = pending?.action === 'role';
  useEffect(() => {
    if (!roleDialogOpen || !targetEventId || (newRole !== 'employer' && newRole !== 'volunteer')) return;
    let cancelled = false;
    setRoleOptionsLoading(true);
    (async () => {
      try {
        if (newRole === 'employer') {
          const { data, error: rpcError } = await supabase.rpc('admin_get_companies', { _event_id: targetEventId });
          if (rpcError) throw rpcError;
          if (!cancelled) setRoleCompanies(((data as { id: string; company_name: string }[]) || [])
            .map((c) => ({ id: c.id, company_name: c.company_name })));
        } else {
          const r = await callSadmin<EventDetail>('sadmin_get_event', { _event_id: targetEventId }, 'Could not load the teams.');
          if (!cancelled) setRoleTeams(r.teams.map((t) => ({ id: t.id, team_name: t.team_name })));
        }
      } catch (err) {
        if (!cancelled) notify(errorText(err, 'Could not load the options for this role.'), 'error');
      } finally {
        if (!cancelled) setRoleOptionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roleDialogOpen, newRole, targetEventId, notify]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    callSadmin<{ events: EventSummary[] }>('sadmin_list_events', undefined, 'Could not load the events.')
      .then((r) => {
        if (cancelled) return;
        setEvents(r.events);
        // Fall back to the current event (or the first) when none is active yet.
        setTargetEventId((prev) => prev || r.events.find((e) => e.is_current)?.id || r.events[0]?.id || '');
      })
      .catch(() => {
        /* The picker stays hidden and the active event is still used. */
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const data = await callSadmin<ListResult>('sadmin_list_accounts', {
        _event_id: targetEventId,
        _scope: scope,
        _search: debouncedSearch || null,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE
      }, 'Could not load accounts.');
      if (id !== requestId.current) return;
      setResult(data);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(errorText(err, 'Could not load accounts.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [scope, debouncedSearch, page, targetEventId]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (action: Action, account: AccountRow) => {
    setNewRole(account.role === 'none' ? '' : account.role);
    setRoleCompanyId('');
    setRoleTeamId('');
    setPending({ action, account });
  };

  const run = async (reason: string, typed: string) => {
    if (!pending) return;
    const { action, account } = pending;
    setBusy(true);
    try {
      if (action === 'role') {
        const options = newRole === 'employer'
          ? { company_id: roleCompanyId }
          : newRole === 'volunteer' && roleTeamId ? { team_id: roleTeamId } : null;
        await callSadmin('sadmin_change_role', { _event_id: targetEventId, _user_id: account.id, _new_role: newRole, _reason: reason, _options: options }, 'The role could not be changed.');
        notify(
          newRole === 'sadmin'
            ? `${account.full_name || 'Account'} is now a super admin (every event).`
            : `${account.full_name || 'Account'} is now ${roleLabel(newRole)} in ${selectedEventName}.`,
          'success'
        );
      } else if (action === 'signout') {
        const r = await callSadmin<{ sessions: number }>('sadmin_sign_out_user', { _user_id: account.id, _reason: reason || null }, 'Could not sign this account out.');
        notify(r.sessions > 0 ? `Signed out of ${r.sessions} session${r.sessions === 1 ? '' : 's'}.` : 'This account had no active sessions.', 'success');
      } else if (action === 'disable' || action === 'enable') {
        await callSadmin('sadmin_set_account_disabled', { _user_id: account.id, _disabled: action === 'disable', _reason: reason || null }, 'Could not update the account.');
        notify(action === 'disable' ? 'Account disabled and signed out.' : 'Account enabled.', 'success');
      } else {
        await callSadmin('sadmin_delete_account', { _user_id: account.id, _confirm_email: typed, _reason: reason }, 'The account could not be deleted.');
        notify('Account deleted.', 'success');
      }
      setPending(null);
      load();
    } catch (err) {
      notify(errorText(err, 'Something went wrong.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const seats = result?.seats;
  const seatsFull = !!seats && seats.count >= seats.limit;
  const target = pending?.account;
  const targetName = target?.full_name || target?.email || 'this account';
  const selectedEvent = events.find((e) => e.id === targetEventId) ?? null;
  const selectedEventName = selectedEvent?.name ?? 'the active event';

  return (
    <div className="space-y-6">
      <PageHeader
        icon="manage_accounts"
        title="People & Access"
        subtitle={
          <>
            {total.toLocaleString()} {scope === 'staff' ? 'staff accounts' : 'accounts'} in {selectedEventName}
            {seats && <> · Super admins {seats.count} / {seats.limit}</>}
          </>
        }
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <Panel>
        <div className="flex flex-col md:flex-row gap-3">
          {events.length > 0 && (
            <select
              value={targetEventId}
              onChange={(e) => { setTargetEventId(e.target.value); setPage(0); }}
              aria-label="Choose the event to manage roles for"
              className={`${inputClass} shrink-0 md:w-64`}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
          )}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 shrink-0" role="tablist">
            {(['staff', 'all'] as Scope[]).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={scope === s}
                onClick={() => { setScope(s); setPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${scope === s ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {s === 'staff' ? 'Staff' : 'Everyone'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or personal ID"
              className={`${inputClass} pl-10 pr-10`}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Staff means every role except attendee and employer. Roles belong to the event chosen above, and someone can hold a role in several events at once — assigning one here does not affect the others. Super admins are the exception: they count for every event. Personal IDs are partly hidden; searching by the full ID still works.
        </p>
      </Panel>

      {error && !result ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : loading && !result ? (
        <LoadingBlock label="Loading accounts..." />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="person_search" title={debouncedSearch ? 'No accounts match your search' : 'No accounts found'} /></Panel>
      ) : (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-left text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4 font-semibold">Person</th>
                  <th className="py-3 px-4 font-semibold">Personal ID</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Last sign-in</th>
                  <th className="py-3 px-4 font-semibold">Protection</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const isMe = a.id === myId;
                  const privileged = isSuperAdminRole(a.role) || a.role === 'admin' || a.role === 'tech_support';
                  return (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          {a.full_name || '—'} {isMe && <Badge tone="blue">You</Badge>}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{a.email || '—'}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">{maskId(a.personal_id)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={roleTone(a.role)}>{roleLabel(a.role)}</Badge>
                          {a.all_events && <Badge tone="neutral">All events</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300" title={formatDateTime(a.last_sign_in_at)}>{timeAgo(a.last_sign_in_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {a.disabled && <Badge tone="red">Disabled</Badge>}
                          {a.has_2fa ? <Badge tone="green">Authenticator</Badge> : privileged ? <Badge tone="amber">No authenticator</Badge> : null}
                          {!a.disabled && !a.has_2fa && !privileged && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex justify-end gap-0.5">
                          <button className={buttonClass.ghost} disabled={isMe} onClick={() => open('role', a)} title="Change role">
                            <MIcon name="badge" className="text-lg" /> <span className="hidden xl:inline">Role</span>
                          </button>
                          <button className={buttonClass.ghost} disabled={isMe} onClick={() => open('signout', a)} title="Sign out everywhere">
                            <MIcon name="logout" className="text-lg" />
                          </button>
                          <button className={buttonClass.ghost} disabled={isMe} onClick={() => open(a.disabled ? 'enable' : 'disable', a)} title={a.disabled ? 'Enable account' : 'Disable account'}>
                            <MIcon name={a.disabled ? 'lock_open' : 'block'} className="text-lg" />
                          </button>
                          <button className={`${buttonClass.ghost} hover:!text-red-600`} disabled={isMe} onClick={() => open('delete', a)} title="Delete account">
                            <MIcon name="delete" className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button className={buttonClass.ghost} disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button className={buttonClass.ghost} disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change role */}
      <ConfirmDialog
        open={pending?.action === 'role'}
        title="Change role"
        confirmLabel="Change role"
        reason="required"
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={(reason, typed) => {
          if (!newRole || newRole === target?.role) return notify('Choose a different role.', 'warning');
          if (newRole === 'employer' && !roleCompanyId) return notify('Choose the company for this employer.', 'warning');
          run(reason, typed);
        }}
        description={
          <p>
            Current role of <strong>{targetName}</strong> in <strong>{selectedEventName}</strong>: {roleLabel(target?.role)}.
          </p>
        }
      >
        <div>
          <label className={labelClass}>New role</label>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={inputClass}>
            <option value="" disabled>Choose a role</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} disabled={r === 'sadmin' && seatsFull && !isSuperAdminRole(target?.role)}>
                {roleLabel(r)}{r === 'sadmin' && seatsFull && !isSuperAdminRole(target?.role) ? ' (all 5 seats taken)' : ''}
              </option>
            ))}
          </select>
        </div>
        {newRole === 'sadmin' && !isSuperAdminRole(target?.role) && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            Super admins have full control over every event. They will need the secret key and an authenticator app before they can open this dashboard.
          </p>
        )}
        {newRole === 'employer' && (
          <div>
            <label className={labelClass}>Company in {selectedEventName}</label>
            <select value={roleCompanyId} onChange={(e) => setRoleCompanyId(e.target.value)} className={inputClass} disabled={roleOptionsLoading}>
              <option value="">{roleOptionsLoading ? 'Loading companies...' : 'Choose a company'}</option>
              {roleCompanies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            {!roleOptionsLoading && roleCompanies.length === 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                No companies take part in this event yet. An admin of the event can add them under Companies.
              </p>
            )}
          </div>
        )}
        {newRole === 'volunteer' && (
          <div>
            <label className={labelClass}>Team (optional)</label>
            <select value={roleTeamId} onChange={(e) => setRoleTeamId(e.target.value)} className={inputClass} disabled={roleOptionsLoading}>
              <option value="">{roleOptionsLoading ? 'Loading teams...' : 'No team'}</option>
              {roleTeams.map((t) => <option key={t.id} value={t.id}>{t.team_name}</option>)}
            </select>
          </div>
        )}
        {(newRole === 'attendee' || newRole === 'volunteer') && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            If they have no registration in this event yet, one is created as approved, copying the details of their latest registration.
          </p>
        )}
        {newRole !== '' && newRole !== 'sadmin' && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This role applies to <strong>{selectedEventName}</strong> only. Any role this person holds in another event stays as it is.
          </p>
        )}
      </ConfirmDialog>

      {/* Sign out everywhere */}
      <ConfirmDialog
        open={pending?.action === 'signout'}
        title="Sign out everywhere"
        confirmLabel="Sign out"
        reason="optional"
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={run}
        description={<p>Ends every active session of <strong>{targetName}</strong>. They can sign in again straight away; use Disable to stop that.</p>}
      />

      {/* Disable / enable */}
      <ConfirmDialog
        open={pending?.action === 'disable'}
        title="Disable account"
        confirmLabel="Disable"
        danger
        reason="required"
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={run}
        description={<p><strong>{targetName}</strong> will be signed out and blocked from signing in until the account is enabled again. No data is deleted.</p>}
      />
      <ConfirmDialog
        open={pending?.action === 'enable'}
        title="Enable account"
        confirmLabel="Enable"
        reason="optional"
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={run}
        description={<p><strong>{targetName}</strong> will be able to sign in again.</p>}
      />

      {/* Delete */}
      <ConfirmDialog
        open={pending?.action === 'delete'}
        title="Delete account permanently"
        confirmLabel="Delete forever"
        danger
        reason="required"
        typeToConfirm={target?.email || ''}
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={run}
        description={
          <>
            <p>This removes <strong>{targetName}</strong> and all of their data. It cannot be undone.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">If you only want to stop them signing in, disable the account instead.</p>
          </>
        }
      />
    </div>
  );
};

export default PeopleAccess;
