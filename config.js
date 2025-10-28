"use strict";
/**
 * API Canvas Configuration
 * Edit this file to configure your Express server settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
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
        timeoutMs: 10 * 60 * 1000,
        enableProgress: true,
        tempDir: process.env.TEMP_DIR || '/tmp/canvas-fonts',
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
    environment: process.env.NODE_ENV || 'development',
};
exports.default = config;
//# sourceMappingURL=config.js.map