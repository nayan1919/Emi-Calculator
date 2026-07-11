/**
 * Login & Signup Form Handling
 * =============================
 * Client-side validation, tab switching, password strength checking,
 * and form submission handling.
 */

(function () {
    'use strict';

    /* ===================================================
       1. DOM REFERENCES
       =================================================== */

    const dom = {
        // Tabs
        authTabs: document.querySelectorAll('.auth-tab'),
        authPanels: document.querySelectorAll('.auth-panel'),

        // Sign In Form
        signInForm: document.getElementById('signin-form'),
        signInEmail: document.getElementById('signin-email'),
        signInPassword: document.getElementById('signin-password'),
        signInEmailError: document.getElementById('signin-email-error'),
        signInPasswordError: document.getElementById('signin-password-error'),

        // Sign Up Form
        signUpForm: document.getElementById('signup-form'),
        signUpFullName: document.getElementById('signup-fullname'),
        signUpEmail: document.getElementById('signup-email'),
        signUpPhone: document.getElementById('signup-phone'),
        signUpPassword: document.getElementById('signup-password'),
        signUpConfirmPassword: document.getElementById('signup-confirm-password'),
        signUpTerms: document.getElementById('signup-terms'),
        signUpFullNameError: document.getElementById('signup-fullname-error'),
        signUpEmailError: document.getElementById('signup-email-error'),
        signUpPhoneError: document.getElementById('signup-phone-error'),
        signUpPasswordError: document.getElementById('signup-password-error'),
        signUpConfirmPasswordError: document.getElementById('signup-confirm-password-error'),
        signUpTermsError: document.getElementById('signup-terms-error'),

        // Password requirements
        passwordRequirements: document.querySelectorAll('.requirement'),

        // Tab switchers
        tabSwitchers: document.querySelectorAll('.tab-switch-btn'),

        // Password toggles
        passwordToggles: document.querySelectorAll('.password-toggle'),
    };

    /* ===================================================
       2. TAB MANAGEMENT
       =================================================== */

    /**
     * Switch between Sign In and Sign Up tabs.
     */
    function switchTab(tabName) {
        // Update tab buttons
        dom.authTabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });

        // Update panels
        dom.authPanels.forEach(panel => {
            if (tabName === 'signin' && panel.id === 'sign-in-panel') {
                panel.classList.add('active');
                panel.removeAttribute('hidden');
            } else if (tabName === 'signup' && panel.id === 'sign-up-panel') {
                panel.classList.add('active');
                panel.removeAttribute('hidden');
            } else {
                panel.classList.remove('active');
                panel.setAttribute('hidden', '');
            }
        });

        // Clear errors when switching tabs
        clearAllErrors();
    }

    /* ===================================================
       3. PASSWORD VISIBILITY TOGGLE
       =================================================== */

    /**
     * Toggle password visibility.
     */
    function setupPasswordToggle(toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const inputField = toggleBtn.previousElementSibling;
            const eyeOpen = toggleBtn.querySelector('.eye-open');
            const eyeClosed = toggleBtn.querySelector('.eye-closed');

            if (inputField.type === 'password') {
                inputField.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'flex';
            } else {
                inputField.type = 'password';
                eyeOpen.style.display = 'flex';
                eyeClosed.style.display = 'none';
            }
        });
    }

    /* ===================================================
       4. SIGN IN VALIDATION & SUBMISSION
       =================================================== */

    /**
     * Validate sign in email field.
     */
    function validateSignInEmail() {
        const email = dom.signInEmail.value.trim();
        dom.signInEmailError.textContent = '';

        if (!email) {
            dom.signInEmailError.textContent = 'Email address is required.';
            return false;
        }

        if (!isValidEmail(email)) {
            dom.signInEmailError.textContent = 'Please enter a valid email address.';
            return false;
        }

        return true;
    }

    /**
     * Validate sign in password field.
     */
    function validateSignInPassword() {
        const password = dom.signInPassword.value;
        dom.signInPasswordError.textContent = '';

        if (!password) {
            dom.signInPasswordError.textContent = 'Password is required.';
            return false;
        }

        if (password.length < 6) {
            dom.signInPasswordError.textContent = 'Password must be at least 6 characters.';
            return false;
        }

        return true;
    }

    /**
     * Validate entire sign in form.
     */
    function validateSignInForm() {
        return validateSignInEmail() && validateSignInPassword();
    }

    /**
     * Handle sign in form submission.
     */
    function handleSignInSubmit(e) {
        e.preventDefault();

        if (!validateSignInForm()) {
            return;
        }

        const formData = {
            email: dom.signInEmail.value.trim(),
            password: dom.signInPassword.value,
        };

        submitSignIn(formData);
    }

    /**
     * Submit sign in request to backend.
     */
    function submitSignIn(formData) {
        const submitBtn = dom.signInForm.querySelector('button[type="submit"]');
        const spinner = submitBtn.querySelector('.loading-spinner');
        const btnText = submitBtn.querySelector('span');

        // Show loading state
        submitBtn.disabled = true;
        spinner.style.display = 'flex';
        btnText.style.display = 'none';

        // Simulate API call (replace with actual API endpoint)
        
        fetch("http://localhost:5000/api/auth/signin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    // Store token if provided
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }

                    // Redirect to calculator
                    window.location.href = data.redirect || 'calculator.html';
                } else {
                    // Show error
                    dom.signInPasswordError.textContent = data.message || 'Invalid email or password.';
                }
            })
            .catch(err => {
                console.error('Sign in error:', err);
                dom.signInPasswordError.textContent = 'An error occurred. Please try again.';
            })
            .finally(() => {
                // Hide loading state
                submitBtn.disabled = false;
                spinner.style.display = 'none';
                btnText.style.display = 'inline';
            });
    }

    /* ===================================================
       5. SIGN UP VALIDATION & SUBMISSION
       =================================================== */

    /**
     * Validate full name.
     */
    function validateSignUpFullName() {
        const fullName = dom.signUpFullName.value.trim();
        dom.signUpFullNameError.textContent = '';

        if (!fullName) {
            dom.signUpFullNameError.textContent = 'Full name is required.';
            return false;
        }

        if (fullName.length < 3) {
            dom.signUpFullNameError.textContent = 'Name must be at least 3 characters.';
            return false;
        }

        if (/\d/.test(fullName)) {
            dom.signUpFullNameError.textContent = 'Name cannot contain numbers.';
            return false;
        }

        return true;
    }

    /**
     * Validate sign up email.
     */
    function validateSignUpEmail() {
        const email = dom.signUpEmail.value.trim();
        dom.signUpEmailError.textContent = '';

        if (!email) {
            dom.signUpEmailError.textContent = 'Email address is required.';
            return false;
        }

        if (!isValidEmail(email)) {
            dom.signUpEmailError.textContent = 'Please enter a valid email address.';
            return false;
        }

        return true;
    }

    /**
     * Validate phone number.
     */
    function validateSignUpPhone() {
        const phone = dom.signUpPhone.value.trim();
        dom.signUpPhoneError.textContent = '';

        if (!phone) {
            dom.signUpPhoneError.textContent = 'Mobile number is required.';
            return false;
        }

        if (!isValidIndianPhone(phone)) {
            dom.signUpPhoneError.textContent = 'Please enter a valid 10-digit Indian mobile number.';
            return false;
        }

        return true;
    }

    /**
     * Validate sign up password.
     */
    function validateSignUpPassword() {
        const password = dom.signUpPassword.value;
        dom.signUpPasswordError.textContent = '';

        if (!password) {
            dom.signUpPasswordError.textContent = 'Password is required.';
            return false;
        }

        const { isValid } = validatePassword(password);

        if (!isValid) {
            dom.signUpPasswordError.textContent = 'Password does not meet requirements.';
            return false;
        }

        return true;
    }

    /**
     * Validate confirm password.
     */
    function validateSignUpConfirmPassword() {
        const password = dom.signUpPassword.value;
        const confirmPassword = dom.signUpConfirmPassword.value;
        dom.signUpConfirmPasswordError.textContent = '';

        if (!confirmPassword) {
            dom.signUpConfirmPasswordError.textContent = 'Please confirm your password.';
            return false;
        }

        if (password !== confirmPassword) {
            dom.signUpConfirmPasswordError.textContent = 'Passwords do not match.';
            return false;
        }

        return true;
    }

    /**
     * Validate terms checkbox.
     */
    function validateSignUpTerms() {
        dom.signUpTermsError.textContent = '';

        if (!dom.signUpTerms.checked) {
            dom.signUpTermsError.textContent = 'Please accept the terms and conditions.';
            return false;
        }

        return true;
    }

    /**
     * Validate entire sign up form.
     */
    function validateSignUpForm() {
        return (
            validateSignUpFullName() &&
            validateSignUpEmail() &&
            validateSignUpPhone() &&
            validateSignUpPassword() &&
            validateSignUpConfirmPassword() &&
            validateSignUpTerms()
        );
    }

    /**
     * Handle sign up form submission.
     */
    function handleSignUpSubmit(e) {
        e.preventDefault();

        if (!validateSignUpForm()) {
            return;
        }

        const formData = {
            fullName: dom.signUpFullName.value.trim(),
            email: dom.signUpEmail.value.trim(),
            phoneNumber: dom.signUpPhone.value.trim(),
            password: dom.signUpPassword.value,
        };

        submitSignUp(formData);
    }

    /**
     * Submit sign up request to backend.
     */
    function submitSignUp(formData) {
        const submitBtn = dom.signUpForm.querySelector('button[type="submit"]');
        const spinner = submitBtn.querySelector('.loading-spinner');
        const btnText = submitBtn.querySelector('span');

        // Show loading state
        submitBtn.disabled = true;
        spinner.style.display = 'flex';
        btnText.style.display = 'none';

        // Simulate API call (replace with actual API endpoint)
        fetch("http://localhost:5000/api/auth/signup", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    // Store token if provided
                    if (data.token) {
                        localStorage.setItem('authToken', data.token);
                    }

                    // Redirect to calculator
                    window.location.href = data.redirect || 'calculator.html';
                } else {
                    // Show specific field error if provided
                    if (data.field && data.field === 'email') {
                        dom.signUpEmailError.textContent = data.message || 'This email is already registered.';
                    } else {
                        dom.signUpPasswordError.textContent = data.message || 'An error occurred. Please try again.';
                    }
                }
            })
            .catch(err => {
                console.error('Sign up error:', err);
                dom.signUpPasswordError.textContent = 'An error occurred. Please try again.';
            })
            .finally(() => {
                // Hide loading state
                submitBtn.disabled = false;
                spinner.style.display = 'none';
                btnText.style.display = 'inline';
            });
    }

    /* ===================================================
       6. PASSWORD STRENGTH INDICATOR
       =================================================== */

    /**
     * Update password requirement indicators.
     */
    function updatePasswordRequirements() {
        const password = dom.signUpPassword.value;
        const { requirements } = validatePassword(password);

        dom.passwordRequirements.forEach(req => {
            const check = req.dataset.check;
            if (requirements[check]) {
                req.classList.add('met');
            } else {
                req.classList.remove('met');
            }
        });
    }

    /* ===================================================
       7. ERROR HANDLING
       =================================================== */

    /**
     * Clear all form errors.
     */
    function clearAllErrors() {
        [
            dom.signInEmailError,
            dom.signInPasswordError,
            dom.signUpFullNameError,
            dom.signUpEmailError,
            dom.signUpPhoneError,
            dom.signUpPasswordError,
            dom.signUpConfirmPasswordError,
            dom.signUpTermsError,
        ].forEach(errorEl => {
            errorEl.textContent = '';
        });
    }

    /**
     * Clear field error on input.
     */
    function clearFieldError(input, errorEl) {
        input.addEventListener('input', () => {
            errorEl.textContent = '';
        });
    }

    /* ===================================================
       8. EVENT BINDING
       =================================================== */

    function bindEvents() {
        // Tab switching
        dom.authTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        dom.tabSwitchers.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(btn.dataset.switchTo);
            });
        });

        // Password toggles
        dom.passwordToggles.forEach(toggle => {
            setupPasswordToggle(toggle);
        });

        // Sign In Form
        if (dom.signInForm) {
            dom.signInForm.addEventListener('submit', handleSignInSubmit);

            // Real-time validation
            dom.signInEmail.addEventListener('blur', validateSignInEmail);
            dom.signInPassword.addEventListener('blur', validateSignInPassword);

            // Clear errors on input
            clearFieldError(dom.signInEmail, dom.signInEmailError);
            clearFieldError(dom.signInPassword, dom.signInPasswordError);
        }

        // Sign Up Form
        if (dom.signUpForm) {
            dom.signUpForm.addEventListener('submit', handleSignUpSubmit);

            // Real-time validation
            dom.signUpFullName.addEventListener('blur', validateSignUpFullName);
            dom.signUpEmail.addEventListener('blur', validateSignUpEmail);
            dom.signUpPhone.addEventListener('blur', validateSignUpPhone);
            dom.signUpPassword.addEventListener('blur', validateSignUpPassword);
            dom.signUpPassword.addEventListener('input', updatePasswordRequirements);
            dom.signUpConfirmPassword.addEventListener('blur', validateSignUpConfirmPassword);
            dom.signUpTerms.addEventListener('change', validateSignUpTerms);

            // Clear errors on input
            clearFieldError(dom.signUpFullName, dom.signUpFullNameError);
            clearFieldError(dom.signUpEmail, dom.signUpEmailError);
            clearFieldError(dom.signUpPhone, dom.signUpPhoneError);
            clearFieldError(dom.signUpPassword, dom.signUpPasswordError);
            clearFieldError(dom.signUpConfirmPassword, dom.signUpConfirmPasswordError);
        }
    }

    /* ===================================================
       9. INITIALIZATION
       =================================================== */

    function init() {
        bindEvents();
        // Set Sign In as default active tab
        switchTab('signin');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
