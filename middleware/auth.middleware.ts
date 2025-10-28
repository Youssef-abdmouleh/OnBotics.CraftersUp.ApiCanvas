/**
 * Simple Authentication Middleware
 * TODO: Replace with proper authentication system for production
 */

import { Request, Response, NextFunction } from 'express';
import config from '../config';

/**
 * Basic authentication middleware
 * Checks for Basic Auth header with configured username/password
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth if disabled
  if (!config.auth.enabled) {
    return next();
  }

  // Get authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId: (req as any).requestId,
      },
    });
    return;
  }

  try {
    // Decode Base64 credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Validate credentials
    if (username === config.auth.username && password === config.auth.password) {
      return next();
    } else {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'AUTH_INVALID',
          requestId: (req as any).requestId,
        },
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid authentication format',
        code: 'AUTH_FORMAT_INVALID',
        requestId: (req as any).requestId,
      },
    });
  }
}

