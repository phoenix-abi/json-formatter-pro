/**
 * Runtime assertion utility with TypeScript assertion signature support.
 *
 * Provides type narrowing through TypeScript's `asserts` keyword, allowing
 * the compiler to understand that a condition is true after the assertion.
 */

const ASSERTION_PREFIX = 'Assertion failed'

/**
 * Asserts that a condition is truthy at runtime.
 *
 * This function throws an error if the condition is falsy and provides
 * TypeScript type narrowing through the `asserts` signature.
 *
 * @param condition - The condition to check
 * @param message - Optional error message (string or lazy function)
 * @throws {Error} When condition is falsy
 *
 * @example
 * ```ts
 * const value: string | null = getValue()
 * assert(value !== null, 'Expected value to be non-null')
 * // TypeScript now knows value is string (not string | null)
 * value.toUpperCase() // ✓ No error
 * ```
 */
export function assert(
  condition: unknown,
  message?: string | (() => string),
): asserts condition {
  // Early return if condition is truthy
  if (condition) {
    return
  }

  // Construct error message
  let errorMessage = ASSERTION_PREFIX

  if (message !== undefined) {
    const messageText = typeof message === 'function' ? message() : message
    errorMessage = `${ASSERTION_PREFIX}: ${messageText}`
  }

  // Throw error with constructed message
  throw new Error(errorMessage)
}
