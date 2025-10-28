/**
 * Canvas Renderer Core Service
 * Environment-agnostic canvas rendering logic
 * Shared between Angular (browser) and Express (Node.js)
 */

import { fabric } from 'fabric';

export interface CanvasDesignJson {
  fabricData: any; // Fabric.js canvas JSON
  customMetadata: {
    dpi: number;
    widthMM: number;
    heightMM: number;
    width: number;
    height: number;
  };
}

export interface FontDefinition {
  idFont: string;
  designation: string;
  fontUrl: string;
  enabled?: boolean;
}

export interface RenderResult {
  dataUrl?: string; // Base64 PNG (browser)
  buffer?: Buffer; // PNG buffer (node)
  width: number;
  height: number;
  objectCount: number;
}

export interface CanvasRenderOptions {
  jsonDesign: string | CanvasDesignJson;
  fonts: FontDefinition[];
  environment: 'browser' | 'node';
}

export interface ICanvasEnvironmentAdapter {
  createCanvas(width: number, height: number): fabric.Canvas;
  loadFont(font: FontDefinition): Promise<void>;
  loadImage(url: string): Promise<any>;
  exportCanvas(canvas: fabric.Canvas): Promise<RenderResult>;
  cleanup(): void;
}

/**
 * Core Canvas Renderer
 * Extracted from appWorkEffortPersonalisation.component.ts
 */
export class CanvasRendererCore {
  private fontCache: Map<string, boolean> = new Map();
  private adapter: ICanvasEnvironmentAdapter;

  constructor(adapter: ICanvasEnvironmentAdapter) {
    this.adapter = adapter;
  }

  /**
   * Parse JSON design from string or object
   */
  parseDesignJson(jsonDesign: string | CanvasDesignJson): CanvasDesignJson {
    if (typeof jsonDesign === 'string') {
      const parsed = JSON.parse(jsonDesign);

      // Validate structure
      if (!parsed || typeof parsed.fabricData !== 'object') {
        throw new Error('Invalid design JSON: missing fabricData');
      }

      if (!parsed.customMetadata || typeof parsed.customMetadata !== 'object') {
        throw new Error('Invalid design JSON: missing customMetadata');
      }

      return parsed as CanvasDesignJson;
    }
    return jsonDesign;
  }

  /**
   * Load fonts for the given environment
   */
  async loadFonts(fonts: FontDefinition[]): Promise<void> {
    console.log(`[CanvasRendererCore] Loading ${fonts.length} fonts`);

    const loadPromises = fonts
      .filter(font => font && font.idFont && font.fontUrl)
      .map(async (font) => {
        // Check cache
        if (this.fontCache.has(font.idFont)) {
          console.log(`[CanvasRendererCore] Font ${font.idFont} already loaded (cached)`);
          return;
        }

        try {
          await this.adapter.loadFont(font);
          this.fontCache.set(font.idFont, true);
          console.log(`[CanvasRendererCore] Font ${font.idFont} loaded successfully`);
        } catch (error) {
          console.warn(`[CanvasRendererCore] Failed to load font ${font.idFont}:`, error);
          // Continue rendering with fallback font
        }
      });

    await Promise.all(loadPromises);
  }

  /**
   * Extract background image URL from design JSON
   */
  private extractBackgroundImage(designJson: CanvasDesignJson): string | null {
    const { fabricData } = designJson;
    
    if (fabricData.backgroundImage && fabricData.backgroundImage.src) {
      return fabricData.backgroundImage.src;
    }
    
    return null;
  }

  /**
   * Pre-load and set background image on canvas
   */
  private async loadAndSetBackgroundImage(
    canvas: fabric.Canvas,
    imageUrl: string
  ): Promise<void> {
    console.log(`[CanvasRendererCore] Pre-loading background image: ${imageUrl}`);
    
    return new Promise((resolve, reject) => {
      // Use adapter to load image
      this.adapter.loadImage(imageUrl)
        .then((imgElement) => {
          // Create fabric image object
          const fabricImage = new fabric.Image(imgElement);
          
          // Set as background image
          canvas.setBackgroundImage(fabricImage, () => {
            console.log('[CanvasRendererCore] Background image set successfully');
            canvas.renderAll();
            resolve();
          }, {
            // Options to stretch/fit background
            scaleX: canvas.width / fabricImage.width,
            scaleY: canvas.height / fabricImage.height,
          });
        })
        .catch((error) => {
          console.error('[CanvasRendererCore] Failed to load background image:', error);
          // Don't reject - continue with color background
          resolve();
        });
    });
  }

  /**
   * Wait for background image to load
   */
  private async waitForBackgroundImageLoad(
    canvas: fabric.Canvas,
    timeoutMs: number = 10000
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const bgImg = canvas.backgroundImage as any;
      
      if (!bgImg) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.warn('[CanvasRendererCore] Background image load timeout');
        resolve();
      }, timeoutMs);

      const imgElement = bgImg._element || bgImg._originalElement;
      
      if (!imgElement) {
        console.log('[CanvasRendererCore] Background image has no element, might already be loaded');
        clearTimeout(timeout);
        resolve();
        return;
      }

      // Check if already loaded (for node-canvas, buffer images load immediately)
      if (imgElement.complete || imgElement.width > 0) {
        console.log('[CanvasRendererCore] Background image already loaded');
        clearTimeout(timeout);
        resolve();
      } else {
        console.log('[CanvasRendererCore] Waiting for background image to load...');
        imgElement.onload = () => {
          console.log('[CanvasRendererCore] Background image loaded successfully');
          clearTimeout(timeout);
          resolve();
        };
        imgElement.onerror = (err: any) => {
          console.error('[CanvasRendererCore] Background image load error:', err);
          clearTimeout(timeout);
          resolve();
        };
      }
    });
  }

  /**
   * Wait for all fabric image objects to finish loading
   */
  private async waitForAllImagesToLoad(
    canvas: fabric.Canvas,
    timeoutMs: number = 5000
  ): Promise<void> {
    const objects = canvas.getObjects();
    const imageObjects = objects.filter((obj: any) => obj.type === 'image');
    
    console.log(`[CanvasRendererCore] Waiting for ${imageObjects.length} image objects to load`);
    
    if (imageObjects.length === 0) {
      console.log('[CanvasRendererCore] No image objects to wait for');
      return;
    }
    
    const loadPromises = imageObjects.map((imgObj: any, index: number) => {
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`[CanvasRendererCore] Image ${index + 1} load timeout`);
          resolve();
        }, timeoutMs);
        
        // Check if image element is loaded
        const imgElement = imgObj._element || imgObj._originalElement;
        
        if (!imgElement) {
          console.log(`[CanvasRendererCore] Image ${index + 1} has no element`);
          clearTimeout(timeout);
          resolve();
          return;
        }
        
        if (imgElement.complete || imgElement.width > 0) {
          console.log(`[CanvasRendererCore] Image ${index + 1} already loaded`);
          clearTimeout(timeout);
          resolve();
        } else {
          console.log(`[CanvasRendererCore] Waiting for image ${index + 1}...`);
          imgElement.onload = () => {
            console.log(`[CanvasRendererCore] Image ${index + 1} loaded`);
            clearTimeout(timeout);
            resolve();
          };
          imgElement.onerror = () => {
            console.error(`[CanvasRendererCore] Image ${index + 1} load error`);
            clearTimeout(timeout);
            resolve();
          };
        }
      });
    });
    
    await Promise.all(loadPromises);
    console.log('[CanvasRendererCore] All image objects loaded');
  }

  /**
   * Load canvas state from JSON
   * FIXED: Let loadFromJSON handle background naturally, then wait for completion
   */
  async loadCanvasFromJson(
    canvas: fabric.Canvas,
    designJson: CanvasDesignJson
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Restore custom canvas metadata
        const { customMetadata, fabricData } = designJson;
        
        console.log(`[CanvasRendererCore] Loading canvas with dimensions: ${customMetadata.width}x${customMetadata.height}, DPI: ${customMetadata.dpi}`);
        console.log(`[CanvasRendererCore] Objects to load: ${fabricData.objects?.length || 0}`);
        console.log(`[CanvasRendererCore] Background color: ${fabricData.background || 'none'}`);
        console.log(`[CanvasRendererCore] Background image: ${fabricData.backgroundImage ? 'YES - ' + JSON.stringify(fabricData.backgroundImage).substring(0, 100) : 'NO'}`);

        // Update canvas dimensions
        canvas.setDimensions({
          width: customMetadata.width,
          height: customMetadata.height,
        });
        console.log(`[CanvasRendererCore] Canvas dimensions set`);

        // CRITICAL: Load Fabric.js objects - this will handle background image via fabric.util.loadImage
        canvas.loadFromJSON(
          fabricData,
          // Success callback - called after JSON parsing but BEFORE async image loads complete
          async () => {
            console.log(`[CanvasRendererCore] loadFromJSON callback - JSON parsed`);
            
            try {
              // STEP 1: Wait for background image if it exists
              if (designJson.fabricData.backgroundImage) {
                console.log('[CanvasRendererCore] Background image object exists, waiting for load...');
                await this.waitForBackgroundImageLoad(canvas);
              } else {
                console.log('[CanvasRendererCore] No background image object');
              }
              
              // STEP 2: Wait for all regular image objects to load
              console.log(`[CanvasRendererCore] Canvas has ${canvas.getObjects().length} objects`);
              await this.waitForAllImagesToLoad(canvas);
              console.log('[CanvasRendererCore] All images loaded');
              
              // STEP 3: Final render
              canvas.renderAll();
              console.log('[CanvasRendererCore] Canvas fully loaded and rendered');
              resolve();
              console.log(`[CanvasRendererCore] Final object count: ${canvas.getObjects().length}`);
            } catch (renderError) {
              console.error('[CanvasRendererCore] Error during post-load:', renderError);
              // Don't reject - try to render anyway
              canvas.renderAll();
              resolve();
            }
          },
          // Error callback - log details but continue
          (errorSource: any, error: Error) => {
            console.error('[CanvasRendererCore] loadFromJSON error:', {
              type: errorSource?.type,
              errorMessage: error?.message || 'Unknown error',
              stack: error?.stack
            });
            // Try to render with what we have
            try {
              canvas.renderAll();
              console.log(`[CanvasRendererCore] Partial render with ${canvas.getObjects().length} objects`);
              resolve();
            } catch (renderError) {
              reject(renderError);
            }
          }
        );
      } catch (error) {
        console.error('[CanvasRendererCore] Error in loadCanvasFromJson setup:', error);
        reject(error);
      }
    });
  }

  /**
   * Save canvas state to JSON
   * Extracted from appWorkEffortPersonalisation.component.ts lines 572-602
   */
  saveCanvasToJson(
    canvas: fabric.Canvas,
    customMetadata: CanvasDesignJson['customMetadata']
  ): string {
    if (!canvas) {
      throw new Error('Canvas not initialized');
    }

    // Serialize canvas with custom properties (e.g., 'tag' for text objects)
    const customPropertiesToInclude = ['tag'];
    const fabricData = canvas.toJSON(customPropertiesToInclude);

    const saveData: CanvasDesignJson = {
      fabricData,
      customMetadata,
    };

    return JSON.stringify(saveData);
  }

  /**
   * Render a design from JSON
   * Main entry point that orchestrates the entire render process
   */
  async render(options: CanvasRenderOptions): Promise<RenderResult> {
    console.log(`[CanvasRendererCore] Starting render in ${options.environment} environment`);

    const startTime = Date.now();

    try {
      // Step 1: Parse design JSON
      const designJson = this.parseDesignJson(options.jsonDesign);
      const { customMetadata } = designJson;
      console.log("[CanvasRendererCore] after parsing design JSON:");

      // Step 2: Load fonts
      await this.loadFonts(options.fonts);

      console.log("[CanvasRendererCore] after loading fonts");
      // Step 3: Create canvas
      const canvas = this.adapter.createCanvas(
        customMetadata.width,
        customMetadata.height
      );

      console.log("[CanvasRendererCore] after creating canvas");
      // Step 4: Load design onto canvas
      await this.loadCanvasFromJson(canvas, designJson);

      console.log("[CanvasRendererCore] after loading canvas from JSON");
      // Step 5: Export preview
      // CRITICAL: Use exact same export method as Angular component (line 688)
      // canvas.toDataURL({ format: 'png' }) - no quality, no multiplier
      const result = await this.adapter.exportCanvas(canvas);
      console.log("[CanvasRendererCore] after exporting canvas:");

      const duration = Date.now() - startTime;
      console.log(`[CanvasRendererCore] Render completed in ${duration}ms`);

      return result;
    } catch (error) {
      console.error('[CanvasRendererCore] Render failed:', error);
      throw error;
    } finally {
      // Cleanup
      this.adapter.cleanup();
    }
  }

  /**
   * Convert pixels to millimeters based on DPI
   */
  pxToMm(px: number, dpi: number): number {
    return (px / dpi) * 25.4;
  }

  /**
   * Convert millimeters to pixels based on DPI
   */
  mmToPx(mm: number, dpi: number): number {
    return (mm / 25.4) * dpi;
  }

  /**
   * Clear font cache
   */
  clearFontCache(): void {
    this.fontCache.clear();
  }
}

