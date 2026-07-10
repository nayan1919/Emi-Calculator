/**
 * Shared Utilities — EMI Calculator
 * ===================================
 * Currency formatting, number parsing, and common functions
 * used across multiple pages.
 */

/* ===== CURRENCY CONFIGURATION ===== */
const CURRENCIES = {
    INR: { symbol: '₹', locale: 'en-IN' },
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' },
    GBP: { symbol: '£', locale: 'en-GB' },
};

// Global state for currency
let currentCurrency = 'INR';

/* ===== CURRENCY & FORMATTING ===== */

/**
 * Format a number as currency string with locale-aware grouping.
 * @param {number} value - The number to format
 * @param {boolean} [compact=false] - Use compact notation for large numbers
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, compact = false) {
    if (typeof value !== 'number' || isNaN(value)) return currentCurrency === 'INR' ? '₹0' : CURRENCIES[currentCurrency].symbol + '0';

    const { symbol, locale } = CURRENCIES[currentCurrency];

    // Compact notation for large numbers (INR only)
    if (compact && currentCurrency === 'INR') {
        if (value >= 10000000) {
            return symbol + (value / 10000000).toFixed(2) + ' Cr';
        }
        if (value >= 100000) {
            return symbol + (value / 100000).toFixed(2) + ' L';
        }
    }

    const formatted = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
    }).format(Math.round(value));

    return symbol + formatted;
}

/**
 * Format number for display in input fields (no currency symbol).
 * @param {number} value
 * @returns {string}
 */
function formatAmountInput(value) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    const { locale } = CURRENCIES[currentCurrency];
    return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
    }).format(Math.round(value));
}

/**
 * Parse a formatted number string back to a number.
 * Removes commas, spaces, currency symbols.
 * @param {string} str
 * @returns {number}
 */
function parseFormattedNumber(str) {
    if (!str || typeof str !== 'string') return NaN;
    const cleaned = str.replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned);
}


/* ===== SLIDER UTILITIES ===== */

/**
 * Update the slider's background gradient to show filled track.
 * @param {HTMLInputElement} slider
 */
function updateSliderFill(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;

    slider.style.background = `linear-gradient(to right, 
        #6366f1 0%, #8b5cf6 ${percent}%, 
        var(--bg-slider-track) ${percent}%, var(--bg-slider-track) 100%)`;
}


/* ===== THEME MANAGEMENT ===== */

/**
 * Initialize theme from localStorage or system preference.
 */
function initTheme() {
    try {
        const savedTheme = localStorage.getItem('emi-calc-theme');
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    } catch (_e) {
        // Ignore localStorage errors
    }
}

/**
 * Toggle between dark and light theme.
 */
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);

    try {
        localStorage.setItem('emi-calc-theme', next);
    } catch (_e) {
        // Ignore localStorage errors
    }

    // Update all sliders on theme change (colors change)
    updateAllSliderFills();
}

/**
 * Update all sliders on page when theme changes.
 */
function updateAllSliderFills() {
    document.querySelectorAll('.slider').forEach(slider => {
        updateSliderFill(slider);
    });
}


/* ===== CURRENCY MANAGEMENT ===== */

/**
 * Set the current currency and update all displayed values.
 * @param {string} currency - Currency code (INR, USD, EUR, GBP)
 */
function setCurrency(currency) {
    if (!CURRENCIES[currency]) return;
    currentCurrency = currency;

    // Update all currency symbols
    document.querySelectorAll('.currency-symbol').forEach(el => {
        el.textContent = CURRENCIES[currency].symbol;
    });

    // Trigger recalculation on pages that have calculation logic
    if (typeof updateResults === 'function') {
        updateResults();
    }
}

/**
 * Setup currency selector event listeners.
 */
function setupCurrencyListener() {
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            setCurrency(e.target.value);
        });
    }
}


/* ===== THEME TOGGLE SETUP ===== */

/**
 * Setup theme toggle button event listener.
 */
function setupThemeListener() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            toggleTheme();
            // Update sliders if they exist
            updateAllSliderFills();
        });
    }
}


/* ===== NAVIGATION ACTIVE STATE ===== */

/**
 * Set the active navigation link based on current page.
 * @param {string} page - Page identifier (calculator, eligibility, etc.)
 */
function setActiveNavLink(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Auto-detect current page and set active nav link.
 */
function autoSetActiveNav() {
    const filename = window.location.pathname.split('/').pop() || 'calculator.html';
    
    if (filename.includes('eligibility')) {
        setActiveNavLink('eligibility');
    } else if (filename.includes('login')) {
        // Login page has no active nav state
    } else {
        setActiveNavLink('calculator');
    }
}


/* ===== FORM VALIDATION ===== */

/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Indian phone number format.
 * @param {string} phone
 * @returns {boolean}
 */
function isValidIndianPhone(phone) {
    const phoneRegex = /^(\+91[\-\s]?)?[0-9]{10}$/;
    const cleaned = phone.replace(/[\s\-+]/g, '');
    return cleaned.length === 10 && /^\d{10}$/.test(cleaned);
}

/**
 * Validate password strength.
 * Must be at least 8 chars, 1 uppercase, 1 number, 1 special char.
 * @param {string} password
 * @returns {object} - { isValid, requirements }
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
 * Sanitize user input to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


/* ===== INITIALIZATION ===== */

/**
 * Initialize all common utilities on page load.
 */
function initializeUtils() {
    initTheme();
    setupThemeListener();
    setupCurrencyListener();
    autoSetActiveNav();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUtils);
} else {
    initializeUtils();
}
