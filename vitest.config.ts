import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    // Vitest quality-of-life and isolation defaults
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    unstubGlobals: true,
    unstubEnvs: true,
    isolate: true,
    // Reasonable timeouts for async and e2e-like utilities inside unit tests
    testTimeout: 10000,
    hookTimeout: 10000,
    // Prevent accidental .only in CI
    allowOnly: !process.env.CI,
    // Deterministic order locally can be shuffled to catch order dependencies
    sequence: {
      shuffle: !process.env.CI
    },
    // Coverage using V8 (c8) with common reporters
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['**/*.d.ts', 'src/**/*.test.*', 'tests/**', 'dist/**']
    },
    projects: [
      // Default project for fast unit, integration, and contract tests
      // Excludes slow performance benchmarks (use npm run test:perf for those)
      {
        test: {
          name: 'unit',
          include: ['tests/**/*.{test,spec}.{ts,tsx,js,jsx}'],
          exclude: [
            'node_modules',
            'dist',
            '.{idea,git,cache,output,temp}/**',
            'tests/e2e/**',
            // Exclude slow performance benchmark tests
            'tests/perf/**/*.{test,spec}.{ts,tsx,js,jsx}',
            // Include only smoke tests for quick regression checks
            '!tests/perf/**/*.smoke.{test,spec}.{ts,tsx,js,jsx}'
          ],
          // Use Node by default; tests that need DOM can instantiate JSDOM explicitly
          environment: 'node',
          setupFiles: ['tests/unit/setup.ts'],
          reporters: ['default'],
        }
      },
      // Storybook project for component stories
      {
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook')
          })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{
              browser: 'chromium'
            }]
          },
          // Only use Storybook setup, not perf setup (which uses Node APIs)
          setupFiles: ['.storybook/vitest.setup.ts']
        }
      }
    ]
  }
});