/**
 * Canvas Renderer Routes
 * Handles server-side canvas rendering requests
 */

import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import * as https from 'https';
import { CanvasRendererCore } from '../services/canvas-renderer-core.service';
import { CanvasRendererNodeAdapter } from '../services/canvas-renderer-node.adapter';
import { AssetFetcherService } from '../services/asset-fetcher.service';
import { SecurityValidatorService } from '../services/security-validator.service';
import config from '../config';
import { FontManager } from '../services/font-manager';


const router = express.Router();

// Services
const assetFetcher = new AssetFetcherService();
const securityValidator = new SecurityValidatorService();

// HTTPS agent for development (accepts self-signed certs)
const httpsAgent = config.environment === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

/**
 * Request/Response interfaces
 */
interface CanvasRenderRequest {
  jsonDesignUrl: string;
  orderItemId: string;
  options?: {
    timeout?: number;
    maxAssetSize?: number;
  };
}

interface CanvasRenderResponse {
  success: true;
  preview: {
    url: string;
    id: string;
    path: string;
  };
  meta: {
    width: number;
    height: number;
    objectCount: number;
    processingTimeMs: number;
    requestId: string;
  };
}

interface CanvasRenderErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    requestId: string;
    details?: any;
    stack?: string;
  };
}

/**
 * POST /api/canvas/render-preview
 * Render a canvas design from JSON URL and generate preview image
 */
router.post('/canvas/render-preview', async (req, res) => {
  const requestId = (req as any).requestId || uuidv4();
  const startTime = Date.now();

  console.log(`[${requestId}] Canvas render request received`);

  try {
    // Parse request body
    const request: CanvasRenderRequest = req.body;

    // Step 1: Validate request
    console.log(`[${requestId}] Step 1: Validating request`);
    const validationErrors = await validateRenderRequest(request);
    if (validationErrors.length > 0) {
      throw {
        message: validationErrors.join('; '),
        code: 'VALIDATION_ERROR',
        status: 400,
      };
    }

    // Step 2: Fetch JSON design from URL
    console.log(`[${requestId}] Step 2: Fetching design JSON from ${request.jsonDesignUrl}`);
    const designResult = await assetFetcher.fetchJson(
      request.jsonDesignUrl,
      {
        timeout: request.options?.timeout || 100000,
        maxSize: request.options?.maxAssetSize || 5242880, // 5 MB default for JSON
      }
    );

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
    const fonts = await extractFontsFromDesign(designJson);
    console.log(`[${requestId}] Found ${fonts.length} unique fonts:`);
    fonts.forEach((font, idx) => {
      console.log(`[${requestId}]   Font ${idx + 1}: ${font.designation} (ID: ${font.idFont})`);
      console.log(`[${requestId}]   Expected name in fabric: ${font.expectedName}`);
      console.log(`[${requestId}]   URL: ${font.fontUrl}`);
    });

    // Step 4: Render canvas with timeout protection
    console.log(`[${requestId}] Step 4: Rendering canvas`);
    const adapter = new FontManager(config.processing.tempDir || '/tmp/canvas-fonts');
    const renderer = new CanvasRendererNodeAdapter(adapter);

    // Add timeout protection (30 seconds for rendering)
    const RENDER_TIMEOUT = 30000;
    // Charger les polices
    for (const font of fonts) {
      await renderer.loadFont(font);
    }

    // Créer le canvas
    const canvas = renderer.createCanvas(designJson.width || 800, designJson.height || 600);

    // Charger le design
    await new Promise<void>((resolve, reject) => {
      canvas.loadFromJSON(designJson, () => resolve(), (err: any) => reject(err));
    });

    // Exporter
    const result = await renderer.exportCanvas(canvas);

    // Nettoyer
    renderer.cleanup();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Rendering timeout after ${RENDER_TIMEOUT}ms - loadFromJSON callback was not called. Check fabric initialization and font loading.`));
      }, RENDER_TIMEOUT);
    });

    console.log(`[${requestId}] Waiting for render with ${RENDER_TIMEOUT}ms timeout...`);
    const renderResult = await Promise.race([canvas, timeoutPromise]) as any;

    // Step 5: Save preview image
    console.log(`[${requestId}] Step 5: Saving preview image`);
    if (!result.buffer) {
      throw new Error('Render did not produce a buffer');
    }

    const filename = securityValidator.generatePreviewFilename(request.orderItemId);
    const previewPath = await savePreviewImage(result.buffer, filename);
    const previewUrl = generatePreviewUrl(filename);

    // Step 6: Prepare response
    const processingTimeMs = Date.now() - startTime;
    console.log(`[${requestId}] Render completed in ${processingTimeMs}ms`);

    const response: CanvasRenderResponse = {
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
  } catch (error: any) {
    console.error(`[${requestId} 111] Render failed:`);
    console.error(`[${requestId}] Render failed:`, error);

    const statusCode = error.status || 500;
    const errorResponse: CanvasRenderErrorResponse = {
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR',
        requestId,
        details: config.environment === 'development' ? error.details : undefined,
        stack: config.environment === 'development' ? error.stack : undefined,
      },
    };

    res.status(statusCode).json(errorResponse);
  }
});

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
async function validateRenderRequest(request: CanvasRenderRequest): Promise<string[]> {
  const errors: string[] = [];

  // Validate jsonDesignUrl
  if (!request.jsonDesignUrl) {
    errors.push('jsonDesignUrl is required');
  }
  else {
    const urlValidation = await securityValidator.validateUrl(request.jsonDesignUrl, 'json');
    if (!urlValidation.valid) {
      errors.push(`Invalid jsonDesignUrl: ${urlValidation.error}`);
    }
  }

  // Validate orderItemId
  if (!request.orderItemId) {
    errors.push('orderItemId is required');
  } else {
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
}

/**
 * Try to resolve a font identifier (could be name or GUID) to a GUID
 * Makes API call to C# backend to map font names to GUIDs
 */
async function resolveFontNameToGuid(fontIdentifier: string): Promise<string> {
  // Check if it's already a GUID format
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (guidPattern.test(fontIdentifier)) {
    return fontIdentifier; // Already a GUID
  }

  // Try to resolve via API
  try {
    const apiUrl = `https://localhost:44301/api/fonts/resolve-name?fontName=${encodeURIComponent(fontIdentifier)}`;
    console.log(`[FontResolver] Attempting to resolve "${fontIdentifier}" via API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
      agent: httpsAgent,
    } as any);

    if (response.ok) {
      const guid = await response.text();
      console.log(`[FontResolver] Resolved "${fontIdentifier}" → ${guid}`);
      return guid;
    } else {
      console.warn(`[FontResolver] API returned ${response.status} for font "${fontIdentifier}"`);
    }
  } catch (error: any) {
    console.warn(`[FontResolver] Failed to resolve font "${fontIdentifier}":`, error.message);
  }

  // If resolution fails, return original identifier
  // The font will still be fetched using this as GUID (will fail if not valid GUID)
  console.log(`[FontResolver] Using original identifier: "${fontIdentifier}"`);
  return fontIdentifier;
}

/**
 * Extract font definitions from design JSON
 * Enhanced to handle nested groups and all text object types
 * NOW ASYNC: Resolves font names to GUIDs via API
 */
async function extractFontsFromDesign(designJson: any): Promise<Array<{
  idFont: string;
  designation: string;
  fontUrl: string;
  expectedName: string;
}>> {
  const fontMap = new Map<string, {
    idFont: string;
    designation: string;
    fontUrl: string;
    expectedName: string;
  }>();

  // Recursively traverse ALL objects including nested groups (now async)
  async function traverseObjects(objects: any[]) {
    if (!objects) return;

    for (const obj of objects) {
      // Check for text objects (all types)
      if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
        const fontFamily = obj.fontFamily;

        if (fontFamily && !fontMap.has(fontFamily)) {
          // Resolve font name/GUID to actual GUID
          const fontGuid = await resolveFontNameToGuid(fontFamily);

          fontMap.set(fontFamily, {
            idFont: fontGuid,                    // GUID for fetching from API
            designation: fontFamily,              // Display name
            expectedName: fontFamily,             // What fabric JSON expects
            fontUrl: `https://localhost:44301/ImageManagement/GetDocumentFileFont?tenantId=52&documentFileId=${fontGuid}&fontType=ttf`
          });
        }
      }

      // Recursively check groups
      if (obj.type === 'group' && obj.objects) {
        await traverseObjects(obj.objects);
      }
    }
  }

  // Traverse fabric objects to find text objects with fonts
  if (designJson.fabricData && designJson.fabricData.objects) {
    await traverseObjects(designJson.fabricData.objects);
  }

  return Array.from(fontMap.values());
}

/**
 * Save preview image to storage
 */
async function savePreviewImage(buffer: Buffer, filename: string): Promise<string> {
  const storageDir = config.storage?.previewDir || path.join(__dirname, '../storage/previews');

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
}

/**
 * Generate public URL for preview image
 */
function generatePreviewUrl(filename: string): string {
  const baseUrl = config.storage?.baseUrl || 'http://localhost:1337/storage';
  return `${baseUrl}/previews/${filename}`;
}

export default router;

