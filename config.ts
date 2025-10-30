/**
 * API Canvas Configuration
 * Edit this file to configure your Express server settings
 */

export interface AppConfig {
  port: number;
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
  };
  auth: {
    enabled: boolean;
    username: string;
    password: string;
  };
  processing: {
    timeoutMs: number; // Maximum processing time in milliseconds
    enableProgress: boolean;
    tempDir?: string; // Temporary directory for font caching
    maxConcurrentRenders?: number; // Maximum concurrent render operations
  };
  storage: {
    previewDir: string; // Directory for storing preview images
    baseUrl: string; // Base URL for accessing stored files
    maxFileSize: number; // Maximum file size in bytes
  };
  logging: {
    enabled: boolean;
    format: string; // 'dev' | 'combined' | 'common' | 'short' | 'tiny'
  };
  environment: 'development' | 'production';
}

const config: AppConfig = {
  // Server port
  port: parseInt(process.env.PORT || '1337', 10),

  // CORS Configuration
  cors: {
    enabled: true,
    // TODO: Update allowed origins for production deployment
    // Development: Allow Angular dev server
    origins: [
      'http://localhost:4200',
      'http://localhost:3000',
      // 'https://your-production-domain.com' // Uncomment and add production domain
    ],
    credentials: true, // Allow cookies and auth headers
  },

  // Simple Authentication
  // TODO: Replace with proper authentication system for production
  auth: {
    enabled: true,
    username: 'username',
    password: '123456',
  },

  // Processing Configuration
  processing: {
    timeoutMs: 10 * 60 * 1000, // 10 minutes
    enableProgress: true, // Enable progress tracking for long-running operations
    // Platform-specific temp directory
    tempDir: process.env.TEMP_DIR || (
      process.platform === 'win32'
        ? (process.env.TEMP || 'C:\\Temp') + '\\canvas-fonts'
        : '/tmp/canvas-fonts'
    ),
    maxConcurrentRenders: parseInt(process.env.MAX_CONCURRENT_RENDERS || '10', 10),
  },

  // Storage Configuration
  storage: {
    previewDir: process.env.PREVIEW_DIR || './storage/previews',
    baseUrl: process.env.STORAGE_BASE_URL || 'http://localhost:1337/storage',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50 MB default
  },

  // Logging Configuration
  logging: {
    enabled: true,
    format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  },

  environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
};

export default config;

