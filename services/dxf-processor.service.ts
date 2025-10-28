/**
 * DXF Processor Service
 * Core business logic extracted from the Angular Web Worker
 */

import * as maker from 'makerjs';
import { DxfTextObject } from '../models/dxf.models';

export interface ProcessingProgress {
  currentItem: number;
  totalItems: number;
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: ProcessingProgress) => void;

/**
 * Process glyph models into a combined DXF model
 * This is the core logic migrated from dxf-writer.worker.ts
 */
export function processDxfGlyphs(
  textObjects: DxfTextObject[],
  onProgress?: ProgressCallback
): any {
  console.log('[DxfProcessor] Starting processing with', textObjects.length, 'text objects');

  if (!textObjects || textObjects.length === 0) {
    throw new Error('No text objects provided for processing');
  }

  let masterCombinedModel: maker.IModel = { models: {} };
  const totalItems = textObjects.length;

  textObjects.forEach((textObj, objIndex) => {
    console.log(`[DxfProcessor] Processing text object ${objIndex + 1}/${totalItems}`);

    const { glyphModels, angle, x, y } = textObj;

    // Report progress
    if (onProgress) {
      onProgress({
        currentItem: objIndex + 1,
        totalItems,
        progress: Math.round(((objIndex + 1) / totalItems) * 100),
        message: `Processing text object ${objIndex + 1} of ${totalItems}`,
      });
    }

    if (!glyphModels || glyphModels.length === 0) {
      console.error(`[DxfProcessor] No glyph models provided for text object at index ${objIndex}`);
      return
      // throw new Error(`No glyph models were provided for text object at index ${objIndex}`);
    }

    // Combine all glyph models for this text object
    let combinedModel = glyphModels[0];
    for (let i = 1; i < glyphModels.length; i++) {
      combinedModel = maker.model.combineUnion(combinedModel, glyphModels[i]);
      if (!combinedModel) {
        console.error(`[DxfProcessor] Union failed for text object ${objIndex}, glyph ${i}`);
        throw new Error(`Union failed for text object at index ${objIndex}, glyph index ${i}`);
      }
    }

    // Perform rotation if needed
    if (angle !== 0) {
      maker.model.rotate(combinedModel, -angle, [x, y]);
    }

    // Combine with master model
    masterCombinedModel = maker.model.combineUnion(masterCombinedModel, combinedModel);
    if (!masterCombinedModel) {
      console.error(`[DxfProcessor] Master union failed after processing text object ${objIndex}`);
      throw new Error(`Master union failed after processing text object at index ${objIndex}`);
    }
  });

  console.log('[DxfProcessor] Processing completed successfully');
  return masterCombinedModel;
}

/**
 * Validate input data
 */
export function validateDxfInput(textObjects: any): textObjects is DxfTextObject[] {
  if (!Array.isArray(textObjects)) {
    return false;
  }

  for (const obj of textObjects) {
    if (
      !obj ||
      typeof obj !== 'object' ||
      !Array.isArray(obj.glyphModels) ||
      typeof obj.angle !== 'number' ||
      typeof obj.x !== 'number' ||
      typeof obj.y !== 'number'
    ) {
      return false;
    }
  }

  return true;
}

