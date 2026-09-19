// components/LoginForm.tsx
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, ArrowLeft } from './icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LoginData, ValidationError } from '../types';
import { validateEmail, validatePassword } from '../utils/validation';
import { signInUser } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { sanitizeEmail } from '../utils/sanitize';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, sessionLoaded, profile, getRoleBasedRedirect } = useAuth();

  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // ── Redirect once profile is loaded ──────────────────────────────────────
  // Fires whenever AuthContext publishes a profile with a role. This is a
  // safety net; handleSubmit usually wins the race and sets isRedirecting.
  useEffect(() => {
    if (!isAuthenticated || !sessionLoaded) return;
    if (!profile?.role) return;
    if (isRedirecting) return;
    // A submit in progress routes on its own (handleSubmit)
    if (loading) return;

    setIsRedirecting(true);

    const role = profile.role;
    // Everyone except super admins re-selects an event after login.
    const target = role !== 'sadmin' && role !== 'super_admin'
      ? '/select-event'
      : getRoleBasedRedirect(role);
    logger.log(`➡️ ${role} → ${target}`);
    navigate(target, { replace: true });
  }, [isAuthenticated, sessionLoaded, profile, isRedirecting, loading, navigate, getRoleBasedRedirect]);

  const updateField = (field: keyof LoginData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const validateForm = (): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    const emailError = validateEmail(formData.email);
    if (emailError) validationErrors.push({ field: 'email', message: emailError });

    const passwordError = validatePassword(formData.password);
    if (passwordError) validationErrors.push({ field: 'password', message: passwordError });

    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      logger.log('🔐 Attempting login for:', formData.email);

      const result = await signInUser(
        sanitizeEmail(formData.email) || formData.email.trim(),
        formData.password
      );

      if (!result.success) {
        if (result.error?.validationErrors && result.error.validationErrors.length > 0) {
          setErrors(result.error.validationErrors);
        } else {
          setErrors([{
            field: 'general',
            message: result.error?.message || 'Invalid email or password. Please try again.'
          }]);
        }
        setLoading(false);
        return;
      }

      if (!result.data?.user) {
        setErrors([{
          field: 'general',
          message: 'Login failed. No user data returned.'
        }]);
        setLoading(false);
        return;
      }

      logger.log('✅ Auth successful — waiting for AuthContext to publish the live profile...');

      // Routing is driven ONLY by the authoritative profile from the live RPC
      // (the safety-net useEffect above fires once `profile` is set).
      // localStorage is deliberately NOT polled: it is not a trusted source for
      // role-based routing. /select-event is the safe landing for every
      // non-super-admin; ProtectedRoute redirects admins once resolved.
      setIsRedirecting(true);
      navigate('/select-event', { replace: true });

    } catch (error: any) {
      logger.error('💥 Login error:', error);
      setErrors([{
        field: 'general',
        message: 'Login failed. Please try again.'
      }]);
      setLoading(false);
      setIsRedirecting(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/images/190A1143.jpeg")' }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-opacity-60"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-gray-700 w-full max-w-md overflow-hidden relative">
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
            className="bg-gradient-to-r from-asu-red to-asu-red-light px-6 py-4 pt-16 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-[6.5rem] h-[6.5rem] bg-white rounded-full flex items-center justify-center mb-2 shadow-lg"
            >
              <img src="/images/logo2.png" alt="ASU Career Expo" className="w-24 h-24 rounded-full object-cover" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Welcome Back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-red-100"
            >
              Sign in to ASU Career Expo
            </motion.p>
          </motion.div>

          <form onSubmit={handleSubmit} className="p-8">
            {getFieldError('general') && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring" }}
                className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center space-x-2 mb-6"
              >
                <AlertCircle className="h-5 w-5 text-asu-red dark:text-red-400 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300 text-sm">{getFieldError('general')}</p>
              </motion.div>
            )}

            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('email') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter your email address"
                  disabled={loading}
                  autoComplete="email"
                />
                {getFieldError('email') && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-asu-red dark:text-red-400 mt-2">
                    {getFieldError('email')}
                  </motion.p>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('password') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-asu-red dark:hover:text-red-400 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </motion.button>
                </div>
                {getFieldError('password') && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-asu-red dark:text-red-400 mt-2">
                    {getFieldError('password')}
                  </motion.p>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-right">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-asu-red dark:text-red-400 hover:text-asu-red-dark dark:hover:text-red-300 hover:underline font-medium transition-colors"
                  disabled={loading}
                >
                  Forgot Password?
                </motion.button>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </motion.button>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-center pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => navigate('/attendee-register')}
                    className="text-asu-red dark:text-red-400 hover:text-asu-red-dark dark:hover:text-red-300 font-medium hover:underline transition-colors"
                    disabled={loading}
                  >
                    Create Attendee Account
                  </motion.button>
                </p>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginForm;
