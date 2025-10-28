"use strict";
/**
 * Asset Fetcher Service
 * Safely fetches remote assets (JSON, images, fonts) with size limits and timeouts
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
exports.AssetFetcherService = void 0;
const node_fetch_1 = require("node-fetch");
const security_validator_service_1 = require("./security-validator.service");
const https = require("https");
const config_1 = require("../config");
const httpsAgent = config_1.default.environment === 'development'
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;
class AssetFetcherService {
    constructor() {
        this.defaultTimeout = 10000; // 10 seconds
        this.defaultMaxSize = 10485760; // 10 MB
        this.securityValidator = new security_validator_service_1.SecurityValidatorService();
    }
    /**
     * Fetch JSON design from URL
     */
    fetchJson(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AssetFetcher] Fetching JSON from: ${url}`);
            // Security validation
            const validation = yield this.securityValidator.validateUrl(url, 'json');
            if (!validation.valid) {
                throw new Error(`Security validation failed: ${validation.error}`);
            }
            const timeout = (options === null || options === void 0 ? void 0 : options.timeout) || this.defaultTimeout;
            const maxSize = (options === null || options === void 0 ? void 0 : options.maxSize) || this.defaultMaxSize;
            const response = yield this.fetchWithTimeout(url, timeout, options === null || options === void 0 ? void 0 : options.userAgent);
            // Validate content type
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
                console.warn(`[AssetFetcher] Unexpected content-type for JSON: ${contentType}`);
            }
            // Check content length
            yield this.validateContentLength(response, maxSize);
            // Read response as text first to check size
            const text = yield response.text();
            if (text.length > maxSize) {
                throw new Error(`JSON size exceeds maximum: ${text.length} > ${maxSize} bytes`);
            }
            const data = JSON.parse(text);
            console.log(`[AssetFetcher] JSON fetched successfully: ${text.length} bytes`);
            return {
                data,
                contentType,
                size: text.length,
            };
        });
    }
    /**
     * Fetch binary asset (image, font) from URL
     */
    fetchBinary(url, assetType, options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AssetFetcher] Fetching ${assetType} from: ${url}`);
            // Security validation
            const validation = yield this.securityValidator.validateUrl(url, assetType);
            if (!validation.valid) {
                throw new Error(`Security validation failed: ${validation.error}`);
            }
            const timeout = (options === null || options === void 0 ? void 0 : options.timeout) || this.defaultTimeout;
            const maxSize = (options === null || options === void 0 ? void 0 : options.maxSize) || this.defaultMaxSize;
            const response = yield this.fetchWithTimeout(url, timeout, options === null || options === void 0 ? void 0 : options.userAgent);
            // Validate content type
            const contentType = response.headers.get('content-type') || '';
            this.validateContentType(contentType, assetType);
            // Check content length
            yield this.validateContentLength(response, maxSize);
            // Stream response with size checking
            const buffer = yield response.buffer();
            if (buffer.length > maxSize) {
                throw new Error(`${assetType} size exceeds maximum: ${buffer.length} > ${maxSize} bytes`);
            }
            console.log(`[AssetFetcher] ${assetType} fetched successfully: ${buffer.length} bytes`);
            return {
                data: buffer,
                contentType,
                size: buffer.length,
            };
        });
    }
    /**
     * Fetch with timeout using AbortController
     */
    fetchWithTimeout(url, timeout, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            console.log(`[AssetFetcher] Fetching URL with timeout ${timeout}ms: ${url}`);
            try {
                const response = yield (0, node_fetch_1.default)(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': userAgent || 'CraftersUp-Canvas-Renderer/1.0',
                    },
                    redirect: 'follow',
                    follow: 3,
                    agent: httpsAgent, // ADD THIS LINE - Use agent for self-signed certs in dev
                });
                console.log(`[AssetFetcher] Received response: ${response.status} ${response.statusText} for URL: ${url}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            }
            catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${timeout}ms`);
                }
                throw error;
            }
            finally {
                clearTimeout(timeoutId);
            }
        });
    }
    /**
     * Validate content length header
     */
    validateContentLength(response, maxSize) {
        return __awaiter(this, void 0, void 0, function* () {
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                const size = parseInt(contentLength, 10);
                if (size > maxSize) {
                    throw new Error(`Content-Length exceeds maximum: ${size} > ${maxSize} bytes`);
                }
            }
        });
    }
    /**
     * Validate content type for asset
     */
    validateContentType(contentType, assetType) {
        const normalized = contentType.toLowerCase();
        if (assetType === 'image') {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
            if (!validTypes.some(type => normalized.includes(type))) {
                throw new Error(`Invalid content-type for image: ${contentType}`);
            }
        }
        else if (assetType === 'font') {
            const validTypes = ['font/', 'application/font', 'application/x-font', 'application/octet-stream'];
            if (!validTypes.some(type => normalized.includes(type))) {
                console.warn(`[AssetFetcher] Unexpected content-type for font: ${contentType}`);
                // Don't fail - some servers use generic content-types for fonts
            }
        }
    }
    /**
     * Batch fetch multiple assets
     */
    fetchMultiple(urls, options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AssetFetcher] Fetching ${urls.length} assets in parallel`);
            const promises = urls.map(({ url, type }) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (type === 'json') {
                        return yield this.fetchJson(url, options);
                    }
                    else {
                        return yield this.fetchBinary(url, type, options);
                    }
                }
                catch (error) {
                    console.error(`[AssetFetcher] Failed to fetch ${type} from ${url}:`, error);
                    throw error;
                }
            }));
            return Promise.all(promises);
        });
    }
}
exports.AssetFetcherService = AssetFetcherService;
//# sourceMappingURL=asset-fetcher.service.js.map