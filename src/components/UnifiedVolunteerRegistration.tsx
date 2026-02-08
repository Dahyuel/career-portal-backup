// components/UnifiedVolunteerRegistration.tsx
// Unified volunteer registration merging auth check + full registration
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ChevronRight, CheckCircle, AlertCircle, Users, X, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ValidationError } from '../types';

import {
    validateName,
    validatePhone,
    validatePersonalId,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
} from '../utils/validation';
import { registerVolunteer } from '../lib/supabase';
// ErrorPopup component
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
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
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
                    <button
                        onClick={onClose}
                        className={`flex-shrink-0 hover:opacity-70 transition-opacity ${styles.button}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Team data provided by user
const VOLUNTEER_TEAMS = [
    { "idx": 0, "id": "394b8631-7948-49f1-87ba-bc7e3ead12b9", "team_name": "Feedback" },
    { "idx": 1, "id": "481237b5-45ef-463f-8460-b6f848835756", "team_name": "Stage" },
    { "idx": 2, "id": "587e30ea-20b2-4292-81fe-02945f6d2a3f", "team_name": "Marketing" },
    { "idx": 3, "id": "8052492b-55bb-46d0-ab4c-52a6df81c4c9", "team_name": "Media" },
    { "idx": 4, "id": "9269ac6a-7b2c-4be5-ab72-3f8278eb8e33", "team_name": "Info Desk" },
    { "idx": 5, "id": "97ab5a37-557e-4a81-ae81-9dcc6bbae87a", "team_name": "Usher" },
    { "idx": 6, "id": "a0abd4b7-7879-4a07-806d-fd0e2f4257f1", "team_name": "Verification" },
    { "idx": 7, "id": "ae0e251c-81f5-4763-a9db-39ca511fd03c", "team_name": "Catering" },
    { "idx": 8, "id": "be96f64f-6674-421d-84f3-791a27bd4121", "team_name": "ER" },
    { "idx": 9, "id": "f9419a07-f974-4f59-bba2-b2f9a2b2fa7f", "team_name": "Building" },
    { "idx": 10, "id": "fc15e3bb-ceed-4aa3-acf5-004a7af664ed", "team_name": "Registration" }
];

interface VolunteerFormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    personalId: string;

    teamId: string;
    gender: string;
}

const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
];

const sections = [
    { id: 1, title: 'Account Info', icon: UserPlus },
    { id: 2, title: 'Personal Info', icon: User },
    { id: 3, title: 'Team Selection', icon: Users } // Changed icon to Users
];

export const UnifiedVolunteerRegistration: React.FC = () => {
    const navigate = useNavigate();
    const [currentSection, setCurrentSection] = useState(1);
    const [formData, setFormData] = useState<VolunteerFormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        personalId: '',

        teamId: '',
        gender: ''
    });

    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    // Success view state
    const [successData, setSuccessData] = useState<{ firstName: string } | null>(null);

    const [errorPopup, setErrorPopup] = useState<{ message: string; type?: 'error' | 'warning' | 'success' } | null>(null);

    const sectionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const totalSections = sections.length;

    // Error popup handlers
    const showErrorPopup = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
        setErrorPopup({ message, type });
    }, []);

    const closeErrorPopup = useCallback(() => {
        setErrorPopup(null);
    }, []);

    const updateField = useCallback((field: keyof VolunteerFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => prev.filter(error => error.field !== field));
    }, []);

    const validateGender = (gender: string): string | null => {
        if (!gender || !gender.trim()) {
            return 'Gender is required';
        }

        const validGenders = ['male', 'female'];
        if (!validGenders.includes(gender.trim().toLowerCase())) {
            return 'Please select a valid gender';
        }

        return null;
    };

    const validateSection = (section: number): ValidationError[] => {
        const validationErrors: ValidationError[] = [];

        if (section === 1) {
            // Account Info validation
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

        if (section === 2) {
            // Personal Info validation
            const phoneError = validatePhone(formData.phone);
            if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

            const personalIdError = validatePersonalId(formData.personalId);
            if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });



            const genderError = validateGender(formData.gender);
            if (genderError) validationErrors.push({ field: 'gender', message: genderError });
        }

        if (section === 3) {
            // Team Selection validation
            if (!formData.teamId) {
                validationErrors.push({ field: 'teamId', message: 'Please select a team' });
            }
        }

        return validationErrors;
    };

    const handleFormKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && currentSection < totalSections) {
            e.preventDefault();
            nextSection();
        }
    };

    const nextSection = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const sectionErrors = validateSection(currentSection);
        if (sectionErrors.length > 0) {
            setErrors(sectionErrors);
            if (sectionErrors.length > 0) {
                showErrorPopup(sectionErrors[0].message, 'error');
            }
            return;
        }

        setErrors([]);
        if (currentSection < totalSections) {
            setCurrentSection(currentSection + 1);
        }
    };

    const prevSection = () => {
        if (sectionChangeTimeoutRef.current) {
            clearTimeout(sectionChangeTimeoutRef.current);
        }

        sectionChangeTimeoutRef.current = setTimeout(() => {
            if (currentSection > 1) {
                setCurrentSection(currentSection - 1);
            } else {
                // At first step, go back using browser history or navigate home
                navigate('/login');
            }
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading) return;

        // Validate all sections
        const allErrors = [1, 2, 3].flatMap(section => validateSection(section));

        if (allErrors.length > 0) {
            setErrors(allErrors);
            if (allErrors.length > 0) {
                showErrorPopup(allErrors[0].message, 'error');
            }

            // Navigate to first section with errors
            const firstErrorField = allErrors[0].field;
            let targetSection = 1;

            if (['firstName', 'lastName', 'email', 'password', 'confirmPassword'].includes(firstErrorField)) targetSection = 1;
            else if (['phone', 'personalId', 'gender'].includes(firstErrorField)) targetSection = 2;
            else targetSection = 3;

            setCurrentSection(targetSection);
            return;
        }

        setLoading(true);
        setErrors([]);

        try {
            // Call Supabase registration
            const result = await registerVolunteer({
                email: formData.email.trim(),
                password: formData.password,
                fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
                phone: formData.phone.trim(),
                personalId: formData.personalId.trim(),

                gender: formData.gender.trim(),
                teamId: formData.teamId
            });

            if (!result.success) {
                // Handle validation errors from Supabase
                if (result.error?.validationErrors && result.error.validationErrors.length > 0) {
                    setErrors(result.error.validationErrors);
                    showErrorPopup(result.error.validationErrors[0].message, 'error');
                } else {
                    showErrorPopup(result.error?.message || 'Registration failed', 'error');
                }
                setLoading(false);
                return;
            }

            // Success handling
            setSuccessData({ firstName: formData.firstName });

            // Log user in automatically logic handled by registerVolunteer usually returning session?
            // Actually registerVolunteer returns AuthResult which might have user/session.
            // If email confirmation is off, they might be logged in. 
            // In the previous code, we cached user info in localStorage.

            // Determine role based on team ID for local storage
            let assignedRole = 'volunteer';
            if (formData.teamId === 'f9419a07-f974-4f59-bba2-b2f9a2b2fa7f') assignedRole = 'building';
            else if (formData.teamId === 'fc15e3bb-ceed-4aa3-acf5-004a7af664ed') assignedRole = 'registration';
            else if (formData.teamId === '9269ac6a-7b2c-4be5-ab72-3f8278eb8e33') assignedRole = 'info_desk';
            else if (formData.teamId === 'a0abd4b7-7879-4a07-806d-fd0e2f4257f1') assignedRole = 'verification';

            const volunteerData = {
                id: result.data?.user?.id,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                role: assignedRole,
                volunteerId: result.data?.volunteer?.volunteer_id,
                teamId: formData.teamId
            };
            localStorage.setItem('currentUser', JSON.stringify(volunteerData));

            console.log('✅ Volunteer registration complete:', result.data);

            setLoading(false);
            setShowSuccess(true);

            // Redirect to appropriate dashboard based on team
            let redirectPath = '/volunteer';
            if (formData.teamId === 'f9419a07-f974-4f59-bba2-b2f9a2b2fa7f') redirectPath = '/buildteam';
            else if (formData.teamId === 'fc15e3bb-ceed-4aa3-acf5-004a7af664ed') redirectPath = '/registration';
            else if (formData.teamId === '9269ac6a-7b2c-4be5-ab72-3f8278eb8e33') redirectPath = '/info-desk';
            else if (formData.teamId === 'a0abd4b7-7879-4a07-806d-fd0e2f4257f1') redirectPath = '/verification';

            setTimeout(() => {
                navigate(redirectPath, { replace: true });
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            showErrorPopup('An error occurred during registration', 'error');
            setLoading(false);
        }
    };

    const getFieldError = (field: string) => {
        return errors.find(error => error.field === field)?.message;
    };

    const renderAccountInfo = () => (
        <div className="space-y-6 stagger-children">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="fade-in-blur">
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
                        <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('firstName')}</p>
                    )}
                </div>

                <div className="fade-in-blur">
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
                        <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('lastName')}</p>
                    )}
                </div>
            </div>

            <div className="fade-in-blur">
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
                    <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('email')}</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="fade-in-blur">
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
                        <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('password')}</p>
                    )}
                </div>

                <div className="fade-in-blur">
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
                        <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('confirmPassword')}</p>
                    )}
                </div>
            </div>
        </div>
    );

    const renderPersonalInfo = () => (
        <div className="space-y-6 stagger-children">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="fade-in-blur">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number *
                    </label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('phone') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        placeholder="01X-XXXXXXXX"
                    />
                    {getFieldError('phone') && (
                        <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('phone')}</p>
                    )}
                </div>

                <div className="fade-in-blur">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Personal ID *
                    </label>
                    <input
                        type="text"
                        value={formData.personalId}
                        onChange={(e) => updateField('personalId', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('personalId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        placeholder="14-digit Egyptian ID"
                        maxLength={14}
                    />
                    {getFieldError('personalId') && (
                        <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('personalId')}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                <div className="fade-in-blur">
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
                        {genderOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    {getFieldError('gender') && (
                        <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('gender')}</p>
                    )}
                </div>
            </div>
        </div>
    );

    const renderRoleSelection = () => (
        <div className="space-y-6 stagger-children">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 fade-in-blur">
                <div className="flex items-center mb-4">
                    <Users className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Team Selection</h3>
                </div>
                <p className="text-red-800 dark:text-red-300">
                    Please select the team you would like to join. This helps us assign you to the most suitable position.
                </p>
            </div>

            <div className="fade-in-blur">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Preferred Team *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {VOLUNTEER_TEAMS.map((team) => (
                        <div
                            key={team.id}
                            className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all duration-300 ${formData.teamId === team.id
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/30 transform scale-[1.02] ring-2 ring-red-500'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 smooth-hover'
                                }`}
                            onClick={() => updateField('teamId', team.id)}
                        >
                            <input
                                type="radio"
                                name="teamId"
                                value={team.id}
                                checked={formData.teamId === team.id}
                                onChange={(e) => updateField('teamId', e.target.value)}
                                className="sr-only"
                            />
                            <div className="flex w-full items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-900 dark:text-white">{team.team_name} Team</span>
                                </div>
                                <div className={`flex-shrink-0 transition-colors duration-300 ${formData.teamId === team.id ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-500'
                                    }`}>
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {getFieldError('teamId') && (
                    <p className="mt-2 text-sm text-red-600 fade-in-blur">{getFieldError('teamId')}</p>
                )}
            </div>
        </div>
    );

    const renderSectionContent = () => {
        switch (currentSection) {
            case 1:
                return renderAccountInfo();
            case 2:
                return renderPersonalInfo();
            case 3:
                return renderRoleSelection();
            default:
                return null;
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100 dark:border-gray-700 fade-in-scale modal-content-blur transition-colors duration-300">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 fade-in-scale">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 fade-in-blur">Registration Complete!</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 fade-in-blur">
                        Welcome, {successData?.firstName}! Your volunteer registration has been submitted successfully.
                    </p>
                    <div className="animate-pulse">
                        <p className="text-red-600 dark:text-red-400 font-medium">Redirecting to volunteer dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
            {/* Error Popup */}
            {errorPopup && (
                <ErrorPopup
                    message={errorPopup.message}
                    type={errorPopup.type}
                    onClose={closeErrorPopup}
                />
            )}

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
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-red-100 dark:border-gray-700 fade-in-up-blur modal-content-blur transition-colors duration-300">
                        {/* Back Button */}
                        <button
                            onClick={prevSection}
                            className="absolute top-4 left-4 z-20 flex items-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-2 hover:px-4 hover:bg-red-100 dark:hover:bg-red-900/50 hover:scale-105 transition-all duration-300 shadow-sm group"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-300">Back</span>
                        </button>

                        {/* Step Progress */}
                        <div className="mb-8 pt-10 md:pt-0">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                                Volunteer Registration
                            </h1>
                            <div className="flex items-center justify-center mb-4">
                                {sections.map((section, index) => (
                                    <React.Fragment key={section.id}>
                                        <div className="flex flex-col items-center">
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${currentSection >= section.id
                                                ? 'bg-red-500 border-red-500 text-white transform scale-110'
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                                                }`}>
                                                <section.icon className="w-5 h-5" />
                                            </div>
                                        </div>
                                        {index < sections.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${currentSection > section.id ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                                                }`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Step {currentSection} of {sections.length}: {sections[currentSection - 1].title}
                                </p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
                            <div className="mb-8 fade-in-blur">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {sections[currentSection - 1].title}
                                </h2>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${(currentSection / totalSections) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="stagger-children">
                                {renderSectionContent()}
                            </div>

                            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 fade-in-up-blur">
                                <button
                                    type="button"
                                    onClick={prevSection}
                                    className={`px-6 py-2.5 rounded-lg border font-medium transition-all duration-300 ${currentSection === 1
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed hidden'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                    disabled={currentSection === 1}
                                >
                                    Previous
                                </button>

                                {currentSection < totalSections ? (
                                    <button
                                        type="button"
                                        onClick={nextSection}
                                        className="flex items-center px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg hover:shadow-red-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                                    >
                                        Next Step
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`flex items-center px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg hover:shadow-red-500/25 transition-all duration-300 transform hover:-translate-y-0.5 font-bold ${loading ? 'opacity-70 cursor-wait' : ''
                                            }`}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Registering...
                                            </>
                                        ) : (
                                            <>
                                                Complete Registration
                                                <CheckCircle className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};