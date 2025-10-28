# Security Validator Updates

## Changes Made

### 1. Allow Localhost in Development Mode

**Previous Behavior:**
- Localhost URLs were blocked in all environments
- HTTP protocol was blocked in all environments

**New Behavior:**
- **Development Mode** (`NODE_ENV=development`):
  - ✅ Localhost URLs are allowed (localhost, 127.0.0.1, ::1)
  - ✅ HTTP protocol is allowed for localhost
  - ✅ Non-standard ports are allowed for localhost (e.g., :3000, :4200, :44301)
  - 🔒 SSRF checks still apply for non-localhost URLs

- **Production Mode** (`NODE_ENV=production`):
  - ❌ Localhost URLs are blocked
  - ❌ HTTP protocol is blocked (HTTPS only)
  - ❌ Non-standard ports are blocked
  - 🔒 Full SSRF protection enabled

### 2. Removed File Extension Validation

**Previous Behavior:**
- URLs were validated for file extensions (.json, .png, .ttf, etc.)
- Warning logged if extension didn't match expected asset type

**New Behavior:**
- ✅ File extension validation removed from URL validation
- ✅ Content-Type header validation happens when fetching the resource
- ✅ Supports platforms that use query parameters instead of file extensions
  - Example: `https://storage.example.com/api/getfile?id=12345`

## Configuration

Set environment mode in `.env` file:

```bash
# Development mode (allows localhost)
NODE_ENV=development

# Production mode (blocks localhost, enforces HTTPS)
NODE_ENV=production
```

## Examples

### Development Mode Examples

```javascript
// ✅ ALLOWED in development
'http://localhost:3000/design.json'
'http://localhost:44301/api/files/preview'
'http://127.0.0.1:8080/template.json'
'https://localhost/design'

// ✅ ALLOWED (no extension required)
'https://storage.example.com/api/getfile?id=12345'
'https://cdn.example.com/preview?orderid=abc123'

// ❌ STILL BLOCKED (security)
'file:///etc/passwd'
'ftp://example.com/file'
'http://10.0.0.1/internal'  // Private IP
```

### Production Mode Examples

```javascript
// ✅ ALLOWED in production
'https://storage.example.com/design.json'
'https://cdn.example.com/api/getfile?id=12345'

// ❌ BLOCKED in production
'http://example.com/design.json'  // HTTP not allowed
'https://localhost/design.json'   // Localhost not allowed
'https://192.168.1.1/file'        // Private IP
'https://example.com:8443/file'   // Non-standard port
```

## Security Features Still Active

The following security protections remain active in all modes:

### SSRF Protection
- ✅ Private IP ranges blocked (10.x, 172.16-31.x, 192.168.x)
- ✅ Link-local addresses blocked (169.254.x)
- ✅ IPv6 private ranges blocked
- ✅ DNS resolution check (resolves hostname before fetching)

### Protocol Protection
- ✅ file:// protocol blocked
- ✅ ftp:// protocol blocked
- ✅ Only HTTP/HTTPS allowed (HTTP only for localhost in dev)

### Request Validation
- ✅ GUID format validation for order IDs
- ✅ Timeout limits (max 60 seconds)
- ✅ File size limits (max 50MB)
- ✅ Filename sanitization

### Content Validation
- ✅ Content-Type headers validated when fetching
- ✅ MIME type checking for images and fonts
- ✅ Size streaming with early abort

## Testing

### Test Localhost in Development

```bash
# Set development mode
export NODE_ENV=development  # Linux/Mac
# or
set NODE_ENV=development     # Windows CMD
# or
$env:NODE_ENV="development"  # Windows PowerShell

# Test the endpoint
curl -X POST http://localhost:1337/api/canvas/render-preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:123456' | base64)" \
  -d '{
    "jsonDesignUrl": "http://localhost:44301/api/files/design?id=123",
    "orderItemId": "12345678-1234-1234-1234-123456789abc"
  }'
```

### Test Production Mode

```bash
# Set production mode
export NODE_ENV=production

# This should fail with LOCALHOST_NOT_ALLOWED
curl -X POST http://localhost:1337/api/canvas/render-preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:123456' | base64)" \
  -d '{
    "jsonDesignUrl": "http://localhost:44301/api/files/design?id=123",
    "orderItemId": "12345678-1234-1234-1234-123456789abc"
  }'
```

## Upgrade Notes

### For Developers

1. **Set NODE_ENV**: Make sure `NODE_ENV=development` is set in your `.env` file
2. **Localhost URLs**: You can now use `http://localhost:port` URLs in development
3. **No Extensions**: URLs no longer need file extensions (e.g., `.json`)

### For Production

1. **Verify NODE_ENV**: Ensure `NODE_ENV=production` in production environment
2. **HTTPS Required**: All URLs must use HTTPS in production
3. **No Localhost**: Localhost URLs will be blocked in production
4. **Public URLs Only**: Use publicly accessible URLs for all resources

## Migration from Old Behavior

If you were previously using workarounds for localhost or file extensions:

```javascript
// OLD: Had to use workarounds
// ❌ This failed in old version
const url = 'http://localhost:44301/api/files/design';

// NEW: Just works in development
// ✅ Now works with NODE_ENV=development
const url = 'http://localhost:44301/api/files/design';
```

## Logging

The validator now logs actions for debugging:

```
[SecurityValidator] Development mode: Allowing localhost URL: http://localhost:3000/design.json
[SecurityValidator] Development mode: Allowing non-standard port 3000 for localhost
[SecurityValidator] URL validated successfully: http://localhost:3000/design.json
```

Production logs:
```
[SecurityValidator] URL validated successfully: https://storage.example.com/api/getfile?id=123
```

## Code Changes

### Files Modified

1. **services/security-validator.service.ts**
   - Added `isDevelopment()` method
   - Added `ALLOWED_PROTOCOLS_DEV` array
   - Updated `validateUrl()` to check NODE_ENV
   - Removed file extension validation
   - Added development mode logging

2. **test/canvas-renderer.spec.ts**
   - Updated tests to handle development/production modes
   - Added tests for localhost in development
   - Added tests for URLs without extensions

## Rollback

If you need to rollback to strict security (block localhost in all modes):

```typescript
// In security-validator.service.ts
private isDevelopment(): boolean {
  return false; // Always return false to enforce production rules
}
```

## Support

For questions or issues with the security changes:
1. Check `NODE_ENV` is set correctly
2. Review logs for security validation messages
3. Verify URL format matches examples above
4. Check that production environment uses HTTPS

---

**Last Updated:** October 2024  
**Breaking Changes:** None (backward compatible, just more permissive in development)

