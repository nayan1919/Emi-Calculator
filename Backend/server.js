/**
 * EMI Calculator Backend Server
 * =============================
 * Express.js API server with authentication, rate limiting, and CORS
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

/* ===================================================
   1. SECURITY MIDDLEWARE
   =================================================== */

// Helmet - Set security headers
app.use(helmet());

// CORS - Allow requests from frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ===================================================
   2. RATE LIMITING
   =================================================== */

// General rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Login rate limiter (stricter)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts. Please try again after 15 minutes.',
    skipSuccessfulRequests: false,
});

// Signup rate limiter
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 signup attempts per hour
    message: 'Too many signup attempts. Please try again later.',
});

// Apply general limiter to all routes
app.use(limiter);

/* ===================================================
   3. BODY PARSER MIDDLEWARE
   =================================================== */

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* ===================================================
   4. REQUEST LOGGING MIDDLEWARE
   =================================================== */

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/* ===================================================
   5. HEALTH CHECK ROUTE
   =================================================== */

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

/* ===================================================
   6. API ROUTES
   =================================================== */

// Authentication routes
app.use('/api/auth', authRoutes);

// Welcome message
app.get('/api', (req, res) => {
    res.status(200).json({
        message: 'EMI Calculator API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            signin: 'POST /api/auth/signin',
            signup: 'POST /api/auth/signup',
            logout: 'POST /api/auth/logout',
        },
    });
});

/* ===================================================
   7. 404 - NOT FOUND
   =================================================== */

app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.path,
        method: req.method,
    });
});

/* ===================================================
   8. ERROR HANDLING MIDDLEWARE
   =================================================== */

app.use(errorHandler);

/* ===================================================
   9. SERVER STARTUP
   =================================================== */

app.listen(PORT, () => {
    console.log(`\n✅ Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
});

module.exports = app;
