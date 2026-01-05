import { afterAll } from 'vitest'
import { flush } from './collector'

/**
 * Vitest setup file for performance metrics collection.
 * This hook ensures that collected performance metrics are flushed
 * to disk at the end of the test run.
 */
afterAll(() => {
  flush()
})
