# Core E2E Tests

Fast, reliable end-to-end tests for core functionality.

## Purpose

These tests validate the essential features of the JSON Formatter Pro extension:
- JSON detection and formatting
- Toolbar functionality
- Theme switching
- Parser selection
- Tree rendering and interaction

## Characteristics

- **Fast** - Runs in ~20 seconds
- **Stable** - No flaky tests, reliable in CI/CD
- **Small payloads** - Uses small to medium JSON files (<100 items)
- **No external dependencies** - Self-contained tests

## When to Run

✅ **Always run these tests:**
- Before committing code
- In CI/CD pipelines
- On every PR
- During development (frequent)

## Running

```bash
# Run all core tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/core/content.e2e.spec.ts

# Run in headed mode (see browser)
npx playwright test tests/e2e/core --headed
```

## Tests Included

- `content.e2e.spec.ts` - Content script functionality (toolbar, toggle, JSON detection)
- `css-themes.spec.ts` - Theme system (light/dark/system modes)
- `fixtures.e2e.spec.ts` - Fixture-driven tests with snapshot validation
- `preact-renderer.e2e.spec.ts` - Preact tree renderer functionality
- `toolbar.e2e.spec.ts` - Toolbar components (parser selector, options button, etc.)

## Coverage

These tests cover:
- ✅ JSON auto-detection
- ✅ Syntax highlighting
- ✅ Expand/collapse trees
- ✅ Raw/parsed toggle
- ✅ Theme switching (light/dark/system)
- ✅ Parser selection (native/custom)
- ✅ URL linkification
- ✅ Toolbar interactions

## Performance

- Average runtime: ~20 seconds
- Test count: ~48 tests
- All tests should pass consistently

## Troubleshooting

If tests fail:
1. Ensure extension is built: `npm run build`
2. Check that Chrome/Chromium is installed
3. Run with `--headed` flag to see what's happening
4. Check test output for specific error messages

For flaky tests, consider moving them to the `/skip` directory for investigation.
