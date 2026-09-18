import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ShieldCheck, Key, LogOut } from '../../components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/shared/Toast';
import { logger } from '../../utils/logger';
import type { TabKey, ToastType } from '../../components/superadmin/sadminApi';
import { EmptyState } from '../../components/superadmin/ui';
import SecurityCenter from '../../components/superadmin/SecurityCenter';
import CommandCenter from '../../components/superadmin/CommandCenter';
import PeopleAccess from '../../components/superadmin/PeopleAccess';
import ActivityLog from '../../components/superadmin/ActivityLog';
import EventControls from '../../components/superadmin/EventControls';
import DataHealth from '../../components/superadmin/DataHealth';
import EventsManager from '../../components/superadmin/EventsManager';

const NAV_ITEMS: NavItem[] = [
  { key: 'command', label: 'Command Center', icon: 'monitor_heart' },
  { key: 'events', label: 'Events', icon: 'event' },
  { key: 'people', label: 'People & Access', icon: 'manage_accounts' },
  { key: 'activity', label: 'Activity', icon: 'history' },
  { key: 'controls', label: 'Event Controls', icon: 'tune' },
  { key: 'security', label: 'Security', icon: 'security' },
  { key: 'health', label: 'Data Health', icon: 'health_and_safety' },
];

const TAB_KEYS = NAV_ITEMS.map((item) => item.key);

// Tabs whose database functions are not installed yet (they arrive step by step).
const COMING_SOON: Record<string, string> = {
  events: 'Events'
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const SuperAdminPanel: React.FC = () => {
  const { signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('security');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({ show: false, message: '', type: 'info' });

  // ===== TWO-FACTOR (AUTHENTICATOR APP) =====
  // Super admin database functions only accept sessions that entered an authenticator
  // code (aal2). This screen guides the admin through that; it is not the protection itself.
  const [mfaStage, setMfaStage] = useState<'checking' | 'error' | 'secret' | 'enroll' | 'verify' | 'unlocked'>('checking');
  const [totpFactor, setTotpFactor] = useState<{ id: string; created_at: string } | null>(null);
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  // While the requirement is switched off (testing) no code is asked for.
  const [twoFaRequired, setTwoFaRequired] = useState(true);
  const isVerified = mfaStage === 'unlocked';

  const notify = useCallback((message: string, type: ToastType) => {
    setToast({ show: true, message, type });
  }, []);
  const closeToast = useCallback(() => setToast((prev) => ({ ...prev, show: false })), []);

  const changeTab = useCallback((key: string) => {
    if (TAB_KEYS.includes(key)) setActiveTab(key as TabKey);
  }, []);

  const refreshMfaState = useCallback(async () => {
    try {
      const [aalResult, factorsResult, stateResult] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
        supabase.rpc('sadmin_2fa_state')
      ]);
      if (aalResult.error) throw aalResult.error;
      if (factorsResult.error) throw factorsResult.error;

      // `totp` only lists authenticator apps whose setup was confirmed with a code.
      const verified = factorsResult.data?.totp?.[0] ?? null;
      setTotpFactor(verified ? { id: verified.id, created_at: verified.created_at } : null);

      const required = stateResult.error ? true : stateResult.data?.required !== false;
      setTwoFaRequired(required);

      if (!required) setMfaStage('unlocked');
      else if (aalResult.data?.currentLevel === 'aal2') setMfaStage('unlocked');
      else if (verified) setMfaStage('verify');
      else setMfaStage('secret');
    } catch (err) {
      logger.error('Error checking two-factor status:', err);
      setMfaStage('error');
    }
  }, []);

  const startEnrollment = async () => {
    // Clear any setup that was started but never confirmed.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.factor_type === 'totp' && factor.status !== 'verified') {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'ASU Career Events',
      friendlyName: `Super admin ${Date.now()}`
    });
    if (error) throw error;

    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setMfaCode('');
    setMfaStage('enroll');
  };

  // Step 1 of first-time setup: the secret key (checked on the server) is required
  // before an authenticator app can be added to this account.
  const handleSecretKeyVerify = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.rpc('sadmin_verify_secret_key', { p_key: secretKeyInput });
      if (error) throw error;

      if (data?.configured === false) {
        notify('No secret key has been set yet. Set one from the Supabase SQL editor.', 'error');
        return;
      }
      if (data?.success !== true) {
        notify('Invalid Secret Key', 'error');
        return;
      }

      setSecretKeyInput('');
      await startEnrollment();
    } catch (err) {
      logger.error('Error starting authenticator setup:', err);
      notify('Could not start the authenticator setup. Please try again.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    const factorId = mfaStage === 'enroll' ? enrollment?.factorId : totpFactor?.id;
    if (!factorId || !/^\d{6}$/.test(mfaCode)) {
      notify('Enter the 6-digit code from your authenticator app', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: mfaCode });
      if (error) {
        notify('Incorrect or expired code. Try the newest code from your app.', 'error');
        return;
      }
      const wasSetup = mfaStage === 'enroll';
      setMfaCode('');
      setEnrollment(null);
      notify(wasSetup ? 'Authenticator app is set up. You will need a code at every sign-in.' : 'Verified', 'success');
      await refreshMfaState();
    } catch (err) {
      logger.error('Error verifying authenticator code:', err);
      notify('Verification failed. Please try again.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (enrollment) await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
    setMfaCode('');
    setMfaStage('secret');
  };

  // Removes the current authenticator (e.g. a lost or replaced phone). The session then
  // returns to the setup screen, which asks for the secret key again.
  const handleResetAuthenticator = useCallback(async () => {
    if (!totpFactor) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      if (error) throw error;
      await supabase.auth.refreshSession();
      setTotpFactor(null);
      notify('Authenticator removed. Set up a new one to continue.', 'info');
      setMfaStage('secret');
    } catch (err) {
      logger.error('Error removing authenticator:', err);
      notify('Could not remove the authenticator. Please try again.', 'error');
    }
  }, [totpFactor, notify]);

  useEffect(() => {
    refreshMfaState();
  }, [refreshMfaState]);

  return (
    <SharedNavigation
      navItems={NAV_ITEMS}
      activeItem={activeTab}
      onItemChange={changeTab}
      title="Super Admin"
    >
      <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-300 min-h-screen">

        {/* Two-factor verification. Super admin database functions refuse this session until it
            has entered an authenticator code, so this screen is guidance, not the lock itself. */}
        <AnimatePresence>
          {!isVerified && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative"
              >
                <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center bg-red-100 dark:bg-red-900/20">
                  <ShieldCheck size={36} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Security Verification</h2>

                {mfaStage === 'checking' && (
                  <div className="flex flex-col items-center gap-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="animate-spin" />
                    Checking your session...
                  </div>
                )}

                {mfaStage === 'error' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Could not check your two-factor status.</p>
                    <button
                      onClick={refreshMfaState}
                      className="w-full py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {mfaStage === 'secret' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Step 1 of 2.</span> This account has no authenticator app yet. Enter the super admin secret key to set one up.
                    </p>
                    <input
                      type="password"
                      value={secretKeyInput}
                      onChange={(e) => setSecretKeyInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isVerifying && secretKeyInput) handleSecretKeyVerify(); }}
                      placeholder="Enter Super Admin Secret Key"
                      autoComplete="off"
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSecretKeyVerify}
                      disabled={isVerifying || !secretKeyInput}
                      className="w-full text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                    >
                      {isVerifying ? <Loader2 className="animate-spin" /> : <Key className="w-6 h-6" />}
                      {isVerifying ? 'Verifying...' : 'Continue'}
                    </motion.button>
                  </div>
                )}

                {mfaStage === 'enroll' && enrollment && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Step 2 of 2.</span> Scan this code with Google Authenticator, Microsoft Authenticator or another authenticator app, then enter the 6-digit code it shows.
                    </p>
                    <img
                      src={enrollment.qrCode}
                      alt="QR code for your authenticator app"
                      className="w-48 h-48 mx-auto rounded-xl bg-white p-2 border border-slate-200"
                    />
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Can't scan it? Enter this key in the app instead:
                      <code className="mt-1 block font-mono text-sm text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 break-all select-all">{enrollment.secret}</code>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isVerifying) handleVerifyCode(); }}
                      placeholder="123456"
                      aria-label="6-digit code"
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-center text-2xl tracking-[0.5em] font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleVerifyCode}
                      disabled={isVerifying || mfaCode.length !== 6}
                      className="w-full text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50 bg-red-600 hover:bg-red-700 shadow-red-500/20"
                    >
                      {isVerifying ? <Loader2 className="animate-spin" /> : <ShieldCheck size={22} />}
                      {isVerifying ? 'Verifying...' : 'Confirm Setup'}
                    </motion.button>
                    <button
                      onClick={handleCancelEnrollment}
                      disabled={isVerifying}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors block w-full text-center"
                    >
                      Cancel setup
                    </button>
                  </div>
                )}

                {mfaStage === 'verify' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Enter the 6-digit code from your authenticator app.</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isVerifying) handleVerifyCode(); }}
                      placeholder="123456"
                      aria-label="6-digit code"
                      autoFocus
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-center text-2xl tracking-[0.5em] font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleVerifyCode}
                      disabled={isVerifying || mfaCode.length !== 6}
                      className="w-full text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50 bg-red-600 hover:bg-red-700 shadow-red-500/20"
                    >
                      {isVerifying ? <Loader2 className="animate-spin" /> : <ShieldCheck size={22} />}
                      {isVerifying ? 'Verifying...' : 'Verify'}
                    </motion.button>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-[0.2em] pt-5">
                  Two-factor protected session
                </p>
                <button
                  onClick={signOut}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nothing sensitive is requested until the session is fully verified. */}
        {isVerified && (
          <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-28 lg:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'command' && <CommandCenter notify={notify} onNavigate={setActiveTab} />}
                {activeTab === 'events' && <EventsManager notify={notify} />}
                {activeTab === 'people' && <PeopleAccess notify={notify} />}
                {activeTab === 'activity' && <ActivityLog notify={notify} />}
                {activeTab === 'controls' && <EventControls notify={notify} />}
                {activeTab === 'health' && <DataHealth notify={notify} />}
                {activeTab === 'security' && (
                  <SecurityCenter
                    notify={notify}
                    totpFactor={totpFactor}
                    onResetAuthenticator={handleResetAuthenticator}
                    twoFaRequired={twoFaRequired}
                    onRequirementChanged={refreshMfaState}
                  />
                )}
                {COMING_SOON[activeTab] && (
                  <EmptyState
                    icon="construction"
                    title={`${COMING_SOON[activeTab]} is not installed yet`}
                    text="Its database functions arrive in the next step, together with the landing page editor."
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={closeToast} />
        )}
      </div>
    </SharedNavigation>
  );
};

export default SuperAdminPanel;
