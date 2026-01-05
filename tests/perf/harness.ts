import { performance } from 'node:perf_hooks'
import { appendSample } from './collector'

/**
 * Times the execution of a function with minimal overhead (<0.1ms).
 * Returns the elapsed time in milliseconds along with the result.
 *
 * @param name - Descriptive name for the timed operation
 * @param fn - Function to time (sync or async)
 * @returns Object containing name, elapsed time in ms, and the function result
 */
export async function time<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<{ name: string; ms: number; result: T }> {
  const t0 = performance.now()
  const result = await fn()
  const ms = performance.now() - t0
  return { name, ms, result }
}

/**
 * Records a performance metric to the shared collector.
 * Metrics will be flushed to JSON at the end of the test run.
 *
 * @param suite - Test suite name (e.g., "render/buildDom")
 * @param testCase - Test case name (e.g., "large-nested-1MB")
 * @param metrics - Key-value pairs of metrics (values must be numbers)
 */
export function recordMetric(
  suite: string,
  testCase: string,
  metrics: Record<string, number>
): void {
  appendSample({ suite, case: testCase, metrics, n: 1 })
}

/**
 * Records multiple samples for the same test case.
 * Useful for recording aggregated results from multiple runs.
 *
 * @param suite - Test suite name
 * @param testCase - Test case name
 * @param metrics - Key-value pairs of metrics
 * @param n - Number of samples aggregated
 */
export function recordMetricN(
  suite: string,
  testCase: string,
  metrics: Record<string, number>,
  n: number
): void {
  appendSample({ suite, case: testCase, metrics, n })
}

/**
 * Convenience function to time a function and record its metrics.
 * The elapsed time is recorded as "ms" in the metrics.
 *
 * @param suite - Test suite name
 * @param testCase - Test case name
 * @param fn - Function to time and execute
 * @returns The result of the function
 */
export async function timeAndRecord<T>(
  suite: string,
  testCase: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const { ms, result } = await time(testCase, fn)
  recordMetric(suite, testCase, { ms })
  return result
}
