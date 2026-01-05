# Visual Parity Testing: Preact vs Legacy Renderer

This document describes how to verify visual parity between the new Preact renderer and the legacy buildDom renderer.

## Overview

The Preact renderer (Week 5) is designed to match the visual output of the legacy buildDom renderer while providing better performance through virtual scrolling. Visual parity ensures users see no difference when the feature flag is enabled.

## Manual Testing Procedure

### Setup

1. Build the extension:
   ```bash
   npm run build
   ```

2. Load the extension in Chrome:
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

### Test Cases

#### Test 1: Simple Object

**JSON:**
```json
{"name": "Alice", "age": 30, "active": true}
```

**Steps:**
1. Create an HTML file with the JSON in a `<pre>` tag
2. Open in Chrome with feature flag **disabled** (default)
3. Take a screenshot
4. Enable Preact renderer: Open DevTools Console and run:
   ```javascript
   localStorage.setItem('jf_flag_usePreactRenderer', 'true')
   ```
5. Reload the page
6. Take another screenshot
7. Compare the two screenshots

**Expected:** Identical visual appearance (syntax colors, spacing, brackets)

#### Test 2: Nested Structure

**JSON:**
```json
{
  "user": {
    "name": "Bob",
    "address": {
      "city": "NYC",
      "zip": "10001"
    }
  },
  "items": [1, 2, 3]
}
```

**Steps:** Same as Test 1

**Expected:**
- Same indentation (20px per level)
- Same bracket/brace styling
- Same key colors
- Same value colors
- Same comma placement

#### Test 3: URL Linkification

**JSON:**
```json
{
  "website": "https://example.com",
  "api": "/api/v1/users",
  "insecure": "http://test.com"
}
```

**Steps:** Same as Test 1

**Expected:**
- All URLs are linkified as `<a>` tags
- Links have `target="_blank"` and `rel="noopener noreferrer"`
- Link text matches the URL value
- Link color inherits from parent (no underline by default)

#### Test 4: Large JSON Performance

**JSON:**
```json
[...] // Array with 10,000 objects
```

**Steps:**
1. Generate large JSON:
   ```javascript
   const large = Array.from({length: 10000}, (_, i) => ({id: i, name: `Item ${i}`}))
   console.log(JSON.stringify(large))
   ```
2. Test with both renderers
3. Compare initial render time (DevTools Performance tab)

**Expected:**
- Preact renderer: < 200ms initial render (virtualization)
- Legacy renderer: May be slower for very large files
- Visual output should match for visible portion

#### Test 5: Expand/Collapse

**JSON:**
```json
{
  "data": {
    "nested": {
      "value": 42
    }
  }
}
```

**Steps:**
1. Load with both renderers
2. Click expanders to collapse/expand nodes
3. Verify visual state changes match

**Expected:**
- Collapse shows `...` ellipsis
- Collapse shows size annotation (`// N items`)
- Expand shows full content
- Cmd/Ctrl+Click expands all siblings (Preact only enhancement)

## CSS Classes Reference

Both renderers should use the same CSS classes:

| Class | Purpose | Example |
|-------|---------|---------|
| `.entry` | Entry wrapper | All nodes |
| `.objProp` | Object property | `"key": value` |
| `.arrElem` | Array element | `value` in `[value]` |
| `.e` | Expander button | Triangle icon |
| `.k` | Key name | `"name"` |
| `.s` | String value | `"Alice"` |
| `.n` | Number value | `42` |
| `.bl` | Boolean value | `true`, `false` |
| `.nl` | Null value | `null` |
| `.oBrace` | Opening brace | `{` |
| `.cBrace` | Closing brace | `}` |
| `.oBracket` | Opening bracket | `[` |
| `.cBracket` | Closing bracket | `]` |
| `.ellipsis` | Collapsed indicator | `...` |
| `.size` | Size annotation | `// 10 items` |
| `.comma` | Comma separator | `,` |

## Known Differences (Acceptable)

The following differences are acceptable and expected:

1. **DOM Structure:**
   - Legacy uses text nodes for quotes/colons
   - Preact uses `<span>` elements for quotes/colons
   - Visual output is identical

2. **Virtual Scrolling:**
   - Preact renderer: Only visible nodes in DOM (large files)
   - Legacy renderer: All nodes in DOM
   - This is an intentional performance improvement

3. **Closing Brackets:**
   - Legacy: Closing brackets appended to parent container
   - Preact: Closing brackets as separate FlatNode entries
   - Visual output is identical

## Automated Testing

### Unit Tests

Visual parity is enforced through unit tests:

```bash
npm test -- tests/unit/components/JsonNode.test.tsx
npm test -- tests/unit/components/JsonTreeView.test.tsx
```

**Coverage:**
- All JSON types render correctly
- CSS classes match legacy
- ARIA attributes present
- URL linkification works

### E2E Tests (when infrastructure is fixed)

```bash
npm run test:e2e -- tests/e2e/preact-renderer.e2e.spec.ts
```

## Troubleshooting

### Preact Renderer Not Loading

1. Check feature flag:
   ```javascript
   localStorage.getItem('jf_flag_usePreactRenderer') // Should be 'true'
   ```

2. Check console for errors:
   - Open DevTools Console
   - Look for import errors or rendering errors

3. Verify build:
   ```bash
   ls -la dist/content.js  # Should exist and be recent
   ```

### Visual Differences

If you notice visual differences:

1. Check CSS classes:
   - Open DevTools Elements tab
   - Inspect the rendered elements
   - Verify classes match the reference table above

2. Check computed styles:
   - Compare computed styles between renderers
   - Ensure color tokens are the same

3. Check indentation:
   - Preact uses `paddingLeft: ${depth * 20}px`
   - Legacy uses similar calculation
   - Verify depth is calculated correctly

## Reporting Issues

If you find visual parity issues:

1. Take screenshots of both renderers
2. Note the JSON test case
3. Include browser version and OS
4. Open an issue with the label `visual-parity`
