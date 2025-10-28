# Canvas Renderer - Quick Reference

## Installation (One-Time Setup)

```bash
# 1. Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev

# 2. Install NPM packages
cd OnBotics.CraftersUp.ApiCanvas/OnBotics.CraftersUp.ApiCanvas
npm install

# 3. Build and start
npm run build
npm start
```

## API Usage

### Endpoint
```
POST /api/canvas/render-preview
Authorization: Basic base64("username:123456")
Content-Type: application/json
```

### Request
```json
{
  "jsonDesignUrl": "https://storage.example.com/design.json",
  "orderItemId": "12345678-1234-1234-1234-123456789abc",
  "options": {
    "timeout": 30000,
    "maxAssetSize": 10485760
  }
}
```

### Response
```json
{
  "success": true,
  "preview": {
    "url": "http://localhost:1337/storage/previews/abc-preview-123.png",
    "id": "12345678-1234-1234-1234-123456789abc",
    "path": "./storage/previews/abc-preview-123.png"
  },
  "meta": {
    "width": 1100,
    "height": 800,
    "objectCount": 5,
    "processingTimeMs": 1250,
    "requestId": "req-abc"
  }
}
```

### cURL Example
```bash
curl -X POST http://localhost:1337/api/canvas/render-preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:123456' | base64)" \
  -d '{
    "jsonDesignUrl": "https://your-server.com/design.json",
    "orderItemId": "12345678-1234-1234-1234-123456789abc"
  }'
```

## Key Files

| File | Purpose |
|------|---------|
| `routes/canvas-renderer.ts` | API endpoint |
| `services/canvas-renderer-core.service.ts` | Rendering logic |
| `services/canvas-renderer-node.adapter.ts` | Node.js adapter |
| `services/security-validator.service.ts` | SSRF protection |
| `services/asset-fetcher.service.ts` | Safe asset loading |
| `config.ts` | Configuration |
| `test/canvas-renderer.spec.ts` | Tests |

## Configuration

**Environment Variables:**
```bash
PORT=1337
NODE_ENV=development
PREVIEW_DIR=./storage/previews
STORAGE_BASE_URL=http://localhost:1337/storage
TEMP_DIR=/tmp/canvas-fonts
MAX_CONCURRENT_RENDERS=10
```

**Edit `config.ts` for:**
- Auth credentials (⚠️ change for production!)
- CORS origins
- Timeout limits
- Storage paths

## Common Commands

```bash
# Start server
npm start

# Development with rebuild
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build TypeScript
npm run build

# Clean build
npm run clean

# Health check
curl http://localhost:1337/api/canvas/health
```

## Troubleshooting

### node-canvas won't install
```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev

# macOS
brew install pkg-config cairo pango

# Windows
npm install --global windows-build-tools
```

### Permission errors
```bash
# Fix storage permissions
chmod -R 755 storage/
mkdir -p /tmp/canvas-fonts
chmod 755 /tmp/canvas-fonts
```

### Font download timeout
Check network, increase timeout in `config.ts`:
```typescript
processing: {
  timeoutMs: 30000, // Increase
}
```

### Preview not saving
```bash
# Ensure directory exists and is writable
mkdir -p storage/previews
chmod 755 storage/previews
```

## Security Checklist

- ✅ HTTPS only (no HTTP)
- ✅ No localhost URLs
- ✅ No private IP addresses
- ✅ GUID validation for IDs
- ✅ Timeout limits (max 60s)
- ✅ Size limits (max 50MB)
- ✅ Filename sanitization

## Performance Tips

1. **Font Caching**: Fonts cached to `/tmp/canvas-fonts` (reused)
2. **Concurrent Limits**: Default 10, adjust in `config.ts`
3. **Asset Streaming**: Early abort on oversized files
4. **Resource Cleanup**: Automatic after each render

## Typical Processing Times

- Simple design: ~500ms
- Complex design: ~2-3s
- Font download: ~500ms (first time only)
- Font from cache: <50ms

## Error Codes

| Code | Status | Fix |
|------|--------|-----|
| `VALIDATION_ERROR` | 400 | Check request format |
| `INVALID_PROTOCOL` | 403 | Use HTTPS |
| `LOCALHOST_NOT_ALLOWED` | 403 | Use public URL |
| `PRIVATE_IP_NOT_ALLOWED` | 403 | Use public IP |
| `TIMEOUT_ERROR` | 408 | Increase timeout |
| `SIZE_TOO_LARGE` | 413 | Reduce asset size |

## Documentation

- **INSTALLATION_GUIDE.md** - Step-by-step setup
- **CANVAS_RENDERING_README.md** - Technical details
- **IMPLEMENTATION_SUMMARY.md** - What was built
- **This file** - Quick reference

## Support

**Health Check:**
```bash
curl http://localhost:1337/api/canvas/health
```

**View Logs:**
- Console output shows request tracking
- Each stage logged with duration
- Errors include requestId for tracking

**Debug Mode:**
Set `NODE_ENV=development` for:
- Detailed error messages
- Stack traces in responses
- Verbose logging

---

**Quick Start:** `npm install && npm start`  
**Test:** `npm test`  
**Docs:** See `INSTALLATION_GUIDE.md`

