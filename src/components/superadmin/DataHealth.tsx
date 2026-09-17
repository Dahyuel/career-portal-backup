// Data Health: finds data problems that distort statistics or confuse staff, with
// a preview of the affected records and a safe, audited fix where one exists.
import React, { useCallback, useEffect, useState } from 'react';
import { buttonClass, callSadmin, errorText, eventId, formatDateTime, roleLabel, timeAgo, type HealthCheck, type Notify } from './sadminApi';
import { Badge, ConfirmDialog, ErrorBlock, LoadingBlock, MIcon, PageHeader, Panel, RefreshButton } from './ui';

const isDateLike = (key: string, value: unknown) =>
  typeof value === 'string' && /(_at|checked_in|checked_out)$/.test(key) && !Number.isNaN(Date.parse(value));

const formatCell = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (isDateLike(key, value)) return formatDateTime(value as string);
  if (key === 'role') return roleLabel(String(value));
  if (key === 'user_id') return `…${String(value).slice(-8)}`;
  return String(value);
};

const without = <T,>(obj: Record<string, T>, key: string): Record<string, T> => {
  const next = { ...obj };
  delete next[key];
  return next;
};

const DataHealth: React.FC<{ notify: Notify }> = ({ notify }) => {
  const [checks, setChecks] = useState<HealthCheck[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, Record<string, unknown>[] | 'loading'>>({});
  const [fixTarget, setFixTarget] = useState<HealthCheck | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await callSadmin<{ checks: HealthCheck[]; generated_at: string }>('sadmin_data_health', { _event_id: eventId() }, 'Could not run the data checks.');
      setChecks(r.checks);
      setGeneratedAt(r.generated_at);
      setPreviews({});
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Could not run the data checks.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePreview = async (code: string) => {
    if (previews[code]) {
      setPreviews((p) => without(p, code));
      return;
    }
    setPreviews((p) => ({ ...p, [code]: 'loading' }));
    try {
      const r = await callSadmin<{ rows: Record<string, unknown>[] }>('sadmin_data_health_preview', { _event_id: eventId(), _code: code }, 'Could not load the affected records.');
      setPreviews((p) => ({ ...p, [code]: r.rows }));
    } catch (err) {
      setPreviews((p) => without(p, code));
      notify(errorText(err, 'Could not load the affected records.'), 'error');
    }
  };

  const runFix = async (reason: string) => {
    if (!fixTarget) return;
    setBusy(true);
    try {
      const r = await callSadmin<{ deleted: number }>('sadmin_data_health_fix', {
        _event_id: eventId(),
        _code: fixTarget.code,
        _expected_count: fixTarget.count,
        _reason: reason
      }, 'Could not fix this problem.');
      notify(`Removed ${r.deleted} record${r.deleted === 1 ? '' : 's'}.`, 'success');
      setFixTarget(null);
      load();
    } catch (err) {
      notify(errorText(err, 'Could not fix this problem.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error && !checks) return <ErrorBlock message={error} onRetry={load} />;
  if (loading && !checks) return <LoadingBlock label="Running data checks..." />;
  if (!checks) return null;

  const problems = checks.filter((c) => (c.count ?? 0) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon="health_and_safety"
        title="Data Health"
        subtitle={
          <>
            {problems.length === 0 ? 'No problems found' : `${problems.length} of ${checks.length} checks found something`}
            {generatedAt && <> · Checked {timeAgo(generatedAt)}</>}
          </>
        }
        actions={<RefreshButton onClick={load} loading={loading} label="Run checks again" />}
      />

      <div className="space-y-3">
        {checks.map((c) => {
          const count = c.count ?? 0;
          const ok = count === 0;
          const preview = previews[c.code];
          return (
            <Panel key={c.code}>
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : c.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                  <MIcon name={ok ? 'check_circle' : c.severity === 'warning' ? 'warning' : 'info'} className="text-xl" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    {c.label}
                    {ok ? <Badge tone="green">OK</Badge> : <Badge tone={c.severity === 'warning' ? 'amber' : 'blue'}>{count.toLocaleString()} found</Badge>}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.description}</p>
                </div>
                {!ok && (
                  <div className="flex gap-2 shrink-0">
                    <button className={buttonClass.ghost} onClick={() => togglePreview(c.code)}>
                      <MIcon name={preview ? 'expand_less' : 'visibility'} className="text-lg" /> {preview ? 'Hide' : 'Show records'}
                    </button>
                    {c.fixable && (
                      <button className={buttonClass.danger} onClick={() => setFixTarget(c)}>
                        <MIcon name="cleaning_services" className="text-lg" /> Clean up
                      </button>
                    )}
                  </div>
                )}
              </div>

              {preview === 'loading' && <LoadingBlock label="Loading records..." />}
              {Array.isArray(preview) && (
                preview.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Nothing to show.</p>
                ) : (
                  <div className="overflow-x-auto mt-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-left text-slate-600 dark:text-slate-300">
                          {Object.keys(preview[0]).map((k) => (
                            <th key={k} className="py-2 px-3 font-semibold capitalize whitespace-nowrap">{k.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-700/50">
                            {Object.keys(preview[0]).map((k) => (
                              <td key={k} className="py-2 px-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatCell(k, row[k])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {count > preview.length && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 border-t border-slate-100 dark:border-slate-700/50">
                        Showing the first {preview.length} of {count.toLocaleString()}.
                      </p>
                    )}
                  </div>
                )
              )}
            </Panel>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Checks without a “Clean up” button need a person to decide, for example which of two duplicate accounts to keep. Use People &amp; Access or the admin panel for those.
      </p>

      <ConfirmDialog
        open={!!fixTarget}
        title={`Clean up: ${fixTarget?.label ?? ''}`}
        confirmLabel={`Delete ${fixTarget?.count ?? 0} record${fixTarget?.count === 1 ? '' : 's'}`}
        danger
        reason="required"
        busy={busy}
        onClose={() => setFixTarget(null)}
        onConfirm={runFix}
        description={
          <>
            <p>This permanently deletes the {fixTarget?.count} record{fixTarget?.count === 1 ? '' : 's'} found by this check. It cannot be undone.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">If the data changes before you confirm, nothing is deleted and you are asked to check again.</p>
          </>
        }
      />
    </div>
  );
};

export default DataHealth;
