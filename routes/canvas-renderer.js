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
const canvas_renderer_core_service_1 = require("../services/canvas-renderer-core.service");
const canvas_renderer_node_adapter_1 = require("../services/canvas-renderer-node.adapter");
const asset_fetcher_service_1 = require("../services/asset-fetcher.service");
const security_validator_service_1 = require("../services/security-validator.service");
const config_1 = require("../config");
const router = express.Router();
// Services
const assetFetcher = new asset_fetcher_service_1.AssetFetcherService();
const securityValidator = new security_validator_service_1.SecurityValidatorService();
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
        // Step 3: Extract font references from design
        console.log(`[${requestId}] Step 3: Extracting font references`);
        const fonts = extractFontsFromDesign(designJson);
        console.log(`[${requestId}] Found ${fonts.length} unique fonts:`);
        fonts.forEach((font, idx) => {
            console.log(`[${requestId}]   Font ${idx + 1}: ${font.designation} (ID: ${font.idFont})`);
            console.log(`[${requestId}]   URL: ${font.fontUrl}`);
        });
        // Step 4: Render canvas with timeout protection
        console.log(`[${requestId}] Step 4: Rendering canvas`);
        const adapter = new canvas_renderer_node_adapter_1.CanvasRendererNodeAdapter(config_1.default.processing.tempDir || '/tmp/canvas-fonts');
        const renderer = new canvas_renderer_core_service_1.CanvasRendererCore(adapter);
        // Add timeout protection (30 seconds for rendering)
        const RENDER_TIMEOUT = 30000;
        const renderPromise = renderer.render({
            jsonDesign: designJson,
            fonts,
            environment: 'node',
        });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Rendering timeout after ${RENDER_TIMEOUT}ms - loadFromJSON callback was not called. Check fabric initialization and font loading.`));
            }, RENDER_TIMEOUT);
        });
        console.log(`[${requestId}] Waiting for render with ${RENDER_TIMEOUT}ms timeout...`);
        const renderResult = yield Promise.race([renderPromise, timeoutPromise]);
        // Step 5: Save preview image
        console.log(`[${requestId}] Step 5: Saving preview image`);
        if (!renderResult.buffer) {
            throw new Error('Render did not produce a buffer');
        }
        const filename = securityValidator.generatePreviewFilename(request.orderItemId);
        const previewPath = yield savePreviewImage(renderResult.buffer, filename);
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
                width: renderResult.width,
                height: renderResult.height,
                objectCount: renderResult.objectCount,
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
 * Extract font definitions from design JSON
 * Enhanced to handle nested groups and all text object types
 */
function extractFontsFromDesign(designJson) {
    const fontMap = new Map();
    // Recursively traverse ALL objects including nested groups
    function traverseObjects(objects) {
        if (!objects)
            return;
        objects.forEach((obj) => {
            // Check for text objects (all types)
            if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
                const fontFamily = obj.fontFamily;
                if (fontFamily && !fontMap.has(fontFamily)) {
                    // For now, we assume fonts are already registered or available
                    // In a production system, you'd maintain a font registry
                    // https://localhost:44301/ImageManagement/GetDocumentFileFont?tenantId=52&documentFileId=b8b8629e-0234-49b6-b1f5-5e953c531098&fontType=ttf
                    fontMap.set(fontFamily, {
                        idFont: fontFamily,
                        designation: fontFamily,
                        fontUrl: `https://localhost:44301/ImageManagement/GetDocumentFileFont?tenantId=52&documentFileId=${fontFamily}&fontType=ttf`, // Font URL would come from a font registry service
                    });
                }
            }
            // Recursively check groups
            if (obj.type === 'group' && obj.objects) {
                traverseObjects(obj.objects);
            }
        });
    }
    // Traverse fabric objects to find text objects with fonts
    if (designJson.fabricData && designJson.fabricData.objects) {
        traverseObjects(designJson.fabricData.objects);
    }
    return Array.from(fontMap.values());
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