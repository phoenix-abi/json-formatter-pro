import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for performance benchmarking tests
 *
 * These tests are slow and should NOT be run as part of the regular test suite.
 * Run with: npm run test:perf
 *
 * Performance tests include:
 * - Parser comparison benchmarks (native vs custom)
 * - Rendering performance tests
 * - Memory profiling
 * - Large dataset stress tests
 */
export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    unstubGlobals: true,
    unstubEnvs: true,
    isolate: true,
    // Longer timeouts for performance tests
    testTimeout: 60000, // 60 seconds
    hookTimeout: 60000,
    allowOnly: !process.env.CI,
    sequence: {
      shuffle: !process.env.CI
    },
    include: ['tests/perf/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.{idea,git,cache,output,temp}/**'
      // Note: Smoke tests are included - they're just faster versions
    ],
    environment: 'node',
    setupFiles: ['tests/perf/setup.ts', 'tests/unit/setup.ts'],
    // Multiple reporters: console output + performance metrics
    // Note: File output is handled by run-perf-with-output.mjs wrapper script
    reporters: process.env.PERF_REPORTER === '0'
      ? ['default']
      : ['default', './tests/perf/perf-reporter.ts'],
  }
});
