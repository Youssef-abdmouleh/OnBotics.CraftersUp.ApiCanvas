/**
 * DXF Processing API Routes
 */

import express = require('express');
import { processDxfGlyphs, validateDxfInput } from '../services/dxf-processor.service';
import { DxfProcessingRequest, DxfProcessingResponse, ErrorResponse } from '../models/dxf.models';
import { authMiddleware } from '../middleware/auth.middleware';
import config from '../config';

const router = express.Router();

// Progress tracking storage (in-memory)
// TODO: Replace with Redis or similar for multi-instance deployments
const progressStore = new Map<string, any>();

/**
 * POST /api/process-dxf
 * Process glyph models and return combined DXF model
 */
router.post('/process-dxf', authMiddleware, async (req: express.Request, res: express.Response) => {
  const requestId = (req as any).requestId;
  const startTime = Date.now();

  console.log(`[${requestId}] DXF processing request received`);

  try {
    // Validate request body
    const { textObjects }: DxfProcessingRequest = req.body;

    if (!textObjects) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          message: 'Missing required field: textObjects',
          code: 'VALIDATION_ERROR',
          requestId,
        },
      };
      return res.status(400).json(errorResponse);
    }

    if (!validateDxfInput(textObjects)) {
      const errorResponse: ErrorResponse = {
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
        const result = processDxfGlyphs(textObjects, (progress) => {
          // Store progress for polling endpoint
          progressStore.set(requestId, progress);
          console.log(`[${requestId}] Progress: ${progress.progress}% - ${progress.message}`);
        });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    // Process without timeout for performance testing
    // In production, use: Promise.race([processingPromise, timeoutPromise])
    const result = await processingPromise;

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Processing completed in ${processingTime}ms`);

    // Clean up progress data
    progressStore.delete(requestId);

    // Return success response
    const response: DxfProcessingResponse = {
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
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Processing failed after ${processingTime}ms:`, error);

    // Clean up progress data
    progressStore.delete(requestId);

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred during processing',
        code: error.code || 'PROCESSING_ERROR',
        requestId,
        ...(config.environment === 'development' && {
          details: error,
          stack: error.stack,
        }),
      },
    };

    const statusCode = error.message?.includes('timeout') ? 408 : 500;
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * GET /api/process-dxf/progress/:requestId
 * Get processing progress for a request
 */
router.get('/progress/:requestId', authMiddleware, (req: express.Request, res: express.Response) => {
  const { requestId } = req.params;
  const progress = progressStore.get(requestId);

  if (progress) {
    res.json({
      success: true,
      requestId,
      ...progress,
    });
  } else {
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
router.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.environment,
  });
});

export default router;

