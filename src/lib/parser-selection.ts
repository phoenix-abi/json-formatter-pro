/**
 * Parser Selection Logic
 *
 * Manages which JSON parser to use (native JSON.parse() vs custom AST parser)
 * based on user preferences, URL patterns, and manual overrides.
 */

import type { NumberMode } from './parser/types'

/**
 * Parser types available
 */
export type ParserType = 'native' | 'custom'

/**
 * Custom parser options (Week 11-15 features)
 */
export interface CustomParserOptions {
  /** Number representation mode */
  numberMode: NumberMode // 'native' | 'bigint' | 'decimal' | 'string'

  /** Error tolerance mode (Week 15) */
  tolerant: boolean

  /** Maximum nesting depth */
  maxDepth: number

  /** Maximum key length */
  maxKeyLength: number

  /** Maximum string length */
  maxStringLength: number
}

/**
 * URL override rule
 */
export interface ParserURLOverride {
  pattern: string // URL pattern with wildcards
  parser: ParserType
  enabled: boolean
}

/**
 * Parser settings stored in chrome.storage
 */
export interface ParserSettings {
  // Global default parser
  defaultParser: ParserType // Default: 'custom'

  // Per-URL overrides
  urlOverrides: ParserURLOverride[]

  // Custom parser options (when custom parser is used)
  customParserOptions: CustomParserOptions

  // UI preferences
  showToolbarToggle: boolean // Default: true
  showPerformanceMetrics: boolean // Default: false
  autoSwitchThreshold: number // File size in MB, default: 10

  // Feature flags
  enableCustomParser: boolean // Default: true (can disable custom parser entirely)

  // Gradual rollout opt-in/opt-out (Week 20)
  forceEnableCustomParser: boolean // Default: false (user opts in to beta)
  forceDisableCustomParser: boolean // Default: false (user opts out after issues)
}

/**
 * Default custom parser options
 */
export const DEFAULT_CUSTOM_PARSER_OPTIONS: CustomParserOptions = {
  numberMode: 'native', // Use native numbers by default (compatible with JSON.parse)
  tolerant: false, // Strict mode by default (RFC 8259 compliant)
  maxDepth: 1000, // Prevent stack overflow
  maxKeyLength: 10000, // Prevent DoS
  maxStringLength: 10000000, // Prevent DoS (10MB strings)
}

/**
 * Default parser settings
 */
export const DEFAULT_PARSER_SETTINGS: ParserSettings = {
  defaultParser: 'custom',
  urlOverrides: [],
  customParserOptions: DEFAULT_CUSTOM_PARSER_OPTIONS,
  showToolbarToggle: true,
  showPerformanceMetrics: false,
  autoSwitchThreshold: 10,
  enableCustomParser: true,
  forceEnableCustomParser: false,
  forceDisableCustomParser: false,
}

/**
 * Parser selection reason (for transparency/debugging)
 */
export type ParserSelectionReason =
  | { type: 'default'; parser: ParserType }
  | { type: 'url-override'; pattern: string; parser: ParserType }
  | { type: 'manual-session'; parser: ParserType }
  | { type: 'auto-size-limit'; thresholdMB: number; parser: ParserType }
  | { type: 'feature-disabled'; parser: 'native' }
  | { type: 'active-on-page'; parser: ParserType }

/**
 * Parser selection result
 */
export interface ParserSelection {
  parser: ParserType
  reason: ParserSelectionReason
}

/**
 * URL pattern matching
 *
 * Supports wildcards:
 * - api.company.com/* - All paths on api.company.com
 * - *.company.com - All subdomains of company.com
 * - * /api/v1/* - All /api/v1/ paths on any domain
 */
export function matchesURLPattern(url: string, pattern: string): boolean {
  // Convert pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')

  const regex = new RegExp(`^${regexPattern}$`, 'i')
  return regex.test(url)
}

/**
 * Get pattern specificity score (higher = more specific)
 * Used to determine which pattern takes precedence
 */
function getPatternSpecificity(pattern: string): number {
  // Count non-wildcard characters (more specific patterns have more)
  const nonWildcardChars = pattern.replace(/\*/g, '').length
  // Subtract wildcard count (fewer wildcards = more specific)
  const wildcardCount = (pattern.match(/\*/g) || []).length

  return nonWildcardChars * 10 - wildcardCount
}

/**
 * Find matching URL override with highest specificity
 */
function findBestURLOverride(
  url: string,
  overrides: ParserURLOverride[]
): ParserURLOverride | null {
  const matches = overrides
    .filter((override) => override.enabled && matchesURLPattern(url, override.pattern))
    .sort((a, b) => getPatternSpecificity(b.pattern) - getPatternSpecificity(a.pattern))

  return matches[0] || null
}

/**
 * Determine which parser to use for a given URL
 *
 * Priority order:
 * 1. Feature flag (if custom parser disabled, always use native)
 * 2. Auto-size limit (if file too large, use native)
 * 3. Manual session override (stored in memory, not persisted)
 * 4. URL pattern override (most specific match)
 * 5. Default parser
 */
export function selectParser(
  url: string,
  settings: ParserSettings,
  sessionOverride?: ParserType,
  fileSizeMB?: number
): ParserSelection {
  // Priority 1: Feature flag
  if (!settings.enableCustomParser) {
    return {
      parser: 'native',
      reason: { type: 'feature-disabled', parser: 'native' },
    }
  }

  // Priority 2: Auto-size limit
  if (
    fileSizeMB !== undefined &&
    fileSizeMB > settings.autoSwitchThreshold &&
    settings.autoSwitchThreshold > 0
  ) {
    return {
      parser: 'native',
      reason: {
        type: 'auto-size-limit',
        thresholdMB: settings.autoSwitchThreshold,
        parser: 'native',
      },
    }
  }

  // Priority 3: Manual session override
  if (sessionOverride) {
    return {
      parser: sessionOverride,
      reason: { type: 'manual-session', parser: sessionOverride },
    }
  }

  // Priority 4: URL pattern override (most specific match)
  const override = findBestURLOverride(url, settings.urlOverrides)
  if (override) {
    return {
      parser: override.parser,
      reason: { type: 'url-override', pattern: override.pattern, parser: override.parser },
    }
  }

  // Priority 5: Default parser
  return {
    parser: settings.defaultParser,
    reason: { type: 'default', parser: settings.defaultParser },
  }
}

/**
 * Get human-readable description of parser selection reason
 */
export function getReasonDescription(reason: ParserSelectionReason): string {
  switch (reason.type) {
    case 'default':
      return 'Default setting'
    case 'url-override':
      return `URL override (${reason.pattern})`
    case 'manual-session':
      return 'Manually selected (this session)'
    case 'auto-size-limit':
      return `File too large (>${reason.thresholdMB}MB, auto-switched to native)`
    case 'feature-disabled':
      return 'ExactJSON disabled'
    case 'active-on-page':
      return 'Active on this page'
  }
}

/**
 * Get parser display name
 */
export function getParserDisplayName(parser: ParserType): string {
  switch (parser) {
    case 'native':
      return 'Native Parser'
    case 'custom':
      return 'ExactJSON'
  }
}

/**
 * Get parser description
 */
export function getParserDescription(parser: ParserType): string {
  switch (parser) {
    case 'native':
      return 'Fast, uses built-in JSON.parse()'
    case 'custom':
      return 'Exact parsing with lossless numbers and key order'
  }
}

/**
 * Get parser features list
 */
export function getParserFeatures(parser: ParserType): string[] {
  switch (parser) {
    case 'native':
      return [
        'Fast parsing',
        'Works for most JSON files',
        'May lose precision on very large numbers',
        'Reorders numeric object keys',
      ]
    case 'custom':
      return [
        'Slower (4-11x)',
        'Preserves large number precision',
        'Maintains exact key order',
        'Better for financial/scientific data',
      ]
  }
}

/**
 * Validate URL pattern syntax
 */
export function isValidURLPattern(pattern: string): boolean {
  if (!pattern || pattern.trim().length === 0) {
    return false
  }

  // Check for valid characters (allow alphanumeric, dots, slashes, hyphens, wildcards, colons)
  const validChars = /^[a-zA-Z0-9.*\-/:]+$/
  if (!validChars.test(pattern)) {
    return false
  }

  // Pattern should have some non-wildcard content
  const nonWildcard = pattern.replace(/\*/g, '')
  if (nonWildcard.length === 0) {
    return false
  }

  return true
}

/**
 * Session storage for manual overrides
 * (Not persisted, cleared on page navigation)
 */
const sessionOverrides = new Map<string, ParserType>()

/**
 * Set session override for current URL
 */
export function setSessionOverride(url: string, parser: ParserType): void {
  sessionOverrides.set(url, parser)
}

/**
 * Get session override for current URL
 */
export function getSessionOverride(url: string): ParserType | undefined {
  return sessionOverrides.get(url)
}

/**
 * Clear session override for current URL
 */
export function clearSessionOverride(url: string): void {
  sessionOverrides.delete(url)
}

// Active parser tracking (for popup to read the actual parser being used)
// Uses chrome.storage.local to share state between content script and popup
// (chrome.storage.session is NOT available in content scripts)

interface ActiveParserEntry {
  parser: ParserType
  timestamp: number
}

const ACTIVE_PARSER_TTL = 60 * 60 * 1000 // 1 hour
const ACTIVE_PARSER_KEY_PREFIX = 'active-parser:'

/**
 * Store the actual parser being used for a URL (called by content script after selectParser)
 * This includes the result of selectParser with all factors (file size, feature flags, etc.)
 * Uses chrome.storage.local to share with popup (separate execution context)
 */
export async function setActiveParser(url: string, parser: ParserType): Promise<void> {
  if (!chrome?.storage?.local) {
    console.warn('chrome.storage.local not available')
    return
  }

  try {
    const key = `${ACTIVE_PARSER_KEY_PREFIX}${url}`
    const entry: ActiveParserEntry = {
      parser,
      timestamp: Date.now(),
    }
    await chrome.storage.local.set({ [key]: entry })

    // Clean up stale entries (don't await to avoid blocking)
    void cleanupStaleActiveParserEntries()
  } catch (error) {
    console.error('Error setting active parser:', error)
  }
}

/**
 * Get the actual parser being used for a URL (called by popup)
 * Returns the parser that was determined by the content script's full selectParser logic
 * Uses chrome.storage.local to read from content script (separate execution context)
 */
export async function getActiveParser(url: string): Promise<ParserType | null> {
  if (!chrome?.storage?.local) {
    console.warn('chrome.storage.local not available')
    return null
  }

  try {
    const key = `${ACTIVE_PARSER_KEY_PREFIX}${url}`
    const result = await chrome.storage.local.get(key)
    const entry = result[key] as ActiveParserEntry | undefined

    if (!entry) {
      return null
    }

    // Check if entry is stale
    const age = Date.now() - entry.timestamp
    if (age > ACTIVE_PARSER_TTL) {
      // Remove stale entry
      void chrome.storage.local.remove(key)
      return null
    }

    if (entry.parser === 'native' || entry.parser === 'custom') {
      return entry.parser
    }
    return null
  } catch (error) {
    console.error('Error getting active parser:', error)
    return null
  }
}

/**
 * Clean up stale active parser entries from storage
 * Called periodically when setting active parser
 */
async function cleanupStaleActiveParserEntries(): Promise<void> {
  try {
    const allItems = await chrome.storage.local.get(null)
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, value] of Object.entries(allItems)) {
      if (key.startsWith(ACTIVE_PARSER_KEY_PREFIX)) {
        const entry = value as ActiveParserEntry
        if (entry?.timestamp && now - entry.timestamp > ACTIVE_PARSER_TTL) {
          keysToRemove.push(key)
        }
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove)
      console.log(`Cleaned up ${keysToRemove.length} stale active parser entries`)
    }
  } catch (error) {
    console.error('Error cleaning up stale active parser entries:', error)
  }
}

/**
 * Clear all session overrides
 */
export function clearAllSessionOverrides(): void {
  sessionOverrides.clear()
}
