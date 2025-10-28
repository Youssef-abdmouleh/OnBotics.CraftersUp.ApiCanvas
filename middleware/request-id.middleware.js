"use strict";
/**
 * Request ID Middleware
 * Generates or extracts correlation ID for request tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const uuid_1 = require("uuid");
/**
 * Add request ID to each request for tracking
 */
function requestIdMiddleware(req, res, next) {
    // Use existing request ID from header, or generate new one
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    // Attach to request object
    req.requestId = requestId;
    // Add to response headers
    res.setHeader('x-request-id', requestId);
    next();
}
//# sourceMappingURL=request-id.middleware.js.map