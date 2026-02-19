// components/UnifiedAttendeeRegistration.tsx
// Merges AuthRegistration + RegistrationForm into one unified, step-based component
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, GraduationCap, ChevronRight, CheckCircle, AlertCircle, FileText, X, Mail, Lock, UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RegistrationData, ValidationError, FileUpload as FileUploadType } from '../types';
import { FACULTIES, CLASS_YEARS, HOW_DID_YOU_HEAR_OPTIONS, UNIVERSITIES } from '../utils/constants';
import { validatePhone, validatePersonalId, validateVolunteerId, validateEmail, validatePassword, validateConfirmPassword, validateName } from '../utils/validation';
import { registerAttendee } from '../lib/supabase';

const ErrorPopup: React.FC<{
    message: string;
    onClose: () => void;
    type?: 'error' | 'warning' | 'success';
}> = ({ message, onClose, type = 'error' }) => {
    useEffect(() => {
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

const FileUpload: React.FC<{
    accept: string;
    maxSize: number;
    onFileSelect: (file: File) => void;
    onFileRemove: () => void;
    label: string;
    currentFile?: File;
    required?: boolean;
    error?: string;
}> = ({ accept, maxSize, onFileSelect, onFileRemove, label, currentFile, required = false, error }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > maxSize) {
                alert(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
                return;
            }
            onFileSelect(file);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
        >
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${error
                ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                : currentFile
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700'
                }`}>
                {currentFile ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring" }}
                        className="flex items-center justify-center space-x-3"
                    >
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{currentFile.name}</span>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={onFileRemove}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
                        >
                            Remove
                        </motion.button>
                    </motion.div>
                ) : (
                    <div>
                        <input
                            type="file"
                            accept={accept}
                            onChange={handleFileChange}
                            className="hidden"
                            id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
                        />
                        <label
                            htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
                            className="cursor-pointer text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors duration-200"
                        >
                            {label} {required ? '*' : '(Optional)'}
                        </label>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export const UnifiedAttendeeRegistration: React.FC = () => {
    const navigate = useNavigate();

    // Step 0 = Auth check, Steps 1-4 = Registration form
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<RegistrationData>({
        firstName: '',
        lastName: '',
        gender: '',
        nationality: '',
        email: '',
        phone: '',
        personalId: '',
        university: '',
        customUniversity: '',
        faculty: '',
        degreeLevel: '',
        program: '',
        classYear: '',
        howDidYouHear: '',
        volunteerId: '',
        password: '',
        confirmPassword: ''
    });

    const [fileUploads, setFileUploads] = useState<FileUploadType>({});
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorPopup, setErrorPopup] = useState<{ message: string; type?: 'error' | 'warning' | 'success' } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const sectionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const steps = [
        { id: 0, title: 'Create Account', icon: UserPlus },
        { id: 1, title: 'Personal Info', icon: User },
        { id: 2, title: 'Academic Info', icon: GraduationCap },
        { id: 3, title: 'Event & Documents', icon: FileText }
    ];



    const showErrorPopup = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
        setErrorPopup({ message, type });
    }, []);

    const closeErrorPopup = useCallback(() => {
        setErrorPopup(null);
    }, []);

    // Save form data to localStorage
    useEffect(() => {
        localStorage.setItem('unifiedRegistrationFormData', JSON.stringify(formData));
    }, [formData]);

    // Load saved form data on mount
    useEffect(() => {
        const savedData = localStorage.getItem('unifiedRegistrationFormData');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setFormData(parsed);
            } catch (error) {
                console.error('Failed to load saved form data:', error);
            }
        }
    }, []);

    const updateField = useCallback((field: keyof RegistrationData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => prev.filter(error => error.field !== field));
    }, []);

    const validateStep = async (step: number): Promise<ValidationError[]> => {
        const validationErrors: ValidationError[] = [];

        if (step === 0) {
            // Step 0: Account creation (first name, last name, email, password)
            const firstNameError = validateName(formData.firstName, 'First name');
            if (firstNameError) validationErrors.push({ field: 'firstName', message: firstNameError });

            const lastNameError = validateName(formData.lastName, 'Last name');
            if (lastNameError) validationErrors.push({ field: 'lastName', message: lastNameError });

            const emailError = validateEmail(formData.email);
            if (emailError) validationErrors.push({ field: 'email', message: emailError });

            const passwordError = validatePassword(formData.password);
            if (passwordError) validationErrors.push({ field: 'password', message: passwordError });

            const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
            if (confirmPasswordError) validationErrors.push({ field: 'confirmPassword', message: confirmPasswordError });
        }

        if (step === 1) {
            // Step 1: Personal Info
            if (!formData.gender) validationErrors.push({ field: 'gender', message: 'Gender is required' });
            if (!formData.nationality) validationErrors.push({ field: 'nationality', message: 'Nationality is required' });

            const phoneError = validatePhone(formData.phone);
            if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

            if (formData.nationality?.toLowerCase() === 'egyptian') {
                const personalIdError = validatePersonalId(formData.personalId);
                if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });
            } else {
                if (!formData.personalId || !formData.personalId.trim()) {
                    validationErrors.push({ field: 'personalId', message: 'Personal ID / Passport number is required' });
                }
            }
        }

        if (step === 2) {
            // Step 2: Academic Info
            if (!formData.university) validationErrors.push({ field: 'university', message: 'University is required' });
            if (formData.university === 'Other' && !formData.customUniversity) {
                validationErrors.push({ field: 'customUniversity', message: 'Please specify your university' });
            }
            if (!formData.faculty) validationErrors.push({ field: 'faculty', message: 'Faculty is required' });
            if (!formData.degreeLevel) validationErrors.push({ field: 'degreeLevel', message: 'Degree level is required' });
            if (!formData.program) validationErrors.push({ field: 'program', message: 'Program/Major is required' });
            if (formData.degreeLevel === 'student' && !formData.classYear) {
                validationErrors.push({ field: 'classYear', message: 'Class year is required for students' });
            }
        }

        if (step === 3) {
            // Step 3: Event & Documents
            if (!formData.howDidYouHear) validationErrors.push({ field: 'howDidYouHear', message: 'This field is required' });

            if (formData.volunteerId && formData.volunteerId.trim()) {
                const volunteerIdError = validateVolunteerId(formData.volunteerId);
                if (volunteerIdError) {
                    validationErrors.push({ field: 'volunteerId', message: volunteerIdError });
                }
            }

            if (!fileUploads.universityId) {
                validationErrors.push({ field: 'universityId', message: 'Enrollment proof is required' });
            }
        }

        return validationErrors;
    };

    const nextStep = async () => {
        if (sectionChangeTimeoutRef.current) {
            clearTimeout(sectionChangeTimeoutRef.current);
        }

        const stepErrors = await validateStep(currentStep);
        if (stepErrors.length > 0) {
            setErrors(stepErrors);
            if (stepErrors.length > 0) {
                showErrorPopup(stepErrors[0].message, 'error');
            }
            return;
        }

        setErrors([]);

        sectionChangeTimeoutRef.current = setTimeout(() => {
            if (currentStep < steps.length) {
                setCurrentStep(currentStep + 1);
            }
        }, 100);
    };

    const prevStep = () => {
        if (sectionChangeTimeoutRef.current) {
            clearTimeout(sectionChangeTimeoutRef.current);
        }

        sectionChangeTimeoutRef.current = setTimeout(() => {
            if (currentStep > 0) {
                setCurrentStep(currentStep - 1);
            } else {
                // If at step 0, go back using browser history
                navigate('/login');
            }
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) return;

        // Validate all steps
        const allErrors = await Promise.all([0, 1, 2, 3].map(step => validateStep(step)))
            .then(errorArrays => errorArrays.flat());

        if (allErrors.length > 0) {
            setErrors(allErrors);
            if (allErrors.length > 0) {
                showErrorPopup(allErrors[0].message, 'error');
            }

            const stepMap: Record<string, number> = {
                firstName: 0, lastName: 0, email: 0, password: 0, confirmPassword: 0,
                gender: 1, nationality: 1, phone: 1, personalId: 1,
                university: 2, faculty: 2, degreeLevel: 2, program: 2, classYear: 2, customUniversity: 2,
                howDidYouHear: 3, volunteerId: 3, universityId: 3
            };

            const firstErrorStep = Math.min(
                ...allErrors.map(error => stepMap[error.field] ?? 0)
            );
            setCurrentStep(firstErrorStep);
            return;
        }

        setLoading(true);
        setErrors([]);

        try {
            // Determine final university value (handle "Other" case)
            const finalUniversity = formData.university === 'Other'
                ? (formData.customUniversity || '').trim()
                : formData.university;

            // Prepare registration payload
            const registrationPayload = {
                email: formData.email.trim(),
                password: formData.password,
                fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
                phone: formData.phone.trim(),
                personalId: formData.personalId.trim(),
                gender: formData.gender,
                nationality: formData.nationality,
                university: finalUniversity,
                faculty: formData.faculty,
                degreeLevel: formData.degreeLevel,
                department: formData.program,
                classYear: formData.classYear || undefined,
                cvFile: fileUploads.resume,
                enrollmentProofFile: fileUploads.universityId,
                volunteerId: formData.volunteerId // Pass volunteer ID
            };

            // Call registration function
            const result = await registerAttendee(registrationPayload);

            if (!result.success) {
                // Handle validation errors
                if (result.error?.validationErrors && result.error.validationErrors.length > 0) {
                    setErrors(result.error.validationErrors);
                    showErrorPopup(result.error.validationErrors[0].message, 'error');
                } else {
                    showErrorPopup(result.error?.message || 'Registration failed', 'error');
                }

                setLoading(false);
                return;
            }

            // Check for warnings (file upload issues are non-critical)
            if (result.error?.validationErrors) {
                const hasFileWarnings = result.error.validationErrors.some(e => e.field === 'files');
                if (hasFileWarnings) {
                    console.warn('⚠️ Registration succeeded with file warnings:', result.error.message);
                }
            }

            // Store user info in localStorage
            const userData = {
                ...result.data?.user,
                profile: result.data?.profile,
                role: 'attendee'
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));

            // Clear form cache
            localStorage.removeItem('unifiedRegistrationFormData');

            // Show success and redirect
            showErrorPopup('Registration successful! Redirecting...', 'success');

            setTimeout(() => {
                navigate('/attendee', { replace: true });
            }, 1500);

        } catch (error: unknown) {
            console.error("💥 Registration exception:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : "An unexpected error occurred. Please try again.";
            showErrorPopup(errorMessage, 'error');
            setLoading(false);
        }
    };

    const getFieldError = (field: string) => {
        return errors.find(error => error.field === field)?.message;
    };

    // Step 0: Account Creation
    const renderAccountCreation = () => (
        <motion.div
            key="account-creation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
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
                            placeholder="Enter your first name"
                        />
                    </div>
                    {getFieldError('firstName') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('firstName')}
                        </motion.p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
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
                            placeholder="Enter your last name"
                        />
                    </div>
                    {getFieldError('lastName') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('lastName')}
                        </motion.p>
                    )}
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
                        placeholder="Enter your email address"
                    />
                </div>
                {getFieldError('email') && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-sm text-red-600"
                    >
                        {getFieldError('email')}
                    </motion.p>
                )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
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
                    {getFieldError('password') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('password')}
                        </motion.p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
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
                    {getFieldError('confirmPassword') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('confirmPassword')}
                        </motion.p>
                    )}
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
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
        </motion.div>
    );

    // Step 1: Personal Info (from RegistrationForm)
    const renderPersonalInfo = () => (
        <motion.div
            key="personal-info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Gender *
                    </label>
                    <select
                        value={formData.gender}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('gender') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                    >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                    {getFieldError('gender') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('gender')}
                        </motion.p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nationality *
                    </label>
                    <select
                        value={formData.nationality}
                        onChange={(e) => updateField('nationality', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('nationality') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                    >
                        <option value="">Select nationality</option>
                        <option value="egyptian">Egyptian</option>
                        <option value="other">Other</option>
                    </select>
                    {getFieldError('nationality') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('nationality')}
                        </motion.p>
                    )}
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number *
                    </label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('phone') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        placeholder="e.g., 01012345678"
                    />
                    {getFieldError('phone') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('phone')}
                        </motion.p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        National ID / Passport *
                    </label>
                    <input
                        type="text"
                        value={formData.personalId}
                        onChange={(e) => updateField('personalId', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('personalId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        placeholder="Enter your National ID or Passport number"
                    />
                    {getFieldError('personalId') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('personalId')}
                        </motion.p>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );

    // Rest of the component continues in next file segment...

    // Step 2: Academic Info (from RegistrationForm)
    const renderAcademicInfo = () => (
        <motion.div
            key="academic-info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    University *
                </label>
                <select
                    value={formData.university}
                    onChange={(e) => updateField('university', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('university') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                        }`}
                >
                    <option value="">Select university</option>
                    {UNIVERSITIES.map(uni => (
                        <option key={uni} value={uni}>{uni}</option>
                    ))}
                </select>
                {getFieldError('university') && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-sm text-red-600"
                    >
                        {getFieldError('university')}
                    </motion.p>
                )}
            </motion.div>

            {formData.university === 'Other' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Custom University Name *
                    </label>
                    <input
                        type="text"
                        value={formData.customUniversity}
                        onChange={(e) => updateField('customUniversity', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('customUniversity') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        placeholder="Enter your university name"
                    />
                    {getFieldError('customUniversity') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('customUniversity')}
                        </motion.p>
                    )}
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Faculty *
                </label>
                <select
                    value={formData.faculty}
                    onChange={(e) => updateField('faculty', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('faculty') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                        }`}
                >
                    <option value="">Select faculty</option>
                    {FACULTIES.map(faculty => (
                        <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                </select>
                {getFieldError('faculty') && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-sm text-red-600"
                    >
                        {getFieldError('faculty')}
                    </motion.p>
                )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Degree Level *
                    </label>
                    <select
                        value={formData.degreeLevel}
                        onChange={(e) => updateField('degreeLevel', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('degreeLevel') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                    >
                        <option value="">Select degree level</option>
                        <option value="student">Student</option>
                        <option value="graduate">Graduate</option>
                    </select>
                    {getFieldError('degreeLevel') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('degreeLevel')}
                        </motion.p>
                    )}
                </motion.div>

                {formData.degreeLevel === 'student' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Class Year *
                        </label>
                        <select
                            value={formData.classYear}
                            onChange={(e) => updateField('classYear', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('classYear') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                }`}
                        >
                            <option value="">Select class year</option>
                            {CLASS_YEARS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        {getFieldError('classYear') && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-1 text-sm text-red-600"
                            >
                                {getFieldError('classYear')}
                            </motion.p>
                        )}
                    </motion.div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Program/Major *
                </label>
                <input
                    type="text"
                    value={formData.program}
                    onChange={(e) => updateField('program', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('program') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    placeholder="Enter your program or major"
                />
                {getFieldError('program') && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-sm text-red-600"
                    >
                        {getFieldError('program')}
                    </motion.p>
                )}
            </motion.div>
        </motion.div>
    );

    // Step 3: Event & Documents (from RegistrationForm)
    const renderEventInfo = () => (
        <motion.div
            key="event-info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    How did you hear about us? *
                </label>
                <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                        value={formData.howDidYouHear}
                        onChange={(e) => updateField('howDidYouHear', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 appearance-none bg-white dark:bg-gray-700 dark:text-white ${getFieldError('howDidYouHear') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                    >
                        <option value="">Select an option</option>
                        {HOW_DID_YOU_HEAR_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 rotate-90" />
                </div>
                {getFieldError('howDidYouHear') && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-sm text-red-600"
                    >
                        {getFieldError('howDidYouHear')}
                    </motion.p>
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Referral Code (Volunteer ID)
                </label>
                <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={formData.volunteerId}
                        onChange={(e) => updateField('volunteerId', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('volunteerId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        placeholder="Enter Volunteer ID (Optional)"
                    />
                </div>
                {getFieldError('volunteerId') && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-sm text-red-600"
                    >
                        {getFieldError('volunteerId')}
                    </motion.p>
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Required Documents</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Enrollment Proof <br />
                        <span className="text-gray-500 font-normal">(University ID, Graduation Certificate, UMS screenshot with full name and grades) *</span>
                    </label>

                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Be sure to upload valid enrollment proof, if not you will be directed to payment link
                        </p>
                    </div>

                    <FileUpload
                        accept=".jpg,.jpeg,.png,.pdf"
                        maxSize={10 * 1024 * 1024}
                        onFileSelect={(file) => {
                            setFileUploads(prev => ({ ...prev, universityId: file }));
                            setErrors(prev => prev.filter(error => error.field !== 'universityId'));
                        }}
                        onFileRemove={() => setFileUploads(prev => ({ ...prev, universityId: undefined }))}
                        label="Upload Enrollment Proof (JPG, PNG, PDF - Max 10MB)"
                        currentFile={fileUploads.universityId}
                        required={true}
                        error={getFieldError('universityId')}
                    />
                    {getFieldError('universityId') && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 text-sm text-red-600"
                        >
                            {getFieldError('universityId')}
                        </motion.p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        CV/Resume (Optional)
                    </label>
                    <FileUpload
                        accept=".pdf,.doc,.docx"
                        maxSize={10 * 1024 * 1024}
                        onFileSelect={(file) => {
                            setFileUploads(prev => ({ ...prev, resume: file }));
                            setErrors(prev => prev.filter(error => error.field !== 'resume'));
                        }}
                        onFileRemove={() => setFileUploads(prev => ({ ...prev, resume: undefined }))}
                        label="Upload CV/Resume (PDF, DOC, DOCX - Max 10MB)"
                        currentFile={fileUploads.resume}
                        required={false}
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                >
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-blue-800 dark:text-blue-200 text-sm">
                                <strong>Note:</strong> Enrollment proof is required. CV/Resume is optional and can be uploaded later if needed.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderAccountCreation();
            case 1:
                return renderPersonalInfo();
            case 2:
                return renderAcademicInfo();
            case 3:
                return renderEventInfo();
            default:
                return null;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sectionChangeTimeoutRef.current) {
                clearTimeout(sectionChangeTimeoutRef.current);
            }
        };
    }, []);

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

            <div className="relative z-10 min-h-screen flex items-center justify-center py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-red-100 dark:border-gray-700 transition-colors duration-300 relative"
                    >
                        {/* Back Button */}
                        <motion.button
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={prevStep}
                            className="absolute top-4 left-4 z-20 flex items-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2 hover:px-4 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-300 shadow-sm group"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300">Back</span>
                        </motion.button>

                        {/* Step Progress */}
                        <div className="mb-8 pt-10 md:pt-0">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <GraduationCap className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center"
                            >
                                Attendee Registration
                            </motion.h1>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center justify-center mb-4"
                            >
                                {steps.map((step, index) => (
                                    <React.Fragment key={step.id}>
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.4 + index * 0.1 }}
                                            className="flex flex-col items-center"
                                        >
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${currentStep >= step.id
                                                ? 'bg-red-500 border-red-500 text-white'
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                                                }`}>
                                                <step.icon className="w-5 h-5" />
                                            </div>
                                        </motion.div>
                                        {index < steps.length - 1 && (
                                            <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ delay: 0.5 + index * 0.1 }}
                                                className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${currentStep > step.id ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-center"
                            >
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
                                </p>
                            </motion.div>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {renderStepContent()}
                            </AnimatePresence>

                            {/* Navigation Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700"
                            >
                                {currentStep < steps.length - 1 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={nextStep}
                                        disabled={loading}
                                        className="ml-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={loading}
                                        className="ml-auto px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Creating Account...
                                            </>
                                        ) : (
                                            'Complete Registration'
                                        )}
                                    </motion.button>
                                )}
                            </motion.div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};