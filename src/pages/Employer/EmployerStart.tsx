// pages/Employer/EmployerStart.tsx
// Employer onboarding after login. Accounts are created by admins, so on first
// login the employer fills in their profile, then picks one of their events.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowRight, Briefcase, Building2, Calendar, FileText,
  Loader2, Lock, LogOut, MapPin, Phone, User
} from '../../components/icons';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLoading from '../../components/DashboardLoading';
import { SearchableSelect } from '../../components/shared/SearchableSelect';
import { GENDER_OPTIONS, NATIONALITY_OPTIONS } from '../../components/UnifiedAttendeeRegistration';
import { validatePhone, validatePersonalId } from '../../utils/validation';
import {
  EmployerEvent, EmployerStatus, completeEmployerProfile, getEmployerStatus, openEmployerEvent
} from '../../lib/employer';
import { logger } from '../../utils/logger';

type FormField = 'fullName' | 'phone' | 'personalId' | 'nationality' | 'gender' | 'jobTitle' | 'general';

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const inputClass = (hasError: boolean) =>
  `w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all bg-white dark:bg-gray-700 dark:text-white ${hasError ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`;

export const EmployerStart: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut, refreshProfile } = useAuth();
  // Set when the user picked a specific company event in /select-event and we
  // need to complete the profile first, then open that event.
  const targetEventId = searchParams.get('eventId');
  const autoOpenedRef = useRef(false);

  const [status, setStatus] = useState<EmployerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '', phone: '', personalId: '', nationality: 'egyptian', gender: '', jobTitle: ''
  });
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [saving, setSaving] = useState(false);

  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [brokenLogos, setBrokenLogos] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await getEmployerStatus();
    if (!result) {
      setLoadError('Could not load your account. Please try again.');
    } else if (!result.is_employer) {
      // Not (or no longer) an employer anywhere: use the normal flow
      navigate('/select-event', { replace: true });
      return;
    } else {
      setStatus(result);
      const p = result.profile;
      setForm((prev) => ({
        fullName: p?.full_name || prev.fullName,
        phone: p?.phone || prev.phone,
        personalId: p?.personal_id || prev.personalId,
        nationality: (p?.nationality || prev.nationality).toLowerCase(),
        gender: p?.gender || prev.gender,
        jobTitle: result.events.find((e) => e.job_title)?.job_title || prev.jobTitle
      }));
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const update = (field: Exclude<FormField, 'general'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const errs: Partial<Record<FormField, string>> = {};
    if (form.fullName.trim().length < 2) errs.fullName = 'Full name is required';
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;
    if (!form.nationality) errs.nationality = 'Nationality is required';
    if (form.nationality === 'egyptian') {
      const idErr = validatePersonalId(form.personalId);
      if (idErr) errs.personalId = idErr;
    } else if (!form.personalId.trim()) {
      errs.personalId = 'Personal ID / Passport number is required';
    }
    if (!form.gender) errs.gender = 'Gender is required';
    if (!form.jobTitle.trim()) errs.jobTitle = 'Job title is required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const result = await completeEmployerProfile({
      fullName: form.fullName.trim(),
      phone: form.phone.replace(/\D/g, ''),
      personalId: form.personalId.trim(),
      nationality: form.nationality,
      gender: form.gender,
      jobTitle: form.jobTitle.trim()
    });
    setSaving(false);

    if (!result.success) {
      const field = (result.field as FormField) || 'general';
      setErrors({ [field in form ? field : 'general']: result.error });
      return;
    }
    await load();
  };

  const handleOpenEvent = async (event: EmployerEvent) => {
    if (!user || openingId) return;
    setOpeningId(event.event_id);
    setOpenError(null);
    try {
      const opened = await openEmployerEvent(event.event_id);
      if (!opened.success) {
        setOpenError(opened.error || 'Could not open this event.');
        return;
      }
      // Binds the whole app (roles, company, dashboard data) to this event
      const updated = await refreshProfile(event.event_id, user.id, user.email ?? '', true);
      if (!updated?.roles?.includes('employer')) {
        logger.error('Employer role missing after selecting event', { event: event.event_id, updated });
        setOpenError('Could not open this event. Please contact the event organizers.');
        return;
      }
      navigate('/employer', { replace: true });
    } catch (err: any) {
      logger.error('Error opening employer event:', err);
      setOpenError(err.message || 'Could not open this event. Please try again.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return <DashboardLoading message="Loading your account..." />;
  }

  const showProfileForm = !!status && !status.profile_complete;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <div className="bg-gradient-to-r from-asu-red to-asu-red-light p-8 text-center relative">
          <button
            onClick={handleSignOut}
            className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-asu-red" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {showProfileForm ? 'Complete Your Profile' : 'Select an Event'}
          </h1>
          <p className="text-red-100 text-sm">
            {showProfileForm
              ? 'Welcome! Fill in your details once to continue.'
              : 'Choose the event you want to open.'}
          </p>
          {status && (
            <div className="mt-4 flex justify-center gap-2 text-xs font-semibold" aria-hidden="true">
              <span className={`px-3 py-1 rounded-full ${showProfileForm ? 'bg-white text-asu-red' : 'bg-white/20 text-white'}`}>1. Your details</span>
              <span className={`px-3 py-1 rounded-full ${!showProfileForm ? 'bg-white text-asu-red' : 'bg-white/20 text-white'}`}>2. Event</span>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {loadError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-asu-red flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p>{loadError}</p>
                <button onClick={load} className="mt-1 font-semibold underline">Retry</button>
              </div>
            </div>
          )}

          {showProfileForm && (
            <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
              {errors.general && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                  {errors.general}
                </div>
              )}

              <div>
                <label htmlFor="emp-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input id="emp-name" type="text" autoComplete="name" value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    className={inputClass(!!errors.fullName)} placeholder="Your full name" />
                </div>
                {errors.fullName && <p className="mt-1 text-sm text-asu-red">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emp-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input id="emp-phone" type="tel" autoComplete="tel" value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      className={inputClass(!!errors.phone)} placeholder="01XXXXXXXXX" />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-asu-red">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nationality *</label>
                  <SearchableSelect
                    options={NATIONALITY_OPTIONS}
                    value={form.nationality}
                    onChange={(val) => update('nationality', val)}
                    placeholder="Select nationality"
                    error={!!errors.nationality}
                    disabled={saving}
                  />
                  {errors.nationality && <p className="mt-1 text-sm text-asu-red">{errors.nationality}</p>}
                </div>

                <div>
                  <label htmlFor="emp-pid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {form.nationality === 'egyptian' ? 'National ID *' : 'Personal ID / Passport *'}
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input id="emp-pid" type="text" value={form.personalId}
                      onChange={(e) => update('personalId', e.target.value)}
                      className={inputClass(!!errors.personalId)}
                      placeholder={form.nationality === 'egyptian' ? '14 digits' : 'ID or passport number'} />
                  </div>
                  {errors.personalId && <p className="mt-1 text-sm text-asu-red">{errors.personalId}</p>}
                </div>

                <div>
                  <label htmlFor="emp-gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender *</label>
                  <select id="emp-gender" value={form.gender}
                    onChange={(e) => update('gender', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red bg-white dark:bg-gray-700 dark:text-white ${errors.gender ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  {errors.gender && <p className="mt-1 text-sm text-asu-red">{errors.gender}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="emp-job" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job title *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input id="emp-job" type="text" autoComplete="organization-title" value={form.jobTitle}
                    onChange={(e) => update('jobTitle', e.target.value)}
                    className={inputClass(!!errors.jobTitle)} placeholder="e.g. HR Manager" />
                </div>
                {errors.jobTitle && <p className="mt-1 text-sm text-asu-red">{errors.jobTitle}</p>}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 bg-gradient-to-r from-asu-red to-asu-red-light text-white rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Saving...</> : <>Save and continue<ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          )}

          {status && !showProfileForm && (
            <>
              {openError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {openError}
                </div>
              )}
              <ul className="space-y-3">
                {status.events.map((event) => (
                  <li key={event.event_id}>
                    <button
                      onClick={() => handleOpenEvent(event)}
                      disabled={!!openingId}
                      className="w-full text-left group bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 sm:p-5 hover:border-asu-red dark:hover:border-red-400 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-4">
                        {event.company_logo && !brokenLogos.has(event.event_id) ? (
                          <img
                            src={event.company_logo}
                            alt=""
                            onError={() => setBrokenLogos((prev) => new Set(prev).add(event.event_id))}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-600"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                            <Building2 className="w-6 h-6 text-asu-red" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{event.event_name}</h3>
                            {event.is_ended ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200 rounded-full">
                                <Lock className="w-3 h-3" /> Ended · view only
                              </span>
                            ) : event.is_current && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{event.company_name}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {event.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(event.start_date)}{event.end_date && ` – ${formatDate(event.end_date)}`}
                              </span>
                            )}
                            {event.venue_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {event.venue_name}
                              </span>
                            )}
                          </div>
                        </div>
                        {openingId === event.event_id ? (
                          <Loader2 className="w-6 h-6 text-asu-red animate-spin shrink-0" />
                        ) : (
                          <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-asu-red transition-colors shrink-0" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EmployerStart;
