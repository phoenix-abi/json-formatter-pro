/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { performance } from 'node:perf_hooks'
import { recordMetric } from './harness'
import { h, render } from 'preact'
import { JsonTreeView } from '../../src/components/JsonTreeView'
import type { JsonValue, JsonObject } from '../../src/lib/types'

/**
 * Benchmark statistics
 */
interface BenchStats {
  avg: number
  p50: number
  p95: number
  p99: number
  min: number
  max: number
  n: number
}

/**
 * Run a function N times and collect timing statistics.
 * Includes warmup phase for JIT stability.
 */
function benchIters<T>(n: number, fn: () => T): BenchStats {
  const times: number[] = []

  // Warmup: run a few times to warm up JIT
  for (let i = 0; i < Math.min(10, n); i++) {
    fn()
  }

  // Actual benchmark
  for (let i = 0; i < n; i++) {
    const t0 = performance.now()
    fn()
    times.push(performance.now() - t0)
  }

  times.sort((a, b) => a - b)

  const p50 = times[Math.floor(times.length * 0.5)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const p99 = times[Math.floor(times.length * 0.99)]
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = times[0]
  const max = times[times.length - 1]

  return { avg, p50, p95, p99, min, max, n }
}

/**
 * Generate a nested object of specified depth
 */
function generateDeepObject(depth: number, breadth: number = 2): JsonObject {
  if (depth === 0) {
    return { value: 42, name: 'leaf', active: true }
  }

  const obj: JsonObject = {}
  for (let i = 0; i < breadth; i++) {
    obj[`child_${i}`] = generateDeepObject(depth - 1, breadth)
  }
  return obj
}

describe('Preact rendering performance', () => {
  afterEach(() => {
    // Cleanup any leftover containers
    const containers = document.body.querySelectorAll('div')
    containers.forEach((c) => {
      if (c.parentNode === document.body) {
        document.body.removeChild(c)
      }
    })
  })

  it('renders 1,000 nodes (virtualized)', () => {
    const largeArray: JsonValue = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
    }))

    const stats = benchIters(10, () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      render(<JsonTreeView data={largeArray} initialExpandDepth={0} />, container)
      render(null, container)
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    })

    recordMetric('preact_render_1000', stats.p50)
    expect(stats.p50).toBeLessThan(200) // Should render in < 200ms
  })

  it('renders 10,000 nodes (virtualized)', () => {
    const largeArray: JsonValue = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
    }))

    const stats = benchIters(5, () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      render(<JsonTreeView data={largeArray} initialExpandDepth={0} />, container)
      render(null, container)
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    })

    recordMetric('preact_render_10000', stats.p50)
    expect(stats.p50).toBeLessThan(200) // Should still render in < 200ms due to virtualization
  })

  it('renders 100,000 nodes (virtualized)', () => {
    const largeArray: JsonValue = Array.from({ length: 100000 }, (_, i) => ({
      id: i,
    }))

    const stats = benchIters(3, () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      render(<JsonTreeView data={largeArray} initialExpandDepth={0} />, container)
      render(null, container)
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    })

    recordMetric('preact_render_100000', stats.p50)
    expect(stats.p50).toBeLessThan(200) // Virtual scrolling ensures fast render
  })

  it('expands node with 100 children', () => {
    const data: JsonValue = {
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      })),
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(<JsonTreeView data={data} initialExpandDepth={0} />, container)

    const stats = benchIters(20, () => {
      // Simulate expand by re-rendering with depth 2
      render(<JsonTreeView data={data} initialExpandDepth={2} />, container)
    })

    recordMetric('preact_expand_100', stats.p50)
    expect(stats.p50).toBeLessThan(50) // Expand should be fast
  })

  it('renders deep nested object', () => {
    const deepObject = generateDeepObject(10, 2) // Depth 10, breadth 2

    const stats = benchIters(10, () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      // Use depth 5 to avoid react-window issues with very large trees in tests
      render(<JsonTreeView data={deepObject} initialExpandDepth={5} />, container)
      render(null, container)
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    })

    recordMetric('preact_render_deep', stats.p50)
    expect(stats.p50).toBeLessThan(100)
  })

  it('renders small tree without virtualization', () => {
    const smallData: JsonValue = {
      user: { name: 'Alice', age: 30 },
      settings: { theme: 'dark', notifications: true },
    }

    const stats = benchIters(50, () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      render(
        <JsonTreeView data={smallData} initialExpandDepth={2} virtual={false} />,
        container
      )
      render(null, container)
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    })

    recordMetric('preact_render_small_direct', stats.p50)
    expect(stats.p50).toBeLessThan(20) // Small trees should be very fast
  })

  it('re-renders with updated data', () => {
    const data1: JsonValue = { count: 1, items: [1, 2, 3] }
    const data2: JsonValue = { count: 2, items: [4, 5, 6, 7] }

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(<JsonTreeView data={data1} initialExpandDepth={2} />, container)

    const stats = benchIters(30, () => {
      render(<JsonTreeView data={data2} initialExpandDepth={2} />, container)
      render(<JsonTreeView data={data1} initialExpandDepth={2} />, container)
    })

    recordMetric('preact_rerender', stats.p50)
    expect(stats.p50).toBeLessThan(10) // Re-renders should be very fast
  })

  it('handles rapid toggle operations', () => {
    const data: JsonValue = {
      section1: { items: Array.from({ length: 50 }, (_, i) => i) },
      section2: { items: Array.from({ length: 50 }, (_, i) => i + 50) },
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    const stats = benchIters(15, () => {
      render(<JsonTreeView data={data} initialExpandDepth={0} />, container)
      render(<JsonTreeView data={data} initialExpandDepth={1} />, container)
      render(<JsonTreeView data={data} initialExpandDepth={2} />, container)
      render(<JsonTreeView data={data} initialExpandDepth={1} />, container)
      render(<JsonTreeView data={data} initialExpandDepth={0} />, container)
    })

    recordMetric('preact_rapid_toggle', stats.p50)
    expect(stats.p50).toBeLessThan(30)
  })
})
