// components/LoginForm.tsx - Frontend-only version
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoginData, ValidationError } from '../types';
import { validateEmail, validatePassword } from '../utils/validation';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        // Redirect based on role
        if (user.role === 'attendee') {
          navigate('/attendee', { replace: true });
        } else if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, [navigate]);

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if user exists in localStorage (from registration)
      const registeredUser = localStorage.getItem('currentUser');

      if (registeredUser) {
        const user = JSON.parse(registeredUser);

        // Simple email check (in real app, you'd verify password too)
        if (user.email.toLowerCase() === formData.email.toLowerCase()) {
          console.log('✅ Login successful:', user);

          // Redirect based on role
          if (user.role === 'attendee') {
            navigate('/attendee', { replace: true });
          } else if (user.role === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }
      }

      // If no match found, show error
      setErrors([{
        field: 'general',
        message: 'Invalid email or password. Please try again or create a new account.'
      }]);

    } catch (error: any) {
      console.error('Login error:', error);
      setErrors([{
        field: 'general',
        message: 'Login failed. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: 'url("/images/careercenter.png")',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-20 dark:bg-opacity-60"></div>
      </div>


      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-100 dark:border-gray-700 w-full max-w-md overflow-hidden fade-in-up-blur modal-content-blur">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="absolute top-4 left-4 z-20 flex items-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2 hover:px-4 hover:bg-red-100 dark:hover:bg-red-900/50 hover:scale-105 transition-all duration-300 shadow-sm group"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300">Back</span>
          </button>

          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 pt-16 text-center fade-in-blur">
            <div className="mx-auto w-28 h-28 bg-white rounded-full flex items-center justify-center mb-2 shadow-lg fade-in-scale">
              <img
                src="/images/logo.png"
                alt="ASU Career Week Logo"
                className="w-24 h-24 rounded-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-red-100">Sign in to ASU Employment Fair</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 stagger-children">
            {getFieldError('general') && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center space-x-2 mb-6 fade-in-blur">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300 text-sm">{getFieldError('general')}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Email */}
              <div className="fade-in-blur">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('email') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Enter your email address"
                  disabled={loading}
                  autoComplete="email"
                />
                {getFieldError('email') && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{getFieldError('email')}</p>
                )}
              </div>

              {/* Password */}
              <div className="fade-in-blur">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('password') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {getFieldError('password') && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{getFieldError('password')}</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="text-right fade-in-blur">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline font-medium transition-colors"
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed fade-in-blur smooth-hover transform hover:scale-105"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Register Link */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-600 fade-in-blur">
                <p className="text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/attendee-register')}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium hover:underline transition-colors"
                    disabled={loading}
                  >
                    Create Attendee Account
                  </button>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};