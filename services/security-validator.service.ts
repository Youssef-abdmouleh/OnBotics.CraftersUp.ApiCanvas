/**
 * Security Validation Service
 * Provides SSRF protection, URL validation, and request sanitization
 */

import * as dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';
import config from '../config';

const dnsLookup = promisify(dns.lookup);

export interface SecurityValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

export class SecurityValidatorService {
  // Private IP ranges to block (SSRF prevention)
  private readonly PRIVATE_IP_RANGES = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^::1$/,                    // IPv6 localhost
    /^fe80:/,                   // IPv6 link-local
    /^fc00:/,                   // IPv6 private
    /^fd00:/,                   // IPv6 private
  ];

  // Allowed protocols
  private readonly ALLOWED_PROTOCOLS = ['https:'];
  private readonly ALLOWED_PROTOCOLS_DEV = ['https:', 'http:']; // Allow HTTP in development

  // Check if running in development mode
  private isDevelopment(): boolean {
    const isDev = config.environment === 'development';
    console.log(`[SecurityValidator] Environment check: config.environment='${config.environment}', isDevelopment=${isDev}`);
    return isDev;
  }

  /**
   * Validate a URL for SSRF and protocol safety
   * In development mode: allows localhost and HTTP protocol
   * In production mode: enforces HTTPS and blocks localhost
   */
  async validateUrl(urlString: string, assetType: 'json' | 'image' | 'font' = 'json'): Promise<SecurityValidationResult> {
    try {
      // Parse URL
      const url = new URL(urlString);
      const isDev = this.isDevelopment();
      const isLocalhostUrl = this.isLocalhost(url.hostname);

      // 1. Protocol validation
      const allowedProtocols = isDev ? this.ALLOWED_PROTOCOLS_DEV : this.ALLOWED_PROTOCOLS;
      
      if (!allowedProtocols.includes(url.protocol)) {
        return {
          valid: false,
          error: `Invalid protocol: ${url.protocol}. ${isDev ? 'Only HTTP/HTTPS allowed.' : 'Only HTTPS is allowed.'}`,
          errorCode: 'INVALID_PROTOCOL',
        };
      }

      // 2. Localhost validation (allow in development, block in production)
      if (isLocalhostUrl && !isDev) {
        return {
          valid: false,
          error: 'Localhost URLs are not allowed in production.',
          errorCode: 'LOCALHOST_NOT_ALLOWED',
        };
      }

      // 3. DNS resolution check (SSRF prevention) - skip for localhost
      if (!isLocalhostUrl) {
        try {
          const { address } = await dnsLookup(url.hostname);
          
          if (this.isPrivateIP(address)) {
            return {
              valid: false,
              error: `URL resolves to private IP: ${address}`,
              errorCode: 'PRIVATE_IP_NOT_ALLOWED',
            };
          }
        } catch (dnsError) {
          return {
            valid: false,
            error: `DNS lookup failed: ${dnsError.message}`,
            errorCode: 'DNS_LOOKUP_FAILED',
          };
        }
      } else {
        console.log(`[SecurityValidator] Development mode: Allowing localhost URL: ${urlString}`);
      }

      // 4. Port validation (flexible in development for localhost)
      if (url.port && url.port !== '443' && url.port !== '') {
        // In development, allow non-standard ports for localhost
        if (!isDev || !isLocalhostUrl) {
          return {
            valid: false,
            error: `Non-standard port not allowed: ${url.port}`,
            errorCode: 'INVALID_PORT',
          };
        }
        console.log(`[SecurityValidator] Development mode: Allowing non-standard port ${url.port} for localhost`);
      }

      // Note: File extension validation removed as requested
      // The platform doesn't add asset types to URLs
      // Content-type will be validated when fetching the actual resource

      console.log(`[SecurityValidator] URL validated successfully: ${urlString}`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid URL: ${error.message}`,
        errorCode: 'INVALID_URL_FORMAT',
      };
    }
  }

  /**
   * Check if hostname is localhost
   */
  private isLocalhost(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    return (
      normalized === 'localhost' ||
      normalized === '127.0.0.1' ||
      normalized === '::1' ||
      normalized === '0.0.0.0' ||
      normalized === '0000:0000:0000:0000:0000:0000:0000:0001'
    );
  }

  /**
   * Check if IP address is in private range
   */
  private isPrivateIP(ip: string): boolean {
    return this.PRIVATE_IP_RANGES.some(pattern => pattern.test(ip));
  }

  /**
   * Validate order item ID (GUID format)
   */
  validateGuid(guid: string): SecurityValidationResult {
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!guid || !guidPattern.test(guid)) {
      return {
        valid: false,
        error: 'Invalid GUID format',
        errorCode: 'INVALID_GUID',
      };
    }

    return { valid: true };
  }

  /**
   * Validate timeout value
   */
  validateTimeout(timeout: number | undefined, maxTimeout: number = 60000): SecurityValidationResult {
    if (timeout === undefined) {
      return { valid: true }; // Optional parameter
    }

    if (typeof timeout !== 'number' || timeout < 0) {
      return {
        valid: false,
        error: 'Timeout must be a positive number',
        errorCode: 'INVALID_TIMEOUT',
      };
    }

    if (timeout > maxTimeout) {
      return {
        valid: false,
        error: `Timeout exceeds maximum allowed: ${maxTimeout}ms`,
        errorCode: 'TIMEOUT_TOO_LARGE',
      };
    }

    return { valid: true };
  }

  /**
   * Validate asset size limit
   */
  validateAssetSize(size: number | undefined, maxSize: number = 52428800): SecurityValidationResult {
    if (size === undefined) {
      return { valid: true }; // Optional parameter
    }

    if (typeof size !== 'number' || size < 0) {
      return {
        valid: false,
        error: 'Asset size must be a positive number',
        errorCode: 'INVALID_SIZE',
      };
    }

    if (size > maxSize) {
      return {
        valid: false,
        error: `Asset size exceeds maximum allowed: ${maxSize} bytes`,
        errorCode: 'SIZE_TOO_LARGE',
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize filename for safe storage
   */
  sanitizeFilename(filename: string): string {
    // Remove any path traversal attempts
    const basename = filename.replace(/^.*[\\\/]/, '');
    
    // Replace unsafe characters with underscores
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Generate safe preview filename
   */
  generatePreviewFilename(orderItemId: string): string {
    const timestamp = Date.now();
    const sanitizedId = this.sanitizeFilename(orderItemId);
    return `${sanitizedId}-preview-${timestamp}.png`;
  }
}

