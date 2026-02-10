import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Building2, CheckCircle, AlertCircle, ArrowLeft, Briefcase, Phone, FileText, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerEmployer } from '../../lib/supabase';
import { validateEmail, validatePassword, validateConfirmPassword, validateName, validatePhone, validatePersonalId } from '../../utils/validation';

const ErrorPopup: React.FC<{
    message: string;
    onClose: () => void;
    type?: 'error' | 'warning' | 'success';
}> = ({ message, onClose, type = 'error' }) => {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
                    icon: 'text-green-600 dark:text-green-400',
                    text: 'text-green-800 dark:text-green-200',
                    button: 'text-green-600 dark:text-green-400'
                };
            case 'warning':
                return {
                    container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800',
                    icon: 'text-yellow-600 dark:text-yellow-400',
                    text: 'text-yellow-800 dark:text-yellow-200',
                    button: 'text-yellow-600 dark:text-yellow-400'
                };
            case 'error':
            default:
                return {
                    container: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
                    icon: 'text-red-600 dark:text-red-400',
                    text: 'text-red-800 dark:text-red-200',
                    button: 'text-red-600 dark:text-red-400'
                };
        }
    };

    const styles = getStyles();

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed top-4 right-4 z-50"
        >
            <div className={`rounded-lg shadow-lg border p-4 max-w-sm ${styles.container}`}>
                <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 ${styles.icon}`}>
                        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-medium ${styles.text}`}>
                            {message}
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className={`flex-shrink-0 hover:opacity-70 transition-opacity ${styles.button}`}
                    >
                        <X className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export const EmployerRegistration: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        personalId: '',
        jobTitle: '',
        password: '',
        confirmPassword: '',
        companyKey: ''
    });

    const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorPopup, setErrorPopup] = useState<{ message: string; type?: 'error' | 'warning' | 'success' } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => prev.filter(error => error.field !== field));
    };

    const showErrorPopup = (message: string, type: 'error' | 'warning' | 'success' = 'error') => {
        setErrorPopup({ message, type });
    };

    const closeErrorPopup = () => {
        setErrorPopup(null);
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

        // Validate phone
        const phoneError = validatePhone(formData.phone);
        if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

        // Validate personal ID
        const personalIdError = validatePersonalId(formData.personalId);
        if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });

        // Validate Job Title
        if (!formData.jobTitle.trim()) {
            validationErrors.push({ field: 'jobTitle', message: 'Job title is required' });
        }

        // Validate passwords
        const passwordError = validatePassword(formData.password);
        if (passwordError) validationErrors.push({ field: 'password', message: passwordError });

        const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
        if (confirmPasswordError) validationErrors.push({ field: 'confirmPassword', message: confirmPasswordError });

        // Validate Company Key
        if (!formData.companyKey.trim()) {
            validationErrors.push({ field: 'companyKey', message: 'Company ID is required' });
        }

        setErrors(validationErrors);

        if (validationErrors.length > 0) {
            showErrorPopup(validationErrors[0].message, 'error');
        }

        return validationErrors.length === 0;
    };

    // Use effect for redirection to ensure it handles component lifecycle correctly
    React.useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => {
                navigate('/login', { replace: true });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setErrors([]);

        try {
            console.log('Starting employer registration...');

            const result = await registerEmployer({
                email: formData.email,
                password: formData.password,
                fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
                phone: formData.phone,
                personalId: formData.personalId,
                jobTitle: formData.jobTitle,
                companyKey: formData.companyKey
            });

            console.log('Registration result:', result);

            if (!result.success || result.error) {
                if (result.error?.validationErrors) {
                    setErrors(result.error.validationErrors);
                    showErrorPopup(result.error.validationErrors[0]?.message || 'Registration failed', 'error');
                } else {
                    const errorMessage = result.error?.message || 'Registration failed';
                    setErrors([{ field: 'root', message: errorMessage }]);
                    showErrorPopup(errorMessage, 'error');
                }
                setLoading(false);
                return;
            }

            console.log('Registration successful, showing success message...');
            showErrorPopup('Registration successful! Redirecting...', 'success');
            setShowSuccess(true);
            // Redirection is now handled by useEffect

        } catch (error: any) {
            console.error('Unexpected registration error:', error);
            const errorMessage = 'An unexpected error occurred. Please try again.';
            setErrors([{
                field: 'general',
                message: errorMessage
            }]);
            showErrorPopup(errorMessage, 'error');
            setShowSuccess(false);
        } finally {
            if (!showSuccess) {
                setLoading(false);
            }
        }
    };

    const getFieldError = (field: string) => {
        return errors.find(error => error.field === field)?.message;
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
                <AnimatePresence>
                    {errorPopup && (
                        <ErrorPopup
                            message={errorPopup.message}
                            type={errorPopup.type}
                            onClose={closeErrorPopup}
                        />
                    )}
                </AnimatePresence>

                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                    style={{
                        backgroundImage: 'url("/images/careercenter.png")',
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-60"></div>
                </div>
                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100 dark:border-gray-700 transition-colors duration-300"
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                            className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
                        >
                            Registration Successful!
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-gray-600 dark:text-gray-300 mb-4"
                        >
                            Your employer account has been created successfully.
                        </motion.p>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-sm text-gray-500 dark:text-gray-400"
                        >
                            Redirecting to login...
                        </motion.p>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
            <AnimatePresence>
                {errorPopup && (
                    <ErrorPopup
                        message={errorPopup.message}
                        type={errorPopup.type}
                        onClose={closeErrorPopup}
                    />
                )}
            </AnimatePresence>

            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                style={{
                    backgroundImage: 'url("/images/careercenter.png")',
                }}
            >
                <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-60"></div>
            </div>


            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-red-100 dark:border-gray-700 transition-colors duration-300 relative"
                >
                    {/* Back Button */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/login')}
                        className="absolute top-4 left-4 z-20 flex items-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2 hover:px-4 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-300 shadow-sm group"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300">Back</span>
                    </motion.button>

                    {/* Header */}
                    <div className="text-center mb-8 pt-10 md:pt-0">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                            className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <Building2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
                        >
                            Employer Registration
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-gray-600 dark:text-gray-300"
                        >
                            Create your employer account for ASU Employment Fair
                        </motion.p>
                    </div>

                    {/* General Error */}
                    <AnimatePresence>
                        {(getFieldError('general') || getFieldError('root')) && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg"
                            >
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                                    <p className="text-red-800 dark:text-red-200 text-sm">
                                        {getFieldError('general') || getFieldError('root')}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
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
                                <AnimatePresence>
                                    {getFieldError('firstName') && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="mt-1 text-sm text-red-600"
                                        >
                                            {getFieldError('firstName')}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45 }}
                            >
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
                                <AnimatePresence>
                                    {getFieldError('lastName') && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="mt-1 text-sm text-red-600"
                                        >
                                            {getFieldError('lastName')}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>

                        {/* Phone & Personal ID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => updateField('phone', e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('phone') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="01XXXXXXXXX"
                                    />
                                </div>
                                <AnimatePresence>
                                    {getFieldError('phone') && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="mt-1 text-sm text-red-600"
                                        >
                                            {getFieldError('phone')}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55 }}
                            >
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Personal ID (National ID) *
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.personalId}
                                        onChange={(e) => updateField('personalId', e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('personalId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="14 digit ID"
                                    />
                                </div>
                                <AnimatePresence>
                                    {getFieldError('personalId') && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="mt-1 text-sm text-red-600"
                                        >
                                            {getFieldError('personalId')}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>

                        {/* Email Field */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
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
                            <AnimatePresence>
                                {getFieldError('email') && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="mt-1 text-sm text-red-600"
                                    >
                                        {getFieldError('email')}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Job Title */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                        >
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Job Title *
                            </label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.jobTitle}
                                    onChange={(e) => updateField('jobTitle', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('jobTitle') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    placeholder="e.g. HR Manager"
                                />
                            </div>
                            <AnimatePresence>
                                {getFieldError('jobTitle') && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="mt-1 text-sm text-red-600"
                                    >
                                        {getFieldError('jobTitle')}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </motion.div>


                        {/* Company Key Field */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Company ID *
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.companyKey}
                                    onChange={(e) => updateField('companyKey', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('companyKey') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                    placeholder="Enter your Company ID"
                                />
                            </div>
                            <AnimatePresence>
                                {getFieldError('companyKey') && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="mt-1 text-sm text-red-600"
                                    >
                                        {getFieldError('companyKey')}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.75 }}
                                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                            >
                                This ID will be provided by the event organizers
                            </motion.p>
                        </motion.div>

                        {/* Password Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                            >
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => updateField('password', e.target.value)}
                                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('password') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="Create a password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {getFieldError('password') && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="mt-1 text-sm text-red-600"
                                        >
                                            {getFieldError('password')}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.85 }}
                            >
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('confirmPassword') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        placeholder="Confirm your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {getFieldError('confirmPassword') && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="mt-1 text-sm text-red-600"
                                        >
                                            {getFieldError('confirmPassword')}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Creating Account...
                                </span>
                            ) : (
                                'Create Employer Account'
                            )}
                        </motion.button>
                    </form>

                    {/* Footer Links */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.95 }}
                        className="mt-6 text-center"
                    >
                        <p className="text-gray-600 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default EmployerRegistration;