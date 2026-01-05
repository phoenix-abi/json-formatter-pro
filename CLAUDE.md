# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Commit Policy

**IMPORTANT: Never include AI attribution in git commit messages.**
- Do NOT add "Co-Authored-By: Claude" or similar attributions
- Do NOT add references to AI assistance in commit messages
- Commit messages should represent human authorship only
- This applies to all commits, pull requests, and git operations

## Project Overview

JSON Formatter Pro is a Chrome extension (Manifest V3) that automatically formats JSON when displayed in browser tabs. It provides syntax highlighting, collapsible trees, dark/light themes, and exposes parsed JSON as `window.json` for debugging.

Key constraints:
- Maximum JSON size: 3,000,000 characters (`MAX_LENGTH`)
- Only formats pages with a single `<pre>` tag containing valid JSON
- Near-zero performance impact on non-JSON pages (< 1ms bailout)

## Build and Test Commands

### Development
```bash
npm install              # Initial setup
npm run dev             # Watch mode - rebuilds on change
npm run build           # Production build → dist/
npm run clean           # Remove dist/ directory
```

### Testing

**Fast Tests (< 1 minute)** - Run these regularly during development:
```bash
npm test                    # Run fast unit, integration, and contract tests
npm run test:unit           # Run only unit tests
npm run test:integration    # Run only integration tests
npm run test:contract       # Run only contract compliance tests
npm run test:update         # Update fixture EXPECT snapshots
npm run test:e2e            # Run Playwright e2e tests (requires build first)
npm run test:perf:smoke     # Run quick performance regression checks
npm run test:all            # Run all fast tests + e2e + smoke tests
```

**Performance Tests (slow, 5-30 minutes)** - Run when working on performance:
```bash
npm run test:perf              # Run all performance benchmarks
npm run test:perf:parser       # Run parser comparison benchmarks
npm run test:perf:parser:memory # Run memory profiling (requires --expose-gc)
npm run test:perf:render       # Run rendering performance tests
npm run test:perf:interaction  # Run interaction performance tests
npm run test:perf:all          # Run complete performance test suite
```

**Component Development:**
```bash
npm run storybook              # Start Storybook dev server (http://localhost:6006)
npm run build-storybook        # Build Storybook for production
npm run e2e:install            # Install Playwright browsers
```

**Test Organization:**
- `tests/unit/` - Fast unit tests (< 100ms each)
- `tests/integration/` - Integration tests (< 500ms each)
- `tests/contract/` - Contract compliance tests (< 100ms each)
- `tests/perf/` - Performance benchmarks (excluded from `npm test`)
  - `*.spec.ts` - Full benchmarks (slow, use `npm run test:perf`)
  - `*.smoke.spec.ts` - Quick smoke tests (fast, included in `npm test`)
- `tests/e2e/` - End-to-end Playwright tests (requires build)

### Build System Details
- Vite with multi-entry build: `content.ts`, `set-json-global.ts`, `options/options.html`, `popup/popup.html`
- Two-stage build process:
  - `npm run build:content` - builds only content.js (ENTRY=src/content.ts)
  - `npm run build:rest` - builds remaining files (EXCLUDE_CONTENT=1)
  - This prevents build conflicts and ensures clean output
- Static assets copied via `vite-plugin-static-copy`: manifest.json, icons/, style.css

### Loading Extension
1. Build with `npm run build`
2. Navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder

## Architecture

### Entry Points (built by Vite)
- **src/content.ts** → `dist/content.js` - Main content script (ISOLATED world)
  - Detects JSON pages via `getResult()`
  - Builds interactive DOM via `buildDom()`
  - Handles UI (Parsed/Raw toggle, theme, collapsing)
- **src/set-json-global.ts** → `dist/set-json-global.js` - Content script (MAIN world)
  - Exposes `window.json` for developer console access
- **src/options/index.ts** → Options page logic (theme selection)
- **src/popup/index.ts** → Extension popup UI

### Core Modules
- **src/lib/getResult.ts** - JSON detection and parsing gatekeeper
  - Fast bailout for non-JSON pages (checks title, DOM structure, content)
  - Returns `Result` type: `{ formatted: true, parsed, element }` or `{ formatted: false, note }`
  - Critical performance boundary

- **src/lib/buildDom.ts** - Recursive JSON tree renderer
  - Builds collapsible DOM tree from parsed JSON
  - String escaping/sanitization via `textContent`/`createTextNode` (no innerHTML)
  - URL linkification with safe attributes
  - Performance optimizations: `content-visibility`, lazy collapsing

- **src/lib/templates.ts** - DOM element templates for performance
- **src/lib/storage.ts** - Chrome storage.local wrapper
- **src/lib/constants.ts** - Shared constants (ThemeOverride enum, etc.)

### Integration Contract (Parser/Renderer Separation)

The codebase uses an **Integration Contract** to decouple JSON parsing from rendering, enabling multiple parser implementations to work with the same renderer.

**Architecture:**
```
Renderer (JsonTreeView, JsonNode)
    ↓ uses
DataAdapter interface
    ↓ implemented by
Parsers (JsonValueAdapter, JsonNodeAdapter)
```

**Key Components:**
- **src/lib/integration/types.ts** - Core types: `ParsedData`, `DataAdapter`, `ValueMetadata`
- **src/lib/integration/adapters.ts** - Adapter implementations
  - `JsonValueAdapter` - Wraps native `JSON.parse()` output (Phase I, production)
  - `JsonNodeAdapter` - For custom parser AST (Phase II, future)
- **src/lib/integration/README.md** - Full contract specification and migration guide

**Benefits:**
- Renderer code is parser-agnostic (uses adapters, not direct property access)
- Future custom parser can be integrated with ZERO renderer changes
- Easy testing with mock adapters
- Clear separation of concerns

**Usage Example:**
```typescript
// In rendering code (src/lib/tree/flatten.ts)
const adapter = createAdapter(value)  // Works with any parser
const meta = adapter.getMetadata(value)
for (const child of adapter.getChildren(value)) {
  // Process child
}
```

**Feature Flags:**
- `UsePreactRenderer` - Enable Preact virtual scrolling renderer (Phase I)
- `UseCustomParser` - Enable custom streaming parser (Phase II, future)

**Testing:**
- Contract compliance suite: `tests/integration/contract-compliance.test.ts` (22 tests)
- Ensures all adapters have identical behavior
- Run: `npm test -- tests/integration/contract-compliance.test.ts`

### UI Components (Preact)

The extension uses Preact components for UI controls, styled to match GitHub's design system:

- **src/components/** - Reusable Preact components
  - `Toolbar.tsx` - Sticky toolbar container with flexible slot-based layout (left/center/right)
  - `Toggle.tsx` - Raw/Parsed toggle with segmented control design
  - `ThemePicker.tsx` - System/Light/Dark theme selector
  - `index.ts` - Barrel export for all components

**Component Files:**
- Each component has a separate `.tsx` file for logic and `.css` file for styles
- Components use Preact hooks (`useState`, `useEffect`, `useCallback`) for state management
- Fully typed with TypeScript interfaces for props

**Usage in Extension:**
- Components are imported and rendered in `src/content.ts` using Preact's `render()` and `h()` functions
- Theme picker automatically syncs with `chrome.storage.local` when `useStorage` prop is `true`
- Callback props (`onModeChange`, `onThemeChange`) enable reactive UI updates

**Usage in Preview Pages:**
- Components are bundled via `scripts/preview-bundle-entry.ts`
- Preview pages use the same toolbar for consistent UI/UX
- Built with `npm run style:preview:bundle`

**Design System:**
- GitHub-inspired styling with segmented controls and clean dropdowns
- Responsive to system theme via `@media (prefers-color-scheme: dark)`
- CSS custom properties for theming integration
- Accessible with ARIA labels, roles, and keyboard navigation

**TypeScript Config:**
- Requires `jsx: "react-jsx"` and `jsxImportSource: "preact"` in tsconfig.json
- Vite config requires `@preact/preset-vite` plugin

**Testing:**
- Unit tests with Vitest + @testing-library/preact in `tests/unit/components/`
- Test files require `@vitest-environment jsdom` comment for DOM access
- E2E tests with Playwright in `tests/e2e/toolbar.e2e.spec.ts`
- Storybook stories in `src/components/stories/` for visual development and documentation

### Theming System
- Token-based CSS in `src/style.css` with cascading layers
- System/light/dark themes via `data-theme` attribute on `<html>`
- Theme override stored in `chrome.storage.local.themeOverride`
- Live theme updates via storage change listener

### Testing Architecture

**Fast Tests (default `npm test`)** - Complete in < 1 minute:
- **Unit tests** (Vitest + JSDOM): `tests/unit/**/*.{test,spec}.ts`
  - Core logic tests in `tests/unit/`
  - Component tests in `tests/unit/components/` (require `@vitest-environment jsdom`)
  - Parser tests in `tests/unit/parser/`
  - Renderer tests in `tests/unit/renderers/`
- **Integration tests**: `tests/integration/*.test.ts`
  - Contract compliance tests
  - Renderer integration tests
- **Contract tests**: `tests/contract/*.spec.ts`
  - API contract validation
  - Component contract tests
- **Fixture-based testing**: `tests/fixtures/*.html`
  - Fixtures contain `<!-- EXPECT {...} -->` comments with expected `getResult()` output
  - `UPDATE_SNAPSHOTS=1` env var triggers snapshot updates
- **Performance smoke tests**: `tests/perf/*.smoke.spec.ts`
  - Quick regression checks (< 5 seconds total)
  - Catch catastrophic performance regressions
- **Fuzz testing**: `tests/unit/getResult.fuzz.test.ts`
- **Storybook tests**: `src/components/stories/*.stories.tsx`
  - Visual regression tests via Chromatic
  - Accessibility tests via addon-a11y

**Slow Performance Tests (separate `npm run test:perf`)** - 5-30 minutes:
- **Performance benchmarks**: `tests/perf/**/*.spec.ts`
  - Parser comparison tests (native vs custom, with/without optimizations)
  - Rendering performance tests (buildDom, Preact renderer)
  - Interaction performance tests (expand/collapse, virtual scrolling)
  - Memory profiling tests (heap usage, leak detection)
  - **When to run:** When optimizing performance or before releasing major changes
  - **Not run by default:** These are slow and for specialized performance work

**E2E Tests (separate `npm run test:e2e`):**
- **Playwright tests**: `tests/e2e/*.spec.ts`
  - Content script tests: `content.e2e.spec.ts`
  - Toolbar component tests: `toolbar.e2e.spec.ts`
  - Theme tests: `css-themes.spec.ts`
  - Parser selector tests: `parser-selector.e2e.spec.ts`
  - Requires `npm run build` first

## Critical Implementation Details

### Security Considerations
1. **XSS Prevention**: All text rendering uses `textContent`/`createTextNode`, never `innerHTML` with untrusted content
2. **Link Safety**: When linkifying URLs in buildDom, use `document.createElement('a')` and set attributes explicitly
3. **MAIN World Script**: `set-json-global.ts` runs in page context - ensure no data leakage, only set `window.json` for valid JSON
4. **Permissions**: Broad `host_permissions: ["*://*/*", "<all_urls>"]` - justify scope or consider narrowing

### Performance Hotspots
- `getResult()` early bailout is critical - avoid expensive checks for non-JSON pages
- Large/deeply nested objects in `buildDom()` - use deferred rendering for collapsed nodes
- Many linkified URLs can impact paint performance

### String Escaping Pattern
```typescript
// GOOD: Use createTextNode or textContent
const span = document.createElement('span')
span.textContent = userString  // Safe

// BAD: Never use innerHTML with parsed JSON values
span.innerHTML = userString  // Unsafe - XSS risk
```

### Manifest V3 Details
- Content scripts run on `<all_urls>` with `run_at: "document_end"`
- Second content script in MAIN world for `window.json` exposure
- Web accessible resources: `style.css`, `assets/*.css`
- Options page: `options/options.html` (open_in_tab: true)

## Development Workflow

### Adding New Features
1. Read DEVELOPER_WALKTHROUGH.md for detailed architecture
2. Check `docs/` for planning documents (REFACTOR_PLAN.md, PERFORMANCE_PLAN.md, etc.)
3. Add tests to `tests/` directory
4. For detection changes: add fixture to `tests/fixtures/` with EXPECT comment
5. Update snapshots with `npm run test:update`

### Modifying Detection Logic
- Edit `src/lib/getResult.ts`
- Add HTML fixture to `tests/fixtures/[name].html`
- Run `npm run test:update` to generate EXPECT comment
- Verify with `npm test`

### Modifying Rendering Logic
- Edit `src/lib/buildDom.ts`
- Add test to `tests/buildDom.test.ts`
- Watch for XSS issues - use text nodes, not innerHTML

### Theme/Style Changes
- Edit `src/style.css` (token-based system)
- Tokens organized in cascading layers
- Test in both light/dark/system modes
- See docs/STYLE_GUIDE.md for detailed guidance

### Modifying UI Components
- Edit component source in `src/components/`
- Components use Preact hooks and functional component patterns
- Add unit tests to `tests/unit/components/` (remember to add `@vitest-environment jsdom` comment)
- Add or update Storybook stories in `src/components/stories/`
- Run `npm run build` to rebuild extension
- Run `npm run style:preview` to test in preview pages
- Run `npm run storybook` to develop components visually
- Styling uses component-scoped CSS files and `@media (prefers-color-scheme)`
- Follow GitHub design system patterns (see `docs/GitHubSettings.png`)

## Documentation Reference

**📚 Complete documentation index:** See [docs/README.md](docs/README.md) for a comprehensive guide to all documentation.

### Essential Reading

- **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)** - Comprehensive contributor guide
  - Start here for new contributors
  - Architecture overview and key files
  - Security/privacy considerations
  - Build, test, and run instructions
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** - User-facing documentation
  - Getting started guide
  - Parser comparison and selection
  - Troubleshooting and FAQ
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Technical architecture documentation
  - System architecture and pipeline
  - Integration contract (parser/renderer separation)
  - Virtual scrolling renderer (Phase I)
  - Custom streaming parser (Phase II)
  - Parser selection system
  - Performance characteristics

### Development Guides

- **[docs/OPTIMIZATION_PLAYBOOK.md](docs/OPTIMIZATION_PLAYBOOK.md)** - Performance workflow and benchmarking
- **[docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md)** - Token-based theme system documentation
- **[docs/PARSER_INTEGRATION_TESTING.md](docs/PARSER_INTEGRATION_TESTING.md)** - Manual testing procedures
- **[docs/VISUAL_PARITY_TESTING.md](docs/VISUAL_PARITY_TESTING.md)** - Renderer parity testing
- **[src/lib/integration/README.md](src/lib/integration/README.md)** - Integration Contract specification (v1.0)

### Rollout and Future Plans

- **[docs/ROLLOUT_PLAN.md](docs/ROLLOUT_PLAN.md)** - Gradual rollout strategy (10% → 50% → 100%)
- **[docs/FUTURE_ENHANCEMENTS.md](docs/FUTURE_ENHANCEMENTS.md)** - Prioritized enhancement roadmap
  - Critical priorities (memory leak fix)
  - Feature roadmap (search, copy path, cross-browser, etc.)
  - Implementation suggestions

### Implementation Status

**Phase I Complete (Weeks 1-6):**
- ✅ Integration Contract v1.0
- ✅ Tree utilities (flatten, expand, collapse)
- ✅ Preact components (JsonNode, JsonTreeView)
- ✅ Virtual scrolling for 100k+ nodes
- ✅ Feature flag system
- ✅ Full test coverage (568 tests passing)

**Week 7 Complete:**
- ✅ Integration Contract documentation (README.md)
- ✅ Contract compliance tests verified
- ✅ CLAUDE.md updated with integration architecture

**Week 8 Complete (Phase II Foundation):**
- ✅ JsonNode AST types defined (ObjectNode, ArrayNode, StringNode, NumberNode, BooleanNode, NullNode)
- ✅ Type guards implemented (isObjectNode, isArrayNode, isJsonNode, etc.)
- ✅ Unit tests for types and guards (33 tests passing)
- ✅ Integration with Integration Contract types
- ✅ Full test suite passing (601 tests)

**Week 9-10 Complete (Lexer/Tokenizer):**
- ✅ Token types defined (punctuation, string, number, literals, EOF)
- ✅ Tokenizer class with streaming iterator API
- ✅ RFC 8259 compliant string parsing with escape sequences
- ✅ Unicode escape handling (\uXXXX)
- ✅ Number tokenization (integers, decimals, exponents)
- ✅ Literal tokenization (true, false, null)
- ✅ Position tracking (line/column) for error reporting
- ✅ Comprehensive unit tests (56 tests passing)
- ✅ Full test suite passing (657 tests)

**Week 11 Complete (Lossless Number Handling):**
- ✅ Number parsing with BigInt support
- ✅ Decimal string preservation for precision
- ✅ Integration with JsonNode types

**Weeks 12-13 Complete (Direct AST Parser):**
- ✅ Direct token → AST parser (eliminated event layer)
- ✅ Optimized tokenizer (charCodeAt, pre-compiled constants)
- ✅ 96x improvement on deep nesting (668x → 6.9x slower)
- ✅ 2.3x average speedup across all tests
- ✅ All unit tests passing (123 parser tests)

**Week 14 Complete (Incremental/Partial Parsing):**
- ✅ Progressive parsing with incremental reveal
- ✅ Custom progress callback interface
- ✅ Async parsing with configurable yield interval
- ✅ Comprehensive unit tests (12 progressive tests)
- ✅ Documentation: WEEK14_INCREMENTAL_PARTIAL_PARSING_COMPLETE.md

**Week 15 Complete (Error Tolerance and Recovery):**
- ✅ Tolerant mode for common JSON errors
- ✅ Recovery from trailing commas, missing commas/colons
- ✅ Error collection with position tracking
- ✅ ParserResult type with errors array
- ✅ Comprehensive unit tests (16 tolerant mode tests)
- ✅ UI integration (options page, settings)
- ✅ Documentation: WEEK15_ERROR_TOLERANCE_COMPLETE.md

**Week 16 Complete (Key Ordering and Stable Iteration):**
- ✅ Array-based storage for ObjectNode entries
- ✅ Preserves exact source order (unlike V8's Object.keys)
- ✅ Handles numeric key reordering edge case
- ✅ Comprehensive key ordering tests (28 tests)
- ✅ Performance tests for large objects (11 tests)
- ✅ Contract compliance verified (44 tests)
- ✅ 2.2x slowdown vs native (acceptable trade-off)
- ✅ Documentation: WEEK16_KEY_ORDERING_COMPLETE.md

**Week 17 Complete (Integration with Renderer):**
- ✅ JsonNodeAdapter implementation (161-280 lines in adapters.ts)
- ✅ Adapter factory with automatic selection (createAdapter)
- ✅ Full integration contract compliance (44 tests passing)
- ✅ Renderer integration tests (20 comprehensive tests)
- ✅ Lossless number handling (BigInt/decimal modes)
- ✅ Key order preservation verified
- ✅ Source range tracking functional
- ✅ End-to-end custom parser → renderer flow working
- ✅ Zero renderer code changes needed (polymorphic via DataAdapter)

**Week 18 Complete (Performance Harness):**
- ✅ Parser comparison benchmarks
- ✅ Memory profiling suite
- ✅ Performance regression gates
- ✅ Optimization round documentation

**Week 18 Complete (Performance Harness):**
- ✅ Parser comparison benchmarks (native vs custom)
- ✅ Memory profiling suite (16 tests)
- ✅ Performance regression gates (6 tests)
- ✅ Optimization documentation (WEEK18_PERFORMANCE_COMPLETE.md)
- ✅ 4-11x slowdown vs native (acceptable for use case)
- ✅ Deep nesting: 6.9x slower (after 96x optimization from 668x)
- ✅ Memory overhead: 4-5x file size

**Week 19 Complete (E2E Tests with Large Fixtures):**
- ✅ Large fixture generator (6 fixtures: 1MB, 10MB, 100MB)
- ✅ E2E test suite (8 tests, large-fixtures.e2e.spec.ts)
- ✅ TTFD measurements and thresholds
- ✅ Memory usage validation (< 5x overhead)
- ✅ Virtual scrolling validation (DOM nodes << total nodes)
- ✅ Scroll performance testing (< 200ms average)
- ✅ Documentation: WEEK19_LARGE_FIXTURES_COMPLETE.md

**Week 20 Complete (Security, Fuzzing, and Rollout):**
- ✅ Security audit test suite (23 tests passing)
  - XSS prevention (4 tests)
  - Prototype pollution (4 tests)
  - DoS prevention (6 tests)
  - Input validation (4 tests)
  - Safe DOM manipulation (3 tests)
  - CSP compliance (2 tests)
- ✅ Comprehensive fuzz testing (19 tests passing)
  - Random JSON generation (100 iterations)
  - Edge cases (empty, deep, long, wide)
  - Security attacks (prototype pollution, XSS, regex DoS, unicode)
  - Number edge cases (extreme, malformed)
  - Escape sequences (valid, invalid)
  - Stress tests (nested, wide)
- ✅ Gradual rollout plan (ROLLOUT_PLAN.md)
  - 3 phases: 10% → 50% → 100%
  - Feature flags with hash-based rollout
  - Monitoring and metrics strategy
  - Rollback procedures
- ✅ User documentation (USER_GUIDE.md)
  - Getting started guide
  - Parser comparison and selection
  - Custom parser options (number mode, tolerant mode)
  - Troubleshooting and FAQ
  - Privacy and security
- ✅ Documentation: WEEK20_SECURITY_ROLLOUT_COMPLETE.md
- ✅ Zero security vulnerabilities found
- ✅ 762+ total tests passing

**Phase II Complete:** ✅ All 20 weeks complete (Weeks 9-20)

**Next Steps:**
- Implement feature flag infrastructure for gradual rollout
- Begin Phase 1 rollout (10% of users)
- Monitor metrics and user feedback
- Proceed to Phase 2 (50%) and Phase 3 (100%) based on success criteria

## Parser Selection Feature

### Overview

The extension supports two JSON parsers with different trade-offs:

**Native Parser (`JSON.parse()`)**
- ✅ Fast (baseline performance)
- ❌ Lossy number representation (loses precision on large numbers)
- ❌ Reorders numeric object keys (V8 standard behavior)
- **Use case:** General JSON viewing, optimal performance

**ExactJSON (AST-based)**
- ✅ Lossless number handling (preserves precision with BigInt/Decimal)
- ✅ Preserves exact key order from server
- ✅ Source position tracking for error highlighting
- ❌ Slower (4-11x vs JSON.parse())
- **Use case:** Financial/scientific data, APIs with numeric keys

### Performance Characteristics

| JSON Size | ExactJSON Slowdown | Absolute Time |
|-----------|------------------------|---------------|
| < 10KB | 4-7x slower | ~0.02-0.2ms |
| 10-100KB | 5-7x slower | ~1-2ms |
| 100KB-1MB | 6-11x slower | ~10-40ms |
| Deep nesting (500 levels) | 5x slower | ~0.3ms |

**Why slowdown is acceptable:**
- On-demand parsing (virtual scrolling parses only visible nodes)
- User interaction time masks overhead
- Custom features provide value for specific use cases
- Users can toggle parsers based on needs

### UI Components

**1. Toolbar Toggle**
- Location: Top toolbar, next to Raw/Parsed toggle
- Dropdown showing current parser
- Quick switch between parsers
- Re-renders page immediately on change

**2. Extension Options Page**
- Set default parser (Native recommended)
- Per-URL overrides (e.g., `api.company.com/* → Custom`)
- Auto-switch threshold for large files
- Performance monitoring settings

**3. Extension Popup**
- Shows current page's active parser
- Shows selection reason (default, override, or manual)
- Quick toggle button
- Link to options for configuration

### Implementation Files

**Core Logic:**
- `src/lib/parser-selection.ts` (341 lines) - Parser selection, URL pattern matching, session overrides
- `src/lib/storage.ts` (+75 lines) - Extended with parser settings functions
- `src/content.ts` (+70 lines) - Parser integration, switching, re-rendering
- `src/lib/renderUI.ts` (+45 lines) - Toolbar integration

**UI Components:**
- `src/components/ParserSelector.tsx` (85 lines) - Toolbar dropdown component
- `src/components/ParserSelector.css` (79 lines) - Component styles
- `src/options/index.ts` (2 → 249 lines) - Complete options page logic
- `src/options/options.html` (24 → 152 lines) - Options page UI
- `src/options/options.css` (17 → 403 lines) - Options page styles
- `src/popup/index.ts` (168 → 311 lines) - Popup with parser status
- `src/popup/popup.html` (27 → 36 lines) - Popup UI updated
- `src/popup/popup.css` (153 → 256 lines) - Popup styles

**Tests:**
- `tests/unit/parser-selection.test.ts` (244 lines) - 34 logic tests
- `tests/unit/storage-parser-settings.test.ts` (185 lines) - 16 storage tests
- `tests/e2e/toolbar.e2e.spec.ts` (+97 lines) - 3 E2E tests for parser selector

**Documentation:**
- `docs/PARSER_SELECTION_UI_SPEC.md` - Original specification
- `docs/PARSER_INTEGRATION_TESTING.md` - Complete manual testing guide
- `docs/PARSER_SELECTION_IMPLEMENTATION_SUMMARY.md` - Full implementation summary

### Storage Schema

```typescript
interface ParserSettings {
  defaultParser: 'native' | 'custom'  // Default: 'custom'
  urlOverrides: Array<{
    pattern: string               // URL pattern with wildcards
    parser: 'native' | 'custom'
    enabled: boolean
  }>
  showToolbarToggle: boolean        // Default: true
  showPerformanceMetrics: boolean   // Default: false
  autoSwitchThreshold: number       // File size in MB, default: 10
}
```

### URL Pattern Matching

- `api.company.com/*` - All paths on api.company.com
- `*.company.com` - All subdomains of company.com
- `*/api/v1/*` - All /api/v1/ paths on any domain

Matching priority: Exact match > Most specific wildcard > Less specific > Default

### Development Workflow

**Adding parser selection to a page:**
1. Import `ParserToggle` component
2. Render in toolbar
3. Wire up parser change handler
4. Re-render page on parser change

**Testing parser selection:**
- Unit tests: `tests/unit/parser-selection.test.ts`
- E2E tests: `tests/e2e/parser-toggle.e2e.spec.ts`
- Test pattern matching, persistence, UI interactions

**See:** `docs/PARSER_SELECTION_UI_SPEC.md` for complete specification

## Known Limitations

1. **Large Numbers with Native Parser**: JavaScript `Number.MAX_SAFE_INTEGER` limitation (2^53 - 1)
   - Numbers outside safe range lose precision with `JSON.parse()`
    - **Solution:** Use ExactJSON or have API quote large numbers as strings

2. **Object Key Order with Native Parser**: V8 moves numeric string keys to top (standardized behavior)
   - Use "Raw" button to see exact server output
    - **Solution:** Use ExactJSON to preserve exact key ordering

3. **ExactJSON Performance**: 4-11x slower than `JSON.parse()`
   - Acceptable due to on-demand parsing (virtual scrolling)
   - User can toggle to Native Parser for better performance
   - See `docs/OPTIMIZATION_ROUND2_FINAL.md` for analysis

4. **Memory Leak (ExactJSON)**: ~14MB per parse with ExactJSON
   - **Status:** 🔴 Known issue, fix planned in Phase IV (Weeks 23-24)
   - **Mitigation:** Users can toggle to Native Parser if experiencing issues
   - **Priority:** CRITICAL blocker for production rollout

5. **Max Length**: 3,000,000 character limit for reliability
   - Prevents tab freezing on extremely large JSON
   - Configurable via `MAX_LENGTH` constant in getResult.ts

### Browser Extension Architecture

1. **Separate execution contexts** - Content scripts, popup, and background scripts cannot share JavaScript objects
2. **Use Chrome APIs** - `chrome.storage`, `chrome.runtime.sendMessage`, `chrome.tabs`
3. **Async by default** - All cross-context communication is async
4. **Session storage** - `chrome.storage.session` is perfect for temporary, tab-scoped data

### Communication Patterns

- **chrome.storage.local** - Persistent settings (options, preferences)
- **chrome.storage.session** - Temporary state (active parser, current page data)
- **chrome.runtime.sendMessage** - One-off messages (commands, requests)
- **JavaScript objects (Map, Set, etc.)** - ❌ Only within the same context
