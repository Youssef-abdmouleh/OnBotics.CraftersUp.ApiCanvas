"use strict";
/**
 * Canvas Renderer Routes
 * Handles server-side canvas rendering requests
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
const express = require("express");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
const node_fetch_1 = require("node-fetch");
const https = require("https");
const canvas_renderer_node_adapter_1 = require("../services/canvas-renderer-node.adapter");
const asset_fetcher_service_1 = require("../services/asset-fetcher.service");
const security_validator_service_1 = require("../services/security-validator.service");
const config_1 = require("../config");
const font_manager_1 = require("../services/font-manager");
const router = express.Router();
// Services
const assetFetcher = new asset_fetcher_service_1.AssetFetcherService();
const securityValidator = new security_validator_service_1.SecurityValidatorService();
// HTTPS agent for development (accepts self-signed certs)
const httpsAgent = config_1.default.environment === 'development'
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;
/**
 * POST /api/canvas/render-preview
 * Render a canvas design from JSON URL and generate preview image
 */
router.post('/canvas/render-preview', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const requestId = req.requestId || (0, uuid_1.v4)();
    const startTime = Date.now();
    console.log(`[${requestId}] Canvas render request received`);
    try {
        // Parse request body
        const request = req.body;
        // Step 1: Validate request
        console.log(`[${requestId}] Step 1: Validating request`);
        const validationErrors = yield validateRenderRequest(request);
        if (validationErrors.length > 0) {
            throw {
                message: validationErrors.join('; '),
                code: 'VALIDATION_ERROR',
                status: 400,
            };
        }
        // Step 2: Fetch JSON design from URL
        console.log(`[${requestId}] Step 2: Fetching design JSON from ${request.jsonDesignUrl}`);
        const designResult = yield assetFetcher.fetchJson(request.jsonDesignUrl, {
            timeout: ((_a = request.options) === null || _a === void 0 ? void 0 : _a.timeout) || 100000,
            maxSize: ((_b = request.options) === null || _b === void 0 ? void 0 : _b.maxAssetSize) || 5242880, // 5 MB default for JSON
        });
        const designJson = designResult.data;
        // Validate design JSON structure
        if (!designJson.fabricData || !designJson.customMetadata) {
            throw {
                message: 'Invalid design JSON: missing fabricData or customMetadata',
                code: 'INVALID_DESIGN_JSON',
                status: 400,
            };
        }
        // Step 3: Extract font references from design (now async!)
        console.log(`[${requestId}] Step 3: Extracting and resolving font references`);
        const fonts = yield extractFontsFromDesign(designJson);
        console.log(`[${requestId}] Found ${fonts.length} unique fonts:`);
        fonts.forEach((font, idx) => {
            console.log(`[${requestId}]   Font ${idx + 1}: ${font.designation} (ID: ${font.idFont})`);
            console.log(`[${requestId}]   Expected name in fabric: ${font.expectedName}`);
            console.log(`[${requestId}]   URL: ${font.fontUrl}`);
        });
        // Step 4: Render canvas with timeout protection
        console.log(`[${requestId}] Step 4: Rendering canvas`);
        const adapter = new font_manager_1.FontManager(config_1.default.processing.tempDir || '/tmp/canvas-fonts');
        const renderer = new canvas_renderer_node_adapter_1.CanvasRendererNodeAdapter(adapter);
        // Add timeout protection (30 seconds for rendering)
        const RENDER_TIMEOUT = 30000;
        // Charger les polices
        for (const font of fonts) {
            yield renderer.loadFont(font);
        }
        // Créer le canvas
        const canvas = renderer.createCanvas(designJson.width || 800, designJson.height || 600);
        // Charger le design
        yield new Promise((resolve, reject) => {
            canvas.loadFromJSON(designJson, () => resolve(), (err) => reject(err));
        });
        // Exporter
        const result = yield renderer.exportCanvas(canvas);
        // Nettoyer
        renderer.cleanup();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Rendering timeout after ${RENDER_TIMEOUT}ms - loadFromJSON callback was not called. Check fabric initialization and font loading.`));
            }, RENDER_TIMEOUT);
        });
        console.log(`[${requestId}] Waiting for render with ${RENDER_TIMEOUT}ms timeout...`);
        const renderResult = yield Promise.race([canvas, timeoutPromise]);
        // Step 5: Save preview image
        console.log(`[${requestId}] Step 5: Saving preview image`);
        if (!result.buffer) {
            throw new Error('Render did not produce a buffer');
        }
        const filename = securityValidator.generatePreviewFilename(request.orderItemId);
        const previewPath = yield savePreviewImage(result.buffer, filename);
        const previewUrl = generatePreviewUrl(filename);
        // Step 6: Prepare response
        const processingTimeMs = Date.now() - startTime;
        console.log(`[${requestId}] Render completed in ${processingTimeMs}ms`);
        const response = {
            success: true,
            preview: {
                url: previewUrl,
                id: request.orderItemId,
                path: previewPath,
            },
            meta: {
                width: result.width,
                height: result.height,
                objectCount: result.objectCount,
                processingTimeMs,
                requestId,
            },
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error(`[${requestId} 111] Render failed:`);
        console.error(`[${requestId}] Render failed:`, error);
        const statusCode = error.status || 500;
        const errorResponse = {
            success: false,
            error: {
                message: error.message || 'Internal server error',
                code: error.code || 'INTERNAL_ERROR',
                requestId,
                details: config_1.default.environment === 'development' ? error.details : undefined,
                stack: config_1.default.environment === 'development' ? error.stack : undefined,
            },
        };
        res.status(statusCode).json(errorResponse);
    }
}));
/**
 * GET /api/canvas/health
 * Health check endpoint
 */
router.get('/canvas/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'canvas-renderer',
        timestamp: new Date().toISOString(),
    });
});
/**
 * Validate render request
 */
function validateRenderRequest(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const errors = [];
        // Validate jsonDesignUrl
        if (!request.jsonDesignUrl) {
            errors.push('jsonDesignUrl is required');
        }
        else {
            const urlValidation = yield securityValidator.validateUrl(request.jsonDesignUrl, 'json');
            if (!urlValidation.valid) {
                errors.push(`Invalid jsonDesignUrl: ${urlValidation.error}`);
            }
        }
        // Validate orderItemId
        if (!request.orderItemId) {
            errors.push('orderItemId is required');
        }
        else {
            const guidValidation = securityValidator.validateGuid(request.orderItemId);
            if (!guidValidation.valid) {
                errors.push(`Invalid orderItemId: ${guidValidation.error}`);
            }
        }
        // Validate options
        if (request.options) {
            const timeoutValidation = securityValidator.validateTimeout(request.options.timeout, 60000);
            if (!timeoutValidation.valid) {
                errors.push(`Invalid timeout: ${timeoutValidation.error}`);
            }
            const sizeValidation = securityValidator.validateAssetSize(request.options.maxAssetSize, 52428800);
            if (!sizeValidation.valid) {
                errors.push(`Invalid maxAssetSize: ${sizeValidation.error}`);
            }
        }
        return errors;
    });
}
/**
 * Try to resolve a font identifier (could be name or GUID) to a GUID
 * Makes API call to C# backend to map font names to GUIDs
 */
function resolveFontNameToGuid(fontIdentifier) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if it's already a GUID format
        const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (guidPattern.test(fontIdentifier)) {
            return fontIdentifier; // Already a GUID
        }
        // Try to resolve via API
        try {
            const apiUrl = `https://localhost:44301/api/fonts/resolve-name?fontName=${encodeURIComponent(fontIdentifier)}`;
            console.log(`[FontResolver] Attempting to resolve "${fontIdentifier}" via API: ${apiUrl}`);
            const response = yield (0, node_fetch_1.default)(apiUrl, {
                timeout: 5000,
                headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
                agent: httpsAgent,
            });
            if (response.ok) {
                const guid = yield response.text();
                console.log(`[FontResolver] Resolved "${fontIdentifier}" → ${guid}`);
                return guid;
            }
            else {
                console.warn(`[FontResolver] API returned ${response.status} for font "${fontIdentifier}"`);
            }
        }
        catch (error) {
            console.warn(`[FontResolver] Failed to resolve font "${fontIdentifier}":`, error.message);
        }
        // If resolution fails, return original identifier
        // The font will still be fetched using this as GUID (will fail if not valid GUID)
        console.log(`[FontResolver] Using original identifier: "${fontIdentifier}"`);
        return fontIdentifier;
    });
}
/**
 * Extract font definitions from design JSON
 * Enhanced to handle nested groups and all text object types
 * NOW ASYNC: Resolves font names to GUIDs via API
 */
function extractFontsFromDesign(designJson) {
    return __awaiter(this, void 0, void 0, function* () {
        const fontMap = new Map();
        // Recursively traverse ALL objects including nested groups (now async)
        function traverseObjects(objects) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!objects)
                    return;
                for (const obj of objects) {
                    // Check for text objects (all types)
                    if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
                        const fontFamily = obj.fontFamily;
                        if (fontFamily && !fontMap.has(fontFamily)) {
                            // Resolve font name/GUID to actual GUID
                            const fontGuid = yield resolveFontNameToGuid(fontFamily);
                            fontMap.set(fontFamily, {
                                idFont: fontGuid,
                                designation: fontFamily,
                                expectedName: fontFamily,
                                fontUrl: `https://localhost:44301/ImageManagement/GetDocumentFileFont?tenantId=52&documentFileId=${fontGuid}&fontType=ttf`
                            });
                        }
                    }
                    // Recursively check groups
                    if (obj.type === 'group' && obj.objects) {
                        yield traverseObjects(obj.objects);
                    }
                }
            });
        }
        // Traverse fabric objects to find text objects with fonts
        if (designJson.fabricData && designJson.fabricData.objects) {
            yield traverseObjects(designJson.fabricData.objects);
        }
        return Array.from(fontMap.values());
    });
}
/**
 * Save preview image to storage
 */
function savePreviewImage(buffer, filename) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const storageDir = ((_a = config_1.default.storage) === null || _a === void 0 ? void 0 : _a.previewDir) || path.join(__dirname, '../storage/previews');
        // Ensure storage directory exists
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
            console.log(`[Storage] Created preview directory: ${storageDir}`);
        }
        const filePath = path.join(storageDir, filename);
        // Write file
        fs.writeFileSync(filePath, new Uint8Array(buffer));
        console.log(`[Storage] Saved preview image: ${filePath} (${buffer.length} bytes)`);
        return filePath;
    });
}
/**
 * Generate public URL for preview image
 */
function generatePreviewUrl(filename) {
    var _a;
    const baseUrl = ((_a = config_1.default.storage) === null || _a === void 0 ? void 0 : _a.baseUrl) || 'http://localhost:1337/storage';
    return `${baseUrl}/previews/${filename}`;
}
exports.default = router;
//# sourceMappingURL=canvas-renderer.js.map