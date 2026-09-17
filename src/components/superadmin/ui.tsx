// Small building blocks shared by the super admin dashboard tabs.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, AlertTriangle } from '../icons';
import { buttonClass, inputClass, labelClass } from './sadminApi';

export const MIcon: React.FC<{ name: string; className?: string; filled?: boolean }> = ({ name, className = '', filled }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    aria-hidden="true"
  >
    {name}
  </span>
);

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'blue';

const BADGE_TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}>
    {children}
  </span>
);

export const PageHeader: React.FC<{ icon: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }> = ({ icon, title, subtitle, actions }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div className="flex items-center gap-4 min-w-0">
      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
        <MIcon name={icon} className="text-red-600 dark:text-red-400 text-2xl" />
      </div>
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Panel: React.FC<{ title?: string; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title, subtitle, actions, children, className = ''
}) => (
  <section className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {(title || actions) && (
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          {title && <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; icon: string; tone?: Tone; onClick?: () => void }> = ({
  label, value, hint, icon, tone = 'neutral', onClick
}) => {
  const iconTone: Record<Tone, string> = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm ${onClick ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconTone[tone]}`}>
          <MIcon name={icon} className="text-xl" />
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </Tag>
  );
};

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-3" />
    <p className="text-sm font-medium">{label}</p>
  </div>
);

export const EmptyState: React.FC<{ icon: string; title: string; text?: React.ReactNode }> = ({ icon, title, text }) => (
  <div className="text-center py-12">
    <MIcon name={icon} className="text-5xl text-slate-300 dark:text-slate-600 block mb-2" />
    <p className="font-semibold text-slate-700 dark:text-slate-300">{title}</p>
    {text && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{text}</p>}
  </div>
);

export const ErrorBlock: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex items-start gap-4">
    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
    <div>
      <p className="font-semibold text-red-700 dark:text-red-300">{message}</p>
      <button onClick={onRetry} className="mt-2 text-sm font-bold text-red-700 dark:text-red-300 hover:underline">Try again</button>
    </div>
  </div>
);

export const RefreshButton: React.FC<{ onClick: () => void; loading?: boolean; label?: string }> = ({ onClick, loading, label = 'Refresh' }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
  >
    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
    {label}
  </button>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label: string }> = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
  >
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

// ---------------------------------------------------------------------------
// Confirmation dialog with optional reason and typed confirmation
// ---------------------------------------------------------------------------
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** 'required' needs at least 5 characters; the reason is saved in the audit log. */
  reason?: 'none' | 'optional' | 'required';
  /** When set, the person must type this text exactly (case-insensitive) to confirm. */
  typeToConfirm?: string;
  children?: React.ReactNode;
  onConfirm: (reason: string, typed: string) => void;
  onClose: () => void;
}

const ConfirmDialogBody: React.FC<Omit<ConfirmDialogProps, 'open'>> = ({
  title, description, confirmLabel = 'Confirm', danger, busy, reason = 'none', typeToConfirm, children, onConfirm, onClose
}) => {
  const [reasonText, setReasonText] = useState('');
  const [typed, setTyped] = useState('');
  const reasonOk = reason !== 'required' || reasonText.trim().length >= 5;
  const typedOk = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.trim().toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        {description && <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 space-y-2">{description}</div>}
        {children && <div className="mb-4 space-y-3">{children}</div>}
        {reason !== 'none' && (
          <div className="mb-4">
            <label className={labelClass}>Reason {reason === 'required' ? '(saved in the activity log)' : '(optional)'}</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value.slice(0, 500))}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Why are you doing this?"
            />
          </div>
        )}
        {typeToConfirm && (
          <div className="mb-4">
            <label className={labelClass}>
              Type <span className="font-mono text-slate-700 dark:text-slate-200">{typeToConfirm}</span> to confirm
            </label>
            <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputClass} />
          </div>
        )}
        <div className="flex items-center gap-3 justify-end mt-2">
          <button onClick={onClose} disabled={busy} className={buttonClass.ghost}>Cancel</button>
          <button
            onClick={() => onConfirm(reasonText.trim(), typed.trim())}
            disabled={busy || !reasonOk || !typedOk}
            className={danger ? buttonClass.danger : buttonClass.primary}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/** Rendered only while open, so its fields start empty every time. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, ...rest }) => (
  <AnimatePresence>{open && <ConfirmDialogBody {...rest} />}</AnimatePresence>
);
