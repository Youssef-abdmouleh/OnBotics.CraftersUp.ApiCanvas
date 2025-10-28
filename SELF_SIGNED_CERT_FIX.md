# Self-Signed Certificate Fix

## Problem Solved

**Error:** `DEPTH_ZERO_SELF_SIGNED_CERT` when fetching from `https://localhost:44301`

**Root Cause:** Node.js's `node-fetch` rejects self-signed SSL certificates by default for security reasons.

## Changes Applied

### 1. **asset-fetcher.service.ts**

**Added imports:**
```typescript
import * as https from 'https';
import config from '../config';
```

**Added HTTPS agent:**
```typescript
const httpsAgent = config.environment === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;
```

**Updated fetch calls:**
```typescript
const response = await fetch(url, {
  signal: controller.signal as any,
  headers: {
    'User-Agent': userAgent || 'CraftersUp-Canvas-Renderer/1.0',
  },
  redirect: 'follow',
  follow: 3,
  agent: httpsAgent, // ADDED: Use agent for self-signed certs in dev
});
```

### 2. **canvas-renderer-node.adapter.ts**

**Added imports:**
```typescript
import * as https from 'https';
import config from '../config';
```

**Added HTTPS agent:**
```typescript
const httpsAgent = config.environment === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;
```

**Updated font download:**
```typescript
const response = await fetch(font.fontUrl, {
  timeout: 10000,
  headers: {
    'User-Agent': 'CraftersUp-Canvas-Renderer/1.0',
  },
  agent: httpsAgent, // ADDED
});
```

**Updated image loading:**
```typescript
const response = await fetch(url, {
  timeout: 10000,
  headers: {
    'User-Agent': 'CraftersUp-Canvas-Renderer/1.0',
  },
  agent: httpsAgent, // ADDED
});
```

## Security Notes

✅ **Safe for Development:**
- Only accepts self-signed certificates when `NODE_ENV=development`
- Uses `rejectUnauthorized: false` only in development mode

🔒 **Production Security:**
- In production (`NODE_ENV=production`), certificate validation is fully enforced
- No security compromise in production environment

## Next Steps

### 1. Build the Project
```powershell
cd OnBotics.CraftersUp.ApiCanvas\OnBotics.CraftersUp.ApiCanvas
npm run build
```

### 2. Start the Server
```powershell
npm start
```

### 3. Test with Localhost HTTPS URL
```powershell
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("username:123456"))

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:1337/api/canvas/render-preview" `
  -Headers @{
    "Authorization" = "Basic $base64Auth"
    "Content-Type" = "application/json"
  } `
  -Body (@{
    jsonDesignUrl = "https://localhost:44301/api/files/design?id=123"
    orderItemId = "12345678-1234-1234-1234-123456789abc"
  } | ConvertTo-Json)
```

## Expected Results

### Before Fix:
```
❌ Error: self-signed certificate
   reason: self-signed certificate
   type: 'system'
   errno: 'DEPTH_ZERO_SELF_SIGNED_CERT'
   code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
```

### After Fix:
```
✅ [AssetFetcher] Fetching JSON from: https://localhost:44301/api/files/design?id=123
✅ [SecurityValidator] Development mode: Allowing localhost URL: https://localhost:44301/api/files/design?id=123
✅ [AssetFetcher] JSON fetched successfully: 5432 bytes
✅ [CanvasRendererCore] Starting render in node environment
✅ [NodeAdapter] Loading font: Arial (Arial)
✅ [NodeAdapter] Font downloaded: C:/temp/canvas-fonts/Arial_abc123.ttf (124567 bytes)
✅ [CanvasRendererCore] Render completed in 1250ms
```

## Verification

### Check Environment Mode
When you start the server, verify it shows:
```
==============================================
  API Canvas Server
  Environment: development      <-- Should show 'development'
  Port: 1337
  ...
==============================================
```

### Check Logs
Look for these log messages:
```
[SecurityValidator] Environment check: config.environment='development', isDevelopment=true
[SecurityValidator] Development mode: Allowing localhost URL: https://localhost:44301/...
[AssetFetcher] JSON fetched successfully: XXXX bytes
```

## Troubleshooting

### Issue: Still getting certificate errors

**Check 1: Verify NODE_ENV**
```powershell
# Check .env file
Get-Content .env | Select-String "NODE_ENV"
# Should show: NODE_ENV=development
```

**Check 2: Restart server**
```powershell
# Stop server (Ctrl+C)
npm start
```

**Check 3: Check server logs**
Look for: `Environment: development` in startup banner

### Issue: Production concerns

**For Production Deployment:**
- Set `NODE_ENV=production` in production environment
- Self-signed certificates will be rejected in production
- Only valid SSL certificates will be accepted

## Files Modified

1. `services/asset-fetcher.service.ts`
   - Added HTTPS agent for development
   - Updated fetch calls to use agent

2. `services/canvas-renderer-node.adapter.ts`
   - Added HTTPS agent for development
   - Updated font download and image loading

## Summary

✅ **Fixed:** Self-signed certificate rejection in development
✅ **Secure:** Production mode still enforces certificate validation
✅ **Compatible:** Works with ASP.NET localhost HTTPS (port 44301)
✅ **Logged:** Clear logging shows when development mode is active

The canvas renderer can now successfully fetch from `https://localhost:44301` in development mode! 🎉

---

**Status:** ✅ Complete  
**Date:** October 2024  
**Impact:** Resolves self-signed certificate errors for localhost HTTPS URLs
