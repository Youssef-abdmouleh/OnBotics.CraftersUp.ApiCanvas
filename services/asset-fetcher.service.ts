/**
 * Asset Fetcher Service
 * Safely fetches remote assets (JSON, images, fonts) with size limits and timeouts
 */

import fetch, { Response } from 'node-fetch';
import { SecurityValidatorService } from './security-validator.service';
import * as https from 'https';
import config from '../config';


const httpsAgent = config.environment === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

export interface FetchOptions {
  timeout?: number;
  maxSize?: number;
  userAgent?: string;
}

export interface FetchResult<T = any> {
  data: T;
  contentType: string;
  size: number;
}

export class AssetFetcherService {
  private securityValidator: SecurityValidatorService;
  private defaultTimeout = 10000; // 10 seconds
  private defaultMaxSize = 10485760; // 10 MB

  constructor() {
    this.securityValidator = new SecurityValidatorService();
  }

  /**
   * Fetch JSON design from URL
   */
  async fetchJson<T = any>(url: string, options?: FetchOptions): Promise<FetchResult<T>> {
    console.log(`[AssetFetcher] Fetching JSON from: ${url}`);

    // Security validation
    const validation = await this.securityValidator.validateUrl(url, 'json');
    if (!validation.valid) {
      throw new Error(`Security validation failed: ${validation.error}`);
    }

    const timeout = options?.timeout || this.defaultTimeout;
    const maxSize = options?.maxSize || this.defaultMaxSize;

    const response = await this.fetchWithTimeout(url, timeout, options?.userAgent);

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      console.warn(`[AssetFetcher] Unexpected content-type for JSON: ${contentType}`);
    }

    // Check content length
    await this.validateContentLength(response, maxSize);

    // Read response as text first to check size
    const text = await response.text();

    if (text.length > maxSize) {
      throw new Error(`JSON size exceeds maximum: ${text.length} > ${maxSize} bytes`);
    }

    const data = JSON.parse(text) as T ;

    console.log(`[AssetFetcher] JSON fetched successfully: ${text.length} bytes`);

    return {
      data,
      contentType,
      size: text.length,
    };
  }

  /**
   * Fetch binary asset (image, font) from URL
   */
  async fetchBinary(url: string, assetType: 'image' | 'font', options?: FetchOptions): Promise<FetchResult<Buffer>> {
    console.log(`[AssetFetcher] Fetching ${assetType} from: ${url}`);

    // Security validation
    const validation = await this.securityValidator.validateUrl(url, assetType);
    if (!validation.valid) {
      throw new Error(`Security validation failed: ${validation.error}`);
    }

    const timeout = options?.timeout || this.defaultTimeout;
    const maxSize = options?.maxSize || this.defaultMaxSize;

    const response = await this.fetchWithTimeout(url, timeout, options?.userAgent);

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    this.validateContentType(contentType, assetType);

    // Check content length
    await this.validateContentLength(response, maxSize);

    // Stream response with size checking
    const buffer = await response.buffer();

    if (buffer.length > maxSize) {
      throw new Error(`${assetType} size exceeds maximum: ${buffer.length} > ${maxSize} bytes`);
    }

    console.log(`[AssetFetcher] ${assetType} fetched successfully: ${buffer.length} bytes`);

    return {
      data: buffer,
      contentType,
      size: buffer.length,
    };
  }

  /**
   * Fetch with timeout using AbortController
   */
  private async fetchWithTimeout(url: string, timeout: number, userAgent?: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    console.log(`[AssetFetcher] Fetching URL with timeout ${timeout}ms: ${url}`);

    try {
      const response = await fetch(url, {
        signal: controller.signal as any,
        headers: {
          'User-Agent': userAgent || 'CraftersUp-Canvas-Renderer/1.0',
        },
        redirect: 'follow',
        follow: 3, // Maximum 3 redirects
        agent: httpsAgent, // ADD THIS LINE - Use agent for self-signed certs in dev
      });
      console.log(`[AssetFetcher] Received response: ${response.status} ${response.statusText} for URL: ${url}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Validate content length header
   */
  private async validateContentLength(response: Response, maxSize: number): Promise<void> {
    const contentLength = response.headers.get('content-length');

    if (contentLength) {
      const size = parseInt(contentLength, 10);

      if (size > maxSize) {
        throw new Error(`Content-Length exceeds maximum: ${size} > ${maxSize} bytes`);
      }
    }
  }

  /**
   * Validate content type for asset
   */
  private validateContentType(contentType: string, assetType: 'image' | 'font'): void {
    const normalized = contentType.toLowerCase();

    if (assetType === 'image') {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.some(type => normalized.includes(type))) {
        throw new Error(`Invalid content-type for image: ${contentType}`);
      }
    } else if (assetType === 'font') {
      const validTypes = ['font/', 'application/font', 'application/x-font', 'application/octet-stream'];
      if (!validTypes.some(type => normalized.includes(type))) {
        console.warn(`[AssetFetcher] Unexpected content-type for font: ${contentType}`);
        // Don't fail - some servers use generic content-types for fonts
      }
    }
  }

  /**
   * Batch fetch multiple assets
   */
  async fetchMultiple<T = any>(
    urls: Array<{ url: string; type: 'json' | 'image' | 'font' }>,
    options?: FetchOptions
  ): Promise<Array<FetchResult<T | Buffer>>> {
    console.log(`[AssetFetcher] Fetching ${urls.length} assets in parallel`);

    const promises = urls.map(async ({ url, type }) => {
      try {
        if (type === 'json') {
          return await this.fetchJson<T>(url, options);
        } else {
          return await this.fetchBinary(url, type as 'image' | 'font', options);
        }
      } catch (error) {
        console.error(`[AssetFetcher] Failed to fetch ${type} from ${url}:`, error);
        throw error;
      }
    });

    return Promise.all(promises);
  }
}

