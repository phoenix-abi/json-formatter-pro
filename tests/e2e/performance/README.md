# Performance E2E Tests

Slow end-to-end tests for large payload rendering performance.

## Purpose

These tests validate that the extension can handle large JSON payloads without freezing or timing out:
- Large JSON objects (1000+ items)
- Very large JSON objects (5000+ items)
- Virtual scrolling functionality
- Memory efficiency

## Characteristics

- **Slow** - Takes 20-60+ seconds per test
- **Resource intensive** - Uses significant CPU/memory
- **Large payloads** - Tests with 200-5000 item JSON objects
- **Extended timeouts** - 30-60 second timeouts per test

## When to Run

✅ **Run these tests when:**
- Working on rendering optimizations
- Investigating performance regressions
- Optimizing virtual scrolling
- Before major releases
- Benchmarking changes to tree rendering code

❌ **Do NOT run these tests:**
- In normal development workflows
- In CI/CD pipelines (too slow)
- Before every commit
- During rapid iteration

## Running

```bash
# Run all performance tests
npm run test:e2e:perf

# Run specific test
npx playwright test tests/e2e/performance/performance.e2e.spec.ts

# Run with verbose output
npx playwright test tests/e2e/performance --reporter=list
```

## Tests Included

- `performance.e2e.spec.ts` - Large payload rendering tests
  - 1000-item JSON objects (20-30s per test)
  - 5000-item JSON objects (60s per test)
  - Virtual scrolling validation
  - Memory usage checks

## Expected Behavior

All tests should pass but may take a long time:
- 200 items: ~15-30 seconds
- 1000 items: ~20-40 seconds
- 5000 items: ~60 seconds or more

## Performance Targets

- **1000 items**: Should render within 30 seconds
- **5000 items**: Should render within 60 seconds
- **Virtual scrolling**: DOM should contain <500 nodes even with 1000+ items

## CI/CD Integration

⚠️ **Not included in default CI/CD workflows**

These tests are intentionally excluded from:
- `npm run test:e2e` (core tests only)
- GitHub Actions fast test workflow
- Pre-commit hooks

To include in CI/CD, explicitly run:
```bash
npm run test:e2e:all  # Includes performance tests
```

## Troubleshooting

If tests timeout:
1. Check if Chrome/Chromium has enough resources
2. Reduce test payload sizes temporarily
3. Increase timeout values in test file
4. Run tests individually to isolate issues

If tests are too slow:
1. This is expected behavior
2. Consider optimizing the rendering code
3. Profile with Chrome DevTools to find bottlenecks
4. Check for memory leaks

## Adding New Performance Tests

When adding new performance tests:
1. Use realistic payload sizes (don't go below 200 items)
2. Set appropriate timeouts (minimum 30s)
3. Validate both rendering AND virtualization
4. Document expected runtime in test comments
