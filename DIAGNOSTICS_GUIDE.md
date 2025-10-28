# Canvas Rendering Diagnostics Guide

## Testing with Enhanced Logging

I've added extensive diagnostic logging to help identify exactly what's happening. Please test the rendering and share the server logs.

### What to Look For in Logs

#### 1. **Background Image Loading**

You should see these log entries if background image loading is working:

```
[NodeAdapter] fabric.util.loadImage called for: https://...
[NodeAdapter] Fetching image...
[NodeAdapter] Image fetch response: 200 OK
[NodeAdapter] Image buffer received: XXXXX bytes
[NodeAdapter] NodeImage created, dimensions: 1100x800
[NodeAdapter] Image callback executed successfully
[CanvasRendererCore] Background image object exists, waiting for load...
[CanvasRendererCore] Background image already loaded (or loaded successfully)
```

**If you DON'T see these logs**, it means:
- Background image URL is not in the JSON, or
- fabric.loadFromJSON isn't processing the backgroundImage property

#### 2. **Font Registration**

You should see these logs for each font:

```
[req-xxx] Found 2 unique fonts:
[req-xxx]   Font 1: FontName (ID: guid-here)
[req-xxx]   URL: https://localhost:44301/ImageManagement/GetDocumentFileFont?...
[NodeAdapter] Loading font: FontName (guid)
[NodeAdapter] Fetching font from: https://...
[NodeAdapter] Font fetched: 123456 bytes
[NodeAdapter] opentype.js parsed font successfully
[NodeAdapter] Font internal name: "FontName"
[NodeAdapter] Verifying font registration: "FontName"
[NodeAdapter] Font "FontName" verified (attempt 1)
```

**If fonts are failing**, you might see:
```
[NodeAdapter] Font verification attempt 1 failed: ...
```

#### 3. **Canvas Loading**

```
[CanvasRendererCore] Loading canvas with dimensions: 1100x800, DPI: 300
[CanvasRendererCore] Objects to load: 5
[CanvasRendererCore] Background color: #ffffff
[CanvasRendererCore] Background image: YES - {"src":"https://...
[CanvasRendererCore] loadFromJSON callback - JSON parsed
[CanvasRendererCore] Canvas has 5 objects
```

---

## Common Issues and Solutions

### Issue 1: Background Image Not Loading

**Symptom**: No `fabric.util.loadImage` logs appear

**Possible Causes**:
1. Background image not in fabricData
2. Background image property has different structure

**Solution**: Check your design JSON structure. Please share:
```javascript
// What does your fabricData.backgroundImage look like?
console.log(JSON.stringify(designJson.fabricData.backgroundImage, null, 2));
```

### Issue 2: fabric.util.loadImage Called But Fails

**Symptom**: You see the loadImage call but get HTTP errors

**Possible Causes**:
1. URL not accessible from server
2. SSL certificate issues
3. Authentication required

**Solution**: 
- Check if the URL is accessible from the server
- Verify the HTTPS agent is accepting self-signed certs in development
- Check if the URL requires authentication headers

### Issue 3: Fonts Registered But Not Applied

**Symptom**: Fonts verify successfully but text still uses fallback

**Possible Causes**:
1. Font family name mismatch
2. Fabric.js not using registered fonts
3. Text objects have different font names in JSON

**Solution**: 
Let me add code to log what fonts the text objects are actually using.

---

## Additional Diagnostic Code

### Check What Fabric Sees

Add this to your design JSON loading to see what fabric sees:

```typescript
// After loadFromJSON callback
const textObjects = canvas.getObjects().filter(obj => obj.type === 'textbox' || obj.type === 'text');
textObjects.forEach((obj, idx) => {
  console.log(`Text ${idx + 1}:`);
  console.log(`  - Text: ${obj.text?.substring(0, 30)}`);
  console.log(`  - Font: ${obj.fontFamily}`);
  console.log(`  - Size: ${obj.fontSize}`);
});

console.log('Background Image:', canvas.backgroundImage ? 'YES' : 'NO');
if (canvas.backgroundImage) {
  console.log('  - Src:', canvas.backgroundImage.getSrc?.() || 'N/A');
  console.log('  - Element:', canvas.backgroundImage._element ? 'EXISTS' : 'MISSING');
}
```

---

## Test Request

Please test with a design that has:
1. A background image
2. At least one custom font
3. Some text objects

Then share the COMPLETE server logs from the request, including:
- All `[NodeAdapter]` logs
- All `[CanvasRendererCore]` logs
- All `[req-xxxxx]` logs for your request
- Any error messages

This will help me identify exactly where the process is failing.

---

## Quick Test Cases

### Test 1: Simple Background Color Only
Design with just background color, no image, no custom fonts.
**Expected**: Should work perfectly

### Test 2: Background Color + System Font
Design with background color and text using a standard font (Arial, sans-serif).
**Expected**: Should work

### Test 3: Background Image Only
Design with background image but no custom fonts.
**Expected**: Should show if image loading works

### Test 4: Custom Font Only
Design with custom font but no background image.
**Expected**: Should show if font registration works

### Test 5: Full Design
Design with background image + custom fonts + text.
**Expected**: Should show combined behavior

---

## Alternative Debugging Approach

If the logs don't reveal the issue, we can try:

### Option A: Save intermediate canvases
Export the canvas at different stages:
1. After loadFromJSON (before waiting)
2. After waiting for background
3. After waiting for images
4. Final export

This will show us exactly when things disappear.

### Option B: Check the source JSON
Share the actual `fabricData` structure from your design JSON so I can see:
- How backgroundImage is structured
- What font names are in text objects
- If there are any unusual properties

### Option C: Test with sample designs
I can create test designs with known good structure to isolate the issue.

---

## What to Share

Please provide:

1. **Server logs** (complete output from one render request)
2. **Sample design JSON** (at least the structure):
```json
{
  "fabricData": {
    "version": "5.3.0",
    "background": "#ffffff",
    "backgroundImage": { /* structure here */ },
    "objects": [
      { "type": "textbox", "fontFamily": "???", /* ... */ }
    ]
  },
  "customMetadata": { /* ... */ }
}
```

3. **Expected vs Actual**:
   - What should the image look like?
   - What does it actually look like?
   - Screenshot if possible

This will help me pinpoint the exact issue and provide a targeted fix.

