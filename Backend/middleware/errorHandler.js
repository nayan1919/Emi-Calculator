/**
 * Error Handler Middleware
 * ========================
 * Centralized error handling for all routes
 */

/**
 * Global error handler middleware
 * Should be the last middleware in the chain
 */
function errorHandler(err, req, res, next) {
    console.error('❌ Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Default error response
    const errorResponse = {
        status: 'error',
        message: err.message || 'An unexpected error occurred',
    };

    // Database errors
    if (err.code === 'ER_DUPLICATE_ENTRY') {
        return res.status(409).json({
            ...errorResponse,
            message: 'This email or phone number is already registered',
        });
    }

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(500).json({
            ...errorResponse,
            message: 'Database connection error',
        });
    }

    if (err.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({
            ...errorResponse,
            message: 'Database schema error',
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            ...errorResponse,
            message: 'Invalid token',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            ...errorResponse,
            message: 'Token expired',
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            ...errorResponse,
            message: 'Validation failed',
            details: err.details,
        });
    }

    // Default 500 error
    return res.status(err.statusCode || 500).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = errorHandler;
module.exports.asyncHandler = asyncHandler;
