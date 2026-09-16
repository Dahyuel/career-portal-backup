import React, { useState } from 'react';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle, Mail } from './icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { sanitizeEmail } from '../utils/sanitize';
import { logger } from '../utils/logger';

export const ForgotPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Please enter a valid email address'); return; }

    setLoading(true);
    setError(null);

    try {
      const sanitized = sanitizeEmail(email) || trimmed;

      const { error } = await supabase.auth.resetPasswordForEmail(sanitized, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        logger.error('Password reset error:', error);
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      logger.error('Password reset exception:', err);
      setError('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ──
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
                Check Your Email
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-red-100"
              >
                Password reset link has been sent
              </motion.p>
            </div>

            {/* Body */}
            <div className="p-8">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 dark:text-gray-400 text-center mb-4"
              >
                We've sent password reset instructions to your email address.
                Please check your inbox and follow the link to reset your password.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Important:</strong> The email is most likely sent to your <strong>spam/junk folder</strong>. Please check there if you don't see it in your inbox.
                  </p>
                </div>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 shadow-lg"
              >
                Back to Login
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main Form ──
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
              Reset Password
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-red-100"
            >
              Enter your email to receive a reset link
            </motion.p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring" }}
                className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center space-x-2 mb-6"
              >
                <AlertCircle className="h-5 w-5 text-asu-red dark:text-red-400 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </motion.div>
            )}

            <div className="space-y-6">
              {/* Spam Warning */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> The reset email is most likely sent to your <strong>spam/junk folder</strong>. Please check there if you don't see it in your inbox.
                  </p>
                </div>
              </motion.div>
              {/* No account warning */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48 }}
                className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    If you don't have an account registered with this email, <strong>no email will be sent</strong>. Please make sure you're using the email you registered with.
                  </p>
                </div>
              </motion.div>
              {/* Email */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${error ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    placeholder="Enter your registered email address"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-asu-red to-asu-red-light text-white py-3 px-4 rounded-lg font-medium hover:from-asu-red-dark hover:to-asu-red transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending Reset Link...</span>
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </motion.button>

              {/* Back to Login */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
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