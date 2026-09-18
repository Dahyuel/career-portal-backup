import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import SharedNavigation, { NavItem } from '../../components/shared/SharedNavigation';

import { useTheme } from '../../contexts/ThemeContext';
import { FACULTIES } from '../../utils/constants';
import { validateEmail } from '../../utils/validation';
import { copyText, selectElementText } from '../../utils/clipboard';
import Toast from '../../components/shared/Toast';

import { supabase, getSessionBookingsRPC } from '../../lib/supabase';
import {
  Plus,
  TrendingUp,
  Building2,
  Calendar,
  Megaphone,
  ArrowRight,
  X,
  Loader2,
  Globe,
  Mail,
  MapPin,
  Key,
  Hash,
  Search,
  Pencil,
  Copy,
  Check,
  Clock,
  Users,
  Send,
  Briefcase,
  Eye,
  ChevronRight,
  Trash2,
  UserPlus
} from '../../components/icons';
import JobApplicantsModal from '../../components/employer/JobApplicantsModal';
import { logger } from '../../utils/logger';
import StatisticsTab from '../../components/admin/StatisticsTab';
import FeedbackManagement from '../../components/admin/FeedbackManagement';
import { getActiveEventId } from '../../lib/currentEvent';

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  },
  exit: { opacity: 0 }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

// --- Types ---
interface Company {
  id: string;
  event_id: string;
  company_name: string;
  industry: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  booth_number: string | null;
  logo_url: string | null;
  partner_type: 'diamond' | 'platinum' | 'gold' | 'silver' | 'exhibitor_a' | 'exhibitor_b' | 'student_activity_partner' | 'community_partner' | 'catering_partner' | 'career_coaching_partner' | null;
  company_key: string | null;
  created_at: string | null;
  faculties: string[] | null;
  employers?: CompanyEmployer[];
}

interface CompanyEmployer {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  profile_complete: boolean;
  added_at: string | null;
}

interface LibraryCompany {
  id: string;
  company_name: string;
  industry: string | null;
  logo_url: string | null;
  website: string | null;
  in_event: boolean;
  events_count: number;
}

interface AdminJob {
  id: string;
  title: string;
  company_id: string;
  employer_id: string;
  event_id: string;
  job_type: string;
  location: string;
  experience_level: string;
  employment_mode: string;
  posted_at: string;
  is_active: boolean;
  no_of_applicants: number;
  description: string;
  required_skills: string;
  company_name?: string;
  company_logo?: string | null;
}

interface AdminEvent {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  schedule_type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  speaker_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  speaker: Speaker | null;
}

interface Speaker {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  linkedin_url: string | null;
  photo_url: string | null;
}

interface Session {
  id: string;
  event_id: string;
  speaker_id: string;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  room_name: string | null;
  room_capacity: number | null;
  max_attendees: number | null;
  current_bookings: number;
  is_full: boolean;
  requires_booking: boolean;
  status: string;
  created_at: string | null;
  speaker?: Speaker;
}


interface DashboardStats {
  totalAttendees: number;
  approvedAttendees: number;
  rejectedAttendees: number;
  pendingAttendees: number;
  todayEntries: number;
  totalCompanies: number;
  totalSessions: number;
}

const PARTNER_TYPE_OPTIONS = ['diamond', 'platinum', 'gold', 'silver', 'exhibitor_a', 'exhibitor_b', 'student_activity_partner', 'community_partner', 'catering_partner', 'career_coaching_partner'] as const;
const SESSION_TYPE_OPTIONS = ['keynote', 'workshop', 'panel', 'networking', 'competition', 'mentorship_circle', 'career_coaching', 'other'] as const;
const ANNOUNCEMENT_TYPE_OPTIONS = ['general', 'urgent', 'update', 'reminder'] as const;

const PARTNER_TYPE_COLORS: Record<string, string> = {
  diamond: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  platinum: 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100',
  gold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  silver: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  exhibitor_a: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  exhibitor_b: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  student_activity_partner: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  community_partner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  catering_partner: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  career_coaching_partner: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
};
const FacultySelector = ({
  faculties,
  onChange,
}: {
  faculties: string[];
  onChange: (updated: string[]) => void;
}) => {

  const addFaculty = () => onChange([...faculties, '']);
  const updateFaculty = (index: number, value: string) => {
    const updated = [...faculties];
    updated[index] = value;
    onChange(updated);
  };
  const removeFaculty = (index: number) => onChange(faculties.filter((_, i) => i !== index));

  const inputClass = "flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target Faculties</label>
        <button
          type="button"
          onClick={addFaculty}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Faculty
        </button>
      </div>

      {faculties.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">
          No faculties added — targets all faculties by default.
        </p>
      ) : (
        <AnimatePresence>
          {faculties.map((faculty, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              <select
                value={faculty}
                onChange={(e) => updateFaculty(index, e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>Select a faculty...</option>
                {FACULTIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeFaculty(index)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};
const SESSION_TYPE_COLORS: Record<string, string> = {
  keynote: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  workshop: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  panel: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  networking: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  competition: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  mentorship_circle: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  career_coaching: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  other: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

const JOB_TYPE_COLORS: Record<string, string> = {
  'full-time': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Full-Time': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'part-time': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Part-Time': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'internship': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Internship': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'contract': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Contract': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'freelance': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'Freelance': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

// The event id is read inside the component from the active event
// (system_config → active_event_id), not hard-coded to one past event.

// Helper: format a date as YYYY-MM-DDTHH:mm in local timezone for datetime-local inputs
// Also normalizes date strings for Safari compatibility (Safari rejects "2026-03-08 14:00" format)
const toLocalDatetimeInput = (dateStr: string): string => {
  // Safari requires 'T' separator between date and time — Supabase returns space-separated
  const normalized = dateStr.replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

const SpeakerPhotoSelector: React.FC<{
  value: string;
  onChange: (url: string) => void;
  inputClass: string;
}> = ({ value, onChange, inputClass }) => {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploadError('');
    setIsUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `speaker_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('Speakers')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('Speakers').getPublicUrl(fileName);
      onChange(data.publicUrl);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setPreview('');
      onChange('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
    setPreview(url);
  };

  const handleClear = () => {
    onChange('');
    setPreview('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Speaker Photo (optional)
        </span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(['file', 'url'] as const).map((m) => (
            <motion.button
              key={m}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => { setMode(m); handleClear(); }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${mode === m
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              {m === 'file' ? 'Upload' : 'URL'}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'file' ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl py-5 flex flex-col items-center gap-2 text-slate-400 hover:border-red-400 hover:text-red-500 dark:hover:border-red-600 transition-all disabled:opacity-50 bg-white dark:bg-slate-900/30"
            >
              {isUploading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-6 h-6" />
                  </motion.span>
                  <span className="text-xs font-semibold">Uploading...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                  <span className="text-xs font-semibold">Click to upload image</span>
                  <span className="text-[10px]">PNG, JPG, WEBP</span>
                </>
              )}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="url"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <input
              type="url"
              className={inputClass}
              placeholder="https://example.com/photo.jpg"
              value={value}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {uploadError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> {uploadError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Preview */}
      <AnimatePresence>
        {(preview || value) && !isUploading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <img
              src={preview || value}
              alt="Speaker preview"
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100"
              onError={(e) => {
                if (mode === 'url' && value) {
                  // Only show the fallback icon if URL fails, don't clear the value completely
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
                } else {
                  setPreview('');
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Preview</p>
              <p className="text-[10px] text-slate-400 truncate">{value}</p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const COMPANY_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const COMPANY_LOGO_MAX_BYTES = 5 * 1024 * 1024;

const CompanyLogoSelector: React.FC<{
  value: string;
  onChange: (url: string) => void;
  inputClass: string;
}> = ({ value, onChange, inputClass }) => {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Must match the Companies bucket limits
    if (!COMPANY_LOGO_TYPES.includes(file.type)) {
      setUploadError('Logo must be a PNG, JPG or WEBP image');
      e.target.value = '';
      return;
    }
    if (file.size > COMPANY_LOGO_MAX_BYTES) {
      setUploadError('Logo must be 5 MB or smaller');
      e.target.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploadError('');
    setIsUploading(true);

    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const fileName = `company_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('Companies')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('Companies').getPublicUrl(fileName);
      onChange(data.publicUrl);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setPreview('');
      onChange('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
    setPreview(url);
  };

  const handleClear = () => {
    onChange('');
    setPreview('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Company Logo (optional)
        </span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(['file', 'url'] as const).map((m) => (
            <motion.button
              key={m}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => { setMode(m); handleClear(); }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${mode === m
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              {m === 'file' ? 'Upload' : 'URL'}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'file' ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl py-5 flex flex-col items-center gap-2 text-slate-400 hover:border-red-400 hover:text-red-500 dark:hover:border-red-600 transition-all disabled:opacity-50 bg-white dark:bg-slate-900/30"
            >
              {isUploading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-6 h-6" />
                  </motion.span>
                  <span className="text-xs font-semibold">Uploading...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                  <span className="text-xs font-semibold">Click to upload logo</span>
                  <span className="text-[10px]">PNG, JPG, WEBP · up to 5 MB</span>
                </>
              )}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="url"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <input
              type="url"
              className={inputClass}
              placeholder="https://example.com/logo.png"
              value={value}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {uploadError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> {uploadError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Preview */}
      <AnimatePresence>
        {(preview || value) && !isUploading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <img
              src={preview || value}
              alt="Company logo preview"
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100"
              onError={(e) => {
                if (mode === 'url' && value) {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
                } else {
                  setPreview('');
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Preview</p>
              <p className="text-[10px] text-slate-400 truncate">{value}</p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export function AdminPanel() {
  useTheme();

  // Whatever the super admin has made the current event. Read here (not at module
  // level) so it is resolved after the active event has loaded at start-up.
  const EVENT_ID = getActiveEventId();


  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'statistics', label: 'Statistics', icon: 'bar_chart' },
    { key: 'sessions', label: 'Sessions', icon: 'event' },
    { key: 'events', label: 'Events', icon: 'campaign' },
    { key: 'companies', label: 'Companies', icon: 'business' },
    { key: 'jobs', label: 'Jobs', icon: 'work' },
    { key: 'points', label: 'Points', icon: 'stars' },
    { key: 'feedback', label: 'Feedback', icon: 'rate_review' }
  ];

  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartMode, setChartMode] = useState<'pie' | 'bar'>('pie');
  const [statisticsView, setStatisticsView] = useState<'general' | 'filter' | 'day'>('general');
  const [selectedDay, setSelectedDay] = useState(0);
  const [statsFilterCategory, setStatsFilterCategory] = useState<'university' | 'faculty' | 'registration' | 'payment' | 'asu' | 'gender' | 'degreeLevel' | 'classYear'>('university');

  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string } | null>(null);

  // Modal states
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ show: false, message: '', type: 'info' });
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string, name: string } | null>(null);

  // ===== JOBS STATE =====
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
  const [showJobDetailModal, setShowJobDetailModal] = useState(false);
  const [showJobApplicantsModal, setShowJobApplicantsModal] = useState(false);

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string, title: string } | null>(null);

  // Add/Edit Event State
  const [showAddEditEventModal, setShowAddEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', schedule_type: 'session', start_time: '', end_time: '', location: '', speaker_id: ''
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isConfirmingCommon, setIsConfirmingCommon] = useState<string | null>(null);
  const [eventFormError, setEventFormError] = useState('');

  // ===== DASHBOARD STATS STATE =====
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalAttendees: 0, approvedAttendees: 0, rejectedAttendees: 0, pendingAttendees: 0, todayEntries: 0, totalCompanies: 0, totalSessions: 0
  });

  // ===== SESSIONS STATE =====
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  // Session Bookings State
  const [showSessionBookingsModal, setShowSessionBookingsModal] = useState(false);
  const [sessionBookings, setSessionBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsSearchQuery, setBookingsSearchQuery] = useState('');
  const [selectedSessionForBookings, setSelectedSessionForBookings] = useState<{ id: string; title: string; current_bookings: number; max_attendees: number | null } | null>(null);

  // Add Session form state
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionForm, setSessionForm] = useState({
    title: '', description: '', session_type: 'workshop' as string, speaker_id: '' as string,
    start_time: '', end_time: '', room_name: '', max_attendees: '' as string,
    requires_booking: false, status: 'scheduled' as string,
    new_speaker_first_name: '', new_speaker_last_name: '', new_speaker_title: '',
    new_speaker_linkedin: '', new_speaker_photo: '',
  });
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [sessionFormError, setSessionFormError] = useState('');
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [isSubmittingSpeaker, setIsSubmittingSpeaker] = useState(false);
  const [useNewSpeaker, setUseNewSpeaker] = useState(false);

  // ===== VIEW SPEAKERS MODAL STATE =====
  const [showViewSpeakersModal, setShowViewSpeakersModal] = useState(false);
  const [speakersWithSessions, setSpeakersWithSessions] = useState<any[]>([]);
  const [isLoadingSpeakersWithSessions, setIsLoadingSpeakersWithSessions] = useState(false);
  const [speakerToDelete, setSpeakerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingSpeaker, setIsDeletingSpeaker] = useState(false);
  const [editingSpeakerInModal, setEditingSpeakerInModal] = useState<any | null>(null);
  const [editSpeakerForm, setEditSpeakerForm] = useState({ first_name: '', last_name: '', title: '', linkedin_url: '', photo_url: '' });
  const [isSubmittingEditSpeaker, setIsSubmittingEditSpeaker] = useState(false);
  const [editSpeakerFormError, setEditSpeakerFormError] = useState('');
  const [showAddSpeakerModal, setShowAddSpeakerModal] = useState(false);
  const [addSpeakerForm, setAddSpeakerForm] = useState({ first_name: '', last_name: '', title: '', linkedin_url: '', photo_url: '' });
  const [isSubmittingAddSpeaker, setIsSubmittingAddSpeaker] = useState(false);
  const [addSpeakerFormError, setAddSpeakerFormError] = useState('');

  // ===== ANNOUNCEMENT STATE =====
  const [announcementForm, setAnnouncementForm] = useState({
    title: '', content: '', announcement_type: 'general' as string,
  });


  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
  const [announcementFormError, setAnnouncementFormError] = useState('');

  // ===== STATISTICS STATE =====
  type CountMap = { label: string; count: number }[];
  interface EnhancedStatsData {
    roleBreakdown: CountMap;
    volunteerTeams: CountMap;
    registrationStatus: CountMap;
    asuVsOthers: CountMap;
    paymentStatus: CountMap;
    universities: CountMap;
    faculties: CountMap;
    genderBreakdown: CountMap;
    degreeLevelBreakdown: CountMap;
    classYearBreakdown: CountMap;
    totalPeople: number;
    attendees: number;
    volunteers: number;
    employers: number;
    companies: number;
    checkIns: number;
    totalSessionBookings: number;
    dayStats: {
      date: string;
      label?: string;
      checkIns: number;
      checkOuts: number;
      maleCheckIns: number;
      femaleCheckIns: number;
      asuCheckIns: number;
      nonAsuCheckIns: number;
      universities: CountMap;
      faculties: CountMap;
      genderBreakdown: CountMap;
      degreeLevelBreakdown: CountMap;
      classYearBreakdown: CountMap;
      sessionAttendance: number;
    }[];
  }

  type AudienceTarget =
    | { type: 'role'; role: string }
    | { type: 'team'; role: string; teamId: string; teamName: string };
  const [statsData, setStatsData] = useState<EnhancedStatsData | null>(null);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);

  const [audienceTargets, setAudienceTargets] = useState<AudienceTarget[]>([]);
  // ===== COMPANIES STATE =====
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showViewCompanyModal, setShowViewCompanyModal] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);
  const loginDetailsRef = useRef<HTMLPreElement>(null);

  // Employers of the company open in the details modal
  const [showEmployerForm, setShowEmployerForm] = useState(false);
  const [employerEmail, setEmployerEmail] = useState('');
  const [employerError, setEmployerError] = useState('');
  const [isAddingEmployer, setIsAddingEmployer] = useState(false);
  const [removingEmployerId, setRemovingEmployerId] = useState<string | null>(null);
  // Shown once after an account is created so the admin can hand it over
  const [createdEmployer, setCreatedEmployer] = useState<{ email: string; password: string | null } | null>(null);

  // "Add existing companies" picker
  const [showLinkCompaniesModal, setShowLinkCompaniesModal] = useState(false);
  const [libraryCompanies, setLibraryCompanies] = useState<LibraryCompany[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySelection, setLibrarySelection] = useState<string[]>([]);
  const [isLinkingCompanies, setIsLinkingCompanies] = useState(false);

  // Add Company form state
  const [companyForm, setCompanyForm] = useState({
    company_name: '', industry: '', email: '', website: '',
    description: '', booth_number: '', logo_url: '', partner_type: '' as string,
    faculties: [] as string[],  // ← ADD THIS
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [companyFormError, setCompanyFormError] = useState('');


  // Edit Company state
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({
    company_name: '', industry: '', email: '', website: '',
    description: '', booth_number: '', logo_url: '', partner_type: '' as string,
    faculties: [] as string[],  // ← ADD THIS
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  const fetchDashboardStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_dashboard_stats', {
        _event_id: EVENT_ID,
      });
      if (error) { logger.error('Error fetching dashboard stats:', error); return; }
      setDashboardStats(data as DashboardStats);
    } catch (err) { logger.error('Error fetching dashboard stats:', err); }
  }, []);

  // ===== SESSIONS FETCHING =====
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_sessions', { _event_id: EVENT_ID });
      if (error) { logger.error('Error fetching sessions:', error); return; }
      setSessions((data as Session[]) || []);
    } catch (err) { logger.error('Error fetching sessions:', err); }
    finally { setIsLoadingSessions(false); }
  }, []);

  const fetchSessionBookings = useCallback(async (session: { id: string; title: string; current_bookings: number; max_attendees: number | null }) => {
    setSelectedSessionForBookings(session);
    setShowSessionBookingsModal(true);
    setIsLoadingBookings(true);
    try {
      const { data, error } = await getSessionBookingsRPC(session.id);
      if (error) {
        setToast({ show: true, message: 'Failed to fetch bookings', type: 'error' });
        return;
      }
      setSessionBookings(data || []);
    } catch (err) {
      logger.error('Error fetching session bookings:', err);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  const formatBookingYear = (yearStr: string | number | null | undefined) => {
    if (!yearStr && yearStr !== 0) return 'N/A';
    const str = String(yearStr).trim();
    if (!str) return 'N/A';
    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      const suffixes = ['th', 'st', 'nd', 'rd'];
      const v = num % 100;
      const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
      return `${num}${suffix} Year`;
    }
    return str;
  };

  const exportBookingsToCSV = () => {
    if (!sessionBookings.length) return;
    
    const headers = ['#', 'Full Name', 'Phone', 'National ID', 'Email', 'University', 'Faculty', 'Year', 'Booked At', 'Status'];
    const csvData = sessionBookings.map((b, idx) => {
      const bookedAt = b.booked_at ? new Date(b.booked_at).toLocaleString() : '';
      return [
        idx + 1,
        `"${(b.full_name || '').replace(/"/g, '""')}"`,
        `="${b.phone || ''}"`,
        `="${b.personal_id || ''}"`,
        `"${(b.email || '').replace(/"/g, '""')}"`,
        `"${(b.university || '').replace(/"/g, '""')}"`,
        `"${(b.faculty || '').replace(/"/g, '""')}"`,
        `"${formatBookingYear(b.class_year)}"`,
        `"${bookedAt}"`,
        `"${b.status || ''}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session_bookings_${selectedSessionForBookings?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchSpeakers = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_speakers');
      if (error) { logger.error('Error fetching speakers:', error); return; }
      setSpeakers((data as Speaker[]) || []);
    } catch (err) { logger.error('Error fetching speakers:', err); }
  }, []);

  // ===== COMPANIES DATA FETCHING =====
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_companies', { _event_id: EVENT_ID });
      if (error) { logger.error('Error fetching companies:', error); return; }
      const list = (data as Company[]) || [];
      setCompanies(list);
      setSelectedCompany((prev) => (prev ? list.find((c) => c.id === prev.id) ?? null : prev));
    } catch (err) { logger.error('Error fetching companies:', err); }
    finally { setIsLoadingCompanies(false); }
  }, []);

  // ===== JOBS DATA FETCHING =====
  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_jobs', { _event_id: EVENT_ID });
      if (error) { logger.error('Error fetching jobs:', error); return; }
      setJobs((data as AdminJob[]) || []);
    } catch (err) { logger.error('Error fetching jobs:', err); }
    finally { setIsLoadingJobs(false); }
  }, []);

  // ===== EVENTS DATA FETCHING =====
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_schedule', { _event_id: EVENT_ID });
      if (error) { logger.error('Error fetching schedule:', error); return; }
      setEvents((data as AdminEvent[]) || []);
    } catch (err) { logger.error('Error fetching events:', err); }
    finally { setIsLoadingEvents(false); }
  }, []);

  // ===== STATISTICS FETCHING =====
  const fetchStatistics = useCallback(async () => {
    setIsLoadingStatistics(true);
    try {
      // Fetch main statistics and session bookings count in parallel
      const [statsResult, bookingsResult] = await Promise.all([
        supabase.rpc('admin_get_enhanced_statistics', { _event_id: EVENT_ID }),
        supabase.rpc('admin_get_total_session_bookings', { _event_id: EVENT_ID }),
      ]);

      if (statsResult.error) { logger.error('Error fetching statistics:', statsResult.error); return; }

      // Add computed label to dayStats and fetch session attendance per day
      const raw = statsResult.data as any;
      const dayStatsRaw = raw.dayStats || [];

      // Fetch session attendance for each day in parallel
      const dayAttendanceResults = await Promise.all(
        dayStatsRaw.map((day: any) =>
          supabase.rpc('admin_get_session_attendance_by_day', { _event_id: EVENT_ID, _target_date: day.date })
        )
      );

      const dayYearLabels: Record<string, string> = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year', '5': '5th Year' };

      const dayStats = dayStatsRaw.map((day: any, i: number) => ({
        ...day,
        label: `Day ${i + 1} — ${new Date(day.date).toLocaleDateString([], {
          weekday: 'long', month: 'short', day: 'numeric',
        })}`,
        sessionAttendance: dayAttendanceResults[i]?.data ?? 0,
        degreeLevelBreakdown: (day.degreeLevelBreakdown || []).filter((item: any) => item.label && item.label !== 'Not specified'),
        classYearBreakdown: (day.classYearBreakdown || [])
          .filter((item: any) => item.label && item.label !== 'Not specified')
          .map((item: any) => ({
            label: dayYearLabels[item.label] || item.label,
            count: item.count,
          })),
      }));

      // Format class year labels (e.g. "1" -> "1st Year")
      const yearLabels: Record<string, string> = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year', '5': '5th Year' };
      const classYearBreakdown: CountMap = (raw.classYearBreakdown || [])
        .filter((item: any) => item.label && item.label !== 'Not specified')
        .map((item: any) => ({
          label: yearLabels[item.label] || item.label,
          count: item.count,
        }));

      setStatsData({
        ...raw,
        dayStats,
        genderBreakdown: (raw.genderDistribution || raw.genderBreakdown || []).filter((item: any) => item.label && item.label !== 'Not specified'),
        degreeLevelBreakdown: (raw.degreeLevelBreakdown || []).filter((item: any) => item.label && item.label !== 'Not specified'),
        classYearBreakdown,
        totalSessionBookings: bookingsResult.data ?? 0,
      });
    } catch (err) { logger.error('Error fetching statistics:', err); }
    finally { setIsLoadingStatistics(false); }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);
  useEffect(() => {
    if (activeTab === 'points') {
      supabase.rpc('admin_get_points_config', { _event_id: EVENT_ID }).then(({ data }) => {
        if (data?.success && data.config) {
          // Load task-based common points
          setCommonPoints(prev => prev.map(rule => {
            const found = data.config.find((c: any) => c.config_key === rule.id);
            return found ? { ...rule, points: found.points } : rule;
          }));
          // Load per-hour rates into teamPointsConfig
          setTeamPointsConfig(prev => {
            const updated = { ...prev };
            VOLUNTEER_TEAMS.forEach(team => {
              const found = data.config.find((c: any) => c.config_key === `per_hour_rate_${team.key}`);
              if (found) {
                updated[team.key] = { perHourRate: found.points };
              }
            });
            return updated;
          });
        }
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'sessions') { fetchSessions(); fetchSpeakers(); }
    if (activeTab === 'companies') { fetchCompanies(); }
    if (activeTab === 'jobs') { fetchJobs(); }
    if (activeTab === 'events') { fetchEvents(); fetchSpeakers(); }
    // The Statistics tab now loads itself through StatisticsTab
    // (admin_get_event_statistics). The old fetch is not run any more.
  }, [activeTab, fetchSessions, fetchSpeakers, fetchCompanies, fetchJobs, fetchEvents, fetchStatistics]);


  // ===== OPEN EDIT EVENT =====
  const openEditEvent = (event: AdminEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      schedule_type: event.schedule_type || 'event',
      start_time: event.start_time ? toLocalDatetimeInput(event.start_time) : '',
      end_time: event.end_time ? toLocalDatetimeInput(event.end_time) : '',
      location: event.location || '',
      speaker_id: event.speaker_id || '',
    });
    setEventFormError('');
    setShowAddEditEventModal(true);
  };
  const handleConfirmCommonRule = async (rule: PointRule) => {
    setIsConfirmingCommon(rule.id);
    try {
      const { data, error } = await supabase.rpc('admin_set_points_config', {
        _event_id: EVENT_ID,
        _config_key: rule.id,   // rule.id matches the config_key e.g. 'attendee_referral'
        _points: rule.points,
      });
      if (error || !data?.success) {
        setToast({ show: true, message: data?.detail || error?.message || 'Failed to save', type: 'error' });
      } else {
        setToast({ show: true, message: `"${rule.name}" set to ${rule.points} points`, type: 'success' });
      }
    } finally {
      setIsConfirmingCommon(null);
    }
  };

  // ===== ADD/EDIT EVENT HANDLER =====
  const handleAddEditEvent = async () => {
    if (!eventForm.title.trim()) { setEventFormError('Title is required.'); return; }
    if (!eventForm.start_time || !eventForm.end_time) { setEventFormError('Start and end times are required.'); return; }
    if (new Date(eventForm.start_time) >= new Date(eventForm.end_time)) {
      setEventFormError('End time must be after start time.'); return;
    }
    setIsSubmittingEvent(true);
    setEventFormError('');
    try {
      const { error } = await supabase.rpc('admin_upsert_schedule_item', {
        _event_id: EVENT_ID,
        _title: eventForm.title.trim(),
        _schedule_type: eventForm.schedule_type,
        _start_time: new Date(eventForm.start_time).toISOString(),
        _end_time: new Date(eventForm.end_time).toISOString(),
        _description: eventForm.description.trim() || null,
        _location: eventForm.location.trim() || null,
        _speaker_id: eventForm.speaker_id || null,
        _item_id: editingEvent?.id ?? null,
      });
      if (error) throw error;

      setEventForm({ title: '', description: '', schedule_type: 'session', start_time: '', end_time: '', location: '', speaker_id: '' });
      setShowAddEditEventModal(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      setEventFormError(err.message || 'Failed to save event');
    } finally { setIsSubmittingEvent(false); }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      const { error } = await supabase.rpc('delete_session', {
        p_session_id: sessionToDelete.id,
      });
      if (error) throw error;
      setToast({ show: true, message: 'Session deleted successfully', type: 'success' });
      fetchSessions();
      fetchDashboardStats();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to delete session', type: 'error' });
    } finally {
      setSessionToDelete(null);
    }
  };
  const renderDeleteSessionModal = () => (
    <AnimatePresence>
      {sessionToDelete && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSessionToDelete(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative z-10 p-6 flex flex-col items-center text-center"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
              className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"
            >
              <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-slate-900 dark:text-white mb-2"
            >
              Delete Session?
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-slate-500 dark:text-slate-400 text-sm mb-6"
            >
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                "{sessionToDelete.title}"
              </span>
              ? All bookings for this session will also be removed. This action cannot be undone.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center gap-3 w-full"
            >
              <button
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmDeleteSession}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderSessionBookingsModal = () => {
    const filteredBookings = sessionBookings.filter(b => {
      if (!bookingsSearchQuery.trim()) return true;
      const q = bookingsSearchQuery.toLowerCase();
      return (
        (b.full_name?.toLowerCase().includes(q) || '') ||
        (b.personal_id?.toLowerCase().includes(q) || '') ||
        (b.email?.toLowerCase().includes(q) || '') ||
        (b.phone?.toLowerCase().includes(q) || '') ||
        (b.university?.toLowerCase().includes(q) || '') ||
        (b.faculty?.toLowerCase().includes(q) || '') ||
        (b.class_year?.toString().toLowerCase().includes(q) || '')
      );
    });

    return (
      <AnimatePresence>
        {showSessionBookingsModal && selectedSessionForBookings && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSessionBookingsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden relative z-10 flex flex-col"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 md:px-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">{selectedSessionForBookings.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{sessionBookings.length} {sessionBookings.length === 1 ? 'Booking' : 'Bookings'}</span>
                      {selectedSessionForBookings.max_attendees && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {selectedSessionForBookings.max_attendees} max capacity
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSessionBookingsModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="p-4 md:px-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4 justify-between shrink-0">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search name, email, phone, ID, university..."
                    value={bookingsSearchQuery}
                    onChange={(e) => setBookingsSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 outline-none text-slate-900 dark:text-white text-sm"
                  />
                  {bookingsSearchQuery && (
                    <button
                      onClick={() => setBookingsSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
                <button
                  onClick={exportBookingsToCSV}
                  disabled={sessionBookings.length === 0}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 relative min-h-[300px]">
                {isLoadingBookings ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No bookings found</p>
                    <p className="text-slate-500 text-sm">
                      {bookingsSearchQuery ? "No results match your search query." : "This session doesn't have any bookings yet."}
                    </p>
                  </div>
                ) : (
                  <div className="min-w-[1100px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 sticky top-0 z-10">
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-12">#</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">National ID</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">University</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faculty</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Year</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booked At</th>
                          <th className="py-3.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredBookings.map((booking, idx) => (
                          <motion.tr 
                            key={booking.booking_id || idx}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.015, 0.2) }}
                            className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-3.5 px-4 text-xs font-semibold text-slate-400 text-center">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {booking.full_name || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {booking.phone || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {booking.personal_id || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {booking.email || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {booking.university || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {booking.faculty || 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                                {formatBookingYear(booking.class_year)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {booking.booked_at ? new Date(booking.booked_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                              }) : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                                (booking.status === 'confirmed' || booking.status === 'booked' || booking.status === 'checked_in')
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50'
                                  : booking.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}>
                                {booking.status || 'Booked'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  // ===== DELETE EVENT HANDLER =====
  const handleDeleteEvent = (eventId: string, eventTitle: string) => {
    setEventToDelete({ id: eventId, title: eventTitle });
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      const { error } = await supabase.rpc('admin_delete_schedule_item', {
        _item_id: eventToDelete.id,
      });
      if (error) throw error;
      setToast({ show: true, message: 'Event deleted successfully', type: 'success' });
      fetchEvents();
      fetchDashboardStats();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to delete event', type: 'error' });
    } finally { setEventToDelete(null); }
  };



  // ===== ADD COMPANY HANDLER =====
  const handleAddCompany = async () => {
    if (!companyForm.company_name.trim()) {
      setCompanyFormError('Company name is required.');
      return;
    }
    setIsSubmittingCompany(true);
    setCompanyFormError('');
    try {
      const { data, error } = await supabase.rpc('admin_add_company', {
        _event_id: EVENT_ID,
        _company_name: companyForm.company_name.trim(),
        _industry: companyForm.industry.trim() || null,
        _email: companyForm.email.trim() || null,
        _website: companyForm.website.trim() || null,
        _description: companyForm.description.trim() || null,
        _booth_number: companyForm.booth_number.trim() || null,
        _logo_url: companyForm.logo_url.trim() || null,
        _partner_type: companyForm.partner_type || null,
        _faculties: companyForm.faculties || []
      });
      if (error) { setCompanyFormError(error.message); return; }
      if (data?.success === false) { setCompanyFormError(data.error || 'Failed to add company'); return; }
      setToast({
        show: true,
        message: data?.created === false
          ? `${data.company_name} already existed and was added to this event (key ${data.company_key})`
          : `Company added. Key: ${data?.company_key ?? '—'}`,
        type: 'success'
      });

      setCompanyForm({
        company_name: '', industry: '', email: '', website: '',
        description: '', booth_number: '', logo_url: '', partner_type: '',
        faculties: [],
      });
      setShowAddCompanyModal(false);
      fetchCompanies();
    } catch (err: any) {
      setCompanyFormError(err.message || 'Failed to add company');
    } finally { setIsSubmittingCompany(false); }
  };

  // ===== COPY COMPANY KEY =====
  // copyId marks which copy button shows the "copied" tick
  // When copying is blocked the text is selected instead (textEl), so Ctrl+C works
  const handleCopyKey = async (copyId: string, text: string, textEl?: HTMLElement | null) => {
    if (await copyText(text)) {
      setCopyFailedId(null);
      setCopiedKeyId(copyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      selectElementText(textEl ?? null);
      setCopyFailedId(copyId);
      if (!textEl) {
        setToast({ show: true, message: 'Could not copy. Select the text and copy it manually.', type: 'error' });
      }
    }
  };

  // ===== COMPANY EMPLOYERS =====
  const resetEmployerPanel = () => {
    setShowEmployerForm(false);
    setEmployerEmail('');
    setEmployerError('');
    setCreatedEmployer(null);
    setCopyFailedId(null);
  };

  const handleAddEmployer = async (companyId: string) => {
    const email = employerEmail.trim().toLowerCase();
    const emailErr = validateEmail(email);
    if (emailErr) { setEmployerError(emailErr); return; }

    setIsAddingEmployer(true);
    setEmployerError('');
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-employer', {
        body: { eventId: EVENT_ID, companyId, email }
      });

      let result: any = data;
      if (!result && error) {
        try { result = await (error as any).context?.json?.(); } catch { /* not JSON */ }
      }
      if (!result?.success) {
        setEmployerError(result?.error || error?.message || 'Failed to add employer');
        return;
      }

      setCreatedEmployer({ email, password: result.existingAccount ? null : result.password });
      setEmployerEmail('');
      setShowEmployerForm(false);
      setToast({ show: true, message: 'Employer added', type: 'success' });
      await fetchCompanies();
    } catch (err: any) {
      setEmployerError(err.message || 'Failed to add employer');
    } finally {
      setIsAddingEmployer(false);
    }
  };

  const handleRemoveEmployer = async (employer: CompanyEmployer) => {
    const who = employer.full_name || employer.email || 'this employer';
    if (!window.confirm(`Remove ${who}? They will lose employer access for this event. Their account is kept.`)) return;
    setRemovingEmployerId(employer.user_id);
    try {
      const { data, error } = await supabase.rpc('admin_remove_employer', {
        _event_id: EVENT_ID,
        _user_id: employer.user_id
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to remove employer');
      setToast({ show: true, message: 'Employer removed', type: 'success' });
      await fetchCompanies();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to remove employer', type: 'error' });
    } finally {
      setRemovingEmployerId(null);
    }
  };

  // ===== ADD EXISTING COMPANIES =====
  const openLinkCompanies = async () => {
    setShowLinkCompaniesModal(true);
    setLibrarySearch('');
    setLibrarySelection([]);
    setIsLoadingLibrary(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_companies', { _event_id: EVENT_ID });
      if (error) throw error;
      setLibraryCompanies((data as LibraryCompany[]) || []);
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to load companies', type: 'error' });
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleLinkCompanies = async () => {
    if (librarySelection.length === 0) return;
    setIsLinkingCompanies(true);
    try {
      const { data, error } = await supabase.rpc('admin_link_companies', {
        _event_id: EVENT_ID,
        _company_ids: librarySelection
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to add companies');
      setToast({ show: true, message: `${data.linked} ${data.linked === 1 ? 'company' : 'companies'} added to this event`, type: 'success' });
      setShowLinkCompaniesModal(false);
      fetchCompanies();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to add companies', type: 'error' });
    } finally {
      setIsLinkingCompanies(false);
    }
  };

  // ===== OPEN EDIT COMPANY =====
  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditCompanyForm({
      company_name: company.company_name || '',
      industry: company.industry || '',
      email: company.email || '',
      website: company.website || '',
      description: company.description || '',
      booth_number: company.booth_number || '',
      logo_url: company.logo_url || '',
      partner_type: company.partner_type || '',
      faculties: company.faculties || [],  // ← ADD THIS
    });
    setEditFormError('');
    setShowEditCompanyModal(true);
  };

  // ===== EDIT COMPANY HANDLER =====
  const handleEditCompany = async () => {
    if (!editingCompany) return;
    if (!editCompanyForm.company_name.trim()) {
      setEditFormError('Company name is required.');
      return;
    }
    setIsSubmittingEdit(true);
    setEditFormError('');
    try {
      const { error } = await supabase.rpc('admin_update_company', {
        _company_id: editingCompany.id,
        _company_name: editCompanyForm.company_name.trim(),
        _industry: editCompanyForm.industry.trim() || null,
        _email: editCompanyForm.email.trim() || null,
        _website: editCompanyForm.website.trim() || null,
        _description: editCompanyForm.description.trim() || null,
        _booth_number: editCompanyForm.booth_number.trim() || null,
        _logo_url: editCompanyForm.logo_url.trim() || null,
        _partner_type: editCompanyForm.partner_type || null,
        _faculties: editCompanyForm.faculties || []
      });
      if (error) { setEditFormError(error.message); return; }

      setShowEditCompanyModal(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update company');
    } finally { setIsSubmittingEdit(false); }
  };

  // ===== DELETE COMPANY HANDLER =====
  const handleDeleteCompany = (companyId: string, companyName: string) => {
    setCompanyToDelete({ id: companyId, name: companyName });
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    try {
      const { error } = await supabase.rpc('admin_delete_company', {
        _company_id: companyToDelete.id,
      });
      if (error) throw error;
      setToast({ show: true, message: 'Company deleted successfully', type: 'success' });
      fetchCompanies();
      fetchDashboardStats();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to delete company', type: 'error' });
    } finally { setCompanyToDelete(null); }
  };

  // ===== POINTS CONFIGURATION STATE =====
  type PointRule = { id: string; name: string; points: number; type: 'per_hour' | 'per_task'; description?: string };
  type TeamPointsConfig = Record<string, { perHourRate: number; tasks?: PointRule[] }>;

  const VOLUNTEER_TEAMS = [
    { key: 'registration', label: 'Registration', icon: 'app_registration', color: 'bg-blue-500', gradientFrom: 'from-blue-500', gradientTo: 'to-blue-600' },
    { key: 'building', label: 'Building', icon: 'construction', color: 'bg-amber-500', gradientFrom: 'from-amber-500', gradientTo: 'to-amber-600' },
    { key: 'verification', label: 'Verification', icon: 'verified_user', color: 'bg-teal-500', gradientFrom: 'from-teal-500', gradientTo: 'to-teal-600' },
    { key: 'feedback', label: 'Feedback', icon: 'rate_review', color: 'bg-pink-500', gradientFrom: 'from-pink-500', gradientTo: 'to-pink-600' },
    { key: 'stage', label: 'Stage', icon: 'mic', color: 'bg-red-500', gradientFrom: 'from-red-500', gradientTo: 'to-red-600' },
    { key: 'marketing', label: 'Marketing', icon: 'campaign', color: 'bg-orange-500', gradientFrom: 'from-orange-500', gradientTo: 'to-orange-600' },
    { key: 'media', label: 'Media', icon: 'photo_camera', color: 'bg-cyan-500', gradientFrom: 'from-cyan-500', gradientTo: 'to-cyan-600' },
    { key: 'usher', label: 'Usher', icon: 'directions_walk', color: 'bg-indigo-500', gradientFrom: 'from-indigo-500', gradientTo: 'to-indigo-600' },
    { key: 'catering', label: 'Catering', icon: 'restaurant', color: 'bg-lime-500', gradientFrom: 'from-lime-500', gradientTo: 'to-lime-600' },
    { key: 'er', label: 'ER', icon: 'emergency', color: 'bg-rose-500', gradientFrom: 'from-rose-500', gradientTo: 'to-rose-600' },
  ];

  const [teamPointsConfig, setTeamPointsConfig] = useState<TeamPointsConfig>(() => {
    const initial: TeamPointsConfig = {};
    VOLUNTEER_TEAMS.forEach(t => {
      initial[t.key] = { perHourRate: 10 };
    });
    return initial;
  });
  const [selectedTeam, setSelectedTeam] = useState(VOLUNTEER_TEAMS[0].key);
  const [commonPoints, setCommonPoints] = useState<PointRule[]>([
    { id: 'attendee_referral', name: 'Attendee Referral', points: 10, type: 'per_task', description: 'Points for referring a new attendee' },
    { id: 'event_checkin_staff', name: 'Event Check-in', points: 1, type: 'per_task', description: 'Points for checking in an attendee at the event' },
    { id: 'event_checkout_staff', name: 'Event Check-out', points: 1, type: 'per_task', description: 'Points for checking out an attendee' },
    { id: 'session_checkin_staff', name: 'Session Check-in', points: 1, type: 'per_task', description: 'Points for checking an attendee into a session' },
    { id: 'attendee_verification', name: 'Verification Action', points: 2, type: 'per_task', description: 'Points for approving or rejecting an attendee registration' },
  ]);

  const updatePerHourRate = (teamKey: string, delta: number) => {
    setTeamPointsConfig(prev => ({
      ...prev,
      [teamKey]: { perHourRate: Math.max(0, (prev[teamKey]?.perHourRate || 0) + delta) }
    }));
  };
  const updateCommonPointValue = (ruleId: string, delta: number) => {
    setCommonPoints(prev => prev.map(r => r.id === ruleId ? { ...r, points: Math.max(0, r.points + delta) } : r));
  };

  // ===== RENDER POINTS TAB =====
  const renderPoints = () => {

    const getTaskRulesForTeam = (teamKey: string) => {
      if (teamKey === 'registration') return commonPoints.filter(r => ['event_checkin_staff', 'event_checkout_staff'].includes(r.id));
      if (teamKey === 'building') return commonPoints.filter(r => r.id === 'session_checkin_staff');
      if (teamKey === 'verification') return commonPoints.filter(r => r.id === 'attendee_verification');
      return [];
    };

    const activeTeam = VOLUNTEER_TEAMS.find(t => t.key === selectedTeam) || VOLUNTEER_TEAMS[0];
    const activeRate = teamPointsConfig[activeTeam.key]?.perHourRate || 0;
    const activeTaskRules = getTaskRulesForTeam(activeTeam.key);

    const CommonPointCard = ({ rule }: { rule: typeof commonPoints[number] }) => (
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
        <p className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">{rule.name}</p>
        {rule.description && <p className="text-xs text-slate-400 mb-3">{rule.description}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateCommonPointValue(rule.id, -1)}
            className="w-9 h-9 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:border-red-300 hover:text-red-500 transition-all bg-white dark:bg-slate-800">
            <span className="material-symbols-outlined text-lg">remove</span>
          </motion.button>
          <span className="text-2xl font-black text-slate-900 dark:text-white w-10 text-center tabular-nums">{rule.points}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateCommonPointValue(rule.id, 1)}
            className="w-9 h-9 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:border-red-300 hover:text-red-500 transition-all bg-white dark:bg-slate-800">
            <span className="material-symbols-outlined text-lg">add</span>
          </motion.button>
          <span className="text-xs text-slate-400">pts / task</span>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleConfirmCommonRule(rule)}
            disabled={isConfirmingCommon === rule.id}
            className="ml-auto px-4 py-2 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 text-sm flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm">
            {isConfirmingCommon === rule.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Confirm
          </motion.button>
        </div>
      </div>
    );

    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* ── Header ── */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
            <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">stars</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Points Configuration</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Set point values per team and per task</p>
          </div>
        </motion.div>

        {/* ── Team selector grid ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2"
        >
          {VOLUNTEER_TEAMS.map((team, index) => {
            const isActive = selectedTeam === team.key;
            return (
              <motion.button
                key={team.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04, duration: 0.25 }}
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setSelectedTeam(team.key)}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-colors duration-200 overflow-hidden ${isActive
                  ? 'border-transparent shadow-lg'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
              >
                {isActive && <span className={`absolute inset-0 ${team.color}`} />}
                <span className={`relative z-10 material-symbols-outlined text-[22px] transition-colors ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                  {team.icon}
                </span>
                <span className={`relative z-10 text-[9px] sm:text-[10px] font-bold leading-tight text-center transition-colors ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {team.label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="activeTeamDot"
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm z-20"
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Team detail panel ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTeam}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
          >
            {/* Coloured header strip */}
            <div className={`bg-gradient-to-r ${activeTeam.gradientFrom} ${activeTeam.gradientTo} px-6 py-5 flex items-center gap-4`}>
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-white text-2xl">{activeTeam.icon}</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                <h2 className="text-xl font-bold text-white">{activeTeam.label} Team</h2>
                <p className="text-white/70 text-xs mt-0.5">
                  {activeTaskRules.length > 0 ? 'Hourly rate + task-based points' : 'Hourly rate only'}
                </p>
              </motion.div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">

              {/* Per-hour rate */}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-base">schedule</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Points Per Hour</p>
                    <p className="text-xs text-slate-400">Awarded for each hour worked</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 py-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => updatePerHourRate(activeTeam.key, -5)}
                    className="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-red-300 hover:text-red-500 transition-all bg-white dark:bg-slate-800 text-xs font-bold">
                    -5
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => updatePerHourRate(activeTeam.key, -1)}
                    className="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-red-300 hover:text-red-500 transition-all bg-white dark:bg-slate-800">
                    <span className="material-symbols-outlined text-xl">remove</span>
                  </motion.button>

                  <div className="text-center min-w-[90px]">
                    <motion.span
                      key={activeRate}
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-5xl font-black text-slate-900 dark:text-white block tabular-nums"
                    >
                      {activeRate}
                    </motion.span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 block">pts / hr</span>
                  </div>

                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => updatePerHourRate(activeTeam.key, 1)}
                    className="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-red-300 hover:text-red-500 transition-all bg-white dark:bg-slate-800">
                    <span className="material-symbols-outlined text-xl">add</span>
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => updatePerHourRate(activeTeam.key, 5)}
                    className="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-red-300 hover:text-red-500 transition-all bg-white dark:bg-slate-800 text-xs font-bold">
                    +5
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    const { data: rpcData, error } = await supabase.rpc('admin_set_points_config', {
                      _event_id: EVENT_ID,
                      _config_key: `per_hour_rate_${activeTeam.key}`,
                      _points: activeRate,
                    });
                    if (error || !rpcData?.success) {
                      setToast({ show: true, message: rpcData?.detail || error?.message || 'Failed to save', type: 'error' });
                    } else {
                      setToast({ show: true, message: `${activeTeam.label}: ${activeRate} pts/hr saved`, type: 'success' });
                    }
                  }}
                  className="mt-3 w-full py-3 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirm Rate
                </motion.button>
              </motion.div>

              {/* Task-based rules for this team */}
              {activeTaskRules.length > 0 && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">Task-Based Points</p>
                  <div className="space-y-3">
                    {activeTaskRules.map((rule, index) => (
                      <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + index * 0.08 }}
                      >
                        <CommonPointCard rule={rule} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Common / General section (always visible) ── */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', bounce: 0.4 }}
              className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">groups</span>
            </motion.div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">General Points</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Applied across all roles</p>
            </div>
          </div>

          <div className="space-y-4">
            {commonPoints.filter(r => r.id === 'attendee_referral').map((rule, index) => (
              <motion.div key={rule.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + index * 0.1 }}>
                <CommonPointCard rule={rule} />
              </motion.div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    );
  };

  // ===== DASHBOARD TAB =====
  const renderDashboard = () => (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Welcome Card */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-red-500/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <span className="material-symbols-outlined text-9xl text-white transform rotate-12">admin_panel_settings</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome, Admin</h1>
          <p className="text-red-100 text-lg mb-6 max-w-2xl">
            Monitor and manage all aspects of the career fair event from one central hub.
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Add Company', icon: <Building2 className="h-6 w-6" />, onClick: () => setShowAddCompanyModal(true), gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
          { label: 'Add Session', icon: <Calendar className="h-6 w-6" />, onClick: () => setShowAddSessionModal(true), gradient: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20' },
          { label: 'Send Announcement', icon: <Megaphone className="h-6 w-6" />, onClick: () => setShowAnnouncementModal(true), gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={action.onClick}
            className={`bg-gradient-to-br ${action.gradient} text-white p-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-between group shadow-md ${action.shadow}`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">{action.icon}</div>
              <span className="font-semibold text-lg">{action.label}</span>
            </div>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        ))}
      </motion.div>

      {/* Statistics Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Registrations */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">person_add</span>
              </div>
              <p className="text-base text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">TOTAL REGISTRATIONS</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-400 text-xs font-bold">Live</span>
            </div>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.totalAttendees}</div>
          <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Approved</p>
              <p className="text-xl font-bold text-green-600">{dashboardStats.approvedAttendees}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pending</p>
              <p className="text-xl font-bold text-amber-600">{dashboardStats.pendingAttendees}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Rejected</p>
              <p className="text-xl font-bold text-rose-600">{dashboardStats.rejectedAttendees}</p>
            </div>
          </div>
        </motion.div>

        {/* Today's Entries */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">login</span>
            </div>
            <p className="text-base text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">TODAY'S CHECK-INS</p>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.todayEntries}</div>
        </motion.div>

        {/* Companies */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
              <Building2 className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-base text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">COMPANIES</p>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.totalCompanies}</div>
        </motion.div>

        {/* Sessions */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
              <Calendar className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-base text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">SESSIONS</p>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dashboardStats.totalSessions}</div>
        </motion.div>
      </motion.div>
    </motion.div>
  );

  // ===== STATISTICS TAB =====
  // Pie chart color palettes
  const PIE_COLORS = {
    people: ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#f97316'],
    registration: ['#10b981', '#f59e0b', '#ef4444'],
    asu: ['#6366f1', '#a855f7'],
    payment: ['#10b981', '#f59e0b', '#ef4444'],
    teams: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#f97316', '#ef4444', '#84cc16', '#14b8a6', '#f43f5e'],
    universities: ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#a855f7', '#0ea5e9', '#22c55e', '#eab308'],
    gender: ['#3b82f6', '#ec4899', '#94a3b8'],
    degreeLevel: ['#8b5cf6', '#f59e0b'],
    classYear: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  };

  // Custom tooltip for pie charts
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{data.name}</p>
          <p className="text-lg font-extrabold" style={{ color: data.payload.fill }}>{data.value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{((data.payload.percent || 0) * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer for pie slices
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Reusable pie chart card component
  const PieChartCard = ({ title, icon, data, colors, delay = 0 }: { title: string; icon: string; data: CountMap; colors: string[]; delay?: number }) => {
    const total = data.reduce((s, d) => s + d.count, 0);
    const chartData = data.filter(d => d.count > 0).map(d => ({ name: d.label.charAt(0).toUpperCase() + d.label.slice(1), value: d.count, percent: total > 0 ? d.count / total : 0 }));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">{icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Total: {total}</p>
          </div>
        </div>
        <div className="p-4">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">pie_chart</span>
              <p className="text-sm font-medium">No data yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                    animationBegin={delay * 1000}
                    animationDuration={800}
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {item.name} <span className="font-semibold text-slate-900 dark:text-white">({item.value})</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Reusable bar chart card component
  const BarChartCard = ({ title, icon, data, colors, delay = 0 }: { title: string; icon: string; data: CountMap; colors: string[]; delay?: number }) => {
    const total = data.reduce((s, d) => s + d.count, 0);
    const chartData = data.filter(d => d.count > 0).map(d => ({ name: d.label.charAt(0).toUpperCase() + d.label.slice(1), value: d.count, percent: total > 0 ? d.count / total : 0 }));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">{icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Total: {total}</p>
          </div>
        </div>
        <div className="p-4">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">bar_chart</span>
              <p className="text-sm font-medium">No data yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.07} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 12) + '…' : v}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const d = payload[0];
                        return (
                          <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{d.payload.name}</p>
                            <p className="text-lg font-extrabold" style={{ color: d.payload.fill || d.color }}>{d.value}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{((d.payload.percent || 0) * 100).toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} animationBegin={delay * 1000} animationDuration={800}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`bar-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {item.name} <span className="font-semibold text-slate-900 dark:text-white">({item.value})</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Helper: render chart card based on mode
  const ChartCard = (props: { title: string; icon: string; data: CountMap; colors: string[]; delay?: number }) => {
    return chartMode === 'bar' ? <BarChartCard {...props} /> : <PieChartCard {...props} />;
  };

  // ===== STATISTICS TAB =====
  const renderStatistics = () => {
    if (isLoadingStatistics || !statsData) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading statistics...</p>
        </div>
      );
    }

    const s = statsData;
    const totalPeople = s.totalPeople;

    // Filter view data
    const filterData: Record<string, CountMap> = {
      university: s.universities,
      faculty: s.faculties,
      registration: s.registrationStatus,
      payment: s.paymentStatus,
      asu: s.asuVsOthers,
      gender: s.genderBreakdown,
      degreeLevel: s.degreeLevelBreakdown || [],
      classYear: s.classYearBreakdown || [],
      volunteerTeams: s.volunteerTeams,
    };
    const filterLabels: Record<string, string> = { university: 'University', faculty: 'Faculty', registration: 'Registration Status', payment: 'Payment Status', asu: 'ASU vs Others', gender: 'Gender', degreeLevel: 'Degree Level', classYear: 'Class Year', volunteerTeams: 'Volunteer Teams' };
    const filterIcons: Record<string, string> = { university: 'school', faculty: 'account_balance', registration: 'how_to_reg', payment: 'payments', asu: 'groups', gender: 'wc', degreeLevel: 'workspace_premium', classYear: 'event_note', volunteerTeams: 'volunteer_activism' };
    const filterPieColors: Record<string, string[]> = {
      university: PIE_COLORS.universities,
      faculty: PIE_COLORS.universities,
      registration: PIE_COLORS.registration,
      payment: PIE_COLORS.payment,
      asu: PIE_COLORS.asu,
      gender: PIE_COLORS.gender,
      degreeLevel: PIE_COLORS.degreeLevel,
      classYear: PIE_COLORS.classYear,
      volunteerTeams: PIE_COLORS.teams,
    };

    return (
      <div className="space-y-6">

        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">pie_chart</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Statistics</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Visual overview of attendees, volunteers & event data</p>
          </div>
        </motion.div>

        {/* Sub-tab Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Sub-tab buttons */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-200 dark:border-slate-700 inline-flex gap-2">
            {(['general', 'filter', 'day'] as const).map(v => (
              <button key={v} onClick={() => setStatisticsView(v)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${statisticsView === v ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {v === 'general' ? 'General' : v === 'filter' ? 'By Filter' : 'By Day'}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-700 inline-flex gap-1">
            {([{ key: 'pie' as const, icon: 'pie_chart', label: 'Pie Charts' }, { key: 'bar' as const, icon: 'bar_chart', label: 'Bar Charts' }]).map(opt => (
              <button
                key={opt.key}
                onClick={() => setChartMode(opt.key)}
                title={opt.label}
                className={`px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 text-sm ${chartMode === opt.key
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <span className="material-symbols-outlined text-base">{opt.icon}</span>
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== GENERAL VIEW ===== */}
        {statisticsView === 'general' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Summary Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total People', value: totalPeople, icon: 'groups', gradient: 'from-red-500 to-rose-600' },
                { label: 'Attendees', value: s.attendees, icon: 'person', gradient: 'from-blue-500 to-blue-600' },
                { label: 'Volunteers', value: s.volunteers, icon: 'volunteer_activism', gradient: 'from-amber-500 to-orange-600' },
                { label: 'Companies', value: s.companies, icon: 'business', gradient: 'from-purple-500 to-violet-600' },
                { label: 'Check-ins', value: s.checkIns, icon: 'login', gradient: 'from-emerald-500 to-green-600' },
                { label: 'Total Session Bookings', value: s.totalSessionBookings, icon: 'calendar_month', gradient: 'from-cyan-500 to-teal-600' },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}
                >
                  <div className="absolute -right-2 -bottom-2 opacity-10">
                    <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>{card.icon}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-lg">{card.icon}</span>
                    <p className="text-sm font-medium text-white/80">{card.label}</p>
                  </div>
                  <p className="text-3xl font-extrabold">{card.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Pie Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ChartCard title="People Overview" icon="groups" data={s.roleBreakdown} colors={PIE_COLORS.people} delay={0.1} />
              <ChartCard title="Registration Status" icon="how_to_reg" data={s.registrationStatus} colors={PIE_COLORS.registration} delay={0.15} />
              <ChartCard title="ASU vs Other Universities" icon="school" data={s.asuVsOthers} colors={PIE_COLORS.asu} delay={0.2} />
              <ChartCard title="Payment Status" icon="payments" data={s.paymentStatus} colors={PIE_COLORS.payment} delay={0.25} />
              <ChartCard title="Volunteer Teams" icon="volunteer_activism" data={s.volunteerTeams} colors={PIE_COLORS.teams} delay={0.3} />

            </div>
          </motion.div>
        )}

        {/* ===== BY FILTER VIEW ===== */}
        {statisticsView === 'filter' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Filter Category Selector */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(filterLabels) as Array<keyof typeof filterLabels>).map(key => (
                <button key={key} onClick={() => setStatsFilterCategory(key as any)}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${statsFilterCategory === key
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-red-300'}`}>
                  <span className="material-symbols-outlined text-base">{filterIcons[key]}</span>
                  {filterLabels[key]}
                </button>
              ))}
            </div>

            {/* Filter Pie Chart + Breakdown */}
            {(() => {
              const currentData = filterData[statsFilterCategory] || [];
              const total = currentData.reduce((sum, d) => sum + d.count, 0);
              const topItem = currentData.length > 0 ? [...currentData].sort((a, b) => b.count - a.count)[0] : null;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie chart */}
                  <ChartCard
                    title={`${filterLabels[statsFilterCategory]} Distribution`}
                    icon={filterIcons[statsFilterCategory]}
                    data={currentData}
                    colors={filterPieColors[statsFilterCategory]}
                    delay={0.1}
                  />

                  {/* Summary + Detail Table */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">insights</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Detailed Breakdown</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{currentData.length} categories · Total: {total}</p>
                      </div>
                    </div>

                    {/* Top item highlight */}
                    {topItem && (
                      <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-900/5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm">trending_up</span>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Top</span>
                        </div>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 truncate">
                          {topItem.label.charAt(0).toUpperCase() + topItem.label.slice(1)}
                        </p>
                        <p className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200">
                          {topItem.count} <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">({total > 0 ? ((topItem.count / total) * 100).toFixed(1) : 0}%)</span>
                        </p>
                      </div>
                    )}

                    {/* Detail rows */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto mt-2">
                      {currentData.map((item, i) => {
                        const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                        return (
                          <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: filterPieColors[statsFilterCategory][i % filterPieColors[statsFilterCategory].length] }} />
                            <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 truncate">
                              {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                            </span>
                            <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 hidden sm:block">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: filterPieColors[statsFilterCategory][i % filterPieColors[statsFilterCategory].length] }} />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-right">{item.count}</span>
                            <span className="text-xs text-slate-400 w-12 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                      {currentData.length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-400">No data available</p>}
                    </div>
                  </motion.div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ===== BY DAY VIEW ===== */}
        {statisticsView === 'day' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Day Selector */}
            <div className="flex gap-3 flex-wrap">
              {s.dayStats.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 w-full text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-3">event_busy</span>
                  <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No check-in data yet</p>
                  <p className="text-sm text-slate-500 mt-1">Check-in statistics will appear here once attendees start checking in.</p>
                </div>
              ) : (
                s.dayStats.map((day, i) => (
                  <button key={day.date} onClick={() => setSelectedDay(i)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${selectedDay === i
                      ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-red-300'}`}>
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    {day.label || `Day ${i + 1}`}
                  </button>
                ))
              )}
            </div>

            {/* Day Stats Content */}
            {s.dayStats.length > 0 && (() => {
              const dayIndex = Math.min(selectedDay, s.dayStats.length - 1);
              const day = s.dayStats[dayIndex];
              return (
                <div className="space-y-6">
                  {/* Day Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Check-ins', value: day.checkIns, icon: 'login', gradient: 'from-red-500 to-rose-600' },
                      { label: 'Check Outs', value: day.checkOuts ?? 0, icon: 'logout', gradient: 'from-orange-500 to-amber-600' },
                      { label: 'ASU Check-ins', value: day.asuCheckIns, icon: 'school', gradient: 'from-indigo-500 to-indigo-600' },
                      { label: 'Session Attendance', value: day.sessionAttendance ?? 0, icon: 'event_available', gradient: 'from-cyan-500 to-teal-600' },
                    ].map((card, i) => (
                      <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}
                      >
                        <div className="absolute -right-2 -bottom-2 opacity-10">
                          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>{card.icon}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-lg">{card.icon}</span>
                          <p className="text-xs font-medium text-white/80">{card.label}</p>
                        </div>
                        <p className="text-3xl font-extrabold">{card.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Day Pie Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChartCard
                      title={`${day.label || 'Day'} — ASU vs Others`}
                      icon="groups"
                      data={[
                        { label: 'ASU Check-ins', count: day.asuCheckIns },
                        { label: 'Other Uni Check-ins', count: day.nonAsuCheckIns },
                      ]}
                      colors={PIE_COLORS.asu}
                      delay={0.1}
                    />
                    <ChartCard
                      title={`${day.label || 'Day'} — Universities`}
                      icon="school"
                      data={day.universities || []}
                      colors={PIE_COLORS.universities}
                      delay={0.15}
                    />
                    <ChartCard
                      title={`${day.label || 'Day'} — Faculties`}
                      icon="account_balance"
                      data={day.faculties || []}
                      colors={PIE_COLORS.universities}
                      delay={0.2}
                    />
                    <ChartCard
                      title={`${day.label || 'Day'} — Gender`}
                      icon="wc"
                      data={day.genderBreakdown || []}
                      colors={PIE_COLORS.gender}
                      delay={0.25}
                    />
                    <ChartCard
                      title={`${day.label || 'Day'} — Student Status`}
                      icon="school"
                      data={day.degreeLevelBreakdown || []}
                      colors={PIE_COLORS.degreeLevel}
                      delay={0.3}
                    />
                    <ChartCard
                      title={`${day.label || 'Day'} — Year of Study`}
                      icon="calendar_month"
                      data={day.classYearBreakdown || []}
                      colors={PIE_COLORS.classYear}
                      delay={0.35}
                    />
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </div>
    );
  };


  // ===== SESSIONS TAB =====
  // Superseded by StatisticsTab. Kept for reference only — nothing renders it,
  // and admin_get_enhanced_statistics is locked from v2_04 onwards. Safe to
  // delete this block (and its chartMode / statisticsView / statsData state).
  void renderStatistics;

  const renderSessions = () => (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header with Add Button */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sessions</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage event sessions and speakers</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            {sessionSearchQuery && (
              <button
                onClick={() => setSessionSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setEditingSession(null);
              setSessionForm({
                title: '', description: '', session_type: 'workshop', speaker_id: '',
                start_time: '', end_time: '', room_name: '', max_attendees: '',
                requires_booking: false, status: 'scheduled',
                new_speaker_first_name: '', new_speaker_last_name: '', new_speaker_title: '',
                new_speaker_linkedin: '', new_speaker_photo: ''
              });
              setUseNewSpeaker(false);
              setSessionFormError('');
              setShowAddSessionModal(true);
            }}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Add Session
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowViewSpeakersModal(true);
              fetchSpeakersWithSessions();
            }}
            className="w-full sm:w-auto bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-500/20 whitespace-nowrap"
          >
            <Users className="h-5 w-5" />
            View Speakers
          </motion.button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search sessions by title or speaker..."
          value={sessionSearchQuery}
          onChange={(e) => setSessionSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
        />
        {sessionSearchQuery && (
          <button
            onClick={() => setSessionSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </motion.div>

      {/* Sessions Grid */}
      {isLoadingSessions ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading sessions...</p>
        </motion.div>
      ) : sessions.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.4, delay: 0.1 }}
          >
            <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          </motion.div>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No sessions yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-6">Click "Add Session" to create one</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddSessionModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all shadow-md shadow-red-500/20"
          >
            <Plus className="h-5 w-5" />
            Add Session
          </motion.button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions
            .filter(session => {
              if (!sessionSearchQuery.trim()) return true;
              const q = sessionSearchQuery.toLowerCase();
              const speakerName = session.speaker
                ? `${session.speaker.first_name} ${session.speaker.last_name}`.toLowerCase()
                : '';
              return session.title.toLowerCase().includes(q) || speakerName.includes(q);
            })
            .map((session, index) => {
              const startDate = new Date(session.start_time.replace(' ', 'T'));
              const timeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.3 }}
                  whileHover={{ y: -5 }}
                  onClick={() => openEditSession(session)}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col h-full cursor-pointer"
                >
                  {/* Image Header */}
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={session.speaker?.photo_url || 'https://images.unsplash.com/photo-1544531320-98514ea28924?auto=format&fit=crop&w=800&q=80'}
                      alt={session.speaker ? `${session.speaker.first_name} ${session.speaker.last_name}` : 'Speaker'}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Time badge */}
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide shadow-sm">
                      {timeStr}
                    </div>

                    {/* Type + Status badges */}
                    <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${SESSION_TYPE_COLORS[session.session_type] || SESSION_TYPE_COLORS.other}`}>
                        {session.session_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                      {session.status !== 'scheduled' && (
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${session.status === 'ongoing' ? 'bg-green-500 text-white' :
                          session.status === 'completed' ? 'bg-slate-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                          {session.status}
                        </span>
                      )}
                    </div>

                    {/* Admin action buttons — top left */}
                    <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEditSession(session); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-800/90 text-blue-600 hover:bg-white transition-colors shadow-sm"
                        title="Edit Session"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSessionToDelete({ id: session.id, title: session.title }); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-800/90 text-red-600 hover:bg-white transition-colors shadow-sm"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <h3
                        onClick={() => openEditSession(session)}
                        className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight cursor-pointer group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors"
                      >
                        {session.title}
                      </h3>

                      {session.speaker && (
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                          with{' '}
                          <span className="text-slate-700 dark:text-slate-300">
                            {session.speaker.first_name} {session.speaker.last_name}
                          </span>
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          <Calendar className="w-3.5 h-3.5 text-red-500" />
                          {dateStr}
                        </div>
                        {session.room_name && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-sm text-red-500">location_on</span>
                            {session.room_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        {session.current_bookings}/{session.max_attendees || '∞'}
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); fetchSessionBookings(session); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Bookings
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); openEditSession(session); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-900/50"
                        >
                          Edit
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </motion.div>
      )}
    </motion.div>
  );

  // ===== EVENTS TAB (SCHEDULE AGENDA) =====
  const filteredEvents = events.filter((e) => {
    if (!eventSearchQuery.trim()) return true;
    const q = eventSearchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.schedule_type && e.schedule_type.toLowerCase().replace('_', ' ').includes(q)) ||
      (e.location && e.location.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  });

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const dateStr = new Date(event.start_time).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(event);
    return acc;
  }, {} as Record<string, AdminEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const renderEvents = () => (
    <motion.div
      key="events"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Header - unchanged */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Schedule Agenda</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage chronological events and sessions.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              setEditingEvent(null);
              setEventForm({ title: '', description: '', schedule_type: 'session', start_time: '', end_time: '', location: '', speaker_id: '' });
              setEventFormError('');
              setShowAddEditEventModal(true);
            }}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Add Item
          </button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search agenda..."
          value={eventSearchQuery}
          onChange={(e) => setEventSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
        />
        {eventSearchQuery && (
          <button
            onClick={() => setEventSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </motion.div>

      {/* Loading State */}
      {isLoadingEvents ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading schedule...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Calendar className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No schedule items yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add an item to build your agenda</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Search className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No events match your search</p>
        </div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-8">
          {sortedDates.map((dateStr) => (
            <div key={dateStr}>
              {/* Date Group Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl shadow-sm shadow-red-500/20">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-bold">{dateStr}</span>
                </div>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {groupedEvents[dateStr].length} item{groupedEvents[dateStr].length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Event Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {groupedEvents[dateStr]
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map((event, index) => {
                    const startDate = new Date(event.start_time);
                    const endDate = new Date(event.end_time);
                    const isOngoing = startDate <= new Date() && endDate >= new Date();
                    const isPast = endDate < new Date();

                    const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * index }}
                        onClick={() => { setSelectedEvent(event); setShowEventDetailModal(true); }}
                        className={`group relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer
                        ${isOngoing
                            ? 'border-red-300 dark:border-red-700 shadow-md shadow-red-500/10'
                            : isPast
                              ? 'border-slate-200 dark:border-slate-700 opacity-70'
                              : 'border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 hover:shadow-md'
                          }`}
                      >
                        {/* Top color strip */}
                        <div className={`h-1 w-full ${isOngoing ? 'bg-red-500' : isPast ? 'bg-slate-300 dark:bg-slate-600' : 'bg-red-400'}`} />

                        <div className="p-5">
                          {/* Time row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{startTime}</span>
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                              <span>{endTime}</span>
                            </div>
                            {isOngoing && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Live
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
                            {event.title}
                          </h4>

                          {/* Speaker */}
                          {event.speaker && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                              {event.speaker.photo_url ? (
                                <img src={event.speaker.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <Users className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span className="truncate">{event.speaker.first_name} {event.speaker.last_name}</span>
                            </div>
                          )}

                          {/* Location */}
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}

                          {/* Description */}
                          {event.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                              {event.description}
                            </p>
                          )}

                          {/* Footer actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60 mt-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowEventDetailModal(true); }}
                              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                            >
                              Details
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditEvent(event); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id, event.title); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );





  // ===== COMPANIES TAB =====
  const filteredCompanies = companies.filter((c) => {
    if (!companySearchQuery.trim()) return true;
    const q = companySearchQuery.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.company_key && c.company_key.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const renderCompanies = () => (
    <motion.div
      key="companies"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Header with Add Button */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Companies</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage exhibitors and partner companies</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={openLinkCompanies}
            className="w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap"
          >
            <Building2 className="h-5 w-5" />
            Add Existing
          </button>
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Add Company
          </button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, industry, key, or email..."
          value={companySearchQuery}
          onChange={(e) => setCompanySearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
        />
        {companySearchQuery && (
          <button
            onClick={() => setCompanySearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </motion.div>

      {/* Content */}
      {isLoadingCompanies ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading companies...</p>
        </div>
      ) : companies.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No companies added yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 mb-6">Click "Add Company" to get started</p>
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all shadow-md shadow-red-500/20"
          >
            <Plus className="h-5 w-5" />
            Add Company
          </button>
        </motion.div>
      ) : filteredCompanies.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Search className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No companies match your search</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Try a different search term</p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <motion.div
              key={company.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              onClick={() => {
                setSelectedCompany(company);
                resetEmployerPanel();
                setShowViewCompanyModal(true);
              }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-pointer group"
            >
              {/* Company Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/10 flex items-center justify-center shrink-0">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 truncate">
                    {company.company_name}
                  </h3>
                  {company.industry && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{company.industry}</p>
                  )}
                </div>
              </div>

              {/* Partner Type Badge */}
              {company.partner_type && (
                <div className="mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${PARTNER_TYPE_COLORS[company.partner_type] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {company.partner_type.split('&').map((part: string) => part.split('_').map((w: string) => w === 'a' || w === 'b' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' & ')}
                  </span>
                </div>
              )}

              {/* Company Key with Copy Button */}
              {company.company_key && (
                <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{company.company_key}</span>
                  </div>
                  <button
                    onClick={() => handleCopyKey(company.id, company.company_key!)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Copy company key"
                  >
                    {copiedKeyId === company.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    )}
                  </button>
                </div>
              )}

              {/* Employers */}
              <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {company.employers?.length ?? 0} {(company.employers?.length ?? 0) === 1 ? 'employer' : 'employers'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCompany(company);
                    resetEmployerPanel();
                    setShowEmployerForm(true);
                    setShowViewCompanyModal(true);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Employer
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                {company.booth_number ? (
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Booth {company.booth_number}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500">No booth assigned</span>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(company.id, company.company_name);
                    }}
                    className="text-red-500 dark:text-red-400 text-sm font-bold hover:underline flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCompany(company);
                    }}
                    className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );

  // ===== JOBS TAB =====
  const filteredJobs = jobs.filter((job) => {
    const q = jobSearchQuery.toLowerCase();
    if (!q) return true;
    return (
      job.title.toLowerCase().includes(q) ||
      (job.company_name || '').toLowerCase().includes(q) ||
      (job.location || '').toLowerCase().includes(q) ||
      (job.job_type || '').toLowerCase().includes(q)
    );
  });

  const totalApplicants = jobs.reduce((sum, job) => sum + job.no_of_applicants, 0);

  const renderJobs = () => (
    <motion.div
      key="jobs"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Job Opportunities</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage all job postings across companies</p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search jobs, companies..."
          value={jobSearchQuery}
          onChange={(e) => setJobSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-900 dark:text-white"
        />
        {jobSearchQuery && (
          <button
            onClick={() => setJobSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </motion.div>

      {/* Stats Bar */}
      {jobs.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Jobs</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{jobs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Applications</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalApplicants}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoadingJobs ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
            <motion.div
              className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading jobs...</p>
        </div>

      ) : jobs.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-4 block">work_off</span>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No jobs posted yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Job postings from companies will appear here</p>
        </div>

      ) : filteredJobs.length === 0 ? (
        /* No Search Results */
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-700 mb-4 block">search_off</span>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No jobs match your search</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Try a different keyword</p>
        </div>

      ) : (
        /* Jobs Grid */
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index, duration: 0.3 }}
              whileHover={{ y: -5 }}
              onClick={() => {
                setSelectedJob(job);
                setShowJobDetailModal(true);
              }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full"
            >
              <div className="space-y-4">
                {/* Top Row: Company Logo + Badges */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {job.company_logo ? (
                      <img src={job.company_logo} alt={job.company_name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{job.company_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!job.is_active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">Inactive</span>
                    )}
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${JOB_TYPE_COLORS[job.job_type] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {job.job_type ? job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1).replace('-', ' ') : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight group-hover:text-red-600 transition-colors">{job.title}</h3>

                {/* Meta Info */}
                <div className="space-y-1.5">
                  {job.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">apartment</span>
                      {job.employment_mode ? job.employment_mode.charAt(0).toUpperCase() + job.employment_mode.slice(1).replace('-', ' ') : 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      {job.experience_level ? job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {job.no_of_applicants} applicant{job.no_of_applicants !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );

  // ===== JOB DETAIL MODAL =====
  const renderJobDetailModal = () => (
    <AnimatePresence>
      {showJobDetailModal && selectedJob && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowJobDetailModal(false)}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header Gradient */}
            <div className="relative bg-gradient-to-r from-red-600 to-red-500 px-8 pt-8 pb-14">
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowJobDetailModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <X className="w-5 h-5" />
              </motion.button>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-red-200 text-sm font-semibold uppercase tracking-wider mb-1">{selectedJob.company_name}</p>
                <h3 className="text-2xl font-bold text-white">{selectedJob.title}</h3>
              </motion.div>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.15, type: "spring" }}
                className="absolute -bottom-8 right-8"
              >
                {selectedJob.company_logo ? (
                  <img src={selectedJob.company_logo} alt={selectedJob.company_name} className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-900 object-cover shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg">
                    <Building2 className="w-8 h-8 text-red-600" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-8 pt-12 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* Metadata Chips */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap gap-2"
              >
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${JOB_TYPE_COLORS[selectedJob.job_type] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {selectedJob.job_type ? selectedJob.job_type.charAt(0).toUpperCase() + selectedJob.job_type.slice(1).replace('-', ' ') : 'N/A'}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">apartment</span>
                  {selectedJob.employment_mode ? selectedJob.employment_mode.charAt(0).toUpperCase() + selectedJob.employment_mode.slice(1).replace('-', ' ') : 'N/A'}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {selectedJob.experience_level ? selectedJob.experience_level.charAt(0).toUpperCase() + selectedJob.experience_level.slice(1) : 'N/A'}
                </span>
                {selectedJob.location && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedJob.location}
                  </span>
                )}
                {!selectedJob.is_active && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Inactive</span>
                )}
              </motion.div>

              {/* Posted date */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Posted {new Date(selectedJob.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </motion.p>

              {/* Description */}
              {selectedJob.description && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5"
                >
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
                </motion.div>
              )}

              {/* Required Skills */}
              {selectedJob.required_skills && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.required_skills.split(',').map((skill, i) => (
                      <span key={i} className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800/30">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Applicants Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedJob.no_of_applicants} Applicant{selectedJob.no_of_applicants !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">People who applied for this job</p>
                  </div>
                </div>
                {selectedJob.no_of_applicants > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowJobDetailModal(false);
                      setShowJobApplicantsModal(true);
                    }}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-red-600/20"
                  >
                    <Eye className="w-4 h-4" />
                    View Applicants
                  </motion.button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== SIMPLE MODALS (Placeholder for non-company modals) =====
  const SimpleModal: React.FC<{ show: boolean; onClose: () => void; title: string }> = ({
    show,
    onClose,
    title
  }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This modal is a placeholder. Add your form content here.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };






  // ===== OPEN EDIT SESSION =====
  const openEditSession = (session: Session) => {
    setEditingSession(session);
    setSessionForm({
      title: session.title || '',
      description: session.description || '',
      session_type: session.session_type || 'other',
      speaker_id: session.speaker_id || '',
      start_time: session.start_time ? toLocalDatetimeInput(session.start_time) : '',
      end_time: session.end_time ? toLocalDatetimeInput(session.end_time) : '',
      room_name: session.room_name || '',
      max_attendees: session.max_attendees ? String(session.max_attendees) : '',
      requires_booking: session.requires_booking,
      status: session.status || 'scheduled',
      new_speaker_first_name: '', new_speaker_last_name: '', new_speaker_title: '', new_speaker_linkedin: '', new_speaker_photo: ''
    });
    setUseNewSpeaker(false);
    setSessionFormError('');
    setShowAddSessionModal(true);
  };

  // ===== ADD/EDIT SESSION HANDLER =====
  const handleAddEditSession = async () => {
    if (!sessionForm.title.trim()) { setSessionFormError('Title is required.'); return; }
    if (!sessionForm.start_time || !sessionForm.end_time) { setSessionFormError('Start and end times are required.'); return; }
    if (!sessionForm.speaker_id) { setSessionFormError('Please select a speaker.'); return; }
    // Date validations
    const startDate = new Date(sessionForm.start_time);
    const endDate = new Date(sessionForm.end_time);
    if (!editingSession && startDate < new Date()) {
      setSessionFormError('Start time cannot be in the past.'); return;
    }
    if (endDate <= startDate) {
      setSessionFormError('End time must be after start time.'); return;
    }
    setIsSubmittingSession(true);
    setSessionFormError('');
    try {
      const { error } = await supabase.rpc('admin_upsert_session', {
        _event_id: EVENT_ID,
        _title: sessionForm.title.trim(),
        _session_type: sessionForm.session_type,
        _status: 'scheduled',
        _start_time: new Date(sessionForm.start_time).toISOString(),
        _end_time: new Date(sessionForm.end_time).toISOString(),
        _requires_booking: true,
        _description: sessionForm.description.trim() || null,
        _room_name: sessionForm.room_name.trim() || null,
        _max_attendees: sessionForm.max_attendees ? parseInt(sessionForm.max_attendees) : null,
        _speaker_id: sessionForm.speaker_id || null,
        _session_id: editingSession?.id ?? null,
      });
      if (error) { setSessionFormError(error.message); return; }

      setToast({ show: true, message: editingSession ? 'Session updated!' : 'Session created!', type: 'success' });
      setSessionForm({
        title: '', description: '', session_type: 'workshop', speaker_id: '',
        start_time: '', end_time: '', room_name: '', max_attendees: '', requires_booking: false,
        status: 'scheduled', new_speaker_first_name: '', new_speaker_last_name: '',
        new_speaker_title: '', new_speaker_linkedin: '', new_speaker_photo: ''
      });
      setUseNewSpeaker(false);
      setShowAddSessionModal(false);
      setEditingSession(null);
      fetchSessions();
      fetchSpeakers();
      fetchDashboardStats();
    } catch (err: any) {
      setSessionFormError(err.message || 'Failed to save session');
    } finally { setIsSubmittingSession(false); }
  };

  // ===== SPEAKER HANDLERS =====
  const handleEditSelectedSpeaker = () => {
    const speaker = speakers.find(s => s.id === sessionForm.speaker_id);
    if (speaker) {
      setUseNewSpeaker(true);
      setEditingSpeakerId(speaker.id);
      setSessionForm({
        ...sessionForm,
        new_speaker_first_name: speaker.first_name || '',
        new_speaker_last_name: speaker.last_name || '',
        new_speaker_title: speaker.title || '',
        new_speaker_linkedin: speaker.linkedin_url || '',
        new_speaker_photo: speaker.photo_url || ''
      });
      setSessionFormError('');
    }
  };


  const handleUpdateSpeaker = async () => {
    if (!sessionForm.new_speaker_first_name.trim() || !sessionForm.new_speaker_last_name.trim() || !sessionForm.new_speaker_title.trim()) {
      setSessionFormError('Speaker first name, last name and title are required.'); return;
    }
    setIsSubmittingSpeaker(true);
    setSessionFormError('');
    try {
      if (editingSpeakerId) {
        const { error } = await supabase.rpc('admin_update_speaker', {
          _speaker_id: editingSpeakerId,
          _first_name: sessionForm.new_speaker_first_name.trim(),
          _last_name: sessionForm.new_speaker_last_name.trim(),
          _title: sessionForm.new_speaker_title.trim(),
          _linkedin_url: sessionForm.new_speaker_linkedin.trim() || null,
          _photo_url: sessionForm.new_speaker_photo.trim() || null
        });
        if (error) throw error;
        setToast({ show: true, message: 'Speaker updated!', type: 'success' });
        await fetchSpeakers();
        setUseNewSpeaker(false);
        setEditingSpeakerId(null);
      }
    } catch (err: any) {
      setSessionFormError(err.message || 'Failed to update speaker');
    } finally { setIsSubmittingSpeaker(false); }
  };


  // ===== VIEW SPEAKERS MODAL HANDLERS =====
  const fetchSpeakersWithSessions = useCallback(async () => {
    setIsLoadingSpeakersWithSessions(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_speakers_with_sessions');
      if (error) throw error;
      setSpeakersWithSessions(data || []);
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to load speakers', type: 'error' });
    } finally {
      setIsLoadingSpeakersWithSessions(false);
    }
  }, []);

  const handleDeleteSpeakerConfirm = async () => {
    if (!speakerToDelete) return;
    setIsDeletingSpeaker(true);
    try {
      const { error } = await supabase.rpc('admin_delete_speaker', { _speaker_id: speakerToDelete.id });
      if (error) throw error;
      setToast({ show: true, message: `Speaker "${speakerToDelete.name}" deleted successfully!`, type: 'success' });
      setSpeakerToDelete(null);
      fetchSpeakersWithSessions();
      fetchSpeakers();
    } catch (err: any) {
      setToast({ show: true, message: err.message || 'Failed to delete speaker', type: 'error' });
    } finally {
      setIsDeletingSpeaker(false);
    }
  };

  const openEditSpeakerInModal = (speaker: any) => {
    setEditingSpeakerInModal(speaker);
    setEditSpeakerForm({
      first_name: speaker.first_name || '',
      last_name: speaker.last_name || '',
      title: speaker.title || '',
      linkedin_url: speaker.linkedin_url || '',
      photo_url: speaker.photo_url || ''
    });
    setEditSpeakerFormError('');
  };

  const handleSaveEditSpeakerInModal = async () => {
    if (!editSpeakerForm.first_name.trim() || !editSpeakerForm.last_name.trim() || !editSpeakerForm.title.trim()) {
      setEditSpeakerFormError('First name, last name and title are required.');
      return;
    }
    setIsSubmittingEditSpeaker(true);
    setEditSpeakerFormError('');
    try {
      const { error } = await supabase.rpc('admin_update_speaker', {
        _speaker_id: editingSpeakerInModal.id,
        _first_name: editSpeakerForm.first_name.trim(),
        _last_name: editSpeakerForm.last_name.trim(),
        _title: editSpeakerForm.title.trim(),
        _linkedin_url: editSpeakerForm.linkedin_url.trim() || null,
        _photo_url: editSpeakerForm.photo_url.trim() || null
      });
      if (error) throw error;
      setToast({ show: true, message: 'Speaker updated successfully!', type: 'success' });
      setEditingSpeakerInModal(null);
      fetchSpeakersWithSessions();
      fetchSpeakers();
    } catch (err: any) {
      setEditSpeakerFormError(err.message || 'Failed to update speaker');
    } finally {
      setIsSubmittingEditSpeaker(false);
    }
  };

  const handleAddNewSpeaker = async () => {
    if (!addSpeakerForm.first_name.trim() || !addSpeakerForm.last_name.trim() || !addSpeakerForm.title.trim()) {
      setAddSpeakerFormError('First name, last name and title are required.');
      return;
    }
    setIsSubmittingAddSpeaker(true);
    setAddSpeakerFormError('');
    try {
      const { error } = await supabase.rpc('admin_add_speaker', {
        _first_name: addSpeakerForm.first_name.trim(),
        _last_name: addSpeakerForm.last_name.trim(),
        _title: addSpeakerForm.title.trim(),
        _linkedin_url: addSpeakerForm.linkedin_url.trim() || null,
        _photo_url: addSpeakerForm.photo_url.trim() || null
      });
      if (error) throw error;
      setToast({ show: true, message: 'Speaker added successfully!', type: 'success' });
      setShowAddSpeakerModal(false);
      setAddSpeakerForm({ first_name: '', last_name: '', title: '', linkedin_url: '', photo_url: '' });
      fetchSpeakersWithSessions();
      fetchSpeakers();
    } catch (err: any) {
      setAddSpeakerFormError(err.message || 'Failed to add speaker');
    } finally {
      setIsSubmittingAddSpeaker(false);
    }
  };

  // ===== SEND ANNOUNCEMENT HANDLER =====
  const handleSendAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      setAnnouncementFormError('Title and content are required.');
      setToast({ show: true, message: 'Please fill in both title and content', type: 'warning' });
      return;
    }
    if (audienceTargets.length === 0) {
      setAnnouncementFormError('Select at least one target audience.');
      setToast({ show: true, message: 'Select at least one target audience', type: 'warning' });
      return;
    }

    setIsSubmittingAnnouncement(true);
    setAnnouncementFormError('');

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setToast({ show: true, message: 'Not authenticated', type: 'error' });
        return;
      }

      // Each audience target gets its own notification row
      const promises = audienceTargets.map((target) => {
        const roles = [target.role];
        const teamId = target.type === 'team' ? target.teamId : null;

        return supabase.rpc('admin_send_announcement', {
          _event_id: EVENT_ID,
          _title: announcementForm.title.trim(),
          _content: announcementForm.content.trim(),
          _announcement_type: announcementForm.announcement_type,
          _target_roles: roles,
          _team_id: teamId,
          // _sender_id removed — server uses auth.uid() directly
        });
      });

      const results = await Promise.all(promises);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;

      setAnnouncementForm({ title: '', content: '', announcement_type: 'general' });
      setAudienceTargets([]);
      setShowAnnouncementModal(false);
      setToast({ show: true, message: 'Announcement sent successfully!', type: 'success' });
    } catch (err: any) {
      setAnnouncementFormError(err.message || 'Failed to send announcement');
      setToast({ show: true, message: 'Failed to send announcement', type: 'error' });
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  // ===== ADD COMPANY MODAL =====
  const renderAddCompanyModal = () => {
    if (!showAddCompanyModal) return null;

    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddCompanyModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
                >
                  <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Add Company
                </motion.h3>
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAddCompanyModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </motion.button>
            </div>

            {/* Form */}
            <motion.div
              className="px-8 py-6 space-y-5"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {companyFormError && (
                <motion.div
                  variants={itemVariants}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300"
                >
                  {companyFormError}
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <label className={labelClass}>Company Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Acme Corporation"
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Industry</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Technology, Finance"
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Partner Type</label>
                  <select
                    className={inputClass}
                    value={companyForm.partner_type}
                    onChange={(e) => setCompanyForm({ ...companyForm, partner_type: e.target.value })}
                  >
                    <option value="">Select partner type</option>
                    {PARTNER_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type.split('&').map(part => part.split('_').map(w => w === 'a' || w === 'b' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' & ')}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className={`${inputClass} pl-10`}
                      placeholder="company@email.com"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      className={`${inputClass} pl-10`}
                      placeholder="https://example.com"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className={labelClass}>Booth Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className={`${inputClass} pl-10`}
                    placeholder="e.g. A12"
                    value={companyForm.booth_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, booth_number: e.target.value })}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <CompanyLogoSelector
                  value={companyForm.logo_url}
                  onChange={(url) => setCompanyForm({ ...companyForm, logo_url: url })}
                  inputClass={inputClass}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <FacultySelector
                  faculties={companyForm.faculties}
                  onChange={(updated) => setCompanyForm({ ...companyForm, faculties: updated })}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Brief description of the company..."
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <Key className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  A unique company key is generated automatically for this company.
                </p>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                disabled={isSubmittingCompany}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddCompany}
                disabled={isSubmittingCompany}
                className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20"
              >
                {isSubmittingCompany ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Adding...</>
                ) : (
                  <><Plus className="w-4 h-4" />Add Company</>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== EDIT COMPANY MODAL =====
  const renderEditCompanyModal = () => {
    if (!showEditCompanyModal || !editingCompany) return null;

    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEditCompanyModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center"
                >
                  <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Edit Company
                </motion.h3>
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowEditCompanyModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </motion.button>
            </div>

            {/* Form */}
            <motion.div
              className="px-8 py-6 space-y-5"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {editFormError && (
                <motion.div
                  variants={itemVariants}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300"
                >
                  {editFormError}
                </motion.div>
              )}

              {editingCompany.company_key && (
                <motion.div
                  variants={itemVariants}
                  className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Key:</span>
                    <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{editingCompany.company_key}</span>
                  </div>
                  <button
                    onClick={() => handleCopyKey(editingCompany.id, editingCompany.company_key!)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copiedKeyId === editingCompany.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <label className={labelClass}>Company Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Acme Corporation"
                  value={editCompanyForm.company_name}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, company_name: e.target.value })}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Industry</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Technology, Finance"
                    value={editCompanyForm.industry}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, industry: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Partner Type</label>
                  <select
                    className={inputClass}
                    value={editCompanyForm.partner_type}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, partner_type: e.target.value })}
                  >
                    <option value="">Select partner type</option>
                    {PARTNER_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type.split('&').map(part => part.split('_').map(w => w === 'a' || w === 'b' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' & ')}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className={`${inputClass} pl-10`}
                      placeholder="company@email.com"
                      value={editCompanyForm.email}
                      onChange={(e) => setEditCompanyForm({ ...editCompanyForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      className={`${inputClass} pl-10`}
                      placeholder="https://example.com"
                      value={editCompanyForm.website}
                      onChange={(e) => setEditCompanyForm({ ...editCompanyForm, website: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className={labelClass}>Booth Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className={`${inputClass} pl-10`}
                    placeholder="e.g. A12"
                    value={editCompanyForm.booth_number}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, booth_number: e.target.value })}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <CompanyLogoSelector
                  value={editCompanyForm.logo_url}
                  onChange={(url) => setEditCompanyForm({ ...editCompanyForm, logo_url: url })}
                  inputClass={inputClass}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <FacultySelector
                  faculties={editCompanyForm.faculties}
                  onChange={(updated) => setEditCompanyForm({ ...editCompanyForm, faculties: updated })}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Brief description of the company..."
                  value={editCompanyForm.description}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, description: e.target.value })}
                />
              </motion.div>
            </motion.div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowEditCompanyModal(false)}
                className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                disabled={isSubmittingEdit}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEditCompany}
                disabled={isSubmittingEdit}
                className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20"
              >
                {isSubmittingEdit ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><Check className="w-4 h-4" />Save Changes</>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== VIEW COMPANY MODAL =====
  // ===== ADD EXISTING COMPANIES MODAL =====
  const renderLinkCompaniesModal = () => {
    if (!showLinkCompaniesModal) return null;

    const q = librarySearch.trim().toLowerCase();
    const visible = libraryCompanies.filter((c) =>
      !q || c.company_name.toLowerCase().includes(q) || (c.industry || '').toLowerCase().includes(q)
    );
    const toggle = (id: string) =>
      setLibrarySelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLinkingCompanies && setShowLinkCompaniesModal(false)} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        >
          <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Existing Companies</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose from every company to add to this event</p>
            </div>
            <button
              onClick={() => setShowLinkCompaniesModal(false)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/40 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="px-6 py-4 overflow-y-auto flex-1 min-h-[12rem]">
            {isLoadingLibrary ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-red-500" /></div>
            ) : visible.length === 0 ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-10">No companies found</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((c) => {
                  const checked = librarySelection.includes(c.id);
                  return (
                    <li key={c.id}>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${c.in_event
                        ? 'border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed'
                        : checked
                          ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 cursor-pointer'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          className="accent-red-600 w-4 h-4"
                          checked={c.in_event || checked}
                          disabled={c.in_event}
                          onChange={() => toggle(c.id)}
                        />
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.company_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {c.in_event ? 'Already in this event' : [c.industry, `${c.events_count} event${c.events_count === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{librarySelection.length} selected</span>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLinkCompaniesModal(false)}
                disabled={isLinkingCompanies}
                className="px-5 py-2.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkCompanies}
                disabled={isLinkingCompanies || librarySelection.length === 0}
                className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {isLinkingCompanies ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to Event
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderViewCompanyModal = () => {
    if (!showViewCompanyModal || !selectedCompany) return null;

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowViewCompanyModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-bold text-slate-900 dark:text-white"
              >
                Company Details
              </motion.h3>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowViewCompanyModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </motion.button>
            </div>

            <div className="px-8 py-6">
              {/* Company Identity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4 mb-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', bounce: 0.4 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/10 flex items-center justify-center shrink-0"
                >
                  {selectedCompany.logo_url ? (
                    <img src={selectedCompany.logo_url} alt={selectedCompany.company_name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                  )}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate">{selectedCompany.company_name}</h4>
                  {selectedCompany.partner_type && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide inline-block mt-1 ${PARTNER_TYPE_COLORS[selectedCompany.partner_type] || 'bg-slate-100 text-slate-600'}`}>
                      {selectedCompany.partner_type.replace('_', ' ')}
                    </span>
                  )}
                </motion.div>
              </motion.div>

              {/* Company Key */}
              {selectedCompany.company_key && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Company Key</p>
                        <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{selectedCompany.company_key}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyKey(selectedCompany.id, selectedCompany.company_key!)}
                      className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 border border-red-200 dark:border-red-700 transition-all"
                    >
                      {copiedKeyId === selectedCompany.id ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Detail Rows */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="divide-y divide-slate-100 dark:divide-slate-700"
              >
                {[
                  { icon: Building2, label: 'Industry', value: selectedCompany.industry },
                  { icon: Mail, label: 'Email', value: selectedCompany.email },
                  { icon: Globe, label: 'Website', value: selectedCompany.website },
                  { icon: MapPin, label: 'Booth Number', value: selectedCompany.booth_number },
                ].filter(d => d.value).map((detail) => (
                  <motion.div key={detail.label} variants={itemVariants} className="flex items-start gap-3 py-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <detail.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{detail.label}</p>
                      <p className="text-sm text-slate-900 dark:text-white break-words">{detail.value}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Description */}
              {selectedCompany.description && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedCompany.description}</p>
                </motion.div>
              )}

              {/* Employers */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Employers ({selectedCompany.employers?.length ?? 0})
                  </p>
                  {!showEmployerForm && (
                    <button
                      onClick={() => { setShowEmployerForm(true); setCreatedEmployer(null); setEmployerError(''); }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Employer
                    </button>
                  )}
                </div>

                {createdEmployer && (
                  <div className="mb-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm">
                    {createdEmployer.password ? (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-green-800 dark:text-green-200">Account created. Send these login details to the employer:</p>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(
                              'login-details',
                              loginDetailsRef.current?.textContent ?? '',
                              loginDetailsRef.current
                            )}
                            className="shrink-0 px-2 py-1 rounded-md text-xs font-semibold text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 flex items-center gap-1"
                            title="Copy login details"
                          >
                            {copiedKeyId === 'login-details'
                              ? <><Check className="w-4 h-4" />Copied</>
                              : <><Copy className="w-4 h-4" />Copy</>}
                          </button>
                        </div>
                        <pre
                          ref={loginDetailsRef}
                          className="font-mono text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-all select-all bg-white/60 dark:bg-slate-900/40 rounded-lg px-3 py-2"
                        >{`Login: ${window.location.origin}/login\nEmail: ${createdEmployer.email}\nPassword: ${createdEmployer.password}`}</pre>
                        {copyFailedId === 'login-details' && (
                          <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            Your browser blocked copying here. The details are selected: press Ctrl+C (Cmd+C on Mac).
                          </p>
                        )}
                        <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                          This password won't be shown again. The employer logs in at /login and fills in their own details.
                        </p>
                      </>
                    ) : (
                      <p className="text-green-800 dark:text-green-200">
                        <span className="font-semibold">{createdEmployer.email}</span> already had an account, so it was linked to this company. They log in with their existing password.
                      </p>
                    )}
                  </div>
                )}

                {showEmployerForm && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleAddEmployer(selectedCompany.id); }}
                    className="mb-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
                  >
                    <label htmlFor="employer-email" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Employer email
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="employer-email"
                        type="email"
                        autoFocus
                        value={employerEmail}
                        onChange={(e) => { setEmployerEmail(e.target.value); setEmployerError(''); }}
                        placeholder="employer@company.com"
                        className={`flex-1 min-w-0 px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 ${employerError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`}
                      />
                      <button
                        type="submit"
                        disabled={isAddingEmployer || !employerEmail.trim()}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                      >
                        {isAddingEmployer ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={resetEmployerPanel}
                        disabled={isAddingEmployer}
                        className="px-3 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                    {employerError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{employerError}</p>}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      A default password is generated for you to send. If this email already has an account, that account is linked instead.
                    </p>
                  </form>
                )}

                <ul className="space-y-2">
                  {(selectedCompany.employers ?? []).map((emp) => (
                    <li key={emp.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {emp.full_name || emp.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {[emp.email, emp.phone, emp.job_title].filter(Boolean).join(' · ')}
                        </p>
                        {!emp.profile_complete && (
                          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Hasn't completed their profile yet</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveEmployer(emp)}
                        disabled={removingEmployerId === emp.user_id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors shrink-0"
                        title="Remove employer"
                        aria-label={`Remove ${emp.full_name || emp.email}`}
                      >
                        {removingEmployerId === emp.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                  {(selectedCompany.employers?.length ?? 0) === 0 && !showEmployerForm && (
                    <li className="text-sm text-slate-400 dark:text-slate-500">No employers yet.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-between rounded-b-2xl">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowViewCompanyModal(false); openEditCompany(selectedCompany); }}
                className="px-6 py-3 rounded-xl font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Company
              </motion.button>
              <button
                onClick={() => setShowViewCompanyModal(false)}
                className="px-6 py-3 rounded-xl font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== DELETE COMPANY MODAL =====
  const renderDeleteCompanyModal = () => (
    <AnimatePresence>
      {companyToDelete && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCompanyToDelete(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4"
              >
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
              >
                Delete Company
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-slate-500 dark:text-slate-400 mb-6"
              >
                Are you sure you want to delete{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{companyToDelete.name}</span>?
                This action cannot be undone.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-4"
              >
                <button
                  onClick={() => setCompanyToDelete(null)}
                  className="w-full px-4 py-3 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDeleteCompany}
                  className="w-full px-4 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition-all"
                >
                  Delete
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== DELETE EVENT MODAL =====
  const renderDeleteEventModal = () => (
    <AnimatePresence>
      {eventToDelete && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEventToDelete(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative z-10 p-6 flex flex-col items-center text-center"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
              className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"
            >
              <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-slate-900 dark:text-white mb-2"
            >
              Delete Event?
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-slate-500 dark:text-slate-400 text-sm mb-6"
            >
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">"{eventToDelete.title}"</span>?
              This action cannot be undone.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center gap-3 w-full"
            >
              <button
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmDeleteEvent}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== ADD/EDIT EVENT MODAL =====
  const renderAddEditEventModal = () => (
    <AnimatePresence>
      {showAddEditEventModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSubmittingEvent && setShowAddEditEventModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
                >
                  <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  {editingEvent ? 'Edit Event' : 'Add New Event'}
                </motion.h2>
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => !isSubmittingEvent && setShowAddEditEventModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Form */}
            <motion.div
              className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {eventFormError && (
                <motion.div
                  variants={itemVariants}
                  className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800/30"
                >
                  {eventFormError}
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                  placeholder="e.g., Annual Career Fair 2026"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none resize-none h-24"
                  placeholder="Provide details about the event"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Schedule Type</label>
                <select
                  value={eventForm.schedule_type}
                  onChange={(e) => setEventForm({ ...eventForm, schedule_type: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                >
                  <option value="session">Session</option>
                  <option value="workshop">Workshop</option>
                  <option value="keynote">Keynote</option>
                  <option value="break">Break</option>
                  <option value="ceremony">Ceremony</option>
                  <option value="networking">Networking</option>
                  <option value="stage_talk">Stage Talk</option>
                  <option value="panel_discussion">Panel Discussion</option>
                  <option value="other">Other</option>
                </select>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Speaker (optional)</label>
                <select
                  value={eventForm.speaker_id}
                  onChange={(e) => setEventForm({ ...eventForm, speaker_id: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                >
                  <option value="">No speaker</option>
                  {speakers.map((s) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.title ? ` — ${s.title}` : ''}</option>
                  ))}
                </select>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                  placeholder="e.g., Main Campus Expo Hall"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Start Date & Time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">End Date & Time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 transition-all outline-none"
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowAddEditEventModal(false)}
                disabled={isSubmittingEvent}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleAddEditEvent}
                disabled={isSubmittingEvent}
                className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-red-500/20"
              >
                {isSubmittingEvent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== EVENT DETAIL MODAL =====
  const renderEventDetailModal = () => (
    <AnimatePresence>
      {showEventDetailModal && selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEventDetailModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-br from-red-600 to-red-800 px-8 pt-10 pb-12">
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowEventDetailModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <X className="w-5 h-5" />
              </motion.button>
              <div className="flex gap-4 items-start">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg shrink-0"
                >
                  <Calendar className="w-10 h-10 text-white" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {selectedEvent.schedule_type && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 inline-block mb-2">
                      {selectedEvent.schedule_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  )}
                  <h3 className="text-3xl font-bold text-white leading-tight">{selectedEvent.title}</h3>
                </motion.div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Start</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedEvent.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {new Date(selectedEvent.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">End</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedEvent.end_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {new Date(selectedEvent.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4 pt-2"
              >
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Location</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedEvent.location || 'Not specified'}</p>
                  </div>
                </div>
                {selectedEvent.description && (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <Megaphone className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Description</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedEvent.description}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.speaker && (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <Users className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="flex items-center gap-3">
                      {selectedEvent.speaker.photo_url && (
                        <img src={selectedEvent.speaker.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedEvent.speaker.first_name} {selectedEvent.speaker.last_name}</p>
                        {selectedEvent.speaker.title && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedEvent.speaker.title}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6"
              >
                <button
                  onClick={() => setShowEventDetailModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowEventDetailModal(false); handleDeleteEvent(selectedEvent.id, selectedEvent.title); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowEventDetailModal(false); openEditEvent(selectedEvent); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Event
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ===== ADD SESSION MODAL =====
  const renderAddSessionModal = () => {
    if (!showAddSessionModal) return null;
    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowAddSessionModal(false); setEditingSession(null); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
                >
                  <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  {editingSession ? 'Edit Session' : 'Add Session'}
                </motion.h3>
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowAddSessionModal(false); setEditingSession(null); }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </motion.button>
            </div>

            {/* Form */}
            <motion.div
              className="px-8 py-6 space-y-5"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <AnimatePresence>
                {sessionFormError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300"
                  >
                    {sessionFormError}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <label className={labelClass}>Title *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Career Growth Panel"
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Session Type</label>
                  <select
                    className={inputClass}
                    value={sessionForm.session_type}
                    onChange={(e) => setSessionForm({ ...sessionForm, session_type: e.target.value })}
                  >
                    {SESSION_TYPE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                    ))}
                  </select>
                </div>
              </motion.div>

              {/* Speaker Section */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Speaker *</label>
                  {sessionForm.speaker_id && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEditSelectedSpeaker}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </motion.button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!useNewSpeaker ? (
                    <motion.div
                      key="existing"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <select
                        className={inputClass}
                        value={sessionForm.speaker_id}
                        onChange={(e) => setSessionForm({ ...sessionForm, speaker_id: e.target.value })}
                      >
                        <option value="">Select a speaker...</option>
                        {speakers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name} — {s.title}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Editing Speaker</span>
                        <button
                          type="button"
                          onClick={() => { setUseNewSpeaker(false); setEditingSpeakerId(null); }}
                          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                        >
                          Cancel Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="First Name *"
                          value={sessionForm.new_speaker_first_name}
                          onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_first_name: e.target.value })}
                        />
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="Last Name *"
                          value={sessionForm.new_speaker_last_name}
                          onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_last_name: e.target.value })}
                        />
                      </div>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Title/Position *"
                        value={sessionForm.new_speaker_title}
                        onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_title: e.target.value })}
                      />
                      <input
                        type="url"
                        className={inputClass}
                        placeholder="LinkedIn URL (optional)"
                        value={sessionForm.new_speaker_linkedin}
                        onChange={(e) => setSessionForm({ ...sessionForm, new_speaker_linkedin: e.target.value })}
                      />
                      <SpeakerPhotoSelector
                        value={sessionForm.new_speaker_photo}
                        onChange={(url) => setSessionForm({ ...sessionForm, new_speaker_photo: url })}
                        inputClass={inputClass}
                      />
                      {editingSpeakerId && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleUpdateSpeaker}
                            disabled={isSubmittingSpeaker}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {isSubmittingSpeaker ? 'Saving...' : 'Save Speaker Changes'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Start Time *</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={sessionForm.start_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Time *</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={sessionForm.end_time}
                    onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Room Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Hall A"
                    value={sessionForm.room_name}
                    onChange={(e) => setSessionForm({ ...sessionForm, room_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Attendees</label>
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="e.g. 100"
                    value={sessionForm.max_attendees}
                    onChange={(e) => setSessionForm({ ...sessionForm, max_attendees: e.target.value })}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Brief description..."
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                />
              </motion.div>
            </motion.div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-between gap-3 rounded-b-2xl">
              <div>
                {editingSession && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowAddSessionModal(false);
                      setSessionToDelete({ id: editingSession.id, title: editingSession.title });
                    }}
                    className="px-5 py-3 rounded-xl font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Session
                  </motion.button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddSessionModal(false); setEditingSession(null); }}
                  className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  disabled={isSubmittingSession}
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddEditSession}
                  disabled={isSubmittingSession}
                  className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20"
                >
                  {isSubmittingSession ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-4 h-4" />
                      </motion.span>
                      Saving...
                    </>
                  ) : editingSession ? (
                    <><Pencil className="w-4 h-4" />Save Changes</>
                  ) : (
                    <><Plus className="w-4 h-4" />Add Session</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ===== ANNOUNCEMENT MODAL =====
  const renderAnnouncementModal = () => {
    if (!showAnnouncementModal) return null;

    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    // Broad role targets (no team)
    const broadRoles = [
      { key: 'attendee', label: 'Attendees', icon: 'people' },
      { key: 'employer', label: 'Employers', icon: 'business_center' },
      { key: 'team_leader', label: 'Team Leaders', icon: 'supervisor_account' },
      { key: 'volunteer', label: 'All Volunteers', icon: 'volunteer_activism' },
    ];

    // Teams from your volunteer_teams table
    const teams = [
      { id: 'fc15e3bb-ceed-4aa3-acf5-004a7af664ed', name: 'Registration', icon: 'app_registration', color: 'bg-blue-500' },
      { id: 'f9419a07-f974-4f59-bba2-b2f9a2b2fa7f', name: 'Building', icon: 'construction', color: 'bg-amber-500' },
      { id: 'a0abd4b7-7879-4a07-806d-fd0e2f4257f1', name: 'Verification', icon: 'verified_user', color: 'bg-teal-500' },
      { id: '394b8631-7948-49f1-87ba-bc7e3ead12b9', name: 'Feedback', icon: 'rate_review', color: 'bg-pink-500' },
      { id: '481237b5-45ef-463f-8460-b6f848835756', name: 'Stage', icon: 'stage', color: 'bg-red-500' },
      { id: '587e30ea-20b2-4292-81fe-02945f6d2a3f', name: 'Marketing', icon: 'campaign', color: 'bg-orange-500' },
      { id: '8052492b-55bb-46d0-ab4c-52a6df81c4c9', name: 'Media', icon: 'photo_camera', color: 'bg-cyan-500' },
      { id: '97ab5a37-557e-4a81-ae81-9dcc6bbae87a', name: 'Usher', icon: 'directions_walk', color: 'bg-indigo-500' },
      { id: 'ae0e251c-81f5-4763-a9db-39ca511fd03c', name: 'Catering', icon: 'restaurant', color: 'bg-lime-500' },
      { id: 'be96f64f-6674-421d-84f3-791a27bd4121', name: 'ER', icon: 'emergency', color: 'bg-rose-500' },
    ];

    const isRoleSelected = (role: string) =>
      audienceTargets.some(t => t.type === 'role' && t.role === role);

    const isTeamSelected = (teamId: string) =>
      audienceTargets.some(t => t.type === 'team' && t.teamId === teamId);

    const toggleRole = (role: string) => {
      setAudienceTargets(prev =>
        isRoleSelected(role)
          ? prev.filter(t => !(t.type === 'role' && t.role === role))
          : [...prev, { type: 'role', role }]
      );
    };

    const toggleTeam = (team: typeof teams[number]) => {
      setAudienceTargets(prev =>
        isTeamSelected(team.id)
          ? prev.filter(t => !(t.type === 'team' && t.teamId === team.id))
          : [...prev, { type: 'team', role: 'volunteer', teamId: team.id, teamName: team.name }]
      );
    };

    const removeTarget = (index: number) => {
      setAudienceTargets(prev => prev.filter((_, i) => i !== index));
    };

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAnnouncementModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
                >
                  <Megaphone className="w-5 h-5 text-red-600 dark:text-red-400" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Send Announcement
                </motion.h3>
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAnnouncementModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </motion.button>
            </div>

            {/* Form */}
            <motion.div
              className="px-8 py-6 space-y-6"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <AnimatePresence>
                {announcementFormError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300"
                  >
                    {announcementFormError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Title */}
              <motion.div variants={itemVariants}>
                <label className={labelClass}>Title *</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Announcement title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
              </motion.div>

              {/* Content */}
              <motion.div variants={itemVariants}>
                <label className={labelClass}>Content *</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={4}
                  placeholder="Announcement content..."
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                />
              </motion.div>

              {/* Type */}
              <motion.div variants={itemVariants}>
                <label className={labelClass}>Type</label>
                <select
                  className={inputClass}
                  value={announcementForm.announcement_type}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, announcement_type: e.target.value })}
                >
                  {ANNOUNCEMENT_TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </motion.div>

              {/* Broad Roles */}
              <motion.div variants={itemVariants}>
                <label className={labelClass}>Broad Audience</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {broadRoles.map((opt) => {
                    const selected = isRoleSelected(opt.key);
                    return (
                      <motion.button
                        key={opt.key}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleRole(opt.key)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${selected
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 dark:hover:border-red-700'
                          }`}
                      >
                        <span className="material-symbols-outlined text-xl block mb-1">{opt.icon}</span>
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Teams */}
              <motion.div variants={itemVariants}>
                <label className={labelClass}>Specific Team</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {teams.map((team) => {
                    const selected = isTeamSelected(team.id);
                    return (
                      <motion.button
                        key={team.id}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleTeam(team)}
                        className={`relative p-3 rounded-xl border-2 text-center transition-all overflow-hidden ${selected
                          ? 'border-transparent text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                      >
                        {selected && (
                          <span className={`absolute inset-0 ${team.color} opacity-90`} />
                        )}
                        <span className="relative z-10 material-symbols-outlined text-lg block mb-0.5">{team.icon}</span>
                        <span className="relative z-10 text-[10px] font-bold leading-tight block">{team.name}</span>
                        {selected && (
                          <motion.span
                            layoutId={`teamCheck-${team.id}`}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center z-20"
                          >
                            <Check className="w-2.5 h-2.5 text-white" />
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Selected targets preview */}
              <AnimatePresence>
                {audienceTargets.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    variants={itemVariants}
                  >
                    <label className={labelClass}>
                      Selected Targets ({audienceTargets.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {audienceTargets.map((target, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {target.type === 'team' ? 'group' : 'person'}
                          </span>
                          {target.type === 'team'
                            ? target.teamName
                            : broadRoles.find(r => r.key === target.role)?.label ?? target.role}
                          <button
                            onClick={() => removeTarget(i)}
                            className="ml-0.5 hover:text-red-900 dark:hover:text-red-100 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setAnnouncementFormError('');
                  setAudienceTargets([]);
                }}
                className="px-6 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                disabled={isSubmittingAnnouncement}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendAnnouncement}
                disabled={isSubmittingAnnouncement}
                className="px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-red-500/20"
              >
                {isSubmittingAnnouncement ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Announcement
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };



  // ===== VIEW SPEAKERS MODAL =====
  const renderViewSpeakersModal = () => {
    if (!showViewSpeakersModal) return null;
    const inputClass = "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowViewSpeakersModal(false); setEditingSpeakerInModal(null); setSpeakerToDelete(null); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center"
                >
                  <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  All Speakers ({speakersWithSessions.length})
                </motion.h3>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.18 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAddSpeakerForm({ first_name: '', last_name: '', title: '', linkedin_url: '', photo_url: '' });
                    setAddSpeakerFormError('');
                    setShowAddSpeakerModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all shadow-md shadow-red-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Speaker
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowViewSpeakersModal(false); setEditingSpeakerInModal(null); setSpeakerToDelete(null); }}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {isLoadingSpeakersWithSessions ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full" />
                    <motion.div
                      className="absolute inset-0 border-4 border-transparent border-t-red-600 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Loading speakers...</p>
                </div>
              ) : speakersWithSessions.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No speakers found</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Speakers added to sessions will appear here</p>
                </div>
              ) : (
                speakersWithSessions.map((speaker: any, index: number) => (
                  <motion.div
                    key={speaker.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                    className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    {/* Speaker Info Row */}
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Photo */}
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {speaker.photo_url ? (
                            <img src={speaker.photo_url} alt={`${speaker.first_name} ${speaker.last_name}`} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-7 h-7 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                            {speaker.first_name} {speaker.last_name}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{speaker.title}</p>
                          {speaker.linkedin_url && (
                            <a
                              href={speaker.linkedin_url.startsWith('http') ? speaker.linkedin_url : `https://${speaker.linkedin_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" /> LinkedIn
                            </a>
                          )}
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openEditSpeakerInModal(speaker)}
                            className="px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSpeakerToDelete({ id: speaker.id, name: `${speaker.first_name} ${speaker.last_name}` })}
                            className="px-3 py-2 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </motion.button>
                        </div>
                      </div>

                      {/* Linked Sessions */}
                      {speaker.sessions && speaker.sessions.length > 0 ? (
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Linked Sessions ({speaker.sessions.length})</p>
                          <div className="space-y-1.5">
                            {speaker.sessions.map((session: any) => (
                              <div key={session.id} className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/60">
                                <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{session.title}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase">
                                  {session.session_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </span>
                                {session.start_time && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">
                                    {new Date(session.start_time.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No sessions linked to this speaker</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-4 flex justify-end rounded-b-2xl">
              <button
                onClick={() => { setShowViewSpeakersModal(false); setEditingSpeakerInModal(null); setSpeakerToDelete(null); }}
                className="px-6 py-3 rounded-xl font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>

        {/* Delete Speaker Confirmation */}
        {speakerToDelete && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setSpeakerToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4"
                >
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold text-slate-900 dark:text-white mb-2"
                >
                  Delete Speaker?
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-slate-500 dark:text-slate-400 text-sm mb-6"
                >
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">"{speakerToDelete.name}"</span>?
                  Their linked sessions will be kept but unlinked from this speaker. This action cannot be undone.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-3"
                >
                  <button
                    onClick={() => setSpeakerToDelete(null)}
                    disabled={isDeletingSpeaker}
                    className="flex-1 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteSpeakerConfirm}
                    disabled={isDeletingSpeaker}
                    className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeletingSpeaker ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</>
                    ) : (
                      'Delete'
                    )}
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Speaker Popup */}
        {editingSpeakerInModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setEditingSpeakerInModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                    className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Speaker</h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingSpeakerInModal(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </motion.button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {editSpeakerFormError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300"
                  >
                    {editSpeakerFormError}
                  </motion.div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={editSpeakerForm.first_name}
                      onChange={(e) => setEditSpeakerForm({ ...editSpeakerForm, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={editSpeakerForm.last_name}
                      onChange={(e) => setEditSpeakerForm({ ...editSpeakerForm, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Title/Position *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={editSpeakerForm.title}
                    onChange={(e) => setEditSpeakerForm({ ...editSpeakerForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>LinkedIn URL</label>
                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://linkedin.com/in/..."
                    value={editSpeakerForm.linkedin_url}
                    onChange={(e) => setEditSpeakerForm({ ...editSpeakerForm, linkedin_url: e.target.value })}
                  />
                </div>
                <div>
                  <SpeakerPhotoSelector
                    value={editSpeakerForm.photo_url}
                    onChange={(url) => setEditSpeakerForm({ ...editSpeakerForm, photo_url: url })}
                    inputClass={inputClass}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setEditingSpeakerInModal(null)}
                  disabled={isSubmittingEditSpeaker}
                  className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveEditSpeakerInModal}
                  disabled={isSubmittingEditSpeaker}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-red-500/20"
                >
                  {isSubmittingEditSpeaker ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                  ) : (
                    <><Check className="w-4 h-4" />Save Changes</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Speaker Popup */}
        {showAddSpeakerModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowAddSpeakerModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                    className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Speaker</h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAddSpeakerModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </motion.button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {addSpeakerFormError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300"
                  >
                    {addSpeakerFormError}
                  </motion.div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. John"
                      value={addSpeakerForm.first_name}
                      onChange={(e) => setAddSpeakerForm({ ...addSpeakerForm, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Doe"
                      value={addSpeakerForm.last_name}
                      onChange={(e) => setAddSpeakerForm({ ...addSpeakerForm, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Title/Position *</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. CEO at Acme Corp"
                    value={addSpeakerForm.title}
                    onChange={(e) => setAddSpeakerForm({ ...addSpeakerForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>LinkedIn URL</label>
                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://linkedin.com/in/..."
                    value={addSpeakerForm.linkedin_url}
                    onChange={(e) => setAddSpeakerForm({ ...addSpeakerForm, linkedin_url: e.target.value })}
                  />
                </div>
                <div>
                  <SpeakerPhotoSelector
                    value={addSpeakerForm.photo_url}
                    onChange={(url) => setAddSpeakerForm({ ...addSpeakerForm, photo_url: url })}
                    inputClass={inputClass}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowAddSpeakerModal(false)}
                  disabled={isSubmittingAddSpeaker}
                  className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddNewSpeaker}
                  disabled={isSubmittingAddSpeaker}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-red-500/20"
                >
                  {isSubmittingAddSpeaker ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Adding...</>
                  ) : (
                    <><Plus className="w-4 h-4" />Add Speaker</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };


  return (
    <SharedNavigation
      navItems={navItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
      title="ASU Career Expo"
      hideNotifications={true}
      eventId={EVENT_ID}
    >
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'statistics' && <StatisticsTab eventId={getActiveEventId()} />}
          {activeTab === 'sessions' && renderSessions()}
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'companies' && renderCompanies()}
          {activeTab === 'jobs' && renderJobs()}
          {activeTab === 'points' && renderPoints()}
          {activeTab === 'feedback' && <FeedbackManagement eventId={getActiveEventId()} />}
        </motion.div>
      </AnimatePresence>

      {renderAddCompanyModal()}
      {renderViewCompanyModal()}
      {renderLinkCompaniesModal()}
      {renderEditCompanyModal()}
      {renderDeleteCompanyModal()}
      {renderAddSessionModal()}
      {renderDeleteSessionModal()}
      {renderSessionBookingsModal()}
      {renderViewSpeakersModal()}
      {renderAnnouncementModal()}

      {renderJobDetailModal()}
      {showJobApplicantsModal && selectedJob && (
        <JobApplicantsModal
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          onClose={() => {
            setShowJobApplicantsModal(false);
            setSelectedJob(null);
          }}
        />
      )}

      {renderEventDetailModal()}
      {renderAddEditEventModal()}
      {renderDeleteEventModal()}

      <SimpleModal show={showAddMapModal} onClose={() => setShowAddMapModal(false)} title="Add Map" />


      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </SharedNavigation>
  );
}

