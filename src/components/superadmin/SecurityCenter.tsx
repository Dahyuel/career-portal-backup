// Security: this account's own protection — the authenticator app, the secret key
// and the devices it is signed in on.
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { buttonClass, inputClass, labelClass, formatDateTime, type Notify } from './sadminApi';
import { Badge, ConfirmDialog, MIcon, PageHeader, Panel } from './ui';

interface Props {
  notify: Notify;
  totpFactor: { id: string; created_at: string } | null;
  onResetAuthenticator: () => Promise<void>;
}

const SecurityCenter: React.FC<Props> = ({ notify, totpFactor, onResetAuthenticator }) => {
  const [dialog, setDialog] = useState<'reset' | 'signout' | 'secret' | null>(null);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newKeyRepeat, setNewKeyRepeat] = useState('');

  const signOutOthers = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      notify('All your other sessions were signed out.', 'success');
      setDialog(null);
    } catch (err) {
      logger.error('Error signing out other sessions:', err);
      notify('Could not sign out your other sessions. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetAuthenticator = async () => {
    setBusy(true);
    try {
      await onResetAuthenticator();
      setDialog(null);
    } finally {
      setBusy(false);
    }
  };

  const keyProblem =
    newKey.length > 0 && (newKey.length < 12 || newKey.length > 72)
      ? 'Use 12 to 72 characters.'
      : newKeyRepeat.length > 0 && newKey !== newKeyRepeat
        ? 'The two keys do not match.'
        : null;
  const keyReady = newKey.length >= 12 && newKey.length <= 72 && newKey === newKeyRepeat;

  const saveSecretKey = async () => {
    setBusy(true);
    try {
      // Hashed with bcrypt on the server; the browser never sees or stores the hash.
      const { data, error } = await supabase.rpc('sadmin_set_secret_key', { p_new_key: newKey });
      if (error || data?.success !== true) {
        logger.error('Failed to update secret key', error ?? data?.error);
        throw new Error('update failed');
      }
      notify('Secret key changed. Share it only with the other super admins.', 'success');
      setNewKey('');
      setNewKeyRepeat('');
      setDialog(null);
    } catch {
      notify('Could not change the secret key. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon="security" title="Security" subtitle="Your own protection for this dashboard." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Authenticator app" subtitle="Needed at every sign-in to this dashboard.">
          <div className="flex items-start gap-4">
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${totpFactor ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
              <MIcon name="phonelink_lock" className="text-2xl" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {totpFactor ? 'Active' : 'Not set up'} {totpFactor && <Badge tone="green">Protected</Badge>}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {totpFactor
                  ? `Set up ${formatDateTime(totpFactor.created_at)}. Replace it if your phone is lost or changed.`
                  : 'Set one up from the verification screen.'}
              </p>
              {totpFactor && (
                <button className={`${buttonClass.ghost} mt-3 !px-0 text-red-600 dark:text-red-400`} onClick={() => setDialog('reset')}>
                  <MIcon name="sync_lock" className="text-lg" /> Replace authenticator
                </button>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="My sessions" subtitle="Sign out everywhere except this device.">
          <button className={buttonClass.ghost} onClick={() => setDialog('signout')}>
            <MIcon name="logout" className="text-lg" /> Sign out my other sessions
          </button>
        </Panel>
      </div>

      <Panel title="Secret key" subtitle="Required before anyone can set up a new authenticator for a super admin account. Change it when someone who knew it leaves.">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className={labelClass}>New secret key</label>
            <input type="password" value={newKey} onChange={(e) => setNewKey(e.target.value)} autoComplete="new-password" className={inputClass} placeholder="12 to 72 characters" />
          </div>
          <div>
            <label className={labelClass}>Repeat it</label>
            <input type="password" value={newKeyRepeat} onChange={(e) => setNewKeyRepeat(e.target.value)} autoComplete="new-password" className={inputClass} />
          </div>
          <button className={buttonClass.primary} disabled={!keyReady || busy} onClick={() => setDialog('secret')}>
            <MIcon name="key" className="text-lg" /> Change key
          </button>
        </div>
        {keyProblem && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{keyProblem}</p>}
      </Panel>

      <ConfirmDialog
        open={dialog === 'reset'}
        title="Replace authenticator"
        confirmLabel="Remove authenticator"
        danger
        typeToConfirm="REPLACE"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={resetAuthenticator}
        description={<p>The current authenticator is removed straight away. You will need the secret key and your new phone to get back in.</p>}
      />
      <ConfirmDialog
        open={dialog === 'signout'}
        title="Sign out your other sessions"
        confirmLabel="Sign out others"
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={signOutOthers}
        description={<p>Every other device signed in to your account is signed out. This device stays signed in.</p>}
      />
      <ConfirmDialog
        open={dialog === 'secret'}
        title="Change the secret key"
        confirmLabel="Change key"
        danger
        busy={busy}
        onClose={() => setDialog(null)}
        onConfirm={saveSecretKey}
        description={<p>The old key stops working immediately. Store the new one in a password manager; it cannot be shown again.</p>}
      />
    </div>
  );
};

export default SecurityCenter;
