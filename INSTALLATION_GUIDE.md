# Canvas Renderer Installation Guide

## Quick Start

Follow these steps to set up server-side canvas rendering on your system.

## Step 1: Install System Dependencies

### Ubuntu/Debian Linux

```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev
```

### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
```

### Windows

```powershell
# Open PowerShell as Administrator
npm install --global --production windows-build-tools

# Or install Visual Studio Build Tools manually
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2019
```

## Step 2: Install NPM Dependencies

```bash
cd OnBotics.CraftersUp.ApiCanvas/OnBotics.CraftersUp.ApiCanvas

# Install canvas and related packages
npm install canvas fabric node-fetch@2 @types/node-fetch@2 --save

# Verify installation
node -e "const canvas = require('canvas'); console.log('canvas version:', canvas.version)"
```

### Expected Output
```
canvas version: 2.11.2
```

## Step 3: Configure Environment

Create a `.env` file in the project root (optional, uses defaults if not provided):

```bash
# Create .env file
cat > .env << EOF
# Server Configuration
PORT=1337
NODE_ENV=development

# Storage Configuration
PREVIEW_DIR=./storage/previews
STORAGE_BASE_URL=http://localhost:1337/storage
MAX_FILE_SIZE=52428800

# Processing Configuration
TEMP_DIR=/tmp/canvas-fonts
MAX_CONCURRENT_RENDERS=10
EOF
```

## Step 4: Create Storage Directories

```bash
# Create storage directories (will be auto-created, but you can pre-create)
mkdir -p storage/previews
mkdir -p /tmp/canvas-fonts

# Set permissions
chmod 755 storage/previews
chmod 755 /tmp/canvas-fonts
```

## Step 5: Build and Start Server

```bash
# Build TypeScript
npm run build

# Start server
npm start

# Or for development with auto-reload
npm run dev
```

### Expected Output
```
==============================================
  API Canvas Server
  Environment: development
  Port: 1337
  Auth: Enabled
  CORS: Enabled
  Progress Tracking: Enabled
==============================================
```

## Step 6: Verify Installation

### Test 1: Health Check

```bash
curl http://localhost:1337/api/canvas/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "canvas-renderer",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Test 2: Test Rendering (with sample design)

Create a test design file `test-design.json`:
```json
{
  "fabricData": {
    "objects": [
      {
        "type": "textbox",
        "text": "Hello Canvas!",
        "fontFamily": "Arial",
        "fontSize": 60,
        "fill": "#000000",
        "left": 100,
        "top": 100
      }
    ],
    "background": "#ffffff"
  },
  "customMetadata": {
    "dpi": 96,
    "widthMM": 100,
    "heightMM": 80,
    "width": 378,
    "height": 302
  }
}
```

Upload to a web server or use a local HTTP server:
```bash
# Option 1: Use Python HTTP server
python3 -m http.server 8000
# Access at: http://localhost:8000/test-design.json

# Option 2: Upload to cloud storage and get HTTPS URL
```

Send render request:
```bash
curl -X POST http://localhost:1337/api/canvas/render-preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:123456' | base64)" \
  -d '{
    "jsonDesignUrl": "https://your-server.com/test-design.json",
    "orderItemId": "12345678-1234-1234-1234-123456789abc"
  }'
```

Expected response:
```json
{
  "success": true,
  "preview": {
    "url": "http://localhost:1337/storage/previews/12345678-1234-1234-1234-123456789abc-preview-1698765432.png",
    "id": "12345678-1234-1234-1234-123456789abc",
    "path": "./storage/previews/..."
  },
  "meta": {
    "width": 378,
    "height": 302,
    "objectCount": 1,
    "processingTimeMs": 850,
    "requestId": "..."
  }
}
```

## Step 7: Run Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Common Issues & Solutions

### Issue: `canvas` npm install fails

**Solution for Linux:**
```bash
# Install ALL required dependencies
sudo apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config

# Try again
npm install canvas
```

**Solution for macOS:**
```bash
# Ensure pkg-config is in PATH
export PKG_CONFIG_PATH="/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"

# Reinstall dependencies
brew reinstall cairo pango

# Try again
npm install canvas
```

**Solution for Windows:**
```powershell
# Install Visual Studio Build Tools with C++ workload
# Download from: https://visualstudio.microsoft.com/downloads/

# Ensure Python is installed
winget install Python.Python.3.11

# Try again
npm install canvas
```

### Issue: Permission denied on storage directory

```bash
# Fix permissions
sudo chown -R $USER:$USER storage/
chmod -R 755 storage/

# Or run with sudo (not recommended for production)
sudo npm start
```

### Issue: Font download timeout

Check network connectivity and firewall:
```bash
# Test font URL directly
curl -I https://your-font-url.com/font.ttf

# Increase timeout in config
# Edit config.ts:
processing: {
  timeoutMs: 30000, // Increase to 30 seconds
}
```

### Issue: ENOENT: no such file or directory

Ensure directories exist:
```bash
# Create all required directories
mkdir -p storage/previews
mkdir -p /tmp/canvas-fonts

# Or let the app create them
# (it will auto-create on first run)
```

### Issue: Canvas render produces blank image

Check:
1. Design JSON is valid
2. Fonts are accessible (HTTPS URLs)
3. Objects have valid coordinates
4. Canvas dimensions are correct

Debug:
```typescript
// Add logging in canvas-renderer-node.adapter.ts
console.log('Canvas objects:', canvas.getObjects().length);
canvas.getObjects().forEach(obj => {
  console.log('Object:', obj.type, obj);
});
```

## Production Deployment Checklist

- [ ] Change default auth credentials in `config.ts`
- [ ] Update CORS origins to production domains
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper storage (S3, Azure Blob, etc.)
- [ ] Set up reverse proxy (nginx) for HTTPS
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Configure firewall rules
- [ ] Set resource limits (memory, CPU)
- [ ] Schedule cache cleanup jobs
- [ ] Configure backup for storage directory

## Next Steps

1. Read `CANVAS_RENDERING_README.md` for detailed documentation
2. Review `routes/canvas-renderer.ts` for API details
3. Check `services/security-validator.service.ts` for security settings
4. Explore `test/canvas-renderer.spec.ts` for usage examples
5. Integrate with your Angular frontend

## Support

For issues or questions:
- Check logs in console output
- Review test cases in `test/canvas-renderer.spec.ts`
- Consult node-canvas documentation: https://github.com/Automattic/node-canvas
- Consult fabric.js documentation: http://fabricjs.com/docs/

## Version Compatibility

| Package | Minimum Version | Recommended Version |
|---------|----------------|---------------------|
| Node.js | 14.x | 18.x or later |
| npm | 6.x | 8.x or later |
| canvas | 2.9.x | 2.11.x |
| fabric | 5.x | 5.3.x |
| TypeScript | 4.5.x | 4.9.x |

---

**Installation Complete!** 🎉

Your server-side canvas rendering is now ready to use.

