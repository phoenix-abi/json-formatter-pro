/**
 * Shared constants used throughout the JSON formatter extension.
 */

// ============================================================================
// JSON Type Constants
// ============================================================================

/**
 * Numeric constants representing JSON value types.
 *
 * These are used in switch statements and type detection logic for performance
 * (numeric comparisons are faster than string comparisons).
 */
export const TYPE_STRING = 1 as const
export const TYPE_NUMBER = 2 as const
export const TYPE_OBJECT = 3 as const
export const TYPE_ARRAY = 4 as const
export const TYPE_BOOL = 5 as const
export const TYPE_NULL = 6 as const

/**
 * Union type of all JSON type constants for type safety.
 */
export type JsonTypeConstant =
  | typeof TYPE_STRING
  | typeof TYPE_NUMBER
  | typeof TYPE_OBJECT
  | typeof TYPE_ARRAY
  | typeof TYPE_BOOL
  | typeof TYPE_NULL

// ============================================================================
// Theme Constants
// ============================================================================

/**
 * Storage key for theme preference in chrome.storage.local
 */
export const THEME_STORAGE_KEY = 'theme' as const

/**
 * Available theme options for the extension.
 *
 * - 'system': Follow browser/OS theme preference
 * - 'light': Always use light theme
 * - 'dark': Always use dark theme
 */
export type Theme = 'system' | 'light' | 'dark'

/**
 * @deprecated Use THEME_STORAGE_KEY instead
 * Kept for backward compatibility with existing code
 */
export const themeStorageKey = THEME_STORAGE_KEY
