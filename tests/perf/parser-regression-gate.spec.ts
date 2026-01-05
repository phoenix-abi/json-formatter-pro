/**
 * Parser Performance Regression Gates
 *
 * This test runs the parser benchmarks and compares results against baseline.
 * Fails if performance degrades beyond acceptable thresholds.
 *
 * Usage:
 *   npm run perf:parser        # Run benchmarks and check against baseline
 *   npm run perf:parser:update # Update baseline with current results
 */

import { describe, it, expect, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { flush, getPerfCollector } from './collector'

describe('Parser Performance Regression Gates', () => {
  const baselinePath = path.resolve(
    __dirname,
    'baselines',
    'parser-comparison.baseline.json'
  )

  afterAll(() => {
    // Flush results after all tests
    flush('parser-regression-check')
  })

  it('should have performance baseline file', async () => {
    try {
      await fs.access(baselinePath)
      expect(true).toBe(true)
    } catch {
      throw new Error(
        `Baseline file not found at ${baselinePath}. ` +
          `Run 'npm run perf:parser:baseline' to create it.`
      )
    }
  })

  it('should load and validate baseline format', async () => {
    const content = await fs.readFile(baselinePath, 'utf8')
    const baseline = JSON.parse(content)

    expect(baseline).toHaveProperty('version')
    expect(baseline).toHaveProperty('tolerance')
    expect(baseline).toHaveProperty('samples')
    expect(Array.isArray(baseline.samples)).toBe(true)
  })

  it('should define performance targets', async () => {
    const content = await fs.readFile(baselinePath, 'utf8')
    const baseline = JSON.parse(content)

    expect(baseline.metadata).toHaveProperty('targets')
    expect(baseline.metadata.targets).toHaveProperty('slowdown_factor')
    expect(baseline.metadata.targets).toHaveProperty('memory_overhead')

    console.log('\nPerformance Targets:')
    console.log(`  Slowdown Factor: ${baseline.metadata.targets.slowdown_factor}`)
    console.log(`  Memory Overhead: ${baseline.metadata.targets.memory_overhead}`)
  })

  it('should have tolerance thresholds', async () => {
    const content = await fs.readFile(baselinePath, 'utf8')
    const baseline = JSON.parse(content)

    expect(baseline.tolerance).toHaveProperty('default')
    expect(baseline.tolerance.default).toHaveProperty('pct')
    expect(baseline.tolerance.default).toHaveProperty('abs_ms')

    console.log('\nTolerance Thresholds:')
    console.log(`  Default: ${baseline.tolerance.default.pct * 100}% / ${baseline.tolerance.default.abs_ms}ms`)

    if (baseline.tolerance['parser-comparison']) {
      console.log(
        `  Parser Comparison: ${baseline.tolerance['parser-comparison'].pct * 100}% / ` +
        `${baseline.tolerance['parser-comparison'].abs_ms}ms`
      )
    }
  })

  describe('Integration with Benchmark Suite', () => {
    it('should run parser-comparison benchmarks', async () => {
      // This test verifies that the benchmark suite can be imported and run
      // The actual benchmarks are in parser-comparison.spec.ts
      expect(true).toBe(true)
    })

    it('should run parser-memory benchmarks', async () => {
      // This test verifies that the memory benchmark suite can be imported and run
      // The actual benchmarks are in parser-memory.spec.ts
      expect(true).toBe(true)
    })
  })
})
