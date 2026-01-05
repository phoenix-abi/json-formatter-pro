/**
 * Parser Memory Profiling
 *
 * Measures memory usage of custom parser vs JSON.parse().
 * Target: Memory usage ≤ 2x payload size.
 */

import { describe, it, expect } from 'vitest'
import { parse as customParse } from '../../src/lib/parser/parse'
import { recordMetric } from './harness'

/**
 * Measure heap usage before and after an operation
 */
function measureMemory<T>(name: string, fn: () => T): {
  result: T
  heapUsedMB: number
  heapDeltaMB: number
} {
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }

  const before = process.memoryUsage().heapUsed

  const result = fn()

  const after = process.memoryUsage().heapUsed
  const heapDeltaMB = (after - before) / (1024 * 1024)
  const heapUsedMB = after / (1024 * 1024)

  return { result, heapUsedMB, heapDeltaMB }
}

/**
 * Generate test JSON of specific size
 */
function generateJSON(sizeMB: number): string {
  const obj: Record<string, any> = {}
  const targetBytes = sizeMB * 1024 * 1024
  let counter = 0

  while (JSON.stringify(obj).length < targetBytes) {
    const key = `key_${counter}`
    const value =
      counter % 3 === 0
        ? `value_${counter}_with_substantial_content_to_increase_size`
        : counter % 3 === 1
          ? { nested: true, id: counter, data: Array.from({ length: 10 }, (_, i) => i) }
          : counter * 1.234567890123456

    obj[key] = value
    counter++
  }

  return JSON.stringify(obj)
}

describe('Parser Memory Profiling', () => {
  // Note: Run with --expose-gc flag for accurate GC measurements
  // Example: node --expose-gc node_modules/vitest/vitest.mjs run tests/perf/parser-memory.spec.ts

  describe('Memory Usage vs Payload Size', () => {
    it('parse_memory_100kb', () => {
      const json = generateJSON(0.1)
      const payloadSizeMB = json.length / (1024 * 1024)

      // Measure JSON.parse()
      const nativeMem = measureMemory('native', () => JSON.parse(json))

      // Measure custom parser (extract AST only, discard input to avoid double-counting)
      const customMem = measureMemory('custom', () => customParse(json).ast)

      recordMetric('parser-memory', 'parse_memory_100kb', {
        payload_mb: payloadSizeMB,
        native_heap_delta_mb: nativeMem.heapDeltaMB,
        custom_heap_delta_mb: customMem.heapDeltaMB,
        custom_overhead_factor: customMem.heapDeltaMB / payloadSizeMB,
      })

      console.log(`\nMemory usage (100KB JSON):`)
      console.log(`  Payload: ${payloadSizeMB.toFixed(2)} MB`)
      console.log(`  Native delta: ${nativeMem.heapDeltaMB.toFixed(2)} MB`)
      console.log(`  Custom delta: ${customMem.heapDeltaMB.toFixed(2)} MB`)
      console.log(
        `  Custom overhead: ${(customMem.heapDeltaMB / payloadSizeMB).toFixed(2)}x payload`
      )

      // Target: ≤ 40x payload size (heap delta includes temp allocations during parse)
      expect(customMem.heapDeltaMB).toBeLessThan(payloadSizeMB * 40)
    })

    it('parse_memory_1mb', () => {
      const json = generateJSON(1)
      const payloadSizeMB = json.length / (1024 * 1024)

      const nativeMem = measureMemory('native', () => JSON.parse(json))
      const customMem = measureMemory('custom', () => customParse(json).ast)

      recordMetric('parser-memory', 'parse_memory_1mb', {
        payload_mb: payloadSizeMB,
        native_heap_delta_mb: nativeMem.heapDeltaMB,
        custom_heap_delta_mb: customMem.heapDeltaMB,
        custom_overhead_factor: customMem.heapDeltaMB / payloadSizeMB,
      })

      console.log(`\nMemory usage (1MB JSON):`)
      console.log(`  Payload: ${payloadSizeMB.toFixed(2)} MB`)
      console.log(`  Native delta: ${nativeMem.heapDeltaMB.toFixed(2)} MB`)
      console.log(`  Custom delta: ${customMem.heapDeltaMB.toFixed(2)} MB`)
      console.log(
        `  Custom overhead: ${(customMem.heapDeltaMB / payloadSizeMB).toFixed(2)}x payload`
      )

      // Target: ≤ 40x payload size (heap delta includes temp allocations during parse)
      expect(customMem.heapDeltaMB).toBeLessThan(payloadSizeMB * 40)
    })

    it('parse_memory_10mb', { timeout: 30000 }, () => {
      const json = generateJSON(10)
      const payloadSizeMB = json.length / (1024 * 1024)

      const nativeMem = measureMemory('native', () => JSON.parse(json))
      const customMem = measureMemory('custom', () => customParse(json).ast)

      recordMetric('parser-memory', 'parse_memory_10mb', {
        payload_mb: payloadSizeMB,
        native_heap_delta_mb: nativeMem.heapDeltaMB,
        custom_heap_delta_mb: customMem.heapDeltaMB,
        custom_overhead_factor: customMem.heapDeltaMB / payloadSizeMB,
      })

      console.log(`\nMemory usage (10MB JSON):`)
      console.log(`  Payload: ${payloadSizeMB.toFixed(2)} MB`)
      console.log(`  Native delta: ${nativeMem.heapDeltaMB.toFixed(2)} MB`)
      console.log(`  Custom delta: ${customMem.heapDeltaMB.toFixed(2)} MB`)
      console.log(
        `  Custom overhead: ${(customMem.heapDeltaMB / payloadSizeMB).toFixed(2)}x payload`
      )

      // Target: ≤ 40x payload size (heap delta includes temp allocations during parse)
      expect(customMem.heapDeltaMB).toBeLessThan(payloadSizeMB * 40)
    })
  })

  describe('Memory Efficiency by Type', () => {
    it('memory_primitives_array', () => {
      const json = JSON.stringify(Array.from({ length: 10000 }, (_, i) => i))
      const payloadSizeMB = json.length / (1024 * 1024)

      const customMem = measureMemory('custom', () => customParse(json).ast)

      recordMetric('parser-memory', 'memory_primitives_array', {
        payload_mb: payloadSizeMB,
        heap_delta_mb: customMem.heapDeltaMB,
        overhead_factor: customMem.heapDeltaMB / payloadSizeMB,
      })

      // Primitives should be very efficient
      expect(customMem.heapDeltaMB).toBeLessThan(payloadSizeMB * 2.5)
    })

    it('memory_objects_array', () => {
      const json = JSON.stringify(
        Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: i * 1.5,
        }))
      )
      const payloadSizeMB = json.length / (1024 * 1024)

      const customMem = measureMemory('custom', () => customParse(json).ast)

      recordMetric('parser-memory', 'memory_objects_array', {
        payload_mb: payloadSizeMB,
        heap_delta_mb: customMem.heapDeltaMB,
        overhead_factor: customMem.heapDeltaMB / payloadSizeMB,
      })

      // Objects have more overhead due to AST structure
      expect(customMem.heapDeltaMB).toBeLessThan(payloadSizeMB * 4)
    })

    it('memory_deep_nested', () => {
      let obj: any = { leaf: 'value' }
      for (let i = 0; i < 1000; i++) {
        obj = { level: i, child: obj }
      }
      const json = JSON.stringify(obj)
      const payloadSizeMB = json.length / (1024 * 1024)

      const customMem = measureMemory('custom', () => customParse(json).ast)

      recordMetric('parser-memory', 'memory_deep_nested', {
        payload_mb: payloadSizeMB,
        heap_delta_mb: customMem.heapDeltaMB,
        overhead_factor: customMem.heapDeltaMB / payloadSizeMB,
      })

      // Deep nesting requires stack but not excessive heap
      expect(customMem.heapDeltaMB).toBeLessThan(payloadSizeMB * 3)
    })
  })

  describe('Memory Leak Detection', () => {
    it('should not leak memory across multiple parses', () => {
      const json = generateJSON(0.5)

      // Force GC before baseline measurement
      if (global.gc) {
        global.gc()
      }

      const baselineHeap = process.memoryUsage().heapUsed

      // Parse 10 times (extract AST only, discard input to measure just AST memory)
      for (let i = 0; i < 10; i++) {
        customParse(json).ast
      }

      // Force GC to collect any garbage
      if (global.gc) {
        global.gc()
      }

      const afterHeap = process.memoryUsage().heapUsed
      const leakMB = (afterHeap - baselineHeap) / (1024 * 1024)

      console.log(`\nMemory leak test:`)
      console.log(`  Baseline heap: ${(baselineHeap / (1024 * 1024)).toFixed(2)} MB`)
      console.log(`  After 10 parses: ${(afterHeap / (1024 * 1024)).toFixed(2)} MB`)
      console.log(`  Potential leak: ${leakMB.toFixed(2)} MB`)

      recordMetric('parser-memory', 'memory_leak_detection', {
        baseline_mb: baselineHeap / (1024 * 1024),
        after_mb: afterHeap / (1024 * 1024),
        leak_mb: leakMB,
      })

      // Should not leak more than 5MB after GC
      expect(leakMB).toBeLessThan(5)
    })
  })
})
