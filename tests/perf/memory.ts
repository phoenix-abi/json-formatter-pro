/**
 * Memory sampling utilities for performance testing.
 *
 * These utilities help track heap usage during benchmarks to catch
 * memory regressions alongside timing regressions.
 */

/**
 * Convert bytes to megabytes
 */
export function toMB(bytes: number): number {
  return bytes / (1024 * 1024)
}

/**
 * Convert bytes to kilobytes
 */
export function toKB(bytes: number): number {
  return bytes / 1024
}

/**
 * Heap memory snapshot
 */
export interface HeapSnapshot {
  /** Resident Set Size - total memory allocated for the process */
  rss_mb: number
  /** Heap memory actually used */
  heapUsed_mb: number
  /** Total heap allocated */
  heapTotal_mb: number
  /** Memory used by C++ objects bound to JavaScript */
  external_mb: number
}

/**
 * Sample current heap usage from Node.js process.
 *
 * Returns memory metrics in megabytes for easier human reading.
 *
 * For more accurate peak measurements, run with --expose-gc flag
 * and call global.gc() before sampling.
 *
 * @example
 * ```ts
 * // Measure peak memory after operations
 * global.gc?.()
 * const snapshot = sampleHeap()
 * recordMetric('render', 'large-array', {
 *   ...timingMetrics,
 *   heap_peak_mb: snapshot.heapUsed_mb
 * })
 * ```
 */
export function sampleHeap(): HeapSnapshot {
  const mem = process.memoryUsage()

  return {
    rss_mb: toMB(mem.rss),
    heapUsed_mb: toMB(mem.heapUsed),
    heapTotal_mb: toMB(mem.heapTotal),
    external_mb: toMB(mem.external ?? 0),
  }
}

/**
 * Force garbage collection if --expose-gc flag was used.
 * Returns true if GC was triggered, false otherwise.
 *
 * @example
 * ```ts
 * if (forceGC()) {
 *   console.log('GC triggered for more accurate memory measurement')
 * }
 * const snapshot = sampleHeap()
 * ```
 */
export function forceGC(): boolean {
  if (typeof global.gc === 'function') {
    global.gc()
    return true
  }
  return false
}

/**
 * Measure peak heap usage during an operation.
 *
 * Optionally forces GC before and after the operation for more
 * accurate measurements (requires --expose-gc).
 *
 * @param fn - Function to measure
 * @returns Heap snapshot after operation
 */
export async function measurePeakHeap<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; snapshot: HeapSnapshot }> {
  // Try to collect before measurement
  forceGC()

  const result = await fn()

  // Try to collect after operation
  forceGC()

  const snapshot = sampleHeap()

  return { result, snapshot }
}
