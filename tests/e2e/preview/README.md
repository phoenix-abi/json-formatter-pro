# Preview E2E Tests

Tests for style preview functionality (requires preview generation).

## Purpose

These tests validate the style preview system used during CSS/theme development:
- Preview page generation
- CSS theme rendering
- Style synchronization
- Preview interactions

## Characteristics

- **Requires setup** - Must run `npm run style:preview` first
- **Style-focused** - Tests CSS and theming, not core functionality
- **Standalone** - Tests preview pages without extension loaded
- **Development tool** - Used when working on styles/themes

## Prerequisites

**IMPORTANT**: These tests require preview files to be generated first:

```bash
# Generate preview files (REQUIRED before running tests)
npm run style:preview

# Then run tests
npm run test:e2e:preview
```

## When to Run

✅ **Run these tests when:**
- Working on CSS changes
- Updating the theme system
- Modifying style tokens
- Testing dark/light mode rendering
- Validating style preview generation

❌ **Do NOT run these tests:**
- In CI/CD pipelines (requires preview generation)
- As part of standard development workflow
- Before every commit (unless working on styles)

## Running

```bash
# Generate preview files first
npm run style:preview

# Run all preview tests
npm run test:e2e:preview

# Run specific preview test
npx playwright test tests/e2e/preview/preview-themes.e2e.spec.ts
```

## Tests Included

- `preview-interactions.e2e.spec.ts` - User interactions in preview pages
- `preview-pages.e2e.spec.ts` - Preview page generation and structure
- `preview-sync.e2e.spec.ts` - CSS/bundle synchronization
- `preview-themes.e2e.spec.ts` - Theme rendering (light/dark/system)

## How Preview System Works

1. **Preview Generation** (`npm run style:preview`):
   - Creates standalone HTML files in `tests/preview/`
   - Inlines CSS from `dist/style.css`
   - Bundles JavaScript for tree rendering
   - Uses test fixtures as data source

2. **Preview Tests**:
   - Load generated HTML files directly
   - No extension required (standalone pages)
   - Validate CSS rendering and theming
   - Check for visual regressions

## Development Workflow

When working on styles:

```bash
# 1. Make CSS changes
vim src/style.css

# 2. Rebuild
npm run build

# 3. Generate preview
npm run style:preview

# 4. Run preview tests
npm run test:e2e:preview

# 5. (Optional) Open preview in browser
open tests/preview/small__mixed.html
```

## Troubleshooting

**Error: "small__mixed.html not found"**
- You forgot to run `npm run style:preview`
- Run it first, then try tests again

**Tests fail after CSS changes**
- Preview files might be stale
- Regenerate: `npm run style:preview`
- Try tests again

**Preview pages don't load**
- Check that `tests/preview/` directory exists
- Verify `dist/style.css` was built
- Make sure `npm run build` completed successfully

## CI/CD Integration

⚠️ **Not included in default CI/CD workflows**

Preview tests are excluded from CI/CD because:
- Require additional setup step
- Primarily for style development
- Not core functionality validation

## Adding New Preview Tests

When adding preview tests:
1. Ensure test uses fixtures from `tests/fixtures/`
2. Run `npm run style:preview` to generate preview files
3. Test should check CSS/theme rendering, not extension features
4. Add appropriate skip logic if preview files don't exist
