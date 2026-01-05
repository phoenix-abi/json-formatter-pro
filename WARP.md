# WARP.md

AI Agent instructions for Warp when working with the JSON Formatter Pro Chrome extension repository.

## Git Commit Policy

**IMPORTANT: Never include AI attribution in git commit messages.**
- Do NOT add "Co-Authored-By: Warp <agent@warp.dev>" or similar attributions
- Do NOT add "Co-Authored-By: Claude" or any AI tool references
- Commit messages should represent human authorship only
- This applies to all commits, pull requests, and git operations

## Quick Reference

For comprehensive documentation, see:
- **AGENTS.md** - Complete AI agent instructions (architecture, commands, patterns)
- **CLAUDE.md** - Claude-specific guidance (workflows, testing, integration contract)
- **docs/README.md** - Full documentation index

## Project Type

Chrome Extension (Manifest V3) - Auto-formats JSON in browser tabs with syntax highlighting, collapsible trees, and theme support.

## Essential Commands

```bash
npm install              # Install dependencies
npm run build           # Build extension → dist/
npm run dev             # Watch mode (rebuilds on change)
npm test                # Run unit tests
npm run test:e2e        # Run Playwright e2e tests
```

## Key Files

- **src/content.ts** - Main content script (JSON detection and rendering)
- **src/lib/getResult.ts** - JSON detection logic
- **src/lib/buildDom.ts** - Tree rendering (SECURITY CRITICAL: XSS prevention)
- **src/manifest.json** - Chrome extension manifest
- **vite.config.ts** - Build configuration

## Critical Security Pattern

```typescript
// ALWAYS use textContent or createTextNode for user content
const span = document.createElement('span')
span.textContent = userString  // ✅ SAFE

// NEVER use innerHTML with parsed JSON values
span.innerHTML = userString  // ❌ XSS VULNERABILITY
```

## Testing

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`
- Fixtures: `tests/fixtures/` (with `<!-- EXPECT {...} -->` snapshots)

Run `npm run test:update` to update fixture snapshots.

## Documentation

See **AGENTS.md** for complete architecture, patterns, and workflow instructions.
