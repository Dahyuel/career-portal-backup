import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from './icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export const ResetPasswordForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate session on mount — also handle recovery token from URL hash
  useEffect(() => {
    const checkSession = async () => {
      // First check if there's already a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setTokenValid(true);
        return;
      }

      // Check URL hash for recovery token (from custom email template)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const type = params.get('type');

      if (accessToken && type === 'recovery') {
        logger.log('Found recovery token in URL hash, verifying...');
        const { error } = await supabase.auth.verifyOtp({
          token_hash: accessToken,
          type: 'recovery',
        });

        if (!error) {
          logger.log('✅ Recovery token verified successfully');
          setTokenValid(true);
          return;
        }
        logger.error('❌ Recovery token verification failed:', error);
      }

      setTokenValid(false);
    };
    checkSession();
  }, []);

  const validatePassword = (password: string): string[] => {
    const errs: string[] = [];
    if (password.length < 8) errs.push('Password must be at least 8 characters long');
    if (!/(?=.*[a-z])/.test(password)) errs.push('Password must contain at least one lowercase letter');
    if (!/(?=.*[A-Z])/.test(password)) errs.push('Password must contain at least one uppercase letter');
    if (!/(?=.*\d)/.test(password)) errs.push('Password must contain at least one number');
    if (!/(?=.*[@$!%*?&])/.test(password)) errs.push('Password must contain at least one special character (@$!%*?&)');
    return errs;
  };

  const validateForm = (): string[] => {
    const validationErrors = validatePassword(formData.password);
    if (!formData.confirmPassword) {
      validationErrors.push('Please confirm your password');
    } else if (formData.password !== formData.confirmPassword) {
      validationErrors.push('Passwords do not match');
    }
    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      logger.log('Updating user password...');

      const { error } = await supabase.auth.updateUser({
        password: formData.password.trim()
      });

      if (error) {
        logger.error('Password update error:', error);
        setErrors([error.message]);
        return;
      }

      logger.log('✅ Password updated successfully');

      // Sign out so the user must log in again with the new password
      await supabase.auth.signOut();
      logger.log('✅ Signed out after password reset');

      setSuccess(true);

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);

    } catch (err: any) {
      logger.error('Password reset exception:', err);
      setErrors(['Password reset failed. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) setErrors([]);
  };

  // ── Loading state while checking token ──
  if (tokenValid === null) {
    return (
      <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: 'url("/images/190A1143.jpeg")' }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-opacity-60"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-gray-700 w-full max-w-md p-8 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-600 dark:text-gray-400">Validating reset link...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Invalid token state ──
  if (tokenValid === false) {
    return (
      <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: 'url("/images/190A1143.jpeg")' }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-opacity-60"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-gray-700 w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-asu-red to-asu-red-light px-6 py-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <AlertCircle className="mx-auto h-14 w-14 text-white mb-3" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Invalid Reset Link
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-red-100"
              >
                This link is invalid or has expired
              </motion.p>
            </div>

            {/* Body */}
            <div className="p-8 space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
                Please request a new password reset link from the forgot password page.
              </p>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 shadow-lg"
              >
                Request New Reset Link
              </motion.button>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className="w-full inline-flex items-center justify-center gap-2 text-asu-red dark:text-red-400 hover:text-asu-red-dark dark:hover:text-red-300 font-medium hover:underline transition-colors py-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: 'url("/images/190A1143.jpeg")' }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-opacity-60"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-gray-700 w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-asu-red to-asu-red-light px-6 py-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="mx-auto h-14 w-14 text-white mb-3" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Password Reset Successful
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-red-100"
              >
                Your password has been updated
              </motion.p>
            </div>

            {/* Body */}
            <div className="p-8">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 dark:text-gray-400 text-center mb-6"
              >
                Your password has been successfully updated. You will be redirected to the login page shortly to sign in with your new password.
              </motion.p>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login', { replace: true })}
                className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 shadow-lg"
              >
                Go to Login Now
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main Reset Password Form ──
  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/images/190A1143.jpeg")' }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-opacity-60"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-gray-700 w-full max-w-md overflow-hidden relative"
        >

          {/* Header */}
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
            >
              <KeyRound className="mx-auto h-12 w-12 text-white mb-3" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Set New Password
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-red-100"
            >
              Enter your new password below
            </motion.p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Errors */}
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring" }}
                className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6"
              >
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-asu-red dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {errors.length === 1 ? (
                      <p className="text-red-700 dark:text-red-300 text-sm">{errors[0]}</p>
                    ) : (
                      <div>
                        <p className="text-red-700 dark:text-red-300 font-medium text-sm mb-1">Please fix the following:</p>
                        <ul className="text-red-600 dark:text-red-400 text-sm space-y-1">
                          {errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              {/* New Password */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
                    placeholder="Enter your new password"
                    disabled={loading}
                    required
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
              </motion.div>

              {/* Confirm Password */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
                    placeholder="Confirm your new password"
                    disabled={loading}
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-asu-red dark:hover:text-red-400 transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </motion.button>
                </div>
              </motion.div>

              {/* Password Requirements */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"
              >
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Requirements:</p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character (@$!%*?&)</li>
                </ul>
              </motion.div>

              {/* Submit Button */}
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
                    <span>Updating Password...</span>
                  </div>
                ) : (
                  'Update Password'
                )}
              </motion.button>

              {/* Back to Login */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-center pt-4 border-t border-gray-200 dark:border-gray-600"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 text-asu-red dark:text-red-400 hover:text-asu-red-dark dark:hover:text-red-300 font-medium hover:underline transition-colors"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </motion.button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};