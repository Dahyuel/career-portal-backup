// components/UnifiedAttendeeRegistration.tsx
// Signup-only form. Event registration now happens post-login via EventRegistration page.
import React, { useState, useCallback } from 'react';
import { User, Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff } from './icons';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ValidationError } from '../types';
import { validateName, validateEmail, validatePassword, validateConfirmPassword, validatePhone, validatePersonalId } from '../utils/validation';
import { signUpUser, SignupData } from '../lib/supabase';
import Toast from '../components/shared/Toast';
import { logger } from '../utils/logger';
import { sanitizeName, sanitizeEmail, sanitizePhone, sanitizeNumeric } from '../utils/sanitize';
import { SearchableSelect } from './shared/SearchableSelect';

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

export const NATIONALITY_OPTIONS = [
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

export const UnifiedAttendeeRegistration: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SignupData & { confirmPassword: string }>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    personalId: '',
    nationality: null,
    gender: null,
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [captcha, setCaptcha] = useState<{ question: string; token: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const showToast = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
    setToast({ message, type });
  }, []);

  const updateField = useCallback((field: keyof (SignupData & { confirmPassword: string }), value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const validateForm = (): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    const nameParts = formData.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';

    const firstNameError = validateName(firstName, 'Full name');
    if (firstNameError) validationErrors.push({ field: 'fullName', message: 'Please enter your full name (first and last name)' });

    const emailError = validateEmail(formData.email);
    if (emailError) validationErrors.push({ field: 'email', message: emailError });

    const passwordError = validatePassword(formData.password);
    if (passwordError) validationErrors.push({ field: 'password', message: passwordError });

    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmPasswordError) validationErrors.push({ field: 'confirmPassword', message: confirmPasswordError });

    const phoneError = validatePhone(formData.phone);
    if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

    if (!formData.nationality) {
      validationErrors.push({ field: 'nationality', message: 'Nationality is required' });
    }

    if (!formData.gender) {
      validationErrors.push({ field: 'gender', message: 'Gender is required' });
    }

    if (formData.nationality === 'egyptian') {
      const personalIdError = validatePersonalId(formData.personalId);
      if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });
    } else {
      if (!formData.personalId || !formData.personalId.trim()) {
        validationErrors.push({ field: 'personalId', message: 'Personal ID / Passport number is required' });
      }
    }

    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      showToast(validationErrors[0].message, 'error');
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const finalNationality: string | null = formData.nationality || null;

      const result = await signUpUser({
        email: sanitizeEmail(formData.email) || formData.email.trim(),
        password: formData.password,
        fullName: sanitizeName(formData.fullName),
        phone: sanitizePhone(formData.phone),
        personalId: sanitizeNumeric(formData.personalId).substring(0, 14),
        nationality: finalNationality ? finalNationality.trim().substring(0, 100) : null,
        gender: formData.gender?.trim() || null,
        captchaToken: captcha?.token,
        captchaAnswer: captchaAnswer.trim()
      });

      if (!result.success) {
        if (result.error?.field === 'captcha' && result.captchaRequired && result.captchaQuestion && result.captchaToken) {
          setCaptcha({ question: result.captchaQuestion, token: result.captchaToken });
          setCaptchaAnswer('');
          setErrors([{ field: 'captcha', message: 'Please complete the verification challenge.' }]);
          showToast('Please complete the verification challenge.', 'warning');
          setLoading(false);
          return;
        }

        const field = result.error?.field || 'general';
        const message = result.error?.message || 'Signup failed. Please try again.';
        setErrors([{ field, message }]);
        showToast(message, 'error');
        setLoading(false);
        return;
      }

      // Auto sign-in after registration
      const { signInUser } = await import('../lib/supabase');
      const loginResult = await signInUser(
        sanitizeEmail(formData.email) || formData.email.trim(),
        formData.password
      );

      setCaptcha(null);
      setCaptchaAnswer('');

      if (loginResult.success) {
        showToast('Account created! Redirecting...', 'success');
        setTimeout(() => {
          navigate('/select-event', { replace: true });
        }, 800);
      } else {
        showToast('Account created successfully! Please sign in.', 'success');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }

    } catch (error: any) {
      logger.error('💥 Signup error:', error);
      showToast(error.message || 'Something went wrong. Please try again.', 'error');
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => errors.find(error => error.field === field)?.message;

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/images/190A1143.jpeg")' }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-opacity-60"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-gray-700 w-full max-w-lg overflow-hidden relative"
        >
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 z-20 flex items-center bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 rounded-full p-2 hover:px-4 hover:bg-white dark:hover:bg-gray-600 transition-all duration-300 shadow-sm group backdrop-blur-sm"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300">Home</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-asu-red to-asu-red-light px-6 py-8 pt-16 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg"
            >
              <User className="w-8 h-8 text-asu-red" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Create Account
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-red-100"
            >
              Sign up for ASU Career Expo
            </motion.p>
          </motion.div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {getFieldError('general') && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center space-x-2"
              >
                <AlertCircle className="h-5 w-5 text-asu-red dark:text-red-400 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300 text-sm">{getFieldError('general')}</p>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span dir="rtl" className="text-gray-500 dark:text-gray-400">(الاسم بالكامل)</span> *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('fullName') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </div>
              {getFieldError('fullName') && <p className="mt-1 text-sm text-asu-red">{getFieldError('fullName')}</p>}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address <span dir="rtl" className="text-gray-500 dark:text-gray-400">(البريد الالكتروني)</span> *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('email') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter your email address"
                  disabled={loading}
                />
              </div>
              {getFieldError('email') && <p className="mt-1 text-sm text-asu-red">{getFieldError('email')}</p>}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password <span dir="rtl" className="text-gray-500 dark:text-gray-400">(كلمة السر)</span> *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('password') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Create a password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-asu-red transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {getFieldError('password') && <p className="mt-1 text-sm text-asu-red">{getFieldError('password')}</p>}
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password <span dir="rtl" className="text-gray-500 dark:text-gray-400">(تأكيد كلمة السر)</span> *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('confirmPassword') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Confirm password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-asu-red transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {getFieldError('confirmPassword') && <p className="mt-1 text-sm text-asu-red">{getFieldError('confirmPassword')}</p>}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number <span dir="rtl" className="text-gray-500 dark:text-gray-400">(رقم الموبايل)</span> *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('phone') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="01X-XXXXXXXX"
                  disabled={loading}
                />
                {getFieldError('phone') && <p className="mt-1 text-sm text-asu-red">{getFieldError('phone')}</p>}
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  National ID / Passport <span dir="rtl" className="text-gray-500 dark:text-gray-400">(رقم القومي / جواز سفر)</span> *
                </label>
                <input
                  type="text"
                  value={formData.personalId}
                  onChange={(e) => updateField('personalId', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('personalId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter your National ID or Passport number"
                  disabled={loading}
                />
                {getFieldError('personalId') && <p className="mt-1 text-sm text-asu-red">{getFieldError('personalId')}</p>}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nationality <span dir="rtl" className="text-gray-500 dark:text-gray-400">(الجنسية)</span> <span className="text-asu-red">*</span>
                </label>
                <SearchableSelect
                  options={NATIONALITY_OPTIONS}
                  value={formData.nationality || ''}
                  onChange={(val) => updateField('nationality', val)}
                  placeholder="Select nationality"
                  error={!!getFieldError('nationality')}
                  disabled={loading}
                />
                {getFieldError('nationality') && <p className="mt-1 text-sm text-asu-red">{getFieldError('nationality')}</p>}
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender <span dir="rtl" className="text-gray-500 dark:text-gray-400">(النوع)</span> <span className="text-asu-red">*</span>
                </label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('gender') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  disabled={loading}
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {getFieldError('gender') && <p className="mt-1 text-sm text-asu-red">{getFieldError('gender')}</p>}
              </motion.div>
            </div>



            {captcha && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
              >
                <label className="block text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                  Verification: {captcha.question}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={captchaAnswer}
                  onChange={(e) => { setCaptchaAnswer(e.target.value); setErrors(prev => prev.filter(error => error.field !== 'captcha')); }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('captcha') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Your answer"
                  disabled={loading}
                />
                {getFieldError('captcha') && <p className="mt-1 text-sm text-asu-red">{getFieldError('captcha')}</p>}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
            >
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    Already have an account? <Link to="/login" className="font-medium underline hover:text-blue-600">Sign in here</Link>
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default UnifiedAttendeeRegistration;
