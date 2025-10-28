/**
 * Request ID Middleware
 * Generates or extracts correlation ID for request tracking
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Add request ID to each request for tracking
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header, or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Attach to request object
  (req as any).requestId = requestId;

  // Add to response headers
  res.setHeader('x-request-id', requestId);

  next();
}

