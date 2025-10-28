"use strict";
/**
 * Security Validation Service
 * Provides SSRF protection, URL validation, and request sanitization
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityValidatorService = void 0;
const dns = require("dns");
const util_1 = require("util");
const url_1 = require("url");
const config_1 = require("../config");
const dnsLookup = (0, util_1.promisify)(dns.lookup);
class SecurityValidatorService {
    constructor() {
        // Private IP ranges to block (SSRF prevention)
        this.PRIVATE_IP_RANGES = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^127\./,
            /^169\.254\./,
            /^::1$/,
            /^fe80:/,
            /^fc00:/,
            /^fd00:/, // IPv6 private
        ];
        // Allowed protocols
        this.ALLOWED_PROTOCOLS = ['https:'];
        this.ALLOWED_PROTOCOLS_DEV = ['https:', 'http:']; // Allow HTTP in development
    }
    // Check if running in development mode
    isDevelopment() {
        const isDev = config_1.default.environment === 'development';
        console.log(`[SecurityValidator] Environment check: config.environment='${config_1.default.environment}', isDevelopment=${isDev}`);
        return isDev;
    }
    /**
     * Validate a URL for SSRF and protocol safety
     * In development mode: allows localhost and HTTP protocol
     * In production mode: enforces HTTPS and blocks localhost
     */
    validateUrl(urlString, assetType = 'json') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Parse URL
                const url = new url_1.URL(urlString);
                const isDev = this.isDevelopment();
                const isLocalhostUrl = this.isLocalhost(url.hostname);
                // 1. Protocol validation
                const allowedProtocols = isDev ? this.ALLOWED_PROTOCOLS_DEV : this.ALLOWED_PROTOCOLS;
                if (!allowedProtocols.includes(url.protocol)) {
                    return {
                        valid: false,
                        error: `Invalid protocol: ${url.protocol}. ${isDev ? 'Only HTTP/HTTPS allowed.' : 'Only HTTPS is allowed.'}`,
                        errorCode: 'INVALID_PROTOCOL',
                    };
                }
                // 2. Localhost validation (allow in development, block in production)
                if (isLocalhostUrl && !isDev) {
                    return {
                        valid: false,
                        error: 'Localhost URLs are not allowed in production.',
                        errorCode: 'LOCALHOST_NOT_ALLOWED',
                    };
                }
                // 3. DNS resolution check (SSRF prevention) - skip for localhost
                if (!isLocalhostUrl) {
                    try {
                        const { address } = yield dnsLookup(url.hostname);
                        if (this.isPrivateIP(address)) {
                            return {
                                valid: false,
                                error: `URL resolves to private IP: ${address}`,
                                errorCode: 'PRIVATE_IP_NOT_ALLOWED',
                            };
                        }
                    }
                    catch (dnsError) {
                        return {
                            valid: false,
                            error: `DNS lookup failed: ${dnsError.message}`,
                            errorCode: 'DNS_LOOKUP_FAILED',
                        };
                    }
                }
                else {
                    console.log(`[SecurityValidator] Development mode: Allowing localhost URL: ${urlString}`);
                }
                // 4. Port validation (flexible in development for localhost)
                if (url.port && url.port !== '443' && url.port !== '') {
                    // In development, allow non-standard ports for localhost
                    if (!isDev || !isLocalhostUrl) {
                        return {
                            valid: false,
                            error: `Non-standard port not allowed: ${url.port}`,
                            errorCode: 'INVALID_PORT',
                        };
                    }
                    console.log(`[SecurityValidator] Development mode: Allowing non-standard port ${url.port} for localhost`);
                }
                // Note: File extension validation removed as requested
                // The platform doesn't add asset types to URLs
                // Content-type will be validated when fetching the actual resource
                console.log(`[SecurityValidator] URL validated successfully: ${urlString}`);
                return { valid: true };
            }
            catch (error) {
                return {
                    valid: false,
                    error: `Invalid URL: ${error.message}`,
                    errorCode: 'INVALID_URL_FORMAT',
                };
            }
        });
    }
    /**
     * Check if hostname is localhost
     */
    isLocalhost(hostname) {
        const normalized = hostname.toLowerCase();
        return (normalized === 'localhost' ||
            normalized === '127.0.0.1' ||
            normalized === '::1' ||
            normalized === '0.0.0.0' ||
            normalized === '0000:0000:0000:0000:0000:0000:0000:0001');
    }
    /**
     * Check if IP address is in private range
     */
    isPrivateIP(ip) {
        return this.PRIVATE_IP_RANGES.some(pattern => pattern.test(ip));
    }
    /**
     * Validate order item ID (GUID format)
     */
    validateGuid(guid) {
        const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guid || !guidPattern.test(guid)) {
            return {
                valid: false,
                error: 'Invalid GUID format',
                errorCode: 'INVALID_GUID',
            };
        }
        return { valid: true };
    }
    /**
     * Validate timeout value
     */
    validateTimeout(timeout, maxTimeout = 60000) {
        if (timeout === undefined) {
            return { valid: true }; // Optional parameter
        }
        if (typeof timeout !== 'number' || timeout < 0) {
            return {
                valid: false,
                error: 'Timeout must be a positive number',
                errorCode: 'INVALID_TIMEOUT',
            };
        }
        if (timeout > maxTimeout) {
            return {
                valid: false,
                error: `Timeout exceeds maximum allowed: ${maxTimeout}ms`,
                errorCode: 'TIMEOUT_TOO_LARGE',
            };
        }
        return { valid: true };
    }
    /**
     * Validate asset size limit
     */
    validateAssetSize(size, maxSize = 52428800) {
        if (size === undefined) {
            return { valid: true }; // Optional parameter
        }
        if (typeof size !== 'number' || size < 0) {
            return {
                valid: false,
                error: 'Asset size must be a positive number',
                errorCode: 'INVALID_SIZE',
            };
        }
        if (size > maxSize) {
            return {
                valid: false,
                error: `Asset size exceeds maximum allowed: ${maxSize} bytes`,
                errorCode: 'SIZE_TOO_LARGE',
            };
        }
        return { valid: true };
    }
    /**
     * Sanitize filename for safe storage
     */
    sanitizeFilename(filename) {
        // Remove any path traversal attempts
        const basename = filename.replace(/^.*[\\\/]/, '');
        // Replace unsafe characters with underscores
        return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
    }
    /**
     * Generate safe preview filename
     */
    generatePreviewFilename(orderItemId) {
        const timestamp = Date.now();
        const sanitizedId = this.sanitizeFilename(orderItemId);
        return `${sanitizedId}-preview-${timestamp}.png`;
    }
}
exports.SecurityValidatorService = SecurityValidatorService;
//# sourceMappingURL=security-validator.service.js.map