
// at /employerreg

// pages/employer/EmployerRegistration.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Building2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, validateConfirmPassword, validateName } from '../../utils/validation';

export const EmployerRegistration: React.FC = () => {
    const navigate = useNavigate();
    const { signUp } = useAuth();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        employerId: ''
    });

    const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => prev.filter(error => error.field !== field));
    };

    const validateForm = (): boolean => {
        const validationErrors: { field: string; message: string }[] = [];

        // Validate names
        const firstNameError = validateName(formData.firstName, 'First name');
        if (firstNameError) validationErrors.push({ field: 'firstName', message: firstNameError });

        const lastNameError = validateName(formData.lastName, 'Last name');
        if (lastNameError) validationErrors.push({ field: 'lastName', message: lastNameError });

        // Validate email
        const emailError = validateEmail(formData.email);
        if (emailError) validationErrors.push({ field: 'email', message: emailError });

        // Validate passwords
        const passwordError = validatePassword(formData.password);
        if (passwordError) validationErrors.push({ field: 'password', message: passwordError });

        const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
        if (confirmPasswordError) validationErrors.push({ field: 'confirmPassword', message: confirmPasswordError });

        // Validate employer ID
        if (!formData.employerId.trim()) {
            validationErrors.push({ field: 'employerId', message: 'Employer ID is required' });
        } else if (formData.employerId.trim().length < 3) {
            validationErrors.push({ field: 'employerId', message: 'Employer ID must be at least 3 characters' });
        }

        setErrors(validationErrors);
        return validationErrors.length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setErrors([]);

        try {
            console.log('Starting employer registration...');

            const result = await signUp(formData.email, formData.password, {
                first_name: formData.firstName.trim(),
                last_name: formData.lastName.trim(),
                role: 'employer',
                employer_id: formData.employerId.trim()
            });

            console.log('Registration completed:', result);

            if (result.success) {
                console.log('Registration successful, showing success message...');
                setShowSuccess(true);

                // Navigate to employer dashboard or login
                setTimeout(() => {
                    navigate('/employer', { replace: true });
                }, 2000);
            } else {
                console.error('Registration failed:', result.error);

                let errorMessage = result.error?.message || 'Registration failed. Please try again.';

                if (errorMessage.includes('User already registered')) {
                    errorMessage = 'An account with this email already exists. Please sign in instead.';
                } else if (errorMessage.includes('Email not confirmed')) {
                    errorMessage = 'Please check your email to confirm your account before signing in.';
                }

                setErrors([{
                    field: 'general',
                    message: errorMessage
                }]);
            }
        } catch (error: any) {
            console.error('Unexpected registration error:', error);
            setErrors([{
                field: 'general',
                message: 'An unexpected error occurred. Please try again.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const getFieldError = (field: string) => {
        return errors.find(error => error.field === field)?.message;
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                    style={{
                        backgroundImage: 'url("/images/careercenter.png")',
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-60"></div>
                </div>
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100 dark:border-gray-700 transition-colors duration-300">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registration Successful!</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Your employer account has been created. Please check your email to verify your account.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Redirecting to login...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                style={{
                    backgroundImage: 'url("/images/careercenter.png")',
                }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-60"></div>
            </div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-red-100 dark:border-gray-700 transition-colors duration-300 relative">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-4 left-4 z-20 p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shadow-sm"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Employer Registration</h1>
                        <p className="text-gray-600 dark:text-gray-300">Create your employer account for ASU Employment Fair</p>
                    </div>

                    {/* General Error */}
                    {getFieldError('general') && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                <p className="text-red-800 dark:text-red-200 text-sm">{getFieldError('general')}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    First Name *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => updateField('firstName', e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('firstName') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="First name"
                                    />
                                </div>
                                {getFieldError('firstName') && (
                                    <p className="mt-1 text-sm text-red-600">{getFieldError('firstName')}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Last Name *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => updateField('lastName', e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('lastName') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="Last name"
                                    />
                                </div>
                                {getFieldError('lastName') && (
                                    <p className="mt-1 text-sm text-red-600">{getFieldError('lastName')}</p>
                                )}
                            </div>
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email Address *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('email') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    placeholder="Enter your email"
                                />
                            </div>
                            {getFieldError('email') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                            )}
                        </div>

                        {/* Employer ID Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Employer ID *
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.employerId}
                                    onChange={(e) => updateField('employerId', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('employerId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    placeholder="Enter your employer ID"
                                />
                            </div>
                            {getFieldError('employerId') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('employerId')}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                This ID will be provided by the event organizers
                            </p>
                        </div>

                        {/* Password Fields */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => updateField('password', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('password') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    placeholder="Create a password"
                                />
                            </div>
                            {getFieldError('password') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('confirmPassword') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    placeholder="Confirm your password"
                                />
                            </div>
                            {getFieldError('confirmPassword') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Creating Account...
                                </span>
                            ) : (
                                'Create Employer Account'
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployerRegistration;
