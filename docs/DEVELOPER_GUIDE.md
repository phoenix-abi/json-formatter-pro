# Developer Walkthrough

Welcome! This document is a practical guide to help new contributors understand what this extension does, how it is structured, where to start reading code, and what to watch out for (security, privacy, reliability). It also proposes next‑step improvements.

Last updated: 2025‑11‑28


## What the software does

JSON Formatter Pro is a Chrome extension that automatically detects when a tab displays JSON and replaces the raw text with a fast, interactive viewer:

- Parses valid JSON and renders it as a collapsible tree
- Syntax highlighting and indent guides
- Dark/light/system themes (user‑selectable via Options)
- Clickable URLs inside string values
- Toggle between Parsed and Raw views
- Exposes the parsed JSON as a global variable `window.json` in the page context (for quick debugging)
- Minimizes impact on non‑JSON pages (bails out early and does near‑zero work)

Key constraints and behaviors:
- Very large responses are limited by `MAX_LENGTH` (currently 3,000,000 chars) for reliability.
- Only pages that look like raw JSON (e.g., a single `<pre>` tag with JSON content) are formatted.


## High‑level architecture

The extension is implemented as a set of content scripts plus an options page. Vite bundles three entry points:

- `src/content.entry.ts` → `dist/content.js` (content script; UI and rendering)
- `src/set-json-global.entry.ts` → `dist/set-json-global.js` (content script in MAIN world; exports parsed JSON to page)
- `src/options/options.entry.ts` → `dist/options.js` (Options page logic)

Static assets are copied to `dist/` via Vite’s static-copy plugin:
- `src/manifest.json` (Chrome MV3)
- `src/icons/**/*`
- `src/options/options.html`
- `src/style*.css`

### Runtime flow (content script)

1. The browser loads `content.js` on all pages (per `manifest.json`).
2. The content script quickly decides whether the document is a likely raw JSON page using `getResult(document)`:
   - Checks `document.title` (bail if contentful)
   - Scans `body` for a single, visible `<pre>` and absence of other textual elements
   - Reads the `<pre>` text, checks length against `MAX_LENGTH`
   - Checks the first non‑whitespace char `{` or `[` and attempts `JSON.parse`
3. If parsing succeeds, the content script builds the interactive DOM via `buildDom(parsed)` and injects UI controls (Parsed/Raw toggle, etc.).
4. The second content script `set-json-global.js` (running in the MAIN world) exposes the parsed value as `window.json` for developer convenience.
5. Theme selection is read from `chrome.storage.local` and applied (dark/light/system). Options page lets user set this preference.


## Key files and what to read first

Suggested reading order for new contributors:

1. `src/lib/getResult.ts`
   - Type: detection + parsing.
   - Exports `MAX_LENGTH`, `Result`, and function `getResult(document)`.
   - This is the gatekeeper for performance and correctness on non‑JSON pages.

2. `src/content.entry.ts`
   - Type: main content script.
   - Responsibilities:
     - Bootstrap (preflight checks via `getResult`) and decide render mode (Parsed vs Raw)
     - Build and inject UI (buttons, styles)
     - Call `buildDom` to render parsed JSON
     - Handle collapsing/expanding, URL linkification, selection behavior, etc.
     - Respect theme override from storage

3. `src/lib/buildDom.ts`
   - Type: view/rendering utility.
   - Builds the expandable JSON tree DOM for objects/arrays/scalars. Pay attention to:
     - How strings are escaped/sanitized before being added to the DOM
     - How clickable URLs are created (attributes like `rel`, `target`)
     - Performance tactics (e.g., `content-visibility`, lazy collapsing)

4. `src/set-json-global.entry.ts`
   - Type: small script running in the page’s MAIN world.
   - Purpose: expose parsed JSON as `window.json` so devs can inspect it from DevTools.
   - Ensure it only runs when there is actually parsed JSON and avoids leaking on non‑JSON pages.

5. Options page
   - `src/options/options.html` and `src/options/options.entry.ts`
   - Reads/writes `chrome.storage.local.themeOverride` with values: `system`, `force_dark`, `force_light`.

6. Configuration & build/test
   - `vite.config.ts`: multi‑entry build and static asset copying; Vitest configuration (jsdom).
   - `tsconfig.json`: strict TS settings; outputs to `dist/`.
   - `package.json`: scripts (`dev`, `build`, `test`, `test:update`).
   - `tests/getResult.test.ts`: fixture‑driven tests using JSDOM; snapshots stored inside `tests/fixtures/*.html` comments.

7. Manifest and permissions
   - `src/manifest.json`: Chrome MV3, content scripts, options UI, permissions.


## Detailed responsibilities and important functions

- `getResult(document): Result` (in `src/lib/getResult.ts`)
  - Returns one of:
    - `{ formatted: true, note, rawLength, element, parsed }` if page looks like raw JSON and can be parsed
    - `{ formatted: false, note, rawLength|null }` for non‑JSON or too‑long or invalid pages
  - Key constants: `MAX_LENGTH = 3_000_000`
  - Key checks: single `<pre>`, visibility via `HTMLElement.prototype.checkVisibility`, emptiness, first non‑whitespace char, `JSON.parse`.

- `buildDom(value, keyName?)` (in `src/lib/buildDom.ts`)
  - Constructs the DOM tree that represents JSON values. The function’s structure makes it the focal point for:
    - String escaping and text node creation
    - Creating collapsible nodes (classes like `.entry`, `.collapsed`)
    - URL detection and anchor creation
    - Large/complex objects performance (defer/hide inner blocks while collapsed)

- `content.entry.ts`
  - Wires `getResult` + `buildDom` to the page
  - Builds UI (CSS inline or via stylesheet), toggles for Raw/Parsed
  - Applies theme override logic

- `set-json-global.entry.ts`
  - Ensures parsed JSON is available as `window.json` within the page context (MAIN world)

- `options/options.entry.ts`
  - Simple storage sync between radio inputs and `chrome.storage.local`


## Build, test, and run

- Install: `npm install`
- Build once: `npm run build` → outputs to `dist/`
- Watch/rebuild on change: `npm run dev`
- Test: `npm test`
- Update fixture EXPECT snapshots: `npm run test:update` (sets `UPDATE_SNAPSHOTS=1`)
- Load unpacked extension from `dist/` in Chrome → Extensions → Load unpacked

Vitest runs in a jsdom environment (configured in `vite.config.ts`). Tests use HTML fixtures that include an `<!-- EXPECT ... -->` comment containing the expected JSON result of `getResult(document)` for that fixture. When updating snapshots, the test will rewrite that comment block.


## Security considerations

While this extension does not fetch remote data or execute arbitrary content, it runs on nearly all pages. Key risks and mitigations:

- XSS (rendering):
  - Risk: When rendering string values, if the viewer uses `innerHTML` unsafely, hostile strings could inject HTML.
  - Mitigation: Use `textContent`/`createTextNode` for all literal text; when linkifying URLs, create elements via `document.createElement('a')` and set attributes safely. Avoid assigning untrusted strings to `innerHTML`.

- Link handling:
  - If creating `<a>` tags, consider `rel="noopener noreferrer"` and explicit `target` handling. In a content script context, opening new tabs should be explicit and safe.

- Permissions scope:
  - `host_permissions` includes `"*://*/*"` and `<all_urls>`. This is broad. Consider narrowing if feasible, or clearly justify in Store listing.

- MAIN world script (`set-json-global.js`):
  - Runs in the page context (not isolated world). Ensure it doesn’t leak data or collide with page variables. Namespace carefully and only set `window.json` when the page truly contains parsed JSON.

- Options storage:
  - Only theme is stored (`chrome.storage.local`). No sensitive data is collected. Ensure no PII is ever stored.

- CSP compatibility:
  - MV3 + content scripts typically avoid inline scripts. The current build emits bundled JS files; ensure injected styles are added via `<style>` with raw CSS text controlled by the extension (not from the page).


## Privacy considerations

- The extension does not send network requests and does not collect telemetry.
- Theme preference is stored locally via `chrome.storage.local`.
- `window.json` exposes data to the page context by design; this only mirrors data already present on the page and is intended to aid debugging.


## Reliability and performance

- Large input guard: `MAX_LENGTH = 3_000_000` characters prevents extreme cases from freezing the tab.
- Early exit: `getResult` quickly bails on non‑JSON pages (title present, multiple/pre conditions, etc.) → negligible overhead (< 1ms target on non‑JSON pages).
- Rendering:
  - Collapsible nodes to limit layout/paint costs
  - CSS like `content-visibility: auto` used in the tree to reduce rendering overhead

Potential hotspots:
- Deeply nested objects/arrays
- Very large strings and many linkified URLs


## Performance optimization workflow

This project has a comprehensive performance measurement and optimization framework. Before optimizing any code:

1. **Read the [Optimization Playbook](docs/OPTIMIZATION_PLAYBOOK.md)** - Provides a step-by-step workflow for identifying, implementing, and validating performance improvements
2. **Run golden tests** - Quick iteration with `npm run perf:golden` (< 10 seconds)
3. **Profile before changing** - Capture flamegraphs and baseline metrics
4. **Measure the impact** - Compare against baselines with `npm run perf:compare`
5. **Follow hot path guidelines** - See [Guardrails and Coding Guidelines](docs/OPTIMIZATION_PLAYBOOK.md#guardrails-and-coding-guidelines)

Key performance commands:
```bash
npm run perf:golden      # Run golden perf tests for quick iteration
npm run perf:compare     # Compare current metrics against baseline
npm run bundle:measure   # Measure bundle size (requires build first)
```

PRs that modify hot paths (`buildDom.ts`, `getResult.ts`, `templates.ts`) must include performance impact analysis. See the PR template's performance section for requirements.


## Next steps and improvement ideas

1. Security hardening
   - Audit `buildDom` to ensure no `innerHTML` with untrusted strings. Centralize string escaping helpers.
   - When linkifying URLs, add `rel="noopener noreferrer"` and consider `target="_blank"` with explicit user action.
   - Revisit `host_permissions`/`matches` to narrow scope if possible.

2. Performance
   - Consider incremental/lazy DOM building for very large trees (virtualization, on‑expand rendering).
   - Add a streaming or chunked parser option for massive JSON (if needed), or allow user to override `MAX_LENGTH`.

3. UX
   - Search/filter within the JSON tree.
   - Copy path (e.g., `$.a[3].b`) and copy value actions.
   - Persist collapsed/expanded state across reloads (size‑limited).

4. Cross‑browser
   - Validate on Firefox/Edge; consider adopting `webextension-polyfill` for portability.

5. Developer experience
   - Add ESLint + Prettier CI checks; add GitHub Actions for build/test.
   - Document internal DOM structure/classes in `buildDom` via TSDoc.


## Troubleshooting

- The page doesn’t format:
  - Check DevTools console for notes from `getResult` (e.g., multiple `<pre>`, too long, not JSON, etc.).
  - Ensure the page actually serves JSON as text (content served as `application/json` often still renders as a single `<pre>` in Chrome).

- Options page doesn’t affect theme:
  - Check `chrome.storage.local` contents; verify `themeOverride` changes and that content script reads it on load.

- `window.json` missing:
  - Ensure `set-json-global.js` runs (`world: MAIN`) and that the page actually parsed successfully.


## File map (quick reference)

- Build tooling
  - `package.json` – scripts and dev deps
  - `vite.config.ts` – multi-entry config; static copy; vitest config
  - `tsconfig.json` – TS compiler config

- Runtime
  - `src/manifest.json` – Chrome MV3 manifest
  - `src/content.entry.ts` – main content script
  - `src/set-json-global.entry.ts` – expose `window.json` in page
  - `src/lib/getResult.ts` – detection and parsing guard
  - `src/lib/buildDom.ts` – JSON tree renderer
  - `src/options/options.html` – Options page markup
  - `src/options/options.entry.ts` – Options page logic
  - `src/style*.css` – Shared stylesheets (if present)

- Tests
  - `tests/getResult.test.ts` – jsdom fixture-driven tests
  - `tests/fixtures/*.html` – input HTML fixtures with `<!-- EXPECT ... -->` snapshot comments


## Contributing

- Use Node 18+/20+
- `npm run dev` while iterating; load `dist/` as unpacked extension
- Add/adjust fixtures when changing `getResult` detection rules; run `npm run test:update`
- Prefer small, focused pull requests with a brief description of the behavior change and any performance impact
