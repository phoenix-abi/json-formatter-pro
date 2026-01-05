# AGENTS.md

AI Agent instructions for the JSON Formatter Pro Chrome extension repository.

## Git Commit Policy

**IMPORTANT: Never include AI attribution in git commit messages.**
- Do NOT add "Co-Authored-By: Warp <agent@warp.dev>" or similar attributions
- Do NOT add "Co-Authored-By: Claude" or any AI tool references
- Commit messages should represent human authorship only
- This applies to all commits, pull requests, and git operations

## Quick Start

```bash
npm install              # Install dependencies
npm run build           # Build extension → dist/
npm run dev             # Watch mode (rebuilds on change)
npm test                # Run unit tests
```

**Load extension in Chrome:**
1. Build with `npm run build`
2. Go to `chrome://extensions`
3. Enable "Developer mode" → "Load unpacked" → select `dist/` folder

## Project Type

Chrome Extension (Manifest V3) - Auto-formats JSON in browser tabs with syntax highlighting, collapsible trees, and theme support.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Build:** Vite 7.x with multi-entry config
- **Tests:** Vitest 4.x (jsdom environment) + Playwright (e2e)
- **Runtime:** Chrome Extension APIs, no external dependencies

## Commands Reference

### Build
```bash
npm run build            # Full build (runs build:content + build:rest)
npm run build:content    # Build only content.js (ENTRY=src/content.ts)
npm run build:rest       # Build other files (EXCLUDE_CONTENT=1)
npm run dev             # Watch mode
npm run clean           # Remove dist/
```

### Testing
```bash
npm test                # Run all unit tests
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests
npm run test:contract   # Run contract tests
npm run test:update     # Update fixture snapshots (sets UPDATE_SNAPSHOTS=1)
npm run test:e2e        # Run Playwright e2e tests
npm run test:perf       # Run performance tests
npm run e2e:install     # Install Playwright with dependencies
```

### Running Single Tests
```bash
# Filter by filename or test name
npm test -- getResult
npm test -- buildDom
npm test -- "specific test name"

# Performance tests
npm run test:perf:parser
npm run test:perf:render
npm run test:perf:smoke
```

## Architecture Overview

### Build System (Vite Multi-Entry)

**Entry Points:**
- `src/content.ts` → `dist/content.js` (main content script, ISOLATED world)
- `src/set-json-global.ts` → `dist/set-json-global.js` (MAIN world script)
- `src/options/index.ts` → `dist/options/options.js` (options page)
- `src/popup/index.ts` → `dist/popup/popup.js` (popup)

**Static Assets (copied to dist/):**
- `src/manifest.json` → Chrome MV3 manifest
- `src/icons/*` → Extension icons
- `src/style.css` → Token-based stylesheet (light/dark themes)

**Two-Stage Build:**
The build process uses two stages to avoid conflicts:
1. `build:content` - Builds content.js in isolation
2. `build:rest` - Builds remaining files without clearing dist/

This prevents Vite from creating shared chunks between incompatible entry points.

### Runtime Architecture

```
content.ts (ISOLATED world)
├── lib/getResult.ts        - JSON detection & parsing
├── lib/buildDom.ts         - Tree rendering
├── lib/storage.ts          - Theme persistence
└── lib/templates.ts        - DOM element cache

set-json-global.ts (MAIN world)
└── Exposes window.json to page context

options/index.ts
└── Theme selection UI

popup/index.ts
└── Extension popup UI
```

### Data Flow

1. **Detection Phase** (`getResult()` in lib/getResult.ts)
   - Checks if page is raw JSON (single `<pre>`, no title, valid JSON)
   - Returns `{ formatted: true, parsed, element }` or `{ formatted: false, note }`
   - Bails out early for non-JSON pages (< 1ms)

2. **Rendering Phase** (`buildDom()` in lib/buildDom.ts)
   - Recursively builds collapsible DOM tree
   - Escapes strings safely (textContent only, no innerHTML)
   - Linkifies URLs with safe attributes

3. **Theme Application** (content.ts)
   - Reads `chrome.storage.local.themeOverride`
   - Sets `data-theme` attribute on `<html>`
   - Listens for live theme changes

## Critical Patterns

### ✅ ALWAYS DO

**Security:**
```typescript
// Safe string rendering - use textContent or createTextNode
const span = document.createElement('span')
span.textContent = userString  // ✅ SAFE

const textNode = document.createTextNode(userString)  // ✅ SAFE
```

**Testing with Fixtures:**
```typescript
// Add fixture to tests/fixtures/my-test.html
// Run: npm run test:update
// Verifies snapshots in <!-- EXPECT {...} --> comments
```

**Theme-Aware Styles:**
```css
/* Use CSS custom properties (tokens) from style.css */
color: var(--jf-string-color);
```

### ❌ NEVER DO

**Security Anti-Patterns:**
```typescript
// NEVER use innerHTML with parsed JSON values
span.innerHTML = userString  // ❌ XSS VULNERABILITY

// NEVER trust user input without escaping
element.outerHTML = `<div>${value}</div>`  // ❌ DANGEROUS
```

**Build Anti-Patterns:**
```typescript
// NEVER import content.ts from other entry points
// NEVER create shared chunks between content.js and other scripts
// Each entry must be independent due to MV3 world separation
```

## Key Files to Know

### Core Logic
- **src/lib/getResult.ts** - JSON detection (MAX_LENGTH = 3,000,000 chars)
  - `getResult(document): Result` - Returns formatted or not
  - Fast bailout: checks title, body structure, visibility
  - Critical for performance on non-JSON pages

- **src/lib/buildDom.ts** - Recursive tree builder
  - `buildDom(value, keyName): HTMLSpanElement`
  - Handles objects, arrays, primitives
  - String escaping, URL linkification
  - **SECURITY CRITICAL**: All string output uses textContent

- **src/content.ts** - Main content script orchestrator
  - Calls getResult() → buildDom()
  - Creates Parsed/Raw toggle UI
  - Handles collapse/expand interactions
  - Theme application and storage listeners

### Configuration
- **vite.config.ts** - Multi-entry build with static-copy plugin
- **vitest.config.ts** - Test environment (Node default, jsdom for DOM tests)
- **tsconfig.json** - Strict TypeScript settings
- **src/manifest.json** - Chrome MV3 manifest (permissions, content_scripts)

### Testing
- **tests/getResult.test.ts** - Fixture-based tests
- **tests/fixtures/*.html** - HTML fixtures with `<!-- EXPECT ... -->` snapshots
- **tests/buildDom.test.ts** - DOM rendering tests
- **tests/e2e/*.spec.ts** - Playwright e2e tests

## Code Style Guidelines

### Formatting & Linting
- **Prettier**: Semi-colons disabled, single quotes preferred (see .prettierrc.yml)
- **TypeScript**: Strict mode enabled with noImplicitAny, noUnusedLocals, noUnusedParameters
- **File Organization**: Barrel exports in index files (e.g., src/lib/getResult.ts)

### Import Conventions
```typescript
// Type imports use "import type"
import type { JsonValue } from '../types'
import { findSingleBodyPre, isRendered } from './scan'

// Group imports: external → internal → relative
import { useEffect } from 'preact/hooks'
import { MAX_LENGTH } from './policy'
import { tryParseJson } from './parse'
```

### Naming Conventions
- **Functions**: camelCase, descriptive names (e.g., `findSingleBodyPre`, `isRendered`)
- **Types**: PascalCase for interfaces/types (e.g., `Result`, `JsonValue`)
- **Constants**: UPPER_SNAKE_CASE for immutable values (e.g., `MAX_LENGTH`)
- **Files**: kebab-case for utilities, camelCase for components

### Error Handling
```typescript
// Early returns for validation
if (document.title)
  return {
    formatted: false,
    note: 'document.title is contentful',
    rawLength: null,
  }

// Use union types for result states
export type Result =
  | { formatted: true; note: string; rawLength: number; element: HTMLPreElement; parsed: JsonValue }
  | { formatted: false; note: string; rawLength: number | null }
```

### Type Safety
- **Strict TypeScript**: All functions have explicit return types
- **Union Types**: Use discriminated unions for state machines
- **Type Guards**: Separate validation functions (e.g., `isRendered`, `startsLikeJson`)
- **No any Types**: Use proper typing or unknown with type guards

### Security Patterns
```typescript
// Safe DOM manipulation - NEVER use innerHTML with user content
const span = document.createElement('span')
span.textContent = userString  // ✅ SAFE

// Safe URL creation
const link = document.createElement('a')
link.href = url
link.rel = 'noopener noreferrer'  // External links
```

### Performance Guidelines
- **Early Bailouts**: Fast checks first (title → DOM → parsing)
- **Lazy Evaluation**: Defer expensive operations until needed
- **Memory Limits**: Enforce MAX_LENGTH for large inputs
- **Avoid Unnecessary Parsing**: Validate structure before JSON.parse()

### Testing Patterns
```typescript
// Fixture-based testing with snapshots
// tests/fixtures/my-case.html contains:
<!-- EXPECT {
  "formatted": true,
  "note": "...",
  ...
} -->

// Test structure: describe → it → expect
describe('getResult', () => {
  it('detects valid JSON', () => {
    const result = getResult(mockDocument)
    expect(result.formatted).toBe(true)
  })
})
```

## Testing Workflow

### Fixture-Based Testing Pattern

1. **Create fixture** at `tests/fixtures/my-case.html`:
```html
<html>
<head><title></title></head>
<body><pre>{"foo": "bar"}</pre></body>
</html>
```

2. **Generate snapshot**:
```bash
npm run test:update
```

3. **Verify** - Fixture now contains:
```html
<!-- EXPECT {
  "formatted": true,
  "note": "...",
  ...
} -->
<html>...</html>
```

4. **Tests auto-compare** against EXPECT comment

## Common Tasks

### Adding Detection Logic
1. Edit `src/lib/getResult.ts`
2. Add fixture to `tests/fixtures/[case-name].html`
3. Run `npm run test:update`
4. Verify with `npm test`

### Modifying Renderer
1. Edit `src/lib/buildDom.ts`
2. **Critical**: Ensure no XSS vulnerabilities
   - Use `textContent` or `createTextNode` for all user content
   - Never use `innerHTML` with parsed JSON values
3. Add test case to `tests/buildDom.test.ts`
4. Run `npm test`

### Updating Styles
1. Edit `src/style.css` (token-based system)
2. Use existing CSS custom properties
3. Test in light/dark/system modes
4. Check visual regression in e2e tests

### Adding New Content Script
1. Add entry point to `vite.config.ts` multiInputs
2. Add to `manifest.json` content_scripts array
3. Consider world isolation (ISOLATED vs MAIN)
4. Update build process if needed

## Performance Constraints

- **MAX_LENGTH**: 3,000,000 chars (defined in getResult.ts)
- **Early Bailout**: < 1ms on non-JSON pages
- **Detection Order**: Cheapest checks first (title → DOM → parsing)
- **Lazy Rendering**: Collapsed nodes defer rendering until expanded

## Security Requirements

### Content Security Policy (MV3)
- No inline scripts (all in bundled JS files)
- Styles loaded via `<link>` with chrome.runtime.getURL()
- No eval or Function constructor

### XSS Prevention
- **All user content** (JSON values) must use `textContent` or `createTextNode`
- URL linkification: create `<a>` with `createElement`, set `href` directly
- Consider `rel="noopener noreferrer"` for external links

### Permission Scope
- `host_permissions: ["*://*/*", "<all_urls>"]` - Very broad
- Justified by need to run on any JSON endpoint
- Extension only runs on pages that match JSON structure

### MAIN World Script (set-json-global.ts)
- Runs in page context (not isolated)
- Only exposes `window.json` when page has valid JSON
- No data leakage to/from page

## Known Limitations

1. **Number Precision**: JavaScript safe integer range (±2^53 - 1)
   - Native `JSON.parse()` limitation
   - Large numbers should be quoted as strings by API

2. **Key Ordering**: V8 moves numeric keys to top (standardized behavior)
   - Use "Raw" button to see original server output

3. **Max Size**: 3M char limit prevents tab freezing
   - Adjustable via MAX_LENGTH constant

## Documentation

- **DEVELOPER_WALKTHROUGH.md** - Detailed architecture and security guide
- **docs/STYLE_GUIDE.md** - Token-based theme system
- **docs/REFACTOR_*.md** - Refactoring plans
- **docs/PERFORMANCE_*.md** - Performance optimization plans
- **docs/CUSTOM_PARSER_*.md** - Future custom parser plans

## Debugging

### Extension Not Loading
- Check `chrome://extensions` for errors
- Verify `dist/manifest.json` exists
- Rebuild with `npm run build`

### Page Not Formatting
- Check DevTools console for getResult() notes
- Verify page has single `<pre>` with JSON
- Check JSON is valid and under MAX_LENGTH

### Theme Not Applying
- Inspect `chrome.storage.local.themeOverride`
- Check `data-theme` attribute on `<html>`
- Verify style.css loaded

### Tests Failing
- Update snapshots: `npm run test:update`
- Check JSDOM environment in vitest.config.ts
- Verify fixture format (<!-- EXPECT ... -->)