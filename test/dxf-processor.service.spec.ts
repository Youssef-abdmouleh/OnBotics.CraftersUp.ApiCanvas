import { processDxfGlyphs, validateDxfInput } from '../services/dxf-processor.service';

describe('DxfProcessorService', () => {
  describe('validateDxfInput', () => {
    it('should validate correct input', () => {
      const input = [
        {
          glyphModels: [{ paths: {} }],
          angle: 0,
          x: 10,
          y: 20,
        },
      ];
      expect(validateDxfInput(input)).toBe(true);
    });

    it('should reject non-array input', () => {
      expect(validateDxfInput({})).toBe(false);
      expect(validateDxfInput(null)).toBe(false);
      expect(validateDxfInput(undefined)).toBe(false);
    });

    it('should reject invalid object structure', () => {
      const input = [
        {
          glyphModels: [{ paths: {} }],
          // missing angle
          x: 10,
          y: 20,
        },
      ];
      expect(validateDxfInput(input)).toBe(false);
    });

    it('should reject non-array glyphModels', () => {
      const input = [
        {
          glyphModels: {},
          angle: 0,
          x: 10,
          y: 20,
        },
      ];
      expect(validateDxfInput(input)).toBe(false);
    });
  });

  describe('processDxfGlyphs', () => {
    it('should throw error for empty input', () => {
      expect(() => processDxfGlyphs([])).toThrow('No text objects provided');
    });

    it('should throw error for objects with no glyph models', () => {
      const input = [
        {
          glyphModels: [],
          angle: 0,
          x: 0,
          y: 0,
        },
      ];
      expect(() => processDxfGlyphs(input)).toThrow('No glyph models were provided');
    });

    it('should call progress callback if provided', () => {
      const progressCallback = jest.fn();
      const input = [
        {
          glyphModels: [{ models: {} }],
          angle: 0,
          x: 0,
          y: 0,
        },
      ];

      try {
        processDxfGlyphs(input, progressCallback);
      } catch (e) {
        // May fail due to makerjs operations, but callback should still be called
      }

      expect(progressCallback).toHaveBeenCalled();
    });

    // TODO: Add more integration tests with actual makerjs models
  });
});

