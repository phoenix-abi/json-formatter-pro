# Skipped/Broken E2E Tests

Tests that are currently broken or not working as expected.

## Purpose

This directory contains tests that:
- Are temporarily disabled due to bugs
- Need refactoring or redesign
- Test features that are not yet implemented
- Have known issues that need investigation

## Characteristics

- **Not run** - Excluded from all test suites
- **Needs work** - Tests require fixes before they can be enabled
- **Documentation** - Each test should document why it's skipped
- **Temporary** - Tests here should eventually be fixed and moved to appropriate suite

## Tests Included

### `large-fixtures.e2e.spec.ts`
**Status**: All tests skipped

**Issue**: Tests rely on very large fixture files (1MB, 10MB, 100MB) that may not exist or may cause performance issues.

**Fix needed**: 
- Verify large fixtures exist
- Consider moving to performance suite if they're slow
- Or remove if not adding value over smaller tests

### `options.e2e.spec.ts`
**Status**: All tests skipped

**Issue**: Options page tests need a different approach. Current implementation doesn't work properly with Chrome extension context.

**Error**: "Options page e2e test needs different approach"

**Fix needed**:
- Redesign tests to properly load options page in extension context
- May need to use `chrome.runtime.openOptionsPage()` API
- Or test options page components in isolation with Storybook

## How to Use This Directory

### Moving Tests Here

When a test becomes flaky or broken:

1. Move the test file to this directory
2. Add a comment at the top explaining why it's skipped
3. Create or update an issue in GitHub to track the fix
4. Document the issue in this README

### Moving Tests Out

When you fix a test:

1. Remove the skip reason comments
2. Move the test to the appropriate directory:
   - `/core/` - If it's a core functionality test
   - `/performance/` - If it tests large payloads
   - `/preview/` - If it tests style previews
3. Run the test to verify it passes
4. Remove it from this README
5. Update GitHub issue as resolved

## Development Workflow

**Do not ignore these tests forever!**

Periodically review tests in this directory:

```bash
# Try running skipped tests to see if they're fixed
npx playwright test tests/e2e/skip --reporter=list

# Or test individually
npx playwright test tests/e2e/skip/large-fixtures.e2e.spec.ts
```

## CI/CD Integration

⚠️ **Never included in CI/CD workflows**

Tests in this directory are excluded from:
- All npm test scripts
- GitHub Actions
- Pre-commit hooks

## Adding New Skipped Tests

When adding a test here:

1. **Document the reason**: Add comments explaining why it's skipped
2. **Create an issue**: Track the problem in GitHub Issues
3. **Update this README**: Add details about the test and fix needed
4. **Link the issue**: Reference the GitHub issue number in code comments

## Example Format

```typescript
/**
 * SKIPPED: Issue #123
 * 
 * Reason: Options page doesn't load properly in test environment
 * Fix needed: Use chrome.runtime API to open options page
 * Last attempted: 2026-01-06
 */
test.skip('options page loads', async ({ page }) => {
  // Test code...
});
```

## Priority

Tests here should be prioritized for fixing based on:
1. **High**: Tests for core functionality (move to /core when fixed)
2. **Medium**: Tests for performance (move to /performance when fixed)
3. **Low**: Tests for edge cases or nice-to-have features

Current priority:
- **High**: `options.e2e.spec.ts` - Core feature, needs fixing
- **Low**: `large-fixtures.e2e.spec.ts` - May be redundant with performance tests
