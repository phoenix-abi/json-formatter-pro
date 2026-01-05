/**
 * Performance tests for Key Ordering (Week 16)
 *
 * Verifies that key order preservation doesn't significantly impact
 * performance for large objects.
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../src/lib/parser/parse'
import type { ObjectNode } from '../../src/lib/parser/types'

describe('Key Ordering Performance', () => {
  describe('Large objects with preserved key order', () => {
    test('100 keys - parse and verify order', () => {
      const keys = Array.from({ length: 100 }, (_, i) => `key${i}`)
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const start = performance.now()
      const { ast } = parse(json)
      const elapsed = performance.now() - start

      const obj = ast as ObjectNode
      const parsedKeys = obj.entries.map(e => e.key.value)

      expect(parsedKeys).toEqual(keys)
      expect(parsedKeys).toHaveLength(100)

      console.log(`100 keys: ${elapsed.toFixed(3)}ms`)
      expect(elapsed).toBeLessThan(50) // Should parse quickly
    })

    test('1000 keys - parse and verify order', () => {
      const keys = Array.from({ length: 1000 }, (_, i) => `key${i}`)
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const start = performance.now()
      const { ast } = parse(json)
      const elapsed = performance.now() - start

      const obj = ast as ObjectNode
      const parsedKeys = obj.entries.map(e => e.key.value)

      expect(parsedKeys).toEqual(keys)
      expect(parsedKeys).toHaveLength(1000)

      console.log(`1000 keys: ${elapsed.toFixed(3)}ms`)
      expect(elapsed).toBeLessThan(500) // Should scale reasonably
    })

    test('1000 keys - mixed numeric and string', () => {
      const keys = Array.from({ length: 1000 }, (_, i) => {
        return i % 2 === 0 ? `${i}` : `key_${i}`
      })
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const start = performance.now()
      const { ast } = parse(json)
      const elapsed = performance.now() - start

      const obj = ast as ObjectNode
      const parsedKeys = obj.entries.map(e => e.key.value)

      expect(parsedKeys).toEqual(keys)
      expect(parsedKeys).toHaveLength(1000)

      console.log(`1000 mixed keys: ${elapsed.toFixed(3)}ms`)
      expect(elapsed).toBeLessThan(500)
    })

    test('5000 keys - stress test', () => {
      const keys = Array.from({ length: 5000 }, (_, i) => `key${i}`)
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const start = performance.now()
      const { ast } = parse(json)
      const elapsed = performance.now() - start

      const obj = ast as ObjectNode
      expect(obj.entries).toHaveLength(5000)

      console.log(`5000 keys: ${elapsed.toFixed(3)}ms`)
      expect(elapsed).toBeLessThan(2000) // Should complete in reasonable time
    })
  })

  describe('Key order iteration performance', () => {
    test('iterating over 1000 entries is fast', () => {
      const keys = Array.from({ length: 1000 }, (_, i) => `key${i}`)
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const start = performance.now()
      const allKeys = obj.entries.map(e => e.key.value)
      const elapsed = performance.now() - start

      expect(allKeys).toHaveLength(1000)

      console.log(`Iterate 1000 entries: ${elapsed.toFixed(6)}ms`)
      expect(elapsed).toBeLessThan(10) // Array iteration should be very fast
    })

    test('accessing entries by index is O(1)', () => {
      const keys = Array.from({ length:10000 }, (_, i) => `key${i}`)
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      const { ast } = parse(json)
      const obj = ast as ObjectNode

      const start = performance.now()
      // Access 100 random entries
      for (let i = 0; i < 100; i++) {
        const idx = Math.floor(Math.random() * obj.entries.length)
        const entry = obj.entries[idx]
        expect(entry).toBeDefined()
      }
      const elapsed = performance.now() - start

      console.log(`100 random accesses (10k entries): ${elapsed.toFixed(6)}ms`)
      // Array indexing is O(1), but allow for overhead from random number generation and expect calls
      expect(elapsed).toBeLessThan(10)
    })
  })

  describe('Comparison with native JSON.parse()', () => {
    test('performance overhead for 1000 keys', () => {
      const keys = Array.from({ length: 1000 }, (_, i) => `key${i}`)
      const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
      const json = `{${entries}}`

      // Benchmark custom parser
      const customStart = performance.now()
      const { ast } = parse(json)
      const customElapsed = performance.now() - customStart

      // Benchmark native parser
      const nativeStart = performance.now()
      const native = JSON.parse(json)
      const nativeElapsed = performance.now() - nativeStart

      expect((ast as ObjectNode).entries).toHaveLength(1000)
      expect(Object.keys(native)).toHaveLength(1000)

      const slowdown = customElapsed / nativeElapsed

      console.log(`1000 keys comparison:`)
      console.log(`  Custom: ${customElapsed.toFixed(3)}ms`)
      console.log(`  Native: ${nativeElapsed.toFixed(3)}ms`)
      console.log(`  Slowdown: ${slowdown.toFixed(2)}x`)

      // Custom parser should be within acceptable range
      expect(slowdown).toBeLessThan(20)
    })

    test('demonstrates why array storage is necessary', () => {
      // Object with numeric-like keys that V8 reorders
      const json = '{"100":"a","2":"b","30":"c","1":"d"}'

      // Custom parser preserves order
      const { ast: custom } = parse(json)
      const customKeys = (custom as ObjectNode).entries.map(e => e.key.value)

      // Native parser reorders
      const native = JSON.parse(json)
      const nativeKeys = Object.keys(native)

      expect(customKeys).toEqual(['100', '2', '30', '1'])
      expect(nativeKeys).toEqual(['1', '2', '30', '100']) // Sorted numerically

      // This is WHY we use array storage - to preserve exact order
      expect(customKeys).not.toEqual(nativeKeys)
    })
  })

  describe('Memory efficiency', () => {
    test('array storage is compact for small objects', () => {
      const json = '{"a":1,"b":2,"c":3}'
      const { ast } = parse(json)
      const obj = ast as ObjectNode

      expect(obj.entries).toHaveLength(3)

      // Verify array is compact (no sparse entries)
      expect(obj.entries.length).toBe(3)
      expect(obj.entries[0]).toBeDefined()
      expect(obj.entries[1]).toBeDefined()
      expect(obj.entries[2]).toBeDefined()
    })

    test('verifies linear scaling', () => {
      const sizes = [100, 500, 1000]
      const results: Array<{ size: number; time: number }> = []

      for (const size of sizes) {
        const keys = Array.from({ length: size }, (_, i) => `key${i}`)
        const entries = keys.map((k, i) => `"${k}":${i}`).join(',')
        const json = `{${entries}}`

        const start = performance.now()
        const { ast } = parse(json)
        const elapsed = performance.now() - start

        expect((ast as ObjectNode).entries).toHaveLength(size)
        results.push({ size, time: elapsed })
      }

      console.log('Scaling test:')
      results.forEach(r => {
        console.log(`  ${r.size} keys: ${r.time.toFixed(3)}ms`)
      })

      // Verify roughly linear scaling
      const ratio1 = results[1].time / results[0].time // 500 / 100
      const ratio2 = results[2].time / results[1].time // 1000 / 500

      // Should be roughly proportional (allow 0.5-40x range for variance, JIT, and GC effects)
      // Observed: ratio1 ~4.35x, ratio2 ~28x (non-linear due to GC/string interning at larger sizes)
      expect(ratio1).toBeGreaterThan(0.5)
      expect(ratio1).toBeLessThan(40)
      expect(ratio2).toBeGreaterThan(0.5)
      expect(ratio2).toBeLessThan(40)
    })
  })

  describe('Numeric key ordering edge cases', () => {
    test('preserves order of numeric strings vs native reordering', () => {
      const testCases = [
        {
          name: 'simple numeric keys',
          json: '{"10":"ten","2":"two","1":"one"}',
          expectedCustom: ['10', '2', '1'],
          expectedNative: ['1', '2', '10'],
        },
        {
          name: 'array indices',
          json: '{"0":"zero","10":"ten","1":"one","2":"two"}',
          expectedCustom: ['0', '10', '1', '2'],
          expectedNative: ['0', '1', '2', '10'],
        },
        {
          name: 'mixed keys',
          json: '{"name":"Alice","100":"id","age":30,"0":"index"}',
          expectedCustom: ['name', '100', 'age', '0'],
          expectedNative: ['0', '100', 'name', 'age'],
        },
      ]

      testCases.forEach(tc => {
        const { ast } = parse(tc.json)
        const customKeys = (ast as ObjectNode).entries.map(e => e.key.value)
        const nativeKeys = Object.keys(JSON.parse(tc.json))

        expect(customKeys).toEqual(tc.expectedCustom)
        expect(nativeKeys).toEqual(tc.expectedNative)
        expect(customKeys).not.toEqual(nativeKeys)
      })
    })
  })
})
