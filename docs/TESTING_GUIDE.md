# Testing Guide

This document explains the testing strategy and how to run different types of tests.

## Quick Start

```bash
# Fast tests for regular development (< 1 minute)
npm test

# Run before committing
npm run test:all  # Fast tests + e2e + smoke tests

# Performance optimization work
npm run test:perf  # Full performance benchmark suite
```

## Test Organization

### Fast Tests (< 1 minute)

These tests run by default with `npm test` and should be run frequently during development:

#### Unit Tests (`tests/unit/`)
- **Purpose:** Test individual functions and components in isolation
- **Speed:** < 100ms per test file
- **Run with:** `npm run test:unit`
- **Examples:**
  - Parser unit tests: `tests/unit/parser/parse.test.ts`
  - Component tests: `tests/unit/components/Toggle.test.tsx`
  - Renderer tests: `tests/unit/renderers/strings.spec.ts`

#### Integration Tests (`tests/integration/`)
- **Purpose:** Test how components work together
- **Speed:** < 500ms per test file
- **Run with:** `npm run test:integration`
- **Examples:**
  - Contract compliance: `tests/integration/contract-compliance.test.ts`
  - Renderer integration: `tests/integration/renderer-integration.test.ts`

#### Contract Tests (`tests/contract/`)
- **Purpose:** Ensure API contracts are maintained
- **Speed:** < 100ms per test file
- **Run with:** `npm run test:contract`
- **Examples:**
  - getResult contract: `tests/contract/getResult.contract.spec.ts`
  - buildDom contract: `tests/contract/buildDom.contract.spec.ts`

#### Smoke Tests (`tests/perf/*.smoke.spec.ts`)
- **Purpose:** Quick performance regression detection
- **Speed:** < 5 seconds total
- **Run with:** `npm run test:perf:smoke` (included in `npm test`)
- **Examples:**
  - Parser regression smoke: `tests/perf/parser-regression.smoke.spec.ts`

### Performance Tests (5-30 minutes)

These tests are **excluded** from `npm test` and should only be run when working on performance optimization:

#### Full Benchmark Suite (`tests/perf/**/*.spec.ts`)
- **Purpose:** Comprehensive performance benchmarking
- **Speed:** 5-30 minutes total
- **Run with:** `npm run test:perf`
- **Output:** Automatically saved to `test-results/perf/` directory
- **When to run:**
  - Before/after performance optimizations
  - Before major releases
  - When investigating performance issues
  - NOT during regular development

#### Viewing Performance Test Results

Performance tests automatically save their complete output to timestamped files for later review:

```bash
# View latest performance test results
npm run perf:results

# List all available test runs
npm run perf:results:list

# View raw output file
cat test-results/perf/latest.txt
```

**Output Files:**
- `test-results/perf/YYYY-MM-DDTHH-MM-SS.txt` - Complete test output (all stdout/stderr)
- `test-results/perf/YYYY-MM-DDTHH-MM-SS+hash.json` - Performance metrics (from perf-reporter)
- `test-results/perf/latest.txt` - Symlink to latest text output

**Why save to files?**
- Performance tests take 5-30 minutes to run
- Developers don't need to watch stdout the entire time
- AI agents can check `test-results/perf/latest.txt` instead of re-running tests
- Easy to compare results across different runs
- Results persist for later analysis

**How it works:**
- All performance test npm scripts use the `run-perf-with-output.mjs` wrapper
- The wrapper captures stdout/stderr while still displaying it in real-time
- Output is saved to a timestamped file and symlinked to `latest.txt`

#### Parser Benchmarks
```bash
# Parser comparison (native vs custom)
npm run test:perf:parser

# Memory profiling (requires --expose-gc)
npm run test:perf:parser:memory
```

**Tests:**
- `parser-comparison.spec.ts` - Native vs custom parser across various JSON sizes
- `parser-round2-comparison.spec.ts` - Round 1 vs Round 2 optimizations
- `parser-pooling-comparison.spec.ts` - Object pooling performance
- `parser-memory.spec.ts` - Memory usage and leak detection
- `key-ordering-performance.spec.ts` - Key preservation performance

#### Rendering Benchmarks
```bash
npm run test:perf:render
```

**Tests:**
- `render-buildDom.spec.ts` - DOM building performance
- `render-preact.spec.tsx` - Virtual scrolling performance

#### Interaction Benchmarks
```bash
npm run test:perf:interaction
```

**Tests:**
- `interaction.spec.ts` - Expand/collapse, virtual scroll interaction tests

### E2E Tests (requires build)

Browser-based end-to-end tests:

```bash
npm run test:e2e
```

**Tests:**
- `content.e2e.spec.ts` - Content script integration
- `toolbar.e2e.spec.ts` - Toolbar interactions
- `css-themes.spec.ts` - Theme switching
- `parser-selector.e2e.spec.ts` - Parser selection UI

**Setup:**
```bash
npm run e2e:install  # Install Playwright browsers (once)
npm run build        # Build extension before running e2e tests
npm run test:e2e     # Run tests
```

## Test Scripts Reference

### Development Scripts
```bash
npm test                    # Fast tests (unit + integration + contract + smoke)
npm run test:unit           # Only unit tests
npm run test:integration    # Only integration tests
npm run test:contract       # Only contract tests
npm run test:update         # Update test snapshots
npm run test:all            # All fast tests + e2e + smoke tests
```

### Performance Scripts
```bash
npm run test:perf              # All performance benchmarks
npm run test:perf:smoke        # Quick smoke tests only
npm run test:perf:parser       # Parser benchmarks
npm run test:perf:parser:memory # Memory profiling
npm run test:perf:render       # Rendering benchmarks
npm run test:perf:interaction  # Interaction benchmarks
npm run test:perf:all          # Complete perf suite + memory profiling
```

### Component Development
```bash
npm run storybook              # Start Storybook dev server
npm run build-storybook        # Build Storybook
```

## CI/CD Integration

### GitHub Actions / CI Pipeline

**Fast CI (runs on every PR):**
```yaml
- run: npm test              # Fast tests
- run: npm run test:e2e      # E2E tests
- run: npm run test:perf:smoke  # Smoke tests
```

**Nightly Performance Testing:**
```yaml
- run: npm run test:perf:all  # Full performance suite
```

**Pre-Release:**
```yaml
- run: npm run test:all      # All tests
- run: npm run test:perf:all # Full performance suite
```

## Writing Tests

### Unit Test Example
```typescript
// tests/unit/example.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../src/lib/myFunction'

describe('myFunction', () => {
  it('should handle basic input', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

### Performance Smoke Test Example
```typescript
// tests/perf/example.smoke.spec.ts
import { describe, it, expect } from 'vitest'

describe('Performance Smoke Tests', () => {
  it('should complete in reasonable time', () => {
    const start = performance.now()
    // ... operation ...
    const elapsed = performance.now() - start

    // Conservative threshold - only catch catastrophic regressions
    expect(elapsed).toBeLessThan(10) // 10ms
  })
})
```

### Full Performance Benchmark Example
```typescript
// tests/perf/example.spec.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'node:perf_hooks'

function benchIters<T>(n: number, fn: () => T) {
  const times: number[] = []

  // Warmup
  for (let i = 0; i < 10; i++) fn()

  // Benchmark
  for (let i = 0; i < n; i++) {
    const t0 = performance.now()
    fn()
    times.push(performance.now() - t0)
  }

  times.sort((a, b) => a - b)
  return {
    p50: times[Math.floor(times.length * 0.5)],
    p95: times[Math.floor(times.length * 0.95)],
    avg: times.reduce((a, b) => a + b, 0) / times.length
  }
}

describe('Detailed Benchmarks', () => {
  it('should benchmark with statistical rigor', () => {
    const stats = benchIters(1000, () => {
      // Operation to benchmark
    })

    console.log(`p50: ${stats.p50.toFixed(3)}ms`)
    expect(stats.p95).toBeLessThan(10)
  })
})
```

## Troubleshooting

### Tests Timing Out
- Check if you're running performance tests with `npm test` (they're excluded by default)
- Use `npm run test:perf` for performance tests
- Reduce iteration counts if tests are too slow

### Memory Tests Failing
```bash
# Memory tests require --expose-gc flag
npm run test:perf:parser:memory
```

### Storybook Tests Failing
```bash
# Ensure Storybook is built
npm run build-storybook
```

### E2E Tests Failing
```bash
# Ensure extension is built first
npm run build
npm run test:e2e
```

## Performance Test Guidelines

### When to Run Full Performance Tests
- ✅ Before/after performance optimizations
- ✅ Before major releases
- ✅ When investigating performance regressions
- ✅ In nightly CI builds

### When NOT to Run Full Performance Tests
- ❌ During regular development
- ❌ On every commit
- ❌ In PR checks (use smoke tests instead)
- ❌ When working on features unrelated to performance

### Smoke Tests vs Full Benchmarks

**Smoke Tests:**
- Very fast (< 5 seconds total)
- Conservative thresholds (catch 10x+ regressions)
- Few iterations (10-20)
- Included in `npm test`
- Run in CI on every PR

**Full Benchmarks:**
- Slow (5-30 minutes)
- Precise thresholds (catch 1.5x+ regressions)
- Many iterations (100-2000)
- Excluded from `npm test`
- Run in nightly CI or manually

## Test Coverage

View coverage reports:
```bash
npm test -- --coverage
# Open coverage/index.html in browser
```

Target coverage:
- Overall: > 80%
- Critical paths: > 90%
- Parser: > 95%
- Renderer: > 85%
