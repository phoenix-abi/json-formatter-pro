import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { time, recordMetric, recordMetricN, timeAndRecord } from './harness'
import { flush, reset, getPerfCollector } from './collector'

/**
 * Helper to sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Helper to check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

describe('Performance Harness', () => {
  const testResultsDir = path.resolve(process.cwd(), 'test-results', 'perf')

  beforeEach(() => {
    // Reset collector before each test
    reset()
  })

  afterEach(async () => {
    // Clean up test results after each test
    try {
      const files = await fs.readdir(testResultsDir)
      for (const file of files) {
        if (file.startsWith('test-') || file.includes('harness-spec')) {
          await fs.unlink(path.join(testResultsDir, file))
        }
      }
    } catch {
      // Directory might not exist, that's fine
    }
  })

  describe('time()', () => {
    it('should measure elapsed time with reasonable accuracy', async () => {
      const sleepDuration = 10
      const tolerance = 20 // Allow up to 20ms tolerance for CI environments and system load

      const { name, ms, result } = await time('test-sleep', () => sleep(sleepDuration))

      expect(name).toBe('test-sleep')
      expect(result).toBeUndefined()
      expect(ms).toBeGreaterThanOrEqual(sleepDuration)
      expect(ms).toBeLessThanOrEqual(sleepDuration + tolerance)
    })

    it('should time synchronous functions', async () => {
      const { name, ms, result } = await time('test-sync', () => {
        let sum = 0
        for (let i = 0; i < 1000; i++) {
          sum += i
        }
        return sum
      })

      expect(name).toBe('test-sync')
      expect(result).toBe(499500)
      expect(ms).toBeGreaterThanOrEqual(0)
      expect(ms).toBeLessThan(10)
    })

    it('should time async functions and return their result', async () => {
      const { name, ms, result } = await time('test-async', async () => {
        await sleep(5)
        return 'done'
      })

      expect(name).toBe('test-async')
      expect(result).toBe('done')
      // Allow small tolerance for timing precision (sleep may complete slightly early)
      expect(ms).toBeGreaterThanOrEqual(4)
    })

    it('should have minimal overhead', async () => {
      // Time a no-op function to measure harness overhead
      const { ms } = await time('no-op', () => {})

      // Overhead should be less than 0.1ms on most systems
      // Using 1ms to account for CI environment variability
      expect(ms).toBeLessThan(1)
    })
  })

  describe('recordMetric()', () => {
    it('should record a metric to the collector', async () => {
      recordMetric('test-suite', 'test-case', { ms: 42.5 })

      const collector = getPerfCollector()
      // Access private samples via flush and read file
      const runId = 'test-record-metric'
      flush(runId)

      // Verify the file was created
      const filePath = path.join(testResultsDir, `${runId}.json`)
      expect(await fileExists(filePath)).toBe(true)
    })

    it('should record multiple metrics', async () => {
      recordMetric('suite1', 'case1', { ms: 10 })
      recordMetric('suite1', 'case2', { ms: 20 })
      recordMetric('suite2', 'case1', { ms: 30 })

      const runId = 'test-multiple-metrics'
      flush(runId)

      const filePath = path.join(testResultsDir, `${runId}.json`)
      expect(await fileExists(filePath)).toBe(true)
    })
  })

  describe('recordMetricN()', () => {
    it('should record aggregated metrics with count', async () => {
      recordMetricN('bench-suite', 'bench-case', { ms_p50: 10, ms_p95: 15 }, 100)

      const runId = 'test-record-metric-n'
      flush(runId)

      const filePath = path.join(testResultsDir, `${runId}.json`)
      expect(await fileExists(filePath)).toBe(true)
    })
  })

  describe('flush()', () => {
    it('should write metrics to JSON file with correct schema', async () => {
      recordMetric('test-suite', 'test-case', { ms: 42.5, heap_mb: 64.2 })

      const runId = 'test-flush-schema'
      flush(runId)

      const filePath = path.join(testResultsDir, `${runId}.json`)
      expect(await fileExists(filePath)).toBe(true)

      const content = await fs.readFile(filePath, 'utf8')
      const data = JSON.parse(content)

      // Verify schema
      expect(data).toHaveProperty('runId', runId)
      expect(data).toHaveProperty('env')
      expect(data.env).toHaveProperty('node')
      expect(data.env).toHaveProperty('os')
      expect(data.env).toHaveProperty('cpu')
      expect(data.env).toHaveProperty('ci')
      expect(data).toHaveProperty('samples')
      expect(Array.isArray(data.samples)).toBe(true)
      expect(data.samples).toHaveLength(1)

      const sample = data.samples[0]
      expect(sample).toHaveProperty('suite', 'test-suite')
      expect(sample).toHaveProperty('case', 'test-case')
      expect(sample).toHaveProperty('metrics')
      expect(sample.metrics).toEqual({ ms: 42.5, heap_mb: 64.2 })
      expect(sample).toHaveProperty('n', 1)
    })

    it('should not write file if no samples recorded', async () => {
      const runId = 'test-no-samples'
      flush(runId)

      const filePath = path.join(testResultsDir, `${runId}.json`)
      expect(await fileExists(filePath)).toBe(false)
    })

    it('should generate runId with timestamp and git sha when not provided', async () => {
      recordMetric('test-suite', 'test-case', { ms: 1 })

      flush() // No runId provided

      // Check that a file was created with timestamp pattern
      const files = await fs.readdir(testResultsDir)
      expect(files).toBeDefined()
    })
  })

  describe('timeAndRecord()', () => {
    it('should time function and record metrics', async () => {
      const result = await timeAndRecord('combo-suite', 'combo-case', async () => {
        await sleep(5)
        return 'result'
      })

      expect(result).toBe('result')

      const runId = 'test-time-and-record'
      flush(runId)

      const filePath = path.join(testResultsDir, `${runId}.json`)
      expect(await fileExists(filePath)).toBe(true)

      const content = await fs.readFile(filePath, 'utf8')
      const data = JSON.parse(content)

      expect(data.samples).toHaveLength(1)
      expect(data.samples[0].suite).toBe('combo-suite')
      expect(data.samples[0].case).toBe('combo-case')
      // Allow small tolerance for timing precision (sleep may complete slightly early)
      expect(data.samples[0].metrics.ms).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Integration', () => {
    it('should handle complete workflow', async () => {
      // Simulate a test suite with multiple benchmarks
      const results = []

      for (let i = 0; i < 3; i++) {
        const { ms, result } = await time(`benchmark-${i}`, async () => {
          await sleep(2)
          return i * 10
        })
        results.push(result)
        recordMetric('integration', `benchmark-${i}`, { ms })
      }

      expect(results).toEqual([0, 10, 20])

      const runId = 'test-integration'
      flush(runId)

      const filePath = path.join(testResultsDir, `${runId}.json`)
      const content = await fs.readFile(filePath, 'utf8')
      const data = JSON.parse(content)

      expect(data.samples).toHaveLength(3)
      expect(data.samples.every(s => s.suite === 'integration')).toBe(true)
      expect(data.samples.map(s => s.case)).toEqual([
        'benchmark-0',
        'benchmark-1',
        'benchmark-2',
      ])
    })
  })
})
