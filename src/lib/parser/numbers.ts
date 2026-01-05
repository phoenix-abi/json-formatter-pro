/**
 * Lossless Number Parsing
 *
 * Provides utilities for parsing JSON numbers without precision loss.
 * Supports multiple representation modes:
 * - native: Standard JavaScript Number (may lose precision)
 * - bigint: BigInt for large integers (no precision loss)
 * - decimal: String representation for precise decimals
 * - string: Raw string only (no parsing)
 */

/**
 * Number parsing mode
 */
export type NumberMode = 'native' | 'bigint' | 'decimal' | 'string'

/**
 * Parsed number representation
 *
 * Depending on the mode, one or more fields will be populated:
 * - value: Always available in native/decimal mode
 * - bigInt: Only for integers in bigint mode
 * - decimal: String representation in decimal mode
 * - raw: Always preserved
 */
export interface ParsedNumber {
  /** Standard JS number (may lose precision for large numbers) */
  value?: number
  /** BigInt representation for large integers */
  bigInt?: bigint
  /** Decimal string representation for precise decimals */
  decimal?: string
  /** Original lexeme from source */
  raw: string
}

/**
 * Parse a number string into a lossless representation
 *
 * @param raw - The raw number string from JSON
 * @param mode - Parsing mode (native, bigint, decimal, string)
 * @returns Parsed number with appropriate representation
 *
 * @example
 * ```typescript
 * // Native mode
 * parseNumber('42', 'native')
 * // => { value: 42, raw: '42' }
 *
 * // BigInt mode for large integers
 * parseNumber('9007199254740992', 'bigint')
 * // => { bigInt: 9007199254740992n, raw: '9007199254740992' }
 *
 * // Decimal mode for precise decimals
 * parseNumber('0.123456789123456789', 'decimal')
 * // => { decimal: '0.123456789123456789', value: 0.12345678912345678, raw: '0.123456789123456789' }
 * ```
 */
export function parseNumber(raw: string, mode: NumberMode = 'native'): ParsedNumber {
  const result: ParsedNumber = { raw }

  // Always try native parsing for convenience
  const nativeValue = Number(raw)

  // Check if this is an integer (no decimal point or exponent)
  const isInteger = !raw.includes('.') && !raw.includes('e') && !raw.includes('E')

  switch (mode) {
    case 'native':
      result.value = nativeValue
      break

    case 'bigint':
      if (isInteger) {
        try {
          result.bigInt = BigInt(raw)
          // Also store native value if it's in safe range
          if (Number.isSafeInteger(nativeValue)) {
            result.value = nativeValue
          }
        } catch {
          // If BigInt fails (shouldn't happen with valid JSON), fallback to native
          result.value = nativeValue
        }
      } else {
        // Not an integer, use native number
        result.value = nativeValue
      }
      break

    case 'decimal':
      result.decimal = raw
      // Also store native value for convenience (even if lossy)
      result.value = nativeValue
      break

    case 'string':
      // Just keep raw, no parsing
      break
  }

  return result
}

/**
 * Check if a number string represents a safe integer
 *
 * Safe integers are those within the range -(2^53 - 1) to (2^53 - 1),
 * which can be represented exactly in IEEE-754 double precision.
 *
 * @param raw - The raw number string
 * @returns True if the number is a safe integer
 *
 * @example
 * ```typescript
 * isSafeInteger('42')              // => true
 * isSafeInteger('9007199254740991') // => true (2^53 - 1)
 * isSafeInteger('9007199254740992') // => false (2^53, not safe)
 * isSafeInteger('3.14')            // => false (not an integer)
 * ```
 */
export function isSafeInteger(raw: string): boolean {
  const num = Number(raw)
  return Number.isSafeInteger(num)
}

/**
 * Check if a number string represents an integer
 *
 * @param raw - The raw number string
 * @returns True if the number has no decimal point or exponent
 */
export function isInteger(raw: string): boolean {
  return !raw.includes('.') && !raw.includes('e') && !raw.includes('E')
}

/**
 * Format a parsed number for display
 *
 * @param parsed - The parsed number
 * @param preferRaw - If true, always return the raw string (default: true)
 * @returns String representation of the number
 *
 * @example
 * ```typescript
 * const num = parseNumber('9007199254740992', 'bigint')
 * formatNumber(num, true)  // => '9007199254740992' (raw)
 * formatNumber(num, false) // => '9007199254740992' (from bigInt)
 * ```
 */
export function formatNumber(parsed: ParsedNumber, preferRaw: boolean = true): string {
  if (preferRaw) {
    return parsed.raw
  }

  // Prefer most precise representation
  if (parsed.bigInt !== undefined) {
    return parsed.bigInt.toString()
  }

  if (parsed.decimal !== undefined) {
    return parsed.decimal
  }

  if (parsed.value !== undefined) {
    return String(parsed.value)
  }

  return parsed.raw
}

/**
 * Get the numeric value of a parsed number
 *
 * Returns the most appropriate numeric representation:
 * - BigInt if available
 * - Number if available
 * - null if only raw string is available
 *
 * @param parsed - The parsed number
 * @returns Numeric value or null
 */
export function getNumericValue(parsed: ParsedNumber): number | bigint | null {
  if (parsed.bigInt !== undefined) {
    return parsed.bigInt
  }

  if (parsed.value !== undefined) {
    return parsed.value
  }

  return null
}

/**
 * Compare two parsed numbers for equality
 *
 * @param a - First number
 * @param b - Second number
 * @returns True if the numbers are equal
 */
export function numbersEqual(a: ParsedNumber, b: ParsedNumber): boolean {
  // If both have BigInt, compare those
  if (a.bigInt !== undefined && b.bigInt !== undefined) {
    return a.bigInt === b.bigInt
  }

  // If both have value, compare those
  if (a.value !== undefined && b.value !== undefined) {
    return a.value === b.value
  }

  // Otherwise compare raw strings
  return a.raw === b.raw
}

/**
 * Constants for number limits
 */
export const NUMBER_CONSTANTS = {
  /** Maximum safe integer: 2^53 - 1 */
  MAX_SAFE_INTEGER: 9007199254740991,
  /** Minimum safe integer: -(2^53 - 1) */
  MIN_SAFE_INTEGER: -9007199254740991,
  /** Maximum representable integer in IEEE-754: 2^53 */
  MAX_INTEGER: 9007199254740992,
  /** Minimum representable integer in IEEE-754: -2^53 */
  MIN_INTEGER: -9007199254740992,
} as const
