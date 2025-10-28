"use strict";
/**
 * Simple Authentication Middleware
 * TODO: Replace with proper authentication system for production
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const config_1 = require("../config");
/**
 * Basic authentication middleware
 * Checks for Basic Auth header with configured username/password
 */
function authMiddleware(req, res, next) {
    // Skip auth if disabled
    if (!config_1.default.auth.enabled) {
        return next();
    }
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.status(401).json({
            success: false,
            error: {
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
                requestId: req.requestId,
            },
        });
        return;
    }
    try {
        // Decode Base64 credentials
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        // Validate credentials
        if (username === config_1.default.auth.username && password === config_1.default.auth.password) {
            return next();
        }
        else {
            res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid credentials',
                    code: 'AUTH_INVALID',
                    requestId: req.requestId,
                },
            });
        }
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: {
                message: 'Invalid authentication format',
                code: 'AUTH_FORMAT_INVALID',
                requestId: req.requestId,
            },
        });
    }
}
//# sourceMappingURL=auth.middleware.js.map