/**
 * Validation Utilities
 * ====================
 * Input validation functions for email, phone, password
 */

/**
 * Validate email format (RFC 5322 simplified)
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Indian phone number
 * @param {string} phone - Phone number (with or without +91)
 * @returns {boolean}
 */
function validatePhone(phone) {
    // Remove common separators
    const cleaned = phone.replace(/[\s\-+()]/g, '');
    
    // Check if it's a 10-digit number
    if (cleaned.length !== 10) {
        return false;
    }
    
    // Check if all characters are digits
    if (!/^\d{10}$/.test(cleaned)) {
        return false;
    }

    // First digit should not be 0
    if (cleaned[0] === '0') {
        return false;
    }

    return true;
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 special character
 * 
 * @param {string} password
 * @returns {object} { isValid, requirements }
 */
function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const isValid = Object.values(requirements).every(req => req === true);
    
    return { isValid, requirements };
}

/**
 * Sanitize string to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Validate full name
 * @param {string} name
 * @returns {boolean}
 */
function validateFullName(name) {
    // Name must be at least 3 characters
    if (name.length < 3) {
        return false;
    }

    // Name should not contain numbers
    if (/\d/.test(name)) {
        return false;
    }

    // Name should only contain letters and spaces
    if (!/^[a-zA-Z\s]*$/.test(name)) {
        return false;
    }

    return true;
}

module.exports = {
    validateEmail,
    validatePhone,
    validatePassword,
    sanitizeString,
    validateFullName,
};
