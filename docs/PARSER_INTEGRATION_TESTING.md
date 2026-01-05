# Parser Integration Testing Guide

This guide provides comprehensive instructions for testing the custom parser integration in the JSON Formatter Pro extension.

## Overview

The extension now supports two JSON parsers:
- **Native Parser**: Uses JavaScript's built-in `JSON.parse()`
- **Custom Parser**: AST-based parser with lossless number support and key ordering preservation

## Build and Load Extension

```bash
# Build the extension
npm run build

# Load in Chrome
1. Navigate to chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the dist/ folder
```

## Test Scenarios

### 1. Toolbar Parser Selector

**Test**: Verify parser selector appears in toolbar

1. Navigate to any JSON URL (e.g., `https://jsonplaceholder.typicode.com/posts/1`)
2. Verify toolbar appears at top of page
3. Locate parser selector dropdown between "Parsed/Raw" toggle and theme picker
4. Verify dropdown shows two options: "Native" and "Custom"

**Expected Result**: Parser selector is visible and functional

---

### 2. Parser Switching

**Test**: Switch between parsers and verify re-rendering

1. Open browser console (F12)
2. Navigate to a JSON URL
3. Look for console log: `Parser selection: { parser: '...', reason: {...}, fileSize: '...' }`
4. Change parser using the dropdown
5. Verify console logs:
   - `Parser changed to: native` or `Parser changed to: custom`
   - `Native parser used` or `Custom parser used`
   - `Parse time: X.XXms`

**Expected Result**:
- JSON re-renders when parser changes
- Console shows parser selection and performance logs
- Content remains visible and correctly formatted

---

### 3. Default Parser Setting

**Test**: Configure default parser in options page

1. Right-click extension icon → "Options"
2. Locate "Default JSON Parser" section
3. Select "Custom Parser" radio button
4. Click "Save Settings"
5. Open a new JSON URL
6. Check console for `Parser selection: { parser: 'custom', reason: { type: 'default-parser' } }`

**Expected Result**: New JSON pages use custom parser by default

---

### 4. Per-URL Overrides

**Test**: Configure parser for specific URLs

1. Open Options page
2. Click "Add URL Override" in "Per-URL Overrides" section
3. Enter pattern: `*.github.com`
4. Select parser: "Custom"
5. Enable override
6. Click "Add"
7. Navigate to `https://api.github.com/users/octocat`
8. Verify console shows: `reason: { type: 'url-override', pattern: '*.github.com' }`

**Expected Result**: GitHub API URLs use custom parser due to override

---

### 5. Session Overrides

**Test**: Temporary parser change for current session

1. Navigate to a JSON URL
2. Change parser using toolbar dropdown
3. Reload page (F5)
4. Verify parser selection persists during session
5. Close tab and open same URL in new tab
6. Verify parser resets to default/URL override

**Expected Result**: Session override persists across reloads but not across new tabs

---

### 6. Extension Popup

**Test**: Quick parser toggle from popup

1. Navigate to a JSON URL
2. Click extension icon in toolbar
3. Verify "JSON Parser" section shows current parser
4. Verify reason is displayed (e.g., "Using default parser setting")
5. Click "Switch to Custom" button
6. Verify success message appears
7. Verify page reloads with new parser

**Expected Result**: Popup allows quick parser switching with page reload

---

### 7. Auto-Size Threshold

**Test**: Automatic parser switch for large files

1. Open Options page
2. Set "Auto-switch threshold" to 0.1 MB
3. Save settings
4. Create a large JSON file (> 100 KB)
5. Open in browser
6. Verify console shows: `reason: { type: 'auto-size-limit', threshold: 0.1 }`

**Expected Result**: Large files automatically use native parser for performance

---

### 8. Feature Flag

**Test**: Disable custom parser entirely

1. Open Options page
2. Uncheck "Enable Custom Parser"
3. Save settings
4. Navigate to any JSON URL
5. Verify parser selector is hidden/disabled
6. Verify console shows: `reason: { type: 'feature-disabled' }`

**Expected Result**: Custom parser cannot be selected when feature is disabled

---

### 9. Error Handling

**Test**: Verify fallback to native parser on custom parser errors

1. Open a JSON file with syntax errors (if custom parser handles differently)
2. Set parser to "Custom"
3. Check console for error messages
4. Verify console shows: `Custom parser failed, falling back to native parser`
5. Verify JSON still renders (using native parser)

**Expected Result**: Graceful fallback prevents page from breaking

---

### 10. Performance Tracking

**Test**: Verify parse time logging

1. Navigate to a medium-sized JSON file (10-100 KB)
2. Open console
3. Verify log: `Parse time: X.XXms`
4. Switch between parsers
5. Compare parse times for native vs custom

**Expected Result**: Performance metrics help identify parser differences

---

### 11. Lossless Numbers (Custom Parser Feature)

**Test**: Verify custom parser preserves large numbers

1. Create JSON with large number: `{"bigNumber": 9007199254740993}`
2. Open in browser with Native parser
3. Check rendered value (may be adjusted due to `Number.MAX_SAFE_INTEGER`)
4. Switch to Custom parser
5. Verify number is preserved exactly

**Expected Result**: Custom parser maintains precision for numbers beyond safe integer range

---

### 12. Key Ordering (Custom Parser Feature)

**Test**: Verify custom parser preserves key order

1. Create JSON with specific key order: `{"z": 1, "a": 2, "m": 3}`
2. Open with Native parser (keys may be reordered)
3. Switch to Custom parser
4. Verify keys appear in original order

**Expected Result**: Custom parser preserves exact key order from source

---

## Automated Tests

Run E2E tests to verify parser integration:

```bash
# Install Playwright browsers (one-time)
npm run e2e:install

# Build extension
npm run build

# Run E2E tests
npm run test:e2e
```

**E2E tests cover:**
- Parser selector visibility
- Parser switching functionality
- State persistence during view toggles
- All existing toolbar features still work

---

## Console Output Examples

### Successful Parser Selection
```
Parser selection: {
  parser: 'custom',
  reason: { type: 'url-override', pattern: '*.example.com', parser: 'custom' },
  fileSize: '0.05 MB'
}
Custom parser used
Parse time: 2.34ms
```

### Auto-Size Override
```
Parser selection: {
  parser: 'native',
  reason: { type: 'auto-size-limit', threshold: 2, actualSize: 3.45 },
  fileSize: '3.45 MB'
}
Native parser used
Parse time: 45.67ms
```

### Session Override
```
Parser changed to: custom
Custom parser used
Parse time: 3.12ms
```

### Error Fallback
```
Parser error: SyntaxError: Unexpected token ...
Custom parser failed, falling back to native parser
Native parser used
Parse time: 1.89ms
```

---

## Verification Checklist

- [ ] Parser selector appears in toolbar
- [ ] Switching parsers triggers re-render
- [ ] Console logs show parser selection details
- [ ] Default parser setting works
- [ ] URL overrides work with wildcard patterns
- [ ] Session overrides persist across reloads
- [ ] Extension popup shows current parser
- [ ] Auto-size threshold switches to native for large files
- [ ] Feature flag disables custom parser
- [ ] Error handling falls back to native parser
- [ ] Performance tracking logs parse time
- [ ] Custom parser preserves large numbers (lossless)
- [ ] Custom parser preserves key order
- [ ] E2E tests pass

---

## Troubleshooting

### Parser selector not visible
- Check that extension is loaded in chrome://extensions
- Verify page is a JSON page (single `<pre>` tag with valid JSON)
- Check console for errors

### Parser not switching
- Clear browser cache and reload
- Check console for error messages
- Verify parser setting in Options page

### E2E tests failing
- Ensure extension is built: `npm run build`
- Verify Playwright browsers installed: `npm run e2e:install`
- Check that Chrome is closed before running tests

### Console logs not appearing
- Open DevTools (F12) before loading JSON page
- Check console filter settings (ensure "Info" level is visible)
- Verify `PERFORMANCE_DEBUGGING` is not disabled in content.ts

---

## Next Steps

After completing manual testing:

1. **Document any issues** found during testing
2. **Update CLAUDE.md** with final integration status
3. **Create git commit** for parser integration work
4. **Plan rollout strategy** (feature flag, gradual rollout, etc.)
