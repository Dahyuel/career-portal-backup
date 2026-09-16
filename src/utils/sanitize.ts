// utils/sanitize.ts — Input sanitization utilities
// Prevents SQL injection, XSS, and other injection attacks in user inputs.

/**
 * Sanitizes a string for safe use in Supabase PostgREST .or() / .filter() queries.
 * Removes characters that could be used for query manipulation.
 */
export const sanitizeSearchQuery = (input: string): string => {
    if (!input) return '';
    return input
        .trim()
        .replace(/[%_'"\\();,]/g, '') // Remove SQL-significant characters
        .substring(0, 200);            // Limit length to prevent abuse
};

/**
 * Sanitizes a string for safe use as display text.
 * Escapes HTML special characters to prevent XSS.
 */
export const sanitizeHtml = (input: string): string => {
    if (!input) return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Validates and sanitizes an email address.
 * Returns the cleaned email or null if invalid.
 */
export const sanitizeEmail = (email: string): string | null => {
    if (!email) return null;
    const cleaned = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : null;
};

/**
 * Validates and sanitizes a UUID string.
 * Returns the UUID or null if invalid.
 */
export const sanitizeUuid = (uuid: string): string | null => {
    if (!uuid) return null;
    const cleaned = uuid.trim().toLowerCase();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    return uuidRegex.test(cleaned) ? cleaned : null;
};

/**
 * Sanitizes a phone number — allows only digits.
 */
export const sanitizePhone = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').substring(0, 15);
};

/**
 * Sanitizes a name — allows only Unicode letters and spaces.
 */
export const sanitizeName = (name: string): string => {
    if (!name) return '';
    return name.trim().replace(/[^\p{L}\s]/gu, '').substring(0, 100);
};

/**
 * Sanitizes a numeric string — allows only digits.
 */
export const sanitizeNumeric = (input: string): string => {
    if (!input) return '';
    return input.replace(/\D/g, '');
};
