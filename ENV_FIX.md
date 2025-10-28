# Environment Variable Loading Fix

## Problem

The `.env` file was created but not being loaded by the application, causing `NODE_ENV` to remain undefined even though it was set in `.env` file.

**Error seen:**
```
"message": "Security validation failed: Localhost URLs are not allowed in production."
```

Even though `.env` had `NODE_ENV=development`.

## Root Cause

The application was missing the `dotenv` package, which is required to load environment variables from `.env` files in Node.js.

## Solution Applied

### 1. **Installed dotenv package**
   - Added `dotenv` to dependencies in `package.json`
   - Added `@types/dotenv` for TypeScript support

### 2. **Updated app.ts**
   - Added dotenv import and config at the top of `app.ts` (before other imports)
   - This ensures `.env` file is loaded before any other code runs

### 3. **Updated SecurityValidator**
   - Changed from reading `process.env.NODE_ENV` directly
   - Now uses `config.environment` which reads from process.env
   - Added logging to show current environment setting

## Steps to Fix (Run These Commands)

### Windows PowerShell

```powershell
# Navigate to API Canvas directory
cd c:\gitSource\craftersup\OnBotics.CraftersUp.ApiCanvas\OnBotics.CraftersUp.ApiCanvas

# Install dotenv package
npm install

# Verify .env file exists with correct content
Get-Content .env

# Should show:
# NODE_ENV=development
# PORT=1337
# etc...

# Rebuild TypeScript
npm run build

# Start server
npm start
```

## Verification

When you start the server, you should now see:

```
==============================================
  API Canvas Server
  Environment: development      <-- Should show 'development'
  Port: 1337
  Auth: Enabled
  CORS: Enabled
  Progress Tracking: Enabled
==============================================
```

When making a request, the logs will show:
```
[SecurityValidator] Environment check: config.environment='development', isDevelopment=true
[SecurityValidator] Development mode: Allowing localhost URL: http://localhost:44301/...
[SecurityValidator] URL validated successfully: http://localhost:44301/...
```

## Testing

### Test 1: Verify Environment Loading

```powershell
# In app directory
cd c:\gitSource\craftersup\OnBotics.CraftersUp.ApiCanvas\OnBotics.CraftersUp.ApiCanvas

# Start server and check output
npm start

# Look for: "Environment: development" in the startup banner
```

### Test 2: Test Localhost URL

```powershell
# In another terminal
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("username:123456"))

$response = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:1337/api/canvas/render-preview" `
  -Headers @{
    "Authorization" = "Basic $base64Auth"
    "Content-Type" = "application/json"
  } `
  -Body (@{
    jsonDesignUrl = "http://localhost:44301/api/test"
    orderItemId = "12345678-1234-1234-1234-123456789abc"
  } | ConvertTo-Json)

# Should NOT get "Localhost URLs are not allowed" error anymore
# May get different error (like "DNS lookup failed") but that's okay
# The important thing is localhost validation passes
```

## What Changed

### Files Modified

1. **package.json**
   ```json
   "dependencies": {
     ...
     "dotenv": "^16.0.3",  // ADDED
     ...
   },
   "devDependencies": {
     ...
     "@types/dotenv": "^8.2.0",  // ADDED
     ...
   }
   ```

2. **app.ts** (lines 1-3)
   ```typescript
   // Load environment variables from .env file
   import * as dotenv from 'dotenv';
   dotenv.config();
   // ... rest of imports
   ```

3. **services/security-validator.service.ts**
   ```typescript
   import config from '../config';  // ADDED

   private isDevelopment(): boolean {
     const isDev = config.environment === 'development';
     console.log(`[SecurityValidator] Environment check: config.environment='${config.environment}', isDevelopment=${isDev}`);
     return isDev;
   }
   ```

## Troubleshooting

### Issue: Still getting "Localhost URLs are not allowed"

**Check 1: Verify .env file exists**
```powershell
Get-Content .env
```

**Check 2: Verify dotenv is installed**
```powershell
npm list dotenv
# Should show: dotenv@16.0.3
```

**Check 3: Check server startup logs**
Look for:
```
Environment: development
```

If it shows `production`, the .env file is not being loaded.

**Check 4: Restart the server**
```powershell
# Stop server (Ctrl+C)
# Start again
npm start
```

### Issue: .env file not found

**Solution: Create it manually**
```powershell
cd c:\gitSource\craftersup\OnBotics.CraftersUp.ApiCanvas\OnBotics.CraftersUp.ApiCanvas

@"
NODE_ENV=development
PORT=1337
PREVIEW_DIR=./storage/previews
STORAGE_BASE_URL=http://localhost:1337/storage
MAX_FILE_SIZE=52428800
TEMP_DIR=C:/temp/canvas-fonts
MAX_CONCURRENT_RENDERS=10
"@ | Out-File -FilePath .env -Encoding UTF8

Get-Content .env
```

### Issue: TypeScript compilation error

**Solution: Install types**
```powershell
npm install @types/dotenv --save-dev
npm run build
```

## Alternative: Set Environment Variable Manually

If you don't want to use `.env` file, you can set NODE_ENV when starting:

### Windows CMD
```cmd
set NODE_ENV=development && npm start
```

### Windows PowerShell
```powershell
$env:NODE_ENV="development"; npm start
```

### Linux/Mac
```bash
NODE_ENV=development npm start
```

## Production Deployment

For production, either:

1. **Set environment variable** (recommended for production):
   ```bash
   export NODE_ENV=production
   npm start
   ```

2. **Or update .env file**:
   ```
   NODE_ENV=production
   ```

Production will:
- ❌ Block localhost URLs
- ❌ Block HTTP (HTTPS only)
- ❌ Block private IPs
- ✅ Full SSRF protection

---

**Status:** ✅ Fixed  
**Date:** October 2024  
**Files Changed:** app.ts, package.json, security-validator.service.ts

