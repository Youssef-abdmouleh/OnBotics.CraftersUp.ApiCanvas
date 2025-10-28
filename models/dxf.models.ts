/**
 * Data Transfer Objects for DXF Processing API
 */

/**
 * Single text object with glyph models to process
 */
export interface DxfTextObject {
  glyphModels: any[]; // makerjs IModel array
  angle: number;
  x: number;
  y: number;
}

/**
 * Request payload for DXF processing
 */
export interface DxfProcessingRequest {
  textObjects: DxfTextObject[];
}

/**
 * Successful response from DXF processing
 */
export interface DxfProcessingResponse {
  success: true;
  result: any; // makerjs IModel (masterCombinedModel)
  meta: {
    processedAt: string;
    itemCount: number;
    requestId: string;
    processingTimeMs: number;
  };
}

/**
 * Progress update for long-running operations
 */
export interface ProgressUpdate {
  requestId: string;
  progress: number; // 0-100
  message: string;
  currentItem: number;
  totalItems: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    requestId: string;
    // Only in development
    details?: any;
    stack?: string;
  };
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && response.success === false && response.error;
}

