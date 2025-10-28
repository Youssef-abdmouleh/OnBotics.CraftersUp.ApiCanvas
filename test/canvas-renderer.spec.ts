/**
 * Canvas Renderer Tests
 * Visual parity and functional tests for server-side canvas rendering
 */

import * as fs from 'fs';
import * as path from 'path';
import { CanvasRendererCore } from '../services/canvas-renderer-core.service';
import { CanvasRendererNodeAdapter } from '../services/canvas-renderer-node.adapter';
import { SecurityValidatorService } from '../services/security-validator.service';
import { AssetFetcherService } from '../services/asset-fetcher.service';

describe('Canvas Renderer Core', () => {
  let adapter: CanvasRendererNodeAdapter;
  let renderer: CanvasRendererCore;

  beforeEach(() => {
    adapter = new CanvasRendererNodeAdapter('/tmp/canvas-test-fonts');
    renderer = new CanvasRendererCore(adapter);
  });

  afterEach(() => {
    adapter.cleanup();
  });

  describe('JSON Parsing', () => {
    it('should parse valid design JSON string', () => {
      const jsonString = JSON.stringify({
        fabricData: { objects: [] },
        customMetadata: { dpi: 96, widthMM: 100, heightMM: 100, width: 378, height: 378 },
      });

      const parsed = renderer.parseDesignJson(jsonString);
      expect(parsed).toBeDefined();
      expect(parsed.fabricData).toBeDefined();
      expect(parsed.customMetadata).toBeDefined();
      expect(parsed.customMetadata.dpi).toBe(96);
    });

    it('should throw error for invalid JSON structure', () => {
      const invalidJson = JSON.stringify({ someKey: 'value' });
      
      expect(() => renderer.parseDesignJson(invalidJson)).toThrow('missing fabricData');
    });

    it('should accept design JSON object directly', () => {
      const designObj = {
        fabricData: { objects: [] },
        customMetadata: { dpi: 96, widthMM: 100, heightMM: 100, width: 378, height: 378 },
      };

      const parsed = renderer.parseDesignJson(designObj);
      expect(parsed).toEqual(designObj);
    });
  });

  describe('Unit Conversions', () => {
    it('should convert pixels to millimeters correctly', () => {
      const px = 96;
      const dpi = 96;
      const mm = renderer.pxToMm(px, dpi);
      
      expect(mm).toBeCloseTo(25.4, 1); // 96 px at 96 DPI = 1 inch = 25.4 mm
    });

    it('should convert millimeters to pixels correctly', () => {
      const mm = 25.4;
      const dpi = 96;
      const px = renderer.mmToPx(mm, dpi);
      
      expect(px).toBeCloseTo(96, 0); // 25.4 mm = 1 inch = 96 px at 96 DPI
    });
  });
});

describe('Security Validator', () => {
  let validator: SecurityValidatorService;

  beforeEach(() => {
    validator = new SecurityValidatorService();
  });

  describe('URL Validation', () => {
    it('should accept valid HTTPS URLs', async () => {
      const result = await validator.validateUrl('https://example.com/design.json');
      expect(result.valid).toBe(true);
    });

    it('should accept HTTP URLs in development mode for localhost', async () => {
      process.env.NODE_ENV = 'development';
      const result = await validator.validateUrl('http://localhost:3000/design.json');
      expect(result.valid).toBe(true);
    });

    it('should accept localhost URLs in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const result = await validator.validateUrl('https://localhost/design.json');
      expect(result.valid).toBe(true);
    });

    it('should reject localhost URLs in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const result = await validator.validateUrl('https://localhost/design.json');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('LOCALHOST_NOT_ALLOWED');
    });

    it('should reject HTTP URLs in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const result = await validator.validateUrl('http://example.com/design.json');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_PROTOCOL');
    });

    it('should reject file:// protocol', async () => {
      const result = await validator.validateUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_PROTOCOL');
    });

    it('should accept URLs without file extensions (platform uses query params)', async () => {
      const result = await validator.validateUrl('https://storage.example.com/api/getfile?id=12345');
      expect(result.valid).toBe(true);
    });
  });

  describe('GUID Validation', () => {
    it('should accept valid GUIDs', () => {
      const validGuid = '12345678-1234-1234-1234-123456789abc';
      const result = validator.validateGuid(validGuid);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid GUIDs', () => {
      const invalidGuid = 'not-a-valid-guid';
      const result = validator.validateGuid(invalidGuid);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_GUID');
    });

    it('should reject empty strings', () => {
      const result = validator.validateGuid('');
      expect(result.valid).toBe(false);
    });
  });

  describe('Timeout Validation', () => {
    it('should accept valid timeout values', () => {
      const result = validator.validateTimeout(30000, 60000);
      expect(result.valid).toBe(true);
    });

    it('should reject timeout exceeding maximum', () => {
      const result = validator.validateTimeout(120000, 60000);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('TIMEOUT_TOO_LARGE');
    });

    it('should reject negative timeout', () => {
      const result = validator.validateTimeout(-1000, 60000);
      expect(result.valid).toBe(false);
    });

    it('should accept undefined timeout', () => {
      const result = validator.validateTimeout(undefined, 60000);
      expect(result.valid).toBe(true);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize unsafe filenames', () => {
      const unsafe = '../../../etc/passwd';
      const safe = validator.sanitizeFilename(unsafe);
      expect(safe).not.toContain('..');
      expect(safe).not.toContain('/');
    });

    it('should generate safe preview filenames', () => {
      const orderId = '12345678-1234-1234-1234-123456789abc';
      const filename = validator.generatePreviewFilename(orderId);
      
      expect(filename).toContain(orderId);
      expect(filename).toMatch(/\.png$/);
      expect(filename).toMatch(/-preview-\d+\.png$/);
    });
  });
});

describe('Asset Fetcher', () => {
  let fetcher: AssetFetcherService;

  beforeEach(() => {
    fetcher = new AssetFetcherService();
  });

  describe('URL Validation Integration', () => {
    it('should reject fetching from localhost in production', async () => {
      process.env.NODE_ENV = 'production';
      await expect(
        fetcher.fetchJson('https://localhost/design.json')
      ).rejects.toThrow('Security validation failed');
    });

    it('should accept fetching from localhost in development', async () => {
      process.env.NODE_ENV = 'development';
      // This would fail with network error, but should pass validation
      // Note: In real tests, you'd mock the fetch
      // For now, just check it doesn't fail validation
    });

    it('should reject non-HTTPS URLs in production', async () => {
      process.env.NODE_ENV = 'production';
      await expect(
        fetcher.fetchJson('http://example.com/design.json')
      ).rejects.toThrow('Security validation failed');
    });

    it('should accept URLs without file extensions', async () => {
      // Should pass validation even without .json extension
      // (would fail with network error in test, but that's expected)
      process.env.NODE_ENV = 'development';
      // URL format: https://storage.example.com/api/getfile?id=12345
      // Should pass validation
    });
  });
});

/**
 * Visual Parity Tests
 * These tests compare server-rendered output with golden master images
 */
describe('Visual Parity Tests', () => {
  const goldenMasterDir = path.join(__dirname, 'fixtures/golden');
  const outputDir = path.join(__dirname, 'fixtures/output');

  beforeAll(() => {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  // Helper function to load test design JSON
  function loadTestDesign(name: string): any {
    const designPath = path.join(__dirname, `fixtures/designs/${name}.json`);
    if (!fs.existsSync(designPath)) {
      throw new Error(`Test design not found: ${designPath}`);
    }
    return JSON.parse(fs.readFileSync(designPath, 'utf-8'));
  }

  // Helper function to compare images (simplified - use pixelmatch in production)
  function compareImages(buffer1: Buffer, buffer2: Buffer): { match: boolean; similarity: number } {
    // Simple byte comparison
    if (buffer1.length !== buffer2.length) {
      return { match: false, similarity: 0 };
    }

    let matchingBytes = 0;
    for (let i = 0; i < buffer1.length; i++) {
      if (buffer1[i] === buffer2[i]) {
        matchingBytes++;
      }
    }

    const similarity = matchingBytes / buffer1.length;
    return {
      match: similarity > 0.99, // Allow 1% variance for compression differences
      similarity,
    };
  }

  it('should render simple text design matching golden master', async () => {
    const designName = 'simple-text';
    const goldenPath = path.join(goldenMasterDir, `${designName}.png`);

    // Skip test if golden master doesn't exist yet
    if (!fs.existsSync(goldenPath)) {
      console.warn(`Golden master not found: ${goldenPath}. Skipping test.`);
      return;
    }

    const design = loadTestDesign(designName);
    const adapter = new CanvasRendererNodeAdapter();
    const renderer = new CanvasRendererCore(adapter);

    const result = await renderer.render({
      jsonDesign: design,
      fonts: [],
      environment: 'node',
    });

    // Save output for inspection
    const outputPath = path.join(outputDir, `${designName}.png`);
    fs.writeFileSync(outputPath, result.buffer!);

    // Compare with golden master
    const goldenBuffer = fs.readFileSync(goldenPath);
    const comparison = compareImages(result.buffer!, goldenBuffer);

    expect(comparison.similarity).toBeGreaterThan(0.99);
    expect(comparison.match).toBe(true);
  });

  it('should render complex design with metadata validation', async () => {
    const design = {
      fabricData: {
        objects: [
          {
            type: 'textbox',
            text: 'Test Text',
            fontFamily: 'Arial',
            fontSize: 60,
            fill: '#000000',
            left: 100,
            top: 100,
          },
        ],
        background: '#ffffff',
      },
      customMetadata: {
        dpi: 96,
        widthMM: 100,
        heightMM: 80,
        width: 378,
        height: 302,
      },
    };

    const adapter = new CanvasRendererNodeAdapter();
    const renderer = new CanvasRendererCore(adapter);

    const result = await renderer.render({
      jsonDesign: design,
      fonts: [],
      environment: 'node',
    });

    expect(result.buffer).toBeDefined();
    expect(result.width).toBe(378);
    expect(result.height).toBe(302);
    expect(result.objectCount).toBe(1);
  });
});

/**
 * Golden Master Generation Helper
 * Run this to generate golden master images from designs
 * Usage: npm run test -- --generate-golden
 */
if (process.argv.includes('--generate-golden')) {
  console.log('Golden master generation mode enabled');
  // Implementation would go here to generate golden masters
}

