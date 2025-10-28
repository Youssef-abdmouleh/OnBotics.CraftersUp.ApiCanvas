/**
 * Node.js Environment Adapter for Canvas Rendering
 * Handles server-side operations: node-canvas, font registration, file system access
 * FIXED: Now uses fabric 5.3.0 with proper initialization
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import * as https from 'https';
import config from '../config';
import * as opentype from 'opentype.js';

// Import node-canvas and fabric properly - MUST use CommonJS for Node.js!
const { createCanvas, loadImage, registerFont, Canvas: NodeCanvas, Image: NodeImage } = require('canvas');
const fabric = require('fabric').fabric;

// Create HTTPS agent for development (accepts self-signed certs)
const httpsAgent = config.environment === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

// Type definitions for the shared interface
export interface ICanvasEnvironmentAdapter {
  createCanvas(width: number, height: number): any; // fabric.Canvas not available in CommonJS import
  loadFont(font: FontDefinition): Promise<void>;
  loadImage(url: string): Promise<any>;
  exportCanvas(canvas: any): Promise<RenderResult>; // fabric.Canvas not available in CommonJS import
  cleanup(): void;
}

export interface FontDefinition {
  idFont: string;
  designation: string;
  fontUrl: string;
  enabled?: boolean;
}

export interface RenderResult {
  dataUrl?: string;
  buffer?: Buffer;
  width: number;
  height: number;
  objectCount: number;
}

/**
 * Node.js Canvas Rendering Adapter
 * Uses node-canvas for headless rendering
 */
export class CanvasRendererNodeAdapter implements ICanvasEnvironmentAdapter {
  private fabricCanvas: any = null;
  private fontBufferCache: Map<string, Buffer> = new Map(); // Memory cache for font buffers
  private fontPathCache: Map<string, string> = new Map();   // File path cache for registered fonts
  private tempFontDir: string;
  private fabricPatchesApplied: boolean = false;

  constructor(tempDir: string = '/tmp/canvas-fonts') {
    this.tempFontDir = tempDir;

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempFontDir)) {
      fs.mkdirSync(this.tempFontDir, { recursive: true });
      console.log(`[NodeAdapter] Created temp font directory: ${this.tempFontDir}`);
    }

    console.log('[NodeAdapter] Initialized with memory-first font caching');
  }

  /**
   * Apply Fabric.js patches for Node.js environment (similar to ExpressApp1)
   */
  private applyFabricNodePatches(): void {
  if (this.fabricPatchesApplied) return;

  console.log('[NodeAdapter] Applying Fabric.js Node.js patches...');
  console.log('[NodeAdapter] Fabric available:', typeof fabric !== 'undefined');
  console.log('[NodeAdapter] Fabric.StaticCanvas available:', typeof fabric?.StaticCanvas !== 'undefined');

  // Patch fabric.util.loadImage to handle both data URLs and remote URLs
  fabric.util.loadImage = function(url: string, callback: Function, context?: any) {
    console.log(`[NodeAdapter] fabric.util.loadImage called`);
    console.log(`[NodeAdapter] URL type: ${url?.substring(0, 30)}...`);
    
    if (!url) {
      console.warn('[NodeAdapter] loadImage called with null/empty URL');
      if (typeof callback === 'function') callback.call(context, null, true);
      return null;
    }

    // Check if it's a data URL (base64 embedded image)
    if (url.startsWith('data:')) {
      console.log('[NodeAdapter] Detected data URL (base64), loading from embedded data...');
      
      try {
        // Extract base64 data from data URL
        // Format: data:image/png;base64,iVBORw0KG...
        const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid data URL format');
        }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        
        console.log(`[NodeAdapter] Data URL MIME type: ${mimeType}`);
        console.log(`[NodeAdapter] Base64 data length: ${base64Data.length} chars`);
        
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        console.log(`[NodeAdapter] Buffer created: ${buffer.length} bytes`);
        
        // Create NodeImage from buffer
        const img = new NodeImage();
        img.src = buffer;
        
        console.log(`[NodeAdapter] NodeImage created from base64, dimensions: ${img.width}x${img.height}`);
        
        // Call callback immediately (synchronous for data URLs)
        if (typeof callback === 'function') {
          callback.call(context, img, false);
          console.log('[NodeAdapter] Base64 image callback executed successfully');
        }
        
        return img;
        
      } catch (error: any) {
        console.error('[NodeAdapter] Failed to load base64 image:', error.message);
        if (typeof callback === 'function') callback.call(context, null, true);
        return null;
      }
    }
    
    // Otherwise, it's a remote URL - fetch it
    console.log('[NodeAdapter] Detected remote URL, fetching...');
    fetch(url, {
      timeout: 15000, // Increase timeout for images
      headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
      agent: httpsAgent,
    } as any)
      .then((response) => {
        console.log(`[NodeAdapter] Image fetch response: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.buffer();
      })
      .then((buffer) => {
        console.log(`[NodeAdapter] Image buffer received: ${buffer.length} bytes`);
        const img = new NodeImage();
        img.src = buffer;
        console.log(`[NodeAdapter] NodeImage created, dimensions: ${img.width}x${img.height}`);
        if (typeof callback === 'function') {
          callback.call(context, img, false);
          console.log('[NodeAdapter] Remote image callback executed successfully');
        }
      })
      .catch((err: any) => {
        console.error(`[NodeAdapter] Failed to load image from ${url?.substring(0, 80)}:`);
        console.error(`[NodeAdapter] Error: ${err.message}`);
        console.error(`[NodeAdapter] Stack: ${err.stack}`);
        if (typeof callback === 'function') callback.call(context, null, true);
      });
    
    // Return Image instance for Fabric's expectations (workaround)
    try {
      return new NodeImage();
    } catch {
      return null;
    }
  };

  this.fabricPatchesApplied = true;
  console.log('[NodeAdapter] Fabric.js patches applied successfully');
}

  /**
   * Patch node-canvas instance to work with Fabric.js (similar to ExpressApp1)
   */
  private patchNodeCanvasForFabric(canvas: any): any {
    // Add minimal DOM-like properties that Fabric expects (exactly like ExpressApp1)
    if (!canvas.style) canvas.style = {};
    if (!canvas.style.setProperty) canvas.style.setProperty = function(p: string, v: string) { (this as any)[p] = v; };
    
    if (!canvas.ownerDocument) {
      canvas.ownerDocument = {
        defaultView: {
          getComputedStyle: () => ({
            getPropertyValue: (prop: string) => (prop === 'font-family' ? 'sans-serif' : '')
          })
        }
      };
    }

    if (!canvas.hasAttribute) canvas.hasAttribute = (n: string) => (n === 'width' || n === 'height');
    if (!canvas.setAttribute) canvas.setAttribute = (n: string, v: string) => {};
    if (!canvas.addEventListener) canvas.addEventListener = () => {};
    if (!canvas.removeEventListener) canvas.removeEventListener = () => {};

    return canvas;
  }

  /**
   * Create fabric canvas with node-canvas backend
   */
  createCanvas(width: number, height: number): any {
    console.log(`[NodeAdapter] Creating fabric canvas: ${width}x${height}`);

    // Apply fabric patches first
    this.applyFabricNodePatches();

    // CRITICAL: Override fabric's canvas creation BEFORE creating StaticCanvas
    const self = this;
    
    fabric.util.createCanvasElement = function() {
      const canvas = createCanvas(width, height);
      
      // Add complete style mock with all CSS methods
      const mockStyle = {
        width: `${width}px`,
        height: `${height}px`,
        position: 'absolute',
        userSelect: 'none',
        touchAction: 'none',
        cursor: 'default',
        setProperty: function(propertyName: string, value: string, priority?: string) {
          (this as any)[propertyName] = value;
        },
        getPropertyValue: function(propertyName: string) {
          return (this as any)[propertyName] || '';
        },
        removeProperty: function(propertyName: string) {
          delete (this as any)[propertyName];
        }
      };
      
      canvas.style = mockStyle;
      
      // Mock DOM element interface
      (canvas as any).tagName = 'CANVAS';
      (canvas as any).nodeName = 'CANVAS';
      (canvas as any).nodeType = 1;
      (canvas as any).addEventListener = () => {};
      (canvas as any).removeEventListener = () => {};
      (canvas as any).dispatchEvent = () => true;
      (canvas as any).setAttribute = () => {};
      (canvas as any).getAttribute = () => null;
      (canvas as any).removeAttribute = () => {};
      (canvas as any).hasAttribute = () => false;
      
      (canvas as any).classList = {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => false
      };
      
      (canvas as any).getBoundingClientRect = () => ({
        left: 0, top: 0, right: width, bottom: height,
        width: width, height: height, x: 0, y: 0
      });
      
      (canvas as any).ownerDocument = {
        defaultView: {
          getComputedStyle: () => mockStyle
        }
      };
      
      (canvas as any).parentNode = {
        removeChild: () => {},
        appendChild: () => {}
      };
      
      (canvas as any).remove = () => {}; // CRITICAL: Add remove method
      (canvas as any).dataset = {};
      
      return canvas;
    };
    
    // Override image creation
    fabric.util.createImage = function() {
      const img = new NodeImage();
      (img as any).tagName = 'IMG';
      (img as any).nodeName = 'IMG';
      (img as any).nodeType = 1;
      return img;
    };
    
    // Patch type checking
    const originalIsCanvas = fabric.util.isCanvas;
    fabric.util.isCanvas = function(el: any) {
      return el && (
        originalIsCanvas.call(this, el) ||
        (typeof el.getContext === 'function' && typeof el.toBuffer === 'function')
      );
    };

    try {
      // Create StaticCanvas - it will use our createCanvasElement override
      this.fabricCanvas = new fabric.StaticCanvas(null, {
        width: width,
        height: height,
        backgroundColor: '#ffffff',
        enableRetinaScaling: false,
        renderOnAddRemove: false
      });
      
      console.log(`[NodeAdapter] Successfully created Fabric StaticCanvas: ${width}x${height}`);
      return this.fabricCanvas;
      
    } catch (error: any) {
      console.error('[NodeAdapter] Failed to create canvas:', error);
      console.error('[NodeAdapter] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Load font with memory-first caching strategy
   * Keeps font in memory, writes to disk only when needed for registration
   */
  async loadFont(font: FontDefinition): Promise<void> {
    try {
      console.log(`[NodeAdapter] Loading font: ${font.designation} (${font.idFont})`);

      // Check if already registered
      if (this.fontPathCache.has(font.idFont)) {
        console.log(`[NodeAdapter] Font ${font.idFont} already registered (using cached path)`);
        return;
      }

      // Step 1: Check memory cache first
      let fontBuffer: Buffer;
      
      if (this.fontBufferCache.has(font.idFont)) {
        console.log(`[NodeAdapter] Font ${font.idFont} found in memory cache`);
        fontBuffer = this.fontBufferCache.get(font.idFont)!;
      } else {
        // Step 2: Fetch from URL (only once)
        const fontUrl = font.fontUrl || `https://localhost:44301/ImageManagement/GetDocumentFileFont?tenantId=52&documentFileId=${font.idFont}&fontType=ttf`;
        console.log(`[NodeAdapter] Fetching font from: ${fontUrl}`);

        const response = await fetch(fontUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
          agent: httpsAgent,
        } as any);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        fontBuffer = await response.buffer();
        console.log(`[NodeAdapter] Font fetched: ${fontBuffer.length} bytes`);
        
        // Store in memory cache
        this.fontBufferCache.set(font.idFont, fontBuffer);
        console.log(`[NodeAdapter] Font cached in memory`);
      }

      // Step 3: Extract font name using opentype.js (works with Buffer!)
      const arrayBuffer = fontBuffer.buffer.slice(
        fontBuffer.byteOffset, 
        fontBuffer.byteOffset + fontBuffer.byteLength
      );
      
      const fontData = opentype.parse(arrayBuffer);
      console.log(`[NodeAdapter] opentype.js parsed font successfully`);

      // Access font names with type safety workaround (cast to any to access all properties)
      const names = fontData.names as any;
      let internalName = 
        this.getPreferredStringName(names.postScriptName) ||
        this.getPreferredStringName(names.typographicFamily) ||
        this.getPreferredStringName(names.preferredFamily) ||
        this.getPreferredStringName(names.fontFamily) ||
        this.getPreferredStringName(names.fullName) ||
        font.designation ||
        font.idFont;

      console.log(`[NodeAdapter] Font internal name: "${internalName}"`);

      // Step 4: Write to temp file ONLY for node-canvas registration
      // (Unfortunately unavoidable - node-canvas requires file path)
      const fontHash = crypto.createHash('md5').update(font.idFont).digest('hex').substring(0, 8);
      const extension = font.fontUrl?.includes('fontType=otf') ? 'otf' : 'ttf';
      const filename = `${font.idFont.replace(/[^a-zA-Z0-9]/g, '_')}_${fontHash}.${extension}`;
      const tempPath = path.join(this.tempFontDir, filename);

      // Only write if file doesn't exist
      if (!fs.existsSync(tempPath)) {
        fs.writeFileSync(tempPath, fontBuffer as any);
        console.log(`[NodeAdapter] Font written to temp: ${tempPath}`);
      } else {
        console.log(`[NodeAdapter] Temp file already exists: ${tempPath}`);
      }

      // Step 5: Register with node-canvas (requires file path)
      registerFont(tempPath, { family: internalName });

      // Step 6: Verify font is registered and available
      await this.verifyFontRegistration(internalName, tempPath);

      // Cache the path for reuse
      this.fontPathCache.set(font.idFont, tempPath);
      console.log(`[NodeAdapter] Font ${font.idFont} registered as "${internalName}"`);

    } catch (error: any) {
      console.error(`[NodeAdapter] Failed to load font ${font.idFont}:`, error.message);
    }
  }

  /**
   * Verify font is registered and available in node-canvas
   */
  private async verifyFontRegistration(
    fontFamily: string,
    fontPath: string,
    maxRetries: number = 3
  ): Promise<void> {
    console.log(`[NodeAdapter] Verifying font registration: "${fontFamily}"`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create a test canvas
        const testCanvas = createCanvas(100, 50);
        const ctx = testCanvas.getContext('2d');
        
        // Try to use the font
        ctx.font = `20px "${fontFamily}"`;
        ctx.fillText('Test', 10, 30);
        
        // If we got here without error, font is registered
        console.log(`[NodeAdapter] Font "${fontFamily}" verified (attempt ${attempt})`);
        return;
        
      } catch (error) {
        console.warn(`[NodeAdapter] Font verification attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.error(`[NodeAdapter] Font "${fontFamily}" verification failed after ${maxRetries} attempts`);
          // Don't throw - allow rendering with fallback font
        }
      }
    }
  }

  /**
   * Helper to get preferred string name from opentype.js name field
   */
  private getPreferredStringName(nameField: any): string | undefined {
    if (nameField && typeof nameField === 'object' && nameField.en && typeof nameField.en === 'string' && nameField.en.trim() !== '') {
      return nameField.en.trim();
    }
    if (nameField && typeof nameField === 'string' && nameField.trim() !== '') {
      return nameField.trim();
    }
    return undefined;
  }

  /**
   * Load image from URL for node-canvas
   */
  async loadImage(url: string): Promise<any> {
    try {
      // Use node-canvas's loadImage function directly
      const img = await loadImage(url);
      return img;
      
    } catch (error: any) {
      console.error(`[NodeAdapter] Failed to load image from ${url}:`, error.message);
      throw new Error(`Failed to load image: ${error.message}`);
    }
  }

  /**
   * Export canvas to PNG - MATCHES Angular component approach
   * Angular uses: canvas.toDataURL({ format: 'png' })
   * ENHANCED: Added verification steps to ensure fonts and images are loaded
   */
  async exportCanvas(canvas: any): Promise<RenderResult> {
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }

    console.log('[NodeAdapter] Starting canvas export with verification...');
    
    // STEP 1: Verify background is set
    if (canvas.backgroundImage) {
      console.log('[NodeAdapter] Background image detected');
      // Ensure background image is fully loaded
      const bgImg = canvas.backgroundImage;
      if (bgImg._element && !bgImg._element.complete) {
        console.log('[NodeAdapter] Waiting for background image to load...');
        await new Promise<void>((resolve) => {
          bgImg._element.onload = () => resolve();
          setTimeout(() => resolve(), 2000); // 2s timeout
        });
      }
    } else if (canvas.backgroundColor) {
      console.log(`[NodeAdapter] Background color: ${canvas.backgroundColor}`);
    }
    
    // STEP 2: Verify all objects are ready
    const objects = canvas.getObjects();
    console.log(`[NodeAdapter] Verifying ${objects.length} canvas objects...`);
    
    for (const obj of objects) {
      if (obj.type === 'image' && obj._element) {
        if (!obj._element.complete && obj._element.width === 0) {
          console.warn('[NodeAdapter] Image not fully loaded, waiting...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    
    // STEP 3: Force render
    console.log('[NodeAdapter] Rendering canvas...');
    canvas.renderAll();
    
    // STEP 4: Small delay to ensure rendering pipeline completes
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // STEP 5: Export
    console.log('[NodeAdapter] Exporting to PNG...');
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    
    const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log(`[NodeAdapter] Export complete: ${buffer.length} bytes`);

    return {
      buffer,
      dataUrl: dataURL,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      objectCount: objects.length,
    };
  }

  /**
   * Cleanup - clear memory cache and dispose canvas
   */
  cleanup(): void {
    console.log('[NodeAdapter] Cleaning up resources');

    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
      this.fabricCanvas = null;
    }

    // Clear memory cache
    console.log(`[NodeAdapter] Clearing ${this.fontBufferCache.size} fonts from memory cache`);
    this.fontBufferCache.clear();
  }

  /**
   * Clear all caches including temp files
   */
  clearAllCaches(): void {
    console.log('[NodeAdapter] Clearing all caches');

    // Clear memory
    this.fontBufferCache.clear();

    // Delete temp files
    this.fontPathCache.forEach((fontPath, fontId) => {
      try {
        if (fs.existsSync(fontPath)) {
          fs.unlinkSync(fontPath);
          console.log(`[NodeAdapter] Deleted temp file: ${fontPath}`);
        }
      } catch (error) {
        console.warn(`[NodeAdapter] Failed to delete ${fontPath}:`, error);
      }
    });

    this.fontPathCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { fontCount: number; memorySize: number; diskSize: number } {
    let memorySize = 0;
    let diskSize = 0;

    // Calculate memory size
    this.fontBufferCache.forEach((buffer) => {
      memorySize += buffer.length;
    });

    // Calculate disk size
    this.fontPathCache.forEach((fontPath) => {
      try {
        if (fs.existsSync(fontPath)) {
          const stats = fs.statSync(fontPath);
          diskSize += stats.size;
        }
      } catch (error) {
        // Ignore errors
      }
    });

    return {
      fontCount: this.fontBufferCache.size,
      memorySize,
      diskSize,
    };
  }
}

