// pages/EventRegistration.tsx
// Post-login event registration form. Collects academic/event fields, files, and calls register-for-event.
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, AlertCircle, CheckCircle, GraduationCap,
  UserPlus, Building2, BookOpen, Hash, Calendar, ArrowRight,
  FileText, Upload, X
} from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import {
  registerForEvent, EventRegistrationPayload, getActiveEvents, FairEvent
} from '../lib/supabase';
import { FACULTIES, CLASS_YEARS, DEGREE_LEVEL_OPTIONS, UNIVERSITIES } from '../utils/constants';
import { logger } from '../utils/logger';
import DashboardLoading from '../components/DashboardLoading';

interface FormErrors {
  [key: string]: string;
}

const ALLOWED_PROOF_TYPES = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.heic,.heif,.pdf';
const ALLOWED_CV_TYPES = '.pdf,.doc,.docx';

const getReadableTypes = (accept: string) => {
  const exts = accept.split(',').map(e => e.trim().toUpperCase().replace('.', ''));
  return exts.join(', ');
};

const FileUploadField: React.FC<{
  label: string;
  accept: string;
  required?: boolean;
  currentFile?: File;
  error?: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}> = ({ label, accept, required = false, currentFile, error, onSelect, onRemove }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onSelect(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required ? <span className="text-asu-red">*</span> : <span className="text-gray-500 font-normal">(Optional)</span>}
      </label>
      <div
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onSelect(file);
        }}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${error
          ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          : dragActive
            ? 'border-asu-red bg-red-50 dark:bg-red-900/20'
            : currentFile
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700'
          }`}
      >
        {currentFile ? (
          <div className="flex items-center justify-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{currentFile.name}</span>
            <button
              type="button"
              onClick={onRemove}
              className="text-asu-red dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept={accept}
              onChange={handleChange}
              className="hidden"
              id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
            />
            <label
              htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
              className="cursor-pointer flex flex-col items-center text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
            >
              <Upload className="w-8 h-8 mb-2" />
              <span>Click or drag file here</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Allowed: {getReadableTypes(accept)}</span>
            </label>
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-sm text-asu-red dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export const EventRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const { user, refreshProfile } = useAuth();

  const [event, setEvent] = useState<FairEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    university: '',
    customUniversity: '',
    faculty: '',
    department: '',
    year: '',
    studentStatus: '',
    volunteerId: ''
  });
  const [enrollmentProofFile, setEnrollmentProofFile] = useState<File | undefined>();
  const [cvFile, setCvFile] = useState<File | undefined>();

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) {
        navigate('/select-event', { replace: true });
        return;
      }

      try {
        setLoading(true);
        const { data: events } = await getActiveEvents();
        const selected = events.find(e => e.id === eventId);
        if (!selected) {
          navigate('/select-event', { replace: true });
          return;
        }
        setEvent(selected);
      } catch (err: any) {
        logger.error('EventRegistration load error:', err);
        setError('Could not load event details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, navigate]);

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const validateFile = (file: File, accept: string, maxSize = 10 * 1024 * 1024): string | null => {
    const allowedExts = accept.split(',').map(e => e.trim().toLowerCase());
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!allowedExts.includes(ext)) {
      return `Invalid file type. Allowed: ${getReadableTypes(accept)}`;
    }
    if (file.size > maxSize) {
      return `File too large. Maximum is ${maxSize / 1024 / 1024}MB`;
    }
    return null;
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.university) errors.university = 'University is required';
    if (formData.university === 'Other' && !formData.customUniversity.trim()) {
      errors.customUniversity = 'Please specify your university';
    }
    if (!formData.faculty) errors.faculty = 'Faculty is required';
    if (!formData.department.trim()) errors.department = 'Department / Major is required';
    if (!formData.studentStatus) errors.studentStatus = 'Student status is required';
    if (formData.studentStatus === 'undergraduate' && !formData.year) {
      errors.year = 'Class year is required for undergraduate students';
    }

    if (!enrollmentProofFile) {
      errors.enrollmentProofFile = 'Enrollment proof is required';
    } else {
      const fileErr = validateFile(enrollmentProofFile, ALLOWED_PROOF_TYPES);
      if (fileErr) errors.enrollmentProofFile = fileErr;
    }

    if (cvFile) {
      const fileErr = validateFile(cvFile, ALLOWED_CV_TYPES);
      if (fileErr) errors.cvFile = fileErr;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !eventId || !user) return;

    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    const finalUniversity = formData.university === 'Other'
      ? formData.customUniversity.trim()
      : formData.university;

    const payload: EventRegistrationPayload = {
      type: 'attendee',
      eventId,
      university: finalUniversity,
      faculty: formData.faculty,
      department: formData.department.trim(),
      year: formData.year ? parseInt(formData.year, 10) : undefined,
      studentStatus: formData.studentStatus ? (formData.studentStatus as any) : undefined,
      volunteerId: formData.volunteerId.trim(),
      enrollmentProofFile,
      cvFile
    };

    try {
      const result = await registerForEvent(payload);

      if (!result.success) {
        const status = result.error?.detail === 'duplicate_registration' ? 409 : 400;
        if (status === 409) {
          await refreshProfile(eventId, user.id, user.email, true);
          navigate('/pending-approval', { replace: true });
          return;
        }
        const field = result.error?.field || 'general';
        const message = result.error?.message || 'Event registration failed. Please try again.';
        if (field !== 'general') {
          setFormErrors(prev => ({ ...prev, [field]: message }));
        }
        setError(message);
        setSubmitting(false);
        return;
      }

      await refreshProfile(eventId, user.id, user.email, true);
      navigate('/pending-approval', { replace: true });
    } catch (err: any) {
      logger.error('Event registration submit error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DashboardLoading message="Loading Event Details..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-asu-red to-asu-red-light p-6 text-center relative">
            <button
              type="button"
              onClick={() => navigate('/select-event')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-white">{event?.name}</h1>
            <p className="text-red-100 text-sm mt-1">Complete your event registration</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-asu-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </motion.div>
            )}

            <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-asu-red" />
                Attendee Registration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Complete your attendee details and upload your enrollment proof.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  University <span dir="rtl" className="text-gray-500 dark:text-gray-400">(الجامعة)</span> <span className="text-asu-red">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.university}
                    onChange={(e) => updateField('university', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.university ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">Select university</option>
                    {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {formErrors.university && <p className="mt-1 text-sm text-asu-red">{formErrors.university}</p>}
              </div>

              {formData.university === 'Other' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Specify University <span className="text-asu-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customUniversity}
                    onChange={(e) => updateField('customUniversity', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.customUniversity ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter your university"
                  />
                  {formErrors.customUniversity && <p className="mt-1 text-sm text-asu-red">{formErrors.customUniversity}</p>}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Faculty <span dir="rtl" className="text-gray-500 dark:text-gray-400">(الكلية)</span> <span className="text-asu-red">*</span>
                </label>
                <select
                  value={formData.faculty}
                  onChange={(e) => updateField('faculty', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.faculty ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">Select faculty</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                {formErrors.faculty && <p className="mt-1 text-sm text-asu-red">{formErrors.faculty}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department / Major <span dir="rtl" className="text-gray-500 dark:text-gray-400">(القسم)</span> <span className="text-asu-red">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => updateField('department', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.department ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                {formErrors.department && <p className="mt-1 text-sm text-asu-red">{formErrors.department}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Student Status <span className="text-asu-red">*</span>
                  </label>
                  <select
                    value={formData.studentStatus}
                    onChange={(e) => updateField('studentStatus', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.studentStatus ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">Select status</option>
                    {DEGREE_LEVEL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {formErrors.studentStatus && <p className="mt-1 text-sm text-asu-red">{formErrors.studentStatus}</p>}
                </div>
              </div>

              {formData.studentStatus === 'undergraduate' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class Year <span className="text-asu-red">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.year}
                      onChange={(e) => updateField('year', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.year ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                      <option value="">Select year</option>
                      {CLASS_YEARS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {formErrors.year && <p className="mt-1 text-sm text-asu-red">{formErrors.year}</p>}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Referral Code (Volunteer ID) <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.volunteerId}
                    onChange={(e) => updateField('volunteerId', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.volunteerId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="e.g., VOL001"
                  />
                </div>
                {formErrors.volunteerId && <p className="mt-1 text-sm text-asu-red">{formErrors.volunteerId}</p>}
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Required Documents:</strong> Please upload a clear enrollment proof (university ID, UMS screenshot, or graduation certificate). CV is optional.
                  </p>
                </div>
              </div>

              <FileUploadField
                label="Enrollment Proof"
                accept={ALLOWED_PROOF_TYPES}
                required
                currentFile={enrollmentProofFile}
                error={formErrors.enrollmentProofFile}
                onSelect={(file) => { setEnrollmentProofFile(file); setFormErrors(prev => { const n = { ...prev }; delete n.enrollmentProofFile; return n; }); }}
                onRemove={() => setEnrollmentProofFile(undefined)}
              />

              <FileUploadField
                label="CV / Resume"
                accept={ALLOWED_CV_TYPES}
                currentFile={cvFile}
                error={formErrors.cvFile}
                onSelect={(file) => { setCvFile(file); setFormErrors(prev => { const n = { ...prev }; delete n.cvFile; return n; }); }}
                onRemove={() => setCvFile(undefined)}
              />
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    Complete Registration
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default EventRegistration;
