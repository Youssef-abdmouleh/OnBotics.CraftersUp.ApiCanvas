"use strict";
/**
 * DXF Processing API Routes
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
const dxf_processor_service_1 = require("../services/dxf-processor.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const config_1 = require("../config");
const router = express.Router();
// Progress tracking storage (in-memory)
// TODO: Replace with Redis or similar for multi-instance deployments
const progressStore = new Map();
/**
 * POST /api/process-dxf
 * Process glyph models and return combined DXF model
 */
router.post('/process-dxf', auth_middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const requestId = req.requestId;
    const startTime = Date.now();
    console.log(`[${requestId}] DXF processing request received`);
    try {
        // Validate request body
        const { textObjects } = req.body;
        if (!textObjects) {
            const errorResponse = {
                success: false,
                error: {
                    message: 'Missing required field: textObjects',
                    code: 'VALIDATION_ERROR',
                    requestId,
                },
            };
            return res.status(400).json(errorResponse);
        }
        if (!(0, dxf_processor_service_1.validateDxfInput)(textObjects)) {
            const errorResponse = {
                success: false,
                error: {
                    message: 'Invalid textObjects format. Expected array of objects with glyphModels, angle, x, y',
                    code: 'VALIDATION_ERROR',
                    requestId,
                },
            };
            return res.status(400).json(errorResponse);
        }
        console.log(`[${requestId}] Processing ${textObjects.length} text objects`);
        // Set up timeout (COMMENTED OUT FOR PERFORMANCE TESTING)
        // Uncomment this in production to prevent long-running requests
        // const timeoutPromise = new Promise((_, reject) => {
        //   setTimeout(() => {
        //     reject(new Error(`Processing timeout after ${config.processing.timeoutMs}ms`));
        //   }, config.processing.timeoutMs);
        // });
        // Process with progress tracking
        const processingPromise = new Promise((resolve, reject) => {
            try {
                const result = (0, dxf_processor_service_1.processDxfGlyphs)(textObjects, (progress) => {
                    // Store progress for polling endpoint
                    progressStore.set(requestId, progress);
                    console.log(`[${requestId}] Progress: ${progress.progress}% - ${progress.message}`);
                });
                resolve(result);
            }
            catch (error) {
                reject(error);
            }
        });
        // Process without timeout for performance testing
        // In production, use: Promise.race([processingPromise, timeoutPromise])
        const result = yield processingPromise;
        const processingTime = Date.now() - startTime;
        console.log(`[${requestId}] Processing completed in ${processingTime}ms`);
        // Clean up progress data
        progressStore.delete(requestId);
        // Return success response
        const response = {
            success: true,
            result,
            meta: {
                processedAt: new Date().toISOString(),
                itemCount: textObjects.length,
                requestId,
                processingTimeMs: processingTime,
            },
        };
        res.json(response);
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[${requestId}] Processing failed after ${processingTime}ms:`, error);
        // Clean up progress data
        progressStore.delete(requestId);
        const errorResponse = {
            success: false,
            error: Object.assign({ message: error.message || 'An unexpected error occurred during processing', code: error.code || 'PROCESSING_ERROR', requestId }, (config_1.default.environment === 'development' && {
                details: error,
                stack: error.stack,
            })),
        };
        const statusCode = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('timeout')) ? 408 : 500;
        res.status(statusCode).json(errorResponse);
    }
}));
/**
 * GET /api/process-dxf/progress/:requestId
 * Get processing progress for a request
 */
router.get('/progress/:requestId', auth_middleware_1.authMiddleware, (req, res) => {
    const { requestId } = req.params;
    const progress = progressStore.get(requestId);
    if (progress) {
        res.json(Object.assign({ success: true, requestId }, progress));
    }
    else {
        res.json({
            success: true,
            requestId,
            progress: 0,
            message: 'No progress data available',
        });
    }
});
/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config_1.default.environment,
    });
});
exports.default = router;
//# sourceMappingURL=dxf-processor.js.map