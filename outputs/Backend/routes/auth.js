/**
 * Authentication Routes
 * =====================
 * POST /signin - Sign in existing user
 * POST /signup - Create new user account
 * POST /logout - Sign out user
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { query } = require('../config/database');
const { validateEmail, validatePhone, validatePassword } = require('../utils/validators');

const router = express.Router();

/* ===================================================
   RATE LIMITERS
   =================================================== */

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many signup attempts. Please try again later.',
});

const signinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many login attempts. Please try again after 15 minutes.',
});

/* ===================================================
   MIDDLEWARE
   =================================================== */

/**
 * Generate JWT token
 */
function generateToken(userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/* ===================================================
   SIGN UP ROUTE
   =================================================== */

router.post(
    '/signup',
    signupLimiter,
    [
        body('fullName')
            .trim()
            .notEmpty().withMessage('Full name is required')
            .isLength({ min: 3 }).withMessage('Name must be at least 3 characters')
            .matches(/^[a-zA-Z\s]*$/).withMessage('Name cannot contain numbers or special characters'),

        body('email')
            .trim()
            .toLowerCase()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format')
            .custom(validateEmail).withMessage('Invalid email format'),

        body('phoneNumber')
            .trim()
            .notEmpty().withMessage('Phone number is required')
            .custom(validatePhone).withMessage('Invalid phone number format. Must be 10 digits'),

        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .custom(validatePassword).withMessage('Password must contain uppercase letter, number, and special character'),
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    message: errors.array()[0].msg,
                    field: errors.array()[0].param,
                });
            }

            const { fullName, email, phoneNumber, password } = req.body;

            // Check if email already exists
            const existingEmail = await query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingEmail.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Email already registered',
                    field: 'email',
                });
            }

            // Check if phone already exists
            const existingPhone = await query('SELECT id FROM users WHERE phone_number = ?', [phoneNumber]);
            if (existingPhone.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Phone number already registered',
                    field: 'phoneNumber',
                });
            }

            // Hash password
            const passwordHash = await hashPassword(password);

            // Create user
            const result = await query(
                'INSERT INTO users (full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?)',
                [fullName, email, phoneNumber, passwordHash]
            );

            const userId = result.insertId;

            // Generate JWT token
            const token = generateToken(userId);

            // Save session
            await query(
                'INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                [userId, token, req.ip, req.get('user-agent')]
            );

            console.log(`✅ New user created: ${email}`);

            return res.status(201).json({
                status: 'success',
                message: 'Account created successfully',
                userId,
                token,
                user: {
                    id: userId,
                    fullName,
                    email,
                },
                redirect: '/calculator.html',
            });
        } catch (error) {
            console.error('❌ Signup Error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'An error occurred during signup. Please try again.',
            });
        }
    }
);

/* ===================================================
   SIGN IN ROUTE
   =================================================== */

router.post(
    '/signin',
    signinLimiter,
    [
        body('email')
            .trim()
            .toLowerCase()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format'),

        body('password')
            .notEmpty().withMessage('Password is required'),
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 'error',
                    message: errors.array()[0].msg,
                });
            }

            const { email, password } = req.body;

            // Find user by email
            const users = await query('SELECT * FROM users WHERE email = ?', [email]);

            if (users.length === 0) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password',
                });
            }

            const user = users[0];

            // Check if user is active
            if (!user.is_active) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Account has been deactivated',
                });
            }

            // Compare passwords
            const isPasswordValid = await comparePassword(password, user.password_hash);

            if (!isPasswordValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password',
                });
            }

            // Generate JWT token
            const token = generateToken(user.id);

            // Update last login
            await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

            // Save session
            await query(
                'INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                [user.id, token, req.ip, req.get('user-agent')]
            );

            console.log(`✅ User signed in: ${email}`);

            return res.status(200).json({
                status: 'success',
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                },
                redirect: '/calculator.html',
            });
        } catch (error) {
            console.error('❌ Signin Error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'An error occurred during signin. Please try again.',
            });
        }
    }
);

/* ===================================================
   LOGOUT ROUTE
   =================================================== */

router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
            // Decode token to get user ID
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            
            // Delete session
            await query('DELETE FROM sessions WHERE user_id = ? AND token_hash = ?', [decoded.userId, token]);

            console.log(`✅ User signed out: ${decoded.userId}`);
        }

        return res.status(200).json({
            status: 'success',
            message: 'Logged out successfully',
            redirect: '/login.html',
        });
    } catch (error) {
        console.error('❌ Logout Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'An error occurred during logout.',
        });
    }
});

module.exports = router;
