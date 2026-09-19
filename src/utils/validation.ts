// utils/validation.ts

export const validateName = (name: string, fieldName: string): string | null => {
  if (!name.trim()) {
    return `${fieldName} is required`;
  }
  if (name.trim().length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    return `${fieldName} must contain only letters and spaces`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) {
    return 'Phone number is required';
  }
  // Egyptian phone number validation
  const phoneRegex = /^(010|011|012|015)\d{8}$/;
  const cleanPhone = phone.replace(/\D/g, '');
  if (!phoneRegex.test(cleanPhone)) {
    return 'Please enter a valid Egyptian phone number (01X-XXXXXXXX)';
  }
  return null;
};

export const validatePersonalId = (personalId: string): string | null => {
  if (!personalId.trim()) {
    return 'Personal ID is required';
  }
  if (personalId.trim().length !== 14) {
    return 'Personal ID must be exactly 14 digits';
  }
  if (!/^\d{14}$/.test(personalId.trim())) {
    return 'Personal ID must contain only numbers';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[@$!%*?&]/.test(password)) {
    return 'Password must contain at least one special character (@$!%*?&)';
  }
  return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

// In utils/validation.ts - make sure this function exists:
export const validateVolunteerId = (volunteerId: string): string | null => {
  if (!volunteerId || !volunteerId.trim()) {
    return null; // Volunteer ID is optional
  }

  // Format: vol + numbers (case insensitive), e.g., vol001, VOL123
  const volunteerIdRegex = /^vol\d+$/i;

  if (!volunteerIdRegex.test(volunteerId.trim())) {
    return 'Volunteer ID must be in format "vol001" (prefix "vol" followed by numbers)';
  }

  return null;
};