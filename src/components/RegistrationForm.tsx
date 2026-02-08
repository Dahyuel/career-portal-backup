// components/RegistrationForm.tsx - UPDATED with 4-step wizard for full registration
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, GraduationCap, ChevronRight, CheckCircle, AlertCircle, FileText, X, LogOut, Mail, Lock, UserPlus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { RegistrationData, ValidationError, FileUpload as FileUploadType } from '../types';
import { FACULTIES, CLASS_YEARS, HOW_DID_YOU_HEAR_OPTIONS } from '../utils/constants';
import { validatePhone, validatePersonalId, validateVolunteerId, validateEmail, validatePassword, validateConfirmPassword, validateName } from '../utils/validation';
import { uploadFile, cleanupUploadedFiles, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AuthTransition } from '../components/AuthTransition';
import { saveFormCache, loadFormCache, clearFormCache } from '../utils/formCache';
import { Navbar } from './shared/Navbar';

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
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-600',
          text: 'text-green-800',
          button: 'text-green-600'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-800',
          button: 'text-yellow-600'
        };
      case 'error':
      default:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          text: 'text-red-800',
          button: 'text-red-600'
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

const FileUpload: React.FC<{
  accept: string;
  maxSize: number;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  label: string;
  currentFile?: File;
  required?: boolean;
}> = ({ accept, maxSize, onFileSelect, onFileRemove, label, currentFile, required = false }) => {
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
    <div className="space-y-2 fade-in-blur">
      <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${currentFile
        ? 'border-green-200 bg-green-50 transform hover:scale-[1.02]'
        : 'border-orange-200 hover:border-orange-300'
        }`}>
        {currentFile ? (
          <div className="flex items-center justify-center space-x-3 fade-in-scale">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900">{currentFile.name}</span>
            <button
              type="button"
              onClick={onFileRemove}
              className="text-red-600 hover:text-red-800 transition-colors duration-200"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="fade-in-blur">
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
              required={required}
            />
            <label
              htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
              className="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors duration-200 smooth-hover"
            >
              {label} {required ? '*' : '(Optional)'}
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

const LogoutButton: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="fixed bottom-6 left-6 z-50 flex items-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed smooth-hover"
    >
      <LogOut className="w-4 h-4" />
      <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
    </button>
  );
};

export const RegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading: authLoading, getRoleBasedRedirect, refreshProfile, signOut, signUp } = useAuth();

  // Determine if this is a new registration (no user) or profile completion (user exists)
  const isNewRegistration = !isAuthenticated;

  const [currentSection, setCurrentSection] = useState(1);
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
  const [showAuthTransition, setShowAuthTransition] = useState(false);
  const [errorPopup, setErrorPopup] = useState<{ message: string; type?: 'error' | 'warning' | 'success' } | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  // Refs to prevent form resets
  const formDataRef = useRef(formData);
  const hasInitialized = useRef(false);
  const hasRedirected = useRef(false);
  const sectionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save form data to cache
  useEffect(() => {
    formDataRef.current = formData;
    if (user?.id) {
      saveFormCache(`registration_${user.id}`, formData);
    }
  }, [formData, user?.id]);

  // Dynamic sections based on authentication state
  const sections = isNewRegistration && !accountCreated
    ? [
      { id: 1, title: 'Account Info', icon: UserPlus },
      { id: 2, title: 'Personal Info', icon: User },
      { id: 3, title: 'Academic Info', icon: GraduationCap },
      { id: 4, title: 'Event & Documents', icon: FileText }
    ]
    : [
      { id: 1, title: 'Personal Information', icon: User },
      { id: 2, title: 'Academic Information', icon: GraduationCap },
      { id: 3, title: 'Event & Documents', icon: FileText }
    ];

  const totalSections = sections.length;

  const universities = [
    'Ain Shams University',
    'Helwan University',
    'Canadian Ahram University',
    'Banha University',
    'Cairo University',
    'Other'
  ];

  const showErrorPopup = useCallback((message: string, type: 'error' | 'warning' | 'success' = 'error') => {
    setErrorPopup({ message, type });
  }, []);

  const closeErrorPopup = useCallback(() => {
    setErrorPopup(null);
  }, []);

  // Single initialization effect
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const checkAuth = async () => {
      if (!authLoading) {
        // For authenticated users with complete profiles, redirect to dashboard
        if (isAuthenticated && profile?.profile_complete && !hasRedirected.current) {
          hasRedirected.current = true;
          const redirectPath = getRoleBasedRedirect();
          console.log('🔄 Profile already complete, redirecting to:', redirectPath);
          navigate(redirectPath, { replace: true });
          return;
        }

        // Load cached form data if user is authenticated
        if (user?.id) {
          const cachedData = loadFormCache<RegistrationData>(`registration_${user.id}`);
          if (cachedData) {
            setFormData(prev => ({
              ...prev,
              ...cachedData
            }));
          }
        }

        // Pre-fill form with existing data if available (but don't override cache)
        if (profile) {
          setFormData(prev => ({
            ...prev,
            firstName: profile.first_name || prev.firstName,
            lastName: profile.last_name || prev.lastName,
            email: profile.email || prev.email,
            ...(profile.personal_id && !prev.personalId && { personalId: profile.personal_id }),
            ...(profile.phone && !prev.phone && { phone: profile.phone }),
            ...(profile.university && !prev.university && { university: profile.university }),
            ...(profile.faculty && !prev.faculty && { faculty: profile.faculty }),
            ...(profile.gender && !prev.gender && { gender: profile.gender }),
            ...(profile.nationality && !prev.nationality && { nationality: profile.nationality })
          }));
        }
      }
    };

    checkAuth();
  }, [isAuthenticated, profile, authLoading, navigate, getRoleBasedRedirect, user?.id]);

  const updateField = useCallback((field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const validateSection = async (section: number): Promise<ValidationError[]> => {
    const validationErrors: ValidationError[] = [];

    // For new registration (4 steps), section mapping is different
    if (isNewRegistration && !accountCreated) {
      // 4-step validation for new users
      if (section === 1) {
        // Account Info: first name, last name, email, password
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
        // Personal Info: gender, nationality, phone, personalId
        if (!formData.gender) validationErrors.push({ field: 'gender', message: 'Gender is required' });
        if (!formData.nationality) validationErrors.push({ field: 'nationality', message: 'Nationality is required' });

        const phoneError = validatePhone(formData.phone);
        if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

        const personalIdError = validatePersonalId(formData.personalId);
        if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });
      }

      if (section === 3) {
        // Academic Info
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

      if (section === 4) {
        // Event & Documents
        if (!formData.howDidYouHear) validationErrors.push({ field: 'howDidYouHear', message: 'This field is required' });

        if (formData.volunteerId && formData.volunteerId.trim()) {
          const volunteerIdError = validateVolunteerId(formData.volunteerId);
          if (volunteerIdError) {
            validationErrors.push({ field: 'volunteerId', message: volunteerIdError });
          }
        }

        if (!fileUploads.universityId) {
          validationErrors.push({ field: 'universityId', message: 'University ID is required' });
        }
      }
    } else {
      // 3-step validation for authenticated users (profile completion)
      if (section === 1) {
        if (!formData.firstName) validationErrors.push({ field: 'firstName', message: 'First name is required' });
        if (!formData.lastName) validationErrors.push({ field: 'lastName', message: 'Last name is required' });
        if (!formData.gender) validationErrors.push({ field: 'gender', message: 'Gender is required' });
        if (!formData.nationality) validationErrors.push({ field: 'nationality', message: 'Nationality is required' });

        const phoneError = validatePhone(formData.phone);
        if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

        const personalIdError = validatePersonalId(formData.personalId);
        if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });
      }

      if (section === 2) {
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

      if (section === 3) {
        if (!formData.howDidYouHear) validationErrors.push({ field: 'howDidYouHear', message: 'This field is required' });

        if (formData.volunteerId && formData.volunteerId.trim()) {
          const volunteerIdError = validateVolunteerId(formData.volunteerId);
          if (volunteerIdError) {
            validationErrors.push({ field: 'volunteerId', message: volunteerIdError });
          }
        }

        if (!fileUploads.universityId) {
          validationErrors.push({ field: 'universityId', message: 'University ID is required' });
        }
      }
    }

    return validationErrors;
  };

  const nextSection = async () => {
    // Clear any pending timeout
    if (sectionChangeTimeoutRef.current) {
      clearTimeout(sectionChangeTimeoutRef.current);
    }

    const sectionErrors = await validateSection(currentSection);
    if (sectionErrors.length > 0) {
      setErrors(sectionErrors);
      if (sectionErrors.length > 0) {
        showErrorPopup(sectionErrors[0].message, 'error');
      }
      return;
    }

    setErrors([]);

    // Debounce section change to prevent rapid navigation
    sectionChangeTimeoutRef.current = setTimeout(() => {
      if (currentSection < totalSections) {
        setCurrentSection(currentSection + 1);
      }
    }, 100);
  };

  const prevSection = () => {
    if (sectionChangeTimeoutRef.current) {
      clearTimeout(sectionChangeTimeoutRef.current);
    }

    sectionChangeTimeoutRef.current = setTimeout(() => {
      if (currentSection > 1) {
        setCurrentSection(currentSection - 1);
      }
    }, 100);
  };

  // OPTIMIZED: Direct redirection without success screen
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) return;

    // Validate all sections based on flow type
    const sectionsToValidate = isNewRegistration && !accountCreated ? [1, 2, 3, 4] : [1, 2, 3];
    const allErrors = await Promise.all(sectionsToValidate.map(section => validateSection(section)))
      .then(errorArrays => errorArrays.flat());

    if (allErrors.length > 0) {
      setErrors(allErrors);
      if (allErrors.length > 0) {
        showErrorPopup(allErrors[0].message, 'error');
      }

      // Section map for navigating to the first error - depends on flow type
      const sectionMap: Record<string, number> = isNewRegistration && !accountCreated
        ? {
          // 4-step flow mapping
          firstName: 1, lastName: 1, email: 1, password: 1, confirmPassword: 1,
          gender: 2, nationality: 2, phone: 2, personalId: 2,
          university: 3, faculty: 3, degreeLevel: 3, program: 3, classYear: 3, customUniversity: 3,
          howDidYouHear: 4, volunteerId: 4, universityId: 4
        }
        : {
          // 3-step flow mapping
          firstName: 1, lastName: 1, gender: 1, nationality: 1, phone: 1, personalId: 1,
          university: 2, faculty: 2, degreeLevel: 2, program: 2, classYear: 2, customUniversity: 2,
          howDidYouHear: 3, volunteerId: 3, universityId: 3
        };

      const firstErrorSection = Math.min(
        ...allErrors.map(error => sectionMap[error.field] ?? 1)
      );
      setCurrentSection(firstErrorSection);
      return;
    }

    setLoading(true);
    setErrors([]);
    setShowAuthTransition(true);

    const uploadedFiles: { bucket: string; path: string }[] = [];

    try {
      let currentUserId = user?.id;

      // For new registration, create the account first
      if (isNewRegistration && !accountCreated) {
        console.log('Starting account creation...');

        const result = await signUp(formData.email, formData.password, {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          role: 'attendee'
        });

        if (!result.success) {
          let errorMessage = result.error?.message || 'Registration failed. Please try again.';

          if (errorMessage.includes('User already registered')) {
            errorMessage = 'An account with this email already exists. Please sign in instead.';
          } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage = 'Please check your email to confirm your account before signing in.';
          }

          throw new Error(errorMessage);
        }

        console.log('Account created successfully');
        setAccountCreated(true);

        // Wait for auth state to update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the new user ID
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (!newUser?.id) {
          throw new Error('Failed to get user after registration');
        }
        currentUserId = newUser.id;
      }

      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // Upload files first
      const fileUpdates: { university_id_path?: string; cv_path?: string } = {};

      if (fileUploads.universityId) {
        const uniResult = await uploadFile('university-ids', currentUserId, fileUploads.universityId);
        if (uniResult && 'error' in uniResult && uniResult.error) {
          showErrorPopup('Failed to upload University ID. Please try again.', 'error');
          await cleanupUploadedFiles(uploadedFiles);
          setShowAuthTransition(false);
          setLoading(false);
          return;
        } else if (uniResult && 'data' in uniResult && uniResult.data) {
          fileUpdates.university_id_path = uniResult.data.path;
          if (uniResult.data.path) {
            uploadedFiles.push({ bucket: 'university-ids', path: uniResult.data.path });
          }
        }
      }

      if (fileUploads.resume) {
        const resumeResult = await uploadFile('cvs', currentUserId, fileUploads.resume);
        if (resumeResult && 'data' in resumeResult && resumeResult.data) {
          fileUpdates.cv_path = resumeResult.data.path;
          if (resumeResult.data.path) {
            uploadedFiles.push({ bucket: 'cvs', path: resumeResult.data.path });
          }
        }
      }

      // Prepare form data for edge function
      const submissionData = {
        formData: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          gender: formData.gender,
          nationality: formData.nationality,
          phone: formData.phone.trim(),
          personalId: formData.personalId.trim(),
          university: formData.university === 'Other' ? formData.customUniversity : formData.university,
          faculty: formData.faculty,
          degreeLevel: formData.degreeLevel,
          program: formData.program,
          classYear: formData.degreeLevel === 'student' ? formData.classYear : undefined,
          howDidYouHear: formData.howDidYouHear,
          volunteerId: formData.volunteerId?.trim() || undefined
        },
        filePaths: fileUpdates
      };

      // Call edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete profile');
      }

      // Clear the form cache after successful submission
      if (currentUserId) {
        clearFormCache(`registration_${currentUserId}`);
      }

      // Refresh profile and wait for it to complete
      await refreshProfile();

      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 300));

      setShowAuthTransition(false);

      // DIRECT REDIRECTION: Navigate immediately without showing success screen
      console.log('✅ Registration complete, redirecting directly to dashboard');
      navigate('/attendee', { replace: true });

    } catch (error: unknown) {
      console.error("Profile completion error:", error);
      await cleanupUploadedFiles(uploadedFiles);

      const errorMessage = error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.";

      showErrorPopup(errorMessage, 'error');
      setShowAuthTransition(false);
      setLoading(false);
    }
  };
  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6 stagger-children">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            disabled
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            placeholder="First name from account"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Name cannot be changed</p>
        </div>

        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            disabled
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            placeholder="Last name from account"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Name cannot be changed</p>
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
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {getFieldError('gender') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('gender')}</p>
          )}
        </div>

        <div className="fade-in-blur">
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
            <option value="Egyptian">Egyptian</option>
            <option value="Other">Other</option>
          </select>
          {getFieldError('nationality') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('nationality')}</p>
          )}
        </div>
      </div>

      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={formData.email}
          disabled
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          placeholder="Your email address"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Email cannot be changed</p>
      </div>

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
    </div>
  );

  const renderAcademicInfo = () => (
    <div className="space-y-6 stagger-children">
      <div className="fade-in-blur">
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
          {universities.map(uni => (
            <option key={uni} value={uni}>{uni}</option>
          ))}
        </select>
        {getFieldError('university') && (
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('university')}</p>
        )}
      </div>

      {formData.university === 'Other' && (
        <div className="fade-in-blur">
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
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('customUniversity')}</p>
          )}
        </div>
      )}

      <div className="fade-in-blur">
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
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('faculty')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fade-in-blur">
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
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('degreeLevel')}</p>
          )}
        </div>

        {formData.degreeLevel === 'student' && (
          <div className="fade-in-blur">
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
              <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('classYear')}</p>
            )}
          </div>
        )}
      </div>

      <div className="fade-in-blur">
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
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('program')}</p>
        )}
      </div>
    </div>
  );

  const renderEventInfo = () => (
    <div className="space-y-6 stagger-children">
      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          How did you hear about this event? *
        </label>
        <select
          value={formData.howDidYouHear}
          onChange={(e) => updateField('howDidYouHear', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white ${getFieldError('howDidYouHear') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
            }`}
        >
          <option value="">Select an option</option>
          {HOW_DID_YOU_HEAR_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {getFieldError('howDidYouHear') && (
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('howDidYouHear')}</p>
        )}
      </div>

      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Volunteer ID (Optional)
        </label>
        <input
          type="text"
          value={formData.volunteerId}
          onChange={(e) => updateField('volunteerId', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${getFieldError('volunteerId') ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
            }`}
          placeholder="Enter volunteer ID (if applicable)"
        />
        {getFieldError('volunteerId') && (
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('volunteerId')}</p>
        )}
      </div>

      <div className="space-y-4 fade-in-blur">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Required Documents</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            University ID *
          </label>
          <FileUpload
            accept=".jpg,.jpeg,.png,.pdf"
            maxSize={10 * 1024 * 1024}
            onFileSelect={(file) => {
              setFileUploads(prev => ({ ...prev, universityId: file }));
              setErrors(prev => prev.filter(error => error.field !== 'universityId'));
            }}
            onFileRemove={() => setFileUploads(prev => ({ ...prev, universityId: undefined }))}
            label="Upload University ID (JPG, PNG, PDF - Max 10MB)"
            currentFile={fileUploads.universityId}
            required={true}
          />
          {getFieldError('universityId') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('universityId')}</p>
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

        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Note:</strong> University ID is required. CV/Resume is optional and can be uploaded later if needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Account Info section for new registration (Step 1 of 4-step flow)
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

      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Already have an account? <Link to="/login" className="font-medium underline hover:text-blue-600">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Personal Info for new registration (Step 2 of 4-step flow) - without name fields
  const renderPersonalInfoForNewReg = () => (
    <div className="space-y-6 stagger-children">
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
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {getFieldError('gender') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('gender')}</p>
          )}
        </div>

        <div className="fade-in-blur">
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
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('nationality')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fade-in-blur">
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
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('phone')}</p>
          )}
        </div>

        <div className="fade-in-blur">
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
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('personalId')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    // For new registration (4-step flow)
    if (isNewRegistration && !accountCreated) {
      switch (currentSection) {
        case 1:
          return renderAccountInfo();
        case 2:
          return renderPersonalInfoForNewReg();
        case 3:
          return renderAcademicInfo();
        case 4:
          return renderEventInfo();
        default:
          return null;
      }
    }

    // For profile completion (3-step flow)
    switch (currentSection) {
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center fade-in-scale">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Navbar */}
      <Navbar />

      {errorPopup && (
        <ErrorPopup
          message={errorPopup.message}
          type={errorPopup.type}
          onClose={closeErrorPopup}
        />
      )}

      <AuthTransition
        isLoading={showAuthTransition}
        message="Completing your profile..."
      />

      {/* Logout Button - only show for authenticated users */}
      {!isNewRegistration && <LogoutButton />}

      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: 'url("/images/careercenter.png")',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-60"></div>
      </div>

      <div className="relative z-10 py-8 px-4 pt-24 md:pt-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 fade-in-up-blur">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              {isNewRegistration ? 'Create Your Account' : 'Complete Your Profile'}
            </h1>
            <p className="text-white drop-shadow">
              {isNewRegistration ? 'Register as an attendee for ASU Employment Fair' : 'Finish setting up your attendee account'}
            </p>
          </div>
        </div>

        <div className="mb-8 fade-in-up-blur">
          <div className="flex items-center max-w-2xl mx-auto">
            {sections.map((section, index) => (
              <React.Fragment key={section.id}>
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${currentSection >= section.id
                    ? 'bg-red-500 border-red-500 text-white transform scale-110'
                    : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                    <section.icon className="w-5 h-5" />
                  </div>
                </div>
                {index < sections.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${currentSection > section.id ? 'bg-red-500' : 'bg-gray-300'
                    }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between max-w-2xl mx-auto mt-2">
            {sections.map(section => (
              <div key={section.id} className="text-xs text-center" style={{ width: '120px' }}>
                <span className={`transition-all duration-300 ${currentSection >= section.id
                  ? 'text-white font-medium drop-shadow transform scale-105'
                  : 'text-white drop-shadow'
                  }`}>
                  {section.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-red-100 dark:border-gray-700 fade-in-up-blur modal-content-blur max-w-4xl mx-auto transition-colors duration-300">
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

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 fade-in-blur">
            <button
              type="button"
              onClick={prevSection}
              disabled={currentSection === 1 || loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${currentSection === 1 || loading
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 smooth-hover transform hover:scale-105'
                }`}
            >
              Previous
            </button>

            {currentSection < totalSections ? (
              <button
                type="button"
                onClick={nextSection}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 flex items-center smooth-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center smooth-hover"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isNewRegistration ? 'Creating Account...' : 'Completing Profile...'}
                  </>
                ) : (
                  isNewRegistration ? 'Complete Registration' : 'Complete Profile'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};