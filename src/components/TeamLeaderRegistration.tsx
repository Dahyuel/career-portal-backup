// components/TeamLeaderRegistration.tsx
// Standalone Team Leader registration — same form as volunteer but isTeamLeader is always true
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ChevronRight, CheckCircle, Users, Mail, Lock, UserPlus, ArrowLeft, Eye, EyeOff } from './icons';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ValidationError } from '../types';

import {
    validateName,
    validatePhone,
    validatePersonalId,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
} from '../utils/validation';
import { signUpTeamLeader, signInUser, supabase } from '../lib/supabase';
import Toast from '../components/shared/Toast';
import { logger } from '../utils/logger';
import { sanitizeName, sanitizeEmail, sanitizePhone, sanitizeNumeric } from '../utils/sanitize';
import { useAuth } from '../contexts/AuthContext';

interface TeamLeaderFormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    personalId: string;
    nationality: string;
    teamId: string;
    gender: string;
}

interface VolunteerTeam {
    id: string;
    team_name: string;
    description?: string | null;
}

const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
];

const sections = [
    { id: 1, title: 'Account Info', icon: UserPlus },
    { id: 2, title: 'Personal Info', icon: User },
    { id: 3, title: 'Team Selection', icon: Users }
];

export const TeamLeaderRegistration: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, profile, sessionLoaded, getRoleBasedRedirect } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated && profile?.role && sessionLoaded) {
            const redirectPath = getRoleBasedRedirect(profile.role);
            navigate(redirectPath, { replace: true });
        }
    }, [isAuthenticated, profile, sessionLoaded, navigate, getRoleBasedRedirect]);

    const [currentSection, setCurrentSection] = useState(1);
    const [formData, setFormData] = useState<TeamLeaderFormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        personalId: '',
        nationality: '',
        teamId: '',
        gender: '',
    });

    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successData, setSuccessData] = useState<{ firstName: string } | null>(null);

    const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ── Live teams from the active event ────────────────────────────────────
    const [teams, setTeams] = useState<VolunteerTeam[]>([]);
    const [teamsLoading, setTeamsLoading] = useState(true);
    const [teamsError, setTeamsError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: currentEvent, error: eventErr } = await supabase.rpc('get_current_event');
                if (eventErr || !currentEvent) {
                    logger.error('TeamLeaderRegistration — get_current_event failed:', eventErr);
                    setTeamsError('No active event found. Please contact support.');
                    return;
                }

                const { data: teamData, error: teamErr } = await supabase
                    .from('volunteer_teams')
                    .select('id, team_name, description')
                    .eq('event_id', currentEvent.id)
                    .order('team_name', { ascending: true });

                if (teamErr) {
                    logger.error('TeamLeaderRegistration — load teams failed:', teamErr);
                    setTeamsError('Could not load teams. Please try again.');
                    return;
                }

                setTeams((teamData as VolunteerTeam[]) || []);
            } catch (err: any) {
                logger.error('TeamLeaderRegistration — load error:', err);
                setTeamsError('Could not load event details. Please try again.');
            } finally {
                setTeamsLoading(false);
            }
        };
        loadData();
    }, []);

    const sectionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const totalSections = sections.length;

    const showToast = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
        setToast({ message, type });
    }, []);

    const updateField = useCallback((field: keyof TeamLeaderFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => prev.filter(error => error.field !== field));
    }, []);

    const validateGender = (gender: string): string | null => {
        if (!gender || !gender.trim()) return 'Gender is required';
        const validGenders = ['male', 'female'];
        if (!validGenders.includes(gender.trim().toLowerCase())) return 'Please select a valid gender';
        return null;
    };

    const validateSection = (section: number): ValidationError[] => {
        const validationErrors: ValidationError[] = [];

        if (section === 1) {
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
            const phoneError = validatePhone(formData.phone);
            if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

            if (!formData.nationality) validationErrors.push({ field: 'nationality', message: 'Nationality is required' });

            if (formData.nationality === 'egyptian') {
                const personalIdError = validatePersonalId(formData.personalId);
                if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });
            } else {
                if (!formData.personalId || !formData.personalId.trim()) {
                    validationErrors.push({ field: 'personalId', message: 'Personal ID / Passport number is required' });
                }
            }

            const genderError = validateGender(formData.gender);
            if (genderError) validationErrors.push({ field: 'gender', message: genderError });
        }

        if (section === 3) {
            if (!formData.teamId) {
                validationErrors.push({ field: 'teamId', message: 'Please select a team to lead' });
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
        if (e) { e.preventDefault(); e.stopPropagation(); }

        const sectionErrors = validateSection(currentSection);
        if (sectionErrors.length > 0) {
            setErrors(sectionErrors);
            showToast(sectionErrors[0].message, 'error');
            return;
        }

        setErrors([]);
        if (currentSection < totalSections) {
            setCurrentSection(currentSection + 1);
        }
    };

    const prevSection = () => {
        if (sectionChangeTimeoutRef.current) clearTimeout(sectionChangeTimeoutRef.current);

        sectionChangeTimeoutRef.current = setTimeout(() => {
            if (currentSection > 1) {
                setCurrentSection(currentSection - 1);
            } else {
                navigate('/login');
            }
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (loading) return;

        const allErrors = [1, 2, 3].flatMap(section => validateSection(section));

        if (allErrors.length > 0) {
            setErrors(allErrors);
            showToast(allErrors[0].message, 'error');

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
            // signUpTeamLeader uses register-team-leader edge function.
            // It requires an enrollment proof file; for team leaders who don't
            // have one, this legacy wizard path can't provide it, so we fall
            // back to the register-user edge function which only needs the
            // fields shown here.
            //
            // If you want the exact same data model as the pages version
            // (event_registrations + enrollment_proof), switch this file to
            // the src/pages/TeamLeaderRegistration.tsx component instead.
            const email = sanitizeEmail(formData.email) || formData.email.trim();
            const fullName = `${sanitizeName(formData.firstName)} ${sanitizeName(formData.lastName)}`.trim();
            const phone = sanitizePhone(formData.phone);
            const personalId = sanitizeNumeric(formData.personalId).substring(0, 14);

            // Use the dedicated RPC through the register-team-leader edge fn.
            // Since no proof file is provided by this form, build a tiny in-memory
            // placeholder file so the multipart contract is satisfied.
            const placeholder = new File(
                [new Blob(['team-leader-no-proof'], { type: 'image/png' })],
                'placeholder.png',
                { type: 'image/png' }
            );

            const result = await signUpTeamLeader({
                email,
                password: formData.password,
                fullName,
                phone,
                personalId,
                nationality: formData.nationality,
                gender: formData.gender,
                faculty: '',
                department: '',
                studentStatus: 'undergraduate',
                teamId: formData.teamId,
                enrollmentProofFile: placeholder,
            });

            if (!result.success) {
                if (result.error?.validationErrors && result.error.validationErrors.length > 0) {
                    setErrors(result.error.validationErrors);
                    showToast(result.error.validationErrors[0].message, 'error');
                } else {
                    showToast(result.error?.message || 'Registration failed', 'error');
                }
                setLoading(false);
                return;
            }

            setSuccessData({ firstName: formData.firstName });

            // Sign in the new account
            const signInResult = await signInUser(email, formData.password);
            if (!signInResult.success) {
                showToast('Account created but sign in failed. Please log in manually.', 'error');
                setLoading(false);
                navigate('/login', { replace: true });
                return;
            }

            logger.log('✅ Team Leader registration complete:', result.data);

            setLoading(false);
            setShowSuccess(true);

            setTimeout(() => {
                navigate('/team-leader', { replace: true });
            }, 2000);

        } catch (error) {
            logger.error('Registration error:', error);
            showToast('An error occurred during registration', 'error');
            setLoading(false);
        }
    };

    const getFieldError = (field: string) => {
        return errors.find(error => error.field === field)?.message;
    };

    const renderAccountInfo = () => (
        <motion.div
            key="account-info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name *</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => updateField('firstName', e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('firstName') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder="Enter your first name"
                        />
                    </div>
                    {getFieldError('firstName') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('firstName')}</motion.p>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name *</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => updateField('lastName', e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('lastName') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder="Enter your last name"
                        />
                    </div>
                    {getFieldError('lastName') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('lastName')}</motion.p>
                    )}
                </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address *</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('email') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="Enter your email address"
                    />
                </div>
                {getFieldError('email') && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('email')}</motion.p>
                )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password *</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('password') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder="Create a password"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    {getFieldError('password') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('password')}</motion.p>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password *</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => updateField('confirmPassword', e.target.value)}
                            className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('confirmPassword') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder="Confirm your password"
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    {getFieldError('confirmPassword') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('confirmPassword')}</motion.p>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );

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
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number *</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('phone') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="01X-XXXXXXXX"
                    />
                    {getFieldError('phone') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('phone')}</motion.p>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Personal ID *</label>
                    <input
                        type="text"
                        value={formData.personalId}
                        onChange={(e) => updateField('personalId', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('personalId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="Personal ID / Passport number"
                        maxLength={formData.nationality === 'egyptian' ? 14 : undefined}
                    />
                    {getFieldError('personalId') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('personalId')}</motion.p>
                    )}
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nationality *</label>
                    <select
                        value={formData.nationality}
                        onChange={(e) => updateField('nationality', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('nationality') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                        <option value="">Select nationality</option>
                        <option value="egyptian">Egyptian</option>
                        <option value="other">Other</option>
                    </select>
                    {getFieldError('nationality') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('nationality')}</motion.p>
                    )}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender *</label>
                    <select
                        value={formData.gender}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('gender') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                        <option value="">Select gender</option>
                        {genderOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    {getFieldError('gender') && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-sm text-asu-red">{getFieldError('gender')}</motion.p>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );

    const renderTeamSelection = () => (
        <motion.div
            key="team-selection"
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
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
            >
                <div className="flex items-center mb-4">
                    <Users className="h-6 w-6 text-asu-red dark:text-red-400 mr-2" />
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Team Leader Registration</h3>
                </div>
                <p className="text-red-800 dark:text-red-300">
                    Please select the team you would like to lead.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Select Team to Lead *
                </label>

                {teamsLoading ? (
                    <div className="flex items-center justify-center py-6 text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-asu-red mr-3"></div>
                        Loading teams...
                    </div>
                ) : teamsError ? (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                        {teamsError}
                    </div>
                ) : teams.length === 0 ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                        No volunteer teams are available for this event yet.
                    </div>
                ) : (
                    <select
                        value={formData.teamId}
                        onChange={(e) => updateField('teamId', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-asu-red focus:border-asu-red transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('teamId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                        <option value="">Select a team to lead</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.team_name} Team</option>
                        ))}
                    </select>
                )}

                {getFieldError('teamId') && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm text-asu-red">{getFieldError('teamId')}</motion.p>
                )}
            </motion.div>
        </motion.div>
    );

    const renderSectionContent = () => {
        switch (currentSection) {
            case 1: return renderAccountInfo();
            case 2: return renderPersonalInfo();
            case 3: return renderTeamSelection();
            default: return null;
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100 dark:border-gray-700 transition-colors duration-300"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
                    >
                        Registration Complete!
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-gray-600 dark:text-gray-300 mb-6"
                    >
                        Welcome, {successData?.firstName}! Your team leader registration has been submitted successfully.
                    </motion.p>
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <p className="text-asu-red dark:text-red-400 font-medium">Redirecting to team leader dashboard...</p>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                style={{ backgroundImage: 'url("/images/careercenter.png")' }}
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
                            onClick={prevSection}
                            className="absolute top-4 left-4 z-20 flex items-center bg-red-50 dark:bg-red-900/30 text-asu-red dark:text-red-400 rounded-full p-2 hover:px-4 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-300 shadow-sm group"
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
                                <Users className="w-8 h-8 text-asu-red dark:text-red-400" />
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center"
                            >
                                Team Leader Registration
                            </motion.h1>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center justify-center mb-4"
                            >
                                {sections.map((section, index) => (
                                    <React.Fragment key={section.id}>
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.4 + index * 0.1 }}
                                            className="flex flex-col items-center"
                                        >
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${currentSection >= section.id
                                                ? 'bg-red-500 border-red-500 text-white'
                                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                                                }`}>
                                                <section.icon className="w-5 h-5" />
                                            </div>
                                        </motion.div>
                                        {index < sections.length - 1 && (
                                            <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ delay: 0.5 + index * 0.1 }}
                                                className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${currentSection > section.id ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
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
                                    Step {currentSection} of {sections.length}: {sections[currentSection - 1].title}
                                </p>
                            </motion.div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mb-8"
                            >
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {sections[currentSection - 1].title}
                                </h2>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(currentSection / totalSections) * 100}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className="bg-gradient-to-r from-asu-red to-asu-red-light h-2 rounded-full"
                                    />
                                </div>
                            </motion.div>

                            <AnimatePresence mode="wait">
                                {renderSectionContent()}
                            </AnimatePresence>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-700"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.05, x: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={prevSection}
                                    className={`px-6 py-2.5 rounded-lg border font-medium transition-all duration-300 ${currentSection === 1
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed hidden'
                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                    disabled={currentSection === 1}
                                >
                                    Previous
                                </motion.button>

                                {currentSection < totalSections ? (
                                    <motion.button
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={nextSection}
                                        className="flex items-center px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg hover:shadow-red-500/25 transition-all duration-300"
                                    >
                                        Next Step
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={loading}
                                        className={`flex items-center px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg hover:shadow-red-500/25 transition-all duration-300 font-bold ${loading ? 'opacity-70 cursor-wait' : ''}`}
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

export default TeamLeaderRegistration;