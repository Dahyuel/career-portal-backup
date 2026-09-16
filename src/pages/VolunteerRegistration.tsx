// pages/VolunteerRegistration.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, User, Mail, Lock, Phone, Hash, Globe, UserCircle,
  AlertCircle, ArrowLeft, ArrowRight, GraduationCap,
  BookOpen, Calendar, FileText, Upload, X, CheckCircle
} from '../components/icons';
import { validateEmail, validatePassword, validateConfirmPassword, validatePhone, validatePersonalId } from '../utils/validation';
import { signUpVolunteer, signInUser, supabase } from '../lib/supabase';
import { sanitizeEmail, sanitizeName, sanitizePhone, sanitizeNumeric } from '../utils/sanitize';
import { logger } from '../utils/logger';
import Toast from '../components/shared/Toast';
import { SearchableSelect } from '../components/shared/SearchableSelect';
import { FACULTIES, CLASS_YEARS, DEGREE_LEVEL_OPTIONS } from '../utils/constants';
import DashboardLoading from '../components/DashboardLoading';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];


const NATIONALITY_OPTIONS = [
  { value: 'egyptian', label: 'Egyptian' },
  { value: 'afghan', label: 'Afghan' },
  { value: 'albanian', label: 'Albanian' },
  { value: 'algerian', label: 'Algerian' },
  { value: 'american', label: 'American' },
  { value: 'andorran', label: 'Andorran' },
  { value: 'angolan', label: 'Angolan' },
  { value: 'argentine', label: 'Argentine' },
  { value: 'armenian', label: 'Armenian' },
  { value: 'australian', label: 'Australian' },
  { value: 'austrian', label: 'Austrian' },
  { value: 'azerbaijani', label: 'Azerbaijani' },
  { value: 'bahraini', label: 'Bahraini' },
  { value: 'bangladeshi', label: 'Bangladeshi' },
  { value: 'barbadian', label: 'Barbadian' },
  { value: 'belarusian', label: 'Belarusian' },
  { value: 'belgian', label: 'Belgian' },
  { value: 'belizean', label: 'Belizean' },
  { value: 'beninese', label: 'Beninese' },
  { value: 'bhutanese', label: 'Bhutanese' },
  { value: 'bolivian', label: 'Bolivian' },
  { value: 'bosnian', label: 'Bosnian' },
  { value: 'brazilian', label: 'Brazilian' },
  { value: 'british', label: 'British' },
  { value: 'bruneian', label: 'Bruneian' },
  { value: 'bulgarian', label: 'Bulgarian' },
  { value: 'burkinabe', label: 'Burkinabe' },
  { value: 'burmese', label: 'Burmese' },
  { value: 'burundian', label: 'Burundian' },
  { value: 'cambodian', label: 'Cambodian' },
  { value: 'cameroonian', label: 'Cameroonian' },
  { value: 'canadian', label: 'Canadian' },
  { value: 'cape_verdean', label: 'Cape Verdean' },
  { value: 'central_african', label: 'Central African' },
  { value: 'chadian', label: 'Chadian' },
  { value: 'chilean', label: 'Chilean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'colombian', label: 'Colombian' },
  { value: 'comoran', label: 'Comoran' },
  { value: 'congolese', label: 'Congolese' },
  { value: 'costa_rican', label: 'Costa Rican' },
  { value: 'croatian', label: 'Croatian' },
  { value: 'cuban', label: 'Cuban' },
  { value: 'cypriot', label: 'Cypriot' },
  { value: 'czech', label: 'Czech' },
  { value: 'danish', label: 'Danish' },
  { value: 'djiboutian', label: 'Djiboutian' },
  { value: 'dominican', label: 'Dominican' },
  { value: 'dutch', label: 'Dutch' },
  { value: 'ecuadorian', label: 'Ecuadorian' },
  { value: 'emirati', label: 'Emirati' },
  { value: 'equatorial_guinean', label: 'Equatorial Guinean' },
  { value: 'eritrean', label: 'Eritrean' },
  { value: 'estonian', label: 'Estonian' },
  { value: 'ethiopian', label: 'Ethiopian' },
  { value: 'fijian', label: 'Fijian' },
  { value: 'finnish', label: 'Finnish' },
  { value: 'french', label: 'French' },
  { value: 'gabonese', label: 'Gabonese' },
  { value: 'gambian', label: 'Gambian' },
  { value: 'georgian', label: 'Georgian' },
  { value: 'german', label: 'German' },
  { value: 'ghanaian', label: 'Ghanaian' },
  { value: 'greek', label: 'Greek' },
  { value: 'grenadian', label: 'Grenadian' },
  { value: 'guatemalan', label: 'Guatemalan' },
  { value: 'guinean', label: 'Guinean' },
  { value: 'guinea_bissauan', label: 'Guinea-Bissauan' },
  { value: 'guyanese', label: 'Guyanese' },
  { value: 'haitian', label: 'Haitian' },
  { value: 'honduran', label: 'Honduran' },
  { value: 'hungarian', label: 'Hungarian' },
  { value: 'icelandic', label: 'Icelandic' },
  { value: 'indian', label: 'Indian' },
  { value: 'indonesian', label: 'Indonesian' },
  { value: 'iranian', label: 'Iranian' },
  { value: 'iraqi', label: 'Iraqi' },
  { value: 'irish', label: 'Irish' },
  { value: 'israeli', label: 'Israeli' },
  { value: 'italian', label: 'Italian' },
  { value: 'ivorian', label: 'Ivorian' },
  { value: 'jamaican', label: 'Jamaican' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'jordanian', label: 'Jordanian' },
  { value: 'kazakhstani', label: 'Kazakhstani' },
  { value: 'kenyan', label: 'Kenyan' },
  { value: 'kiribati', label: 'Kiribati' },
  { value: 'kuwaiti', label: 'Kuwaiti' },
  { value: 'kyrgyz', label: 'Kyrgyz' },
  { value: 'laotian', label: 'Laotian' },
  { value: 'latvian', label: 'Latvian' },
  { value: 'lebanese', label: 'Lebanese' },
  { value: 'liberian', label: 'Liberian' },
  { value: 'libyan', label: 'Libyan' },
  { value: 'liechtensteiner', label: 'Liechtensteiner' },
  { value: 'lithuanian', label: 'Lithuanian' },
  { value: 'luxembourger', label: 'Luxembourger' },
  { value: 'macedonian', label: 'Macedonian' },
  { value: 'malagasy', label: 'Malagasy' },
  { value: 'malawian', label: 'Malawian' },
  { value: 'malaysian', label: 'Malaysian' },
  { value: 'maldivian', label: 'Maldivian' },
  { value: 'malian', label: 'Malian' },
  { value: 'maltese', label: 'Maltese' },
  { value: 'marshallese', label: 'Marshallese' },
  { value: 'mauritanian', label: 'Mauritanian' },
  { value: 'mauritian', label: 'Mauritian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'micronesian', label: 'Micronesian' },
  { value: 'moldovan', label: 'Moldovan' },
  { value: 'monegasque', label: 'Monegasque' },
  { value: 'mongolian', label: 'Mongolian' },
  { value: 'montenegrin', label: 'Montenegrin' },
  { value: 'moroccan', label: 'Moroccan' },
  { value: 'mozambican', label: 'Mozambican' },
  { value: 'namibian', label: 'Namibian' },
  { value: 'nauruan', label: 'Nauruan' },
  { value: 'nepalese', label: 'Nepalese' },
  { value: 'new_zealander', label: 'New Zealander' },
  { value: 'nicaraguan', label: 'Nicaraguan' },
  { value: 'nigerian', label: 'Nigerian' },
  { value: 'nigerien', label: 'Nigerien' },
  { value: 'north_korean', label: 'North Korean' },
  { value: 'norwegian', label: 'Norwegian' },
  { value: 'omani', label: 'Omani' },
  { value: 'pakistani', label: 'Pakistani' },
  { value: 'palauan', label: 'Palauan' },
  { value: 'palestinian', label: 'Palestinian' },
  { value: 'panamanian', label: 'Panamanian' },
  { value: 'papua_new_guinean', label: 'Papua New Guinean' },
  { value: 'paraguayan', label: 'Paraguayan' },
  { value: 'peruvian', label: 'Peruvian' },
  { value: 'philippine', label: 'Philippine' },
  { value: 'polish', label: 'Polish' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'qatari', label: 'Qatari' },
  { value: 'romanian', label: 'Romanian' },
  { value: 'russian', label: 'Russian' },
  { value: 'rwandan', label: 'Rwandan' },
  { value: 'saint_lucian', label: 'Saint Lucian' },
  { value: 'salvadoran', label: 'Salvadoran' },
  { value: 'samoan', label: 'Samoan' },
  { value: 'san_marinese', label: 'San Marinese' },
  { value: 'sao_tomean', label: 'Sao Tomean' },
  { value: 'saudi', label: 'Saudi' },
  { value: 'senegalese', label: 'Senegalese' },
  { value: 'serbian', label: 'Serbian' },
  { value: 'seychellois', label: 'Seychellois' },
  { value: 'sierra_leonean', label: 'Sierra Leonean' },
  { value: 'singaporean', label: 'Singaporean' },
  { value: 'slovak', label: 'Slovak' },
  { value: 'slovenian', label: 'Slovenian' },
  { value: 'solomon_islander', label: 'Solomon Islander' },
  { value: 'somali', label: 'Somali' },
  { value: 'south_african', label: 'South African' },
  { value: 'south_korean', label: 'South Korean' },
  { value: 'south_sudanese', label: 'South Sudanese' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'sri_lankan', label: 'Sri Lankan' },
  { value: 'sudanese', label: 'Sudanese' },
  { value: 'surinamer', label: 'Surinamer' },
  { value: 'swazi', label: 'Swazi' },
  { value: 'swedish', label: 'Swedish' },
  { value: 'swiss', label: 'Swiss' },
  { value: 'syrian', label: 'Syrian' },
  { value: 'taiwanese', label: 'Taiwanese' },
  { value: 'tajik', label: 'Tajik' },
  { value: 'tanzanian', label: 'Tanzanian' },
  { value: 'thai', label: 'Thai' },
  { value: 'togolese', label: 'Togolese' },
  { value: 'tongan', label: 'Tongan' },
  { value: 'trinidadian_or_tobagonian', label: 'Trinidadian or Tobagonian' },
  { value: 'tunisian', label: 'Tunisian' },
  { value: 'turkish', label: 'Turkish' },
  { value: 'tuvaluan', label: 'Tuvaluan' },
  { value: 'ugandan', label: 'Ugandan' },
  { value: 'ukrainian', label: 'Ukrainian' },
  { value: 'uruguayan', label: 'Uruguayan' },
  { value: 'uzbekistani', label: 'Uzbekistani' },
  { value: 'venezuelan', label: 'Venezuelan' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'yemeni', label: 'Yemeni' },
  { value: 'zambian', label: 'Zambian' },
  { value: 'zimbabwean', label: 'Zimbabwean' }
];

interface VolunteerTeam {
  id: string;
  team_name: string;
  description?: string | null;
}

const ALLOWED_PROOF_TYPES = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.heic,.heif,.pdf';
const ALLOWED_CV_TYPES = '.pdf,.doc,.docx';

const getReadableTypes = (accept: string) => {
  return accept.split(',').map(e => e.trim().toUpperCase().replace('.', '')).join(', ');
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
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${error ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          : dragActive ? 'border-asu-red bg-red-50 dark:bg-red-900/20'
            : currentFile ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700'
          }`}
      >
        {currentFile ? (
          <div className="flex items-center justify-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{currentFile.name}</span>
            <button type="button" onClick={onRemove} className="text-asu-red dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <input type="file" accept={accept} onChange={handleChange} className="hidden" id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`} />
            <label htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`} className="cursor-pointer flex flex-col items-center text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors">
              <Upload className="w-8 h-8 mb-2" />
              <span>Click or drag file here</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Allowed: {getReadableTypes(accept)}</span>
            </label>
          </div>
        )}
      </div>
      {error && <p className="flex items-center gap-1 text-sm text-asu-red dark:text-red-400"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
    </div>
  );
};

export const VolunteerRegistration: React.FC = () => {
  const navigate = useNavigate();

  const [teams, setTeams] = useState<VolunteerTeam[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', fullName: '', phone: '', personalId: '',
    nationality: '', gender: '',
    faculty: '', department: '',
    studentStatus: '', year: '', teamId: '',
  });

  const [enrollmentProofFile, setEnrollmentProofFile] = useState<File | undefined>();
  const [cvFile, setCvFile] = useState<File | undefined>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: currentEvent } = await supabase.rpc('get_current_event');
        if (!currentEvent) {
          setError('No active event found. Please contact support.');
          setLoadingPage(false);
          return;
        }
        setEventId(currentEvent.id);

        const { data: teamData, error: teamError } = await supabase
          .from('volunteer_teams')
          .select('id, team_name, description')
          .eq('event_id', currentEvent.id)
          .order('team_name', { ascending: true });

        if (teamError) {
          logger.error('Error loading teams:', teamError);
        } else {
          setTeams((teamData as VolunteerTeam[]) || []);
        }
      } catch (err: any) {
        logger.error('VolunteerRegistration load error:', err);
        setError('Could not load event details. Please try again.');
      } finally {
        setLoadingPage(false);
      }
    };
    loadData();
  }, []);

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const validateFile = (file: File, accept: string, maxSize = 10 * 1024 * 1024): string | null => {
    const allowedExts = accept.split(',').map(e => e.trim().toLowerCase());
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!allowedExts.includes(ext)) return `Invalid file type. Allowed: ${getReadableTypes(accept)}`;
    if (file.size > maxSize) return `File too large. Maximum is ${maxSize / 1024 / 1024}MB`;
    return null;
  };

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    // Identity
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;
    const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmError) errors.confirmPassword = confirmError;
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;
    if (!formData.nationality) errors.nationality = 'Nationality is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (formData.nationality === 'egyptian') {
      const idError = validatePersonalId(formData.personalId);
      if (idError) errors.personalId = idError;
    } else if (!formData.personalId.trim()) {
      errors.personalId = 'Personal ID / Passport is required';
    }

    // Academic
    if (!formData.faculty) errors.faculty = 'Faculty is required';
    if (!formData.department.trim()) errors.department = 'Department / Major is required';
    if (!formData.studentStatus) errors.studentStatus = 'Student status is required';
    if (formData.studentStatus === 'undergraduate' && !formData.year) errors.year = 'Class year is required for undergraduate students';
    if (!formData.teamId) errors.teamId = 'Please select a team';

    if (!enrollmentProofFile) errors.enrollmentProofFile = 'Enrollment proof is required';
    else {
      const fileErr = validateFile(enrollmentProofFile, ALLOWED_PROOF_TYPES);
      if (fileErr) errors.enrollmentProofFile = fileErr;
    }
    if (cvFile) {
      const fileErr = validateFile(cvFile, ALLOWED_CV_TYPES);
      if (fileErr) errors.cvFile = fileErr;
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !eventId) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast(Object.values(errors)[0], 'error');
      return;
    }

    setSubmitting(true);
    setError(null);


    try {
      const result = await signUpVolunteer({
        email: sanitizeEmail(formData.email) || formData.email.trim(),
        password: formData.password,
        fullName: sanitizeName(formData.fullName),
        phone: sanitizePhone(formData.phone),
        personalId: sanitizeNumeric(formData.personalId).substring(0, 14),
        nationality: formData.nationality,
        gender: formData.gender,
        faculty: formData.faculty,
        department: formData.department.trim(),
        studentStatus: formData.studentStatus as any,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
        teamId: formData.teamId,
        enrollmentProofFile: enrollmentProofFile!,   // ← add the "!"
        cvFile,
      });

      if (!result.success) {
        const field = result.error?.field || 'general';
        const message = result.error?.message || 'Registration failed. Please try again.';
        if (field !== 'general') setFormErrors(prev => ({ ...prev, [field]: message }));
        setError(message);
        setSubmitting(false);
        return;
      }

      // Sign in the new user
      const signInResult = await signInUser(
        sanitizeEmail(formData.email) || formData.email.trim(),
        formData.password
      );

      if (!signInResult.success) {
        showToast('Account created but sign in failed. Please log in manually.', 'error');
        navigate('/login', { replace: true });
        return;
      }

      navigate('/volunteer/dashboard', { replace: true });
    } catch (err: any) {
      logger.error('VolunteerRegistration submit error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'error') => {
    setToast({ message, type });
  };

  if (loadingPage) return <DashboardLoading message="Loading Event Details..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-10 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-asu-red to-asu-red-light p-6 text-center relative">
            <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/login')} className="absolute top-4 left-4 z-20 flex items-center bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 rounded-full p-2 hover:px-4 hover:bg-white dark:hover:bg-gray-600 transition-all duration-300 shadow-sm group backdrop-blur-sm" aria-label="Back to login">
              <ArrowLeft className="h-5 w-5" />
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300">Login</span>
            </motion.button>
            <h1 className="text-2xl font-bold text-white mt-4">Volunteer Registration</h1>
            <p className="text-red-100 text-sm mt-1">Complete all fields to register as a volunteer</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-asu-red flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* === SECTION 1: ACCOUNT === */}
            <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><User className="w-5 h-5 text-asu-red" />Account</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name <span className="text-asu-red">*</span></label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.fullName ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} placeholder="Enter your full name" disabled={submitting} /></div>
                {formErrors.fullName && <p className="mt-1 text-sm text-asu-red">{formErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email <span className="text-asu-red">*</span></label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.email ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} placeholder="Enter your email" disabled={submitting} /></div>
                {formErrors.email && <p className="mt-1 text-sm text-asu-red">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password <span className="text-asu-red">*</span></label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => updateField('password', e.target.value)} className={`w-full pl-10 pr-12 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.password ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} placeholder="Create a password" disabled={submitting} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-asu-red"><Lock className="h-5 w-5" /></button></div>
                {formErrors.password && <p className="mt-1 text-sm text-asu-red">{formErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password <span className="text-asu-red">*</span></label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className={`w-full pl-10 pr-12 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} placeholder="Confirm password" disabled={submitting} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-asu-red"><Lock className="h-5 w-5" /></button></div>
                {formErrors.confirmPassword && <p className="mt-1 text-sm text-asu-red">{formErrors.confirmPassword}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone <span className="text-asu-red">*</span></label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.phone ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} placeholder="01X-XXXXXXXX" disabled={submitting} /></div>
                {formErrors.phone && <p className="mt-1 text-sm text-asu-red">{formErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">National ID / Passport <span className="text-asu-red">*</span></label>
                <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" value={formData.personalId} onChange={(e) => updateField('personalId', e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.personalId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} placeholder="National ID or Passport" disabled={submitting} /></div>
                {formErrors.personalId && <p className="mt-1 text-sm text-asu-red">{formErrors.personalId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nationality <span className="text-asu-red">*</span></label>
                <SearchableSelect options={NATIONALITY_OPTIONS} value={formData.nationality} onChange={(val) => updateField('nationality', val)} placeholder="Select nationality" error={!!formErrors.nationality} disabled={submitting} icon={<Globe />} />
                {formErrors.nationality && <p className="mt-1 text-sm text-asu-red">{formErrors.nationality}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender <span className="text-asu-red">*</span></label>
                <div className="relative"><UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><select value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.gender ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} disabled={submitting}><option value="">Select gender</option>{GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                {formErrors.gender && <p className="mt-1 text-sm text-asu-red">{formErrors.gender}</p>}
              </div>
            </div>

            {/* === SECTION 2: ACADEMIC === */}
            <div className="pt-6 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><GraduationCap className="w-5 h-5 text-asu-red" />Academic Information</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your academic details and enrollment proof.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Faculty <span className="text-asu-red">*</span></label>
                <select value={formData.faculty} onChange={(e) => updateField('faculty', e.target.value)} className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.faculty ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} disabled={submitting}><option value="">Select faculty</option>{FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}</select>
                {formErrors.faculty && <p className="mt-1 text-sm text-asu-red">{formErrors.faculty}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department / Major <span className="text-asu-red">*</span></label>
                <div className="relative"><BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={formData.department} onChange={(e) => updateField('department', e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.department ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} placeholder="e.g., Computer Science" disabled={submitting} /></div>
                {formErrors.department && <p className="mt-1 text-sm text-asu-red">{formErrors.department}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Student Status <span className="text-asu-red">*</span></label>
                <select value={formData.studentStatus} onChange={(e) => updateField('studentStatus', e.target.value)} className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.studentStatus ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} disabled={submitting}><option value="">Select status</option>{DEGREE_LEVEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
                {formErrors.studentStatus && <p className="mt-1 text-sm text-asu-red">{formErrors.studentStatus}</p>}
              </div>
              {formData.studentStatus === 'undergraduate' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class Year <span className="text-asu-red">*</span></label>
                  <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><select value={formData.year} onChange={(e) => updateField('year', e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 dark:text-white ${formErrors.year ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`} disabled={submitting}><option value="">Select year</option>{CLASS_YEARS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                  {formErrors.year && <p className="mt-1 text-sm text-asu-red">{formErrors.year}</p>}
                </motion.div>
              )}
            </div>

            {/* === SECTION 3: DOCUMENTS === */}
            <div className="pt-6 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-asu-red" />Documents</h2>
            </div>
            <FileUploadField label="Enrollment Proof" accept={ALLOWED_PROOF_TYPES} required currentFile={enrollmentProofFile} error={formErrors.enrollmentProofFile} onSelect={(file) => { setEnrollmentProofFile(file); setFormErrors(prev => { const n = { ...prev }; delete n.enrollmentProofFile; return n; }); }} onRemove={() => setEnrollmentProofFile(undefined)} />
            <FileUploadField label="CV / Resume" accept={ALLOWED_CV_TYPES} currentFile={cvFile} error={formErrors.cvFile} onSelect={(file) => { setCvFile(file); setFormErrors(prev => { const n = { ...prev }; delete n.cvFile; return n; }); }} onRemove={() => setCvFile(undefined)} />

            {/* === SECTION 4: TEAM === */}
            <div className="pt-6 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-asu-red" />Preferred Team</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select the team you'd like to volunteer with.</p>
            </div>
            {teams.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No volunteer teams are available for this event yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teams.map(team => (
                  <button key={team.id} type="button" onClick={() => updateField('teamId', team.id)} className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${formData.teamId === team.id ? 'border-asu-red bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`} disabled={submitting}>
                    <div><p className={`font-semibold ${formData.teamId === team.id ? 'text-asu-red' : 'text-gray-900 dark:text-white'}`}>{team.team_name}</p>{team.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{team.description}</p>}</div>
                    {formData.teamId === team.id && <CheckCircle className="w-5 h-5 text-asu-red flex-shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
            {formErrors.teamId && <p className="mt-2 text-sm text-asu-red">{formErrors.teamId}</p>}

            {/* Submit */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" disabled={submitting || teams.length === 0} className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2">
                {submitting ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Submitting...</span></>) : (<>Complete Registration<ArrowRight className="w-4 h-4" /></>)}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default VolunteerRegistration;