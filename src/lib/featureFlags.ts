/**
 * Feature Flag System for Gradual Rollout
 *
 * Provides hash-based deterministic rollout of features to a percentage of users.
 * Supports user opt-in, localStorage overrides for testing, and rollback capabilities.
 */

import { getParserSettings } from './storage'

/**
 * Feature flags available in the extension
 */
export enum FeatureFlag {
  UsePreactRenderer = 'usePreactRenderer',
  UseCustomParser = 'useCustomParser',
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  /** Whether the feature is enabled (master switch) */
  enabled: boolean

  /** Percentage of users to roll out to (0-100) */
  rolloutPercentage: number

  /** Allow users to force-enable via options page */
  userOptIn?: boolean

  /** Allow users to force-disable via options page */
  userOptOut?: boolean
}

/**
 * Feature flag configuration for each flag
 *
 * Update these values to control rollout percentages.
 */
const FEATURE_FLAG_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.UsePreactRenderer]: {
    enabled: true,
    rolloutPercentage: 100, // Already rolled out
    userOptIn: false,
    userOptOut: false,
  },
  [FeatureFlag.UseCustomParser]: {
    enabled: true,
    rolloutPercentage: 100, // Fully rolled out - ExactJSON is now default
    userOptIn: false, // No longer needed - feature is fully enabled
    userOptOut: false, // No longer needed - feature is fully enabled
  },
}

/**
 * Get or generate a stable user ID for rollout decisions
 *
 * The user ID is generated once and stored in chrome.storage.local,
 * ensuring consistent rollout decisions across sessions.
 */
async function getUserId(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get('userId')
    if (stored.userId) {
      return stored.userId
    }

    // Generate new UUID and store it
    const newId = crypto.randomUUID()
    await chrome.storage.local.set({ userId: newId })
    return newId
  } catch (error) {
    // Fallback if storage fails (shouldn't happen)
    console.error('Failed to get user ID:', error)
    return 'fallback-user-id'
  }
}

/**
 * Hash a string to a number (0-99) for deterministic rollout
 *
 * Uses a simple hash function to convert string to number.
 * Same input always produces same output (deterministic).
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100
}

/**
 * Check if a feature is enabled for the current user
 *
 * Decision flow:
 * 1. Check localStorage override (for development/testing)
 * 2. Check if feature is enabled (master switch)
 * 3. Check user opt-in/opt-out settings
 * 4. Hash-based rollout decision (deterministic per user)
 *
 * @param flag - Feature flag to check
 * @returns true if feature is enabled for this user
 */
export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  // Priority 1: localStorage override (for development/testing)
  try {
    const override = localStorage.getItem(`jf_flag_${flag}`)
    if (override !== null) {
      return override === 'true'
    }
  } catch (e) {
    // localStorage might not be available (e.g., in tests)
    // Fall through to other checks
  }

  const config = FEATURE_FLAG_CONFIG[flag]

  // Priority 2: Master switch - if disabled, feature is off for everyone
  if (!config.enabled) {
    return false
  }

  // Priority 3: Check user opt-in/opt-out settings
  try {
    const settings = await getParserSettings()

    // User force-enabled (opt-in)
    if (config.userOptIn && settings.forceEnableCustomParser) {
      return true
    }

    // User force-disabled (opt-out)
    if (config.userOptOut && settings.forceDisableCustomParser) {
      return false
    }
  } catch (error) {
    // If settings fail to load, continue with hash-based rollout
    console.error('Failed to load settings for feature flag:', error)
  }

  // Priority 4: Hash-based rollout decision
  // Get stable user ID and hash it with feature flag name
  const userId = await getUserId()
  const hash = hashString(userId + flag)

  // User is in rollout if hash < rolloutPercentage
  // e.g., rolloutPercentage=10 means users with hash 0-9 get the feature (10%)
  return hash < config.rolloutPercentage
}

/**
 * Get the current rollout percentage for a feature
 *
 * Useful for displaying rollout status in UI.
 */
export function getRolloutPercentage(flag: FeatureFlag): number {
  return FEATURE_FLAG_CONFIG[flag].rolloutPercentage
}

/**
 * Get the full feature flag configuration
 *
 * Useful for debugging and admin UI.
 */
export function getFeatureFlagConfig(flag: FeatureFlag): FeatureFlagConfig {
  return { ...FEATURE_FLAG_CONFIG[flag] }
}

/**
 * Check if a user can opt-in to a feature
 */
export function canOptIn(flag: FeatureFlag): boolean {
  const config = FEATURE_FLAG_CONFIG[flag]
  return config.enabled && (config.userOptIn ?? false)
}

/**
 * Check if a user can opt-out of a feature
 */
export function canOptOut(flag: FeatureFlag): boolean {
  const config = FEATURE_FLAG_CONFIG[flag]
  return config.enabled && (config.userOptOut ?? false)
}

/**
 * Set a feature flag override in localStorage
 *
 * Useful for development and testing.
 * This bypasses all other checks (opt-in/opt-out, rollout percentage, etc.)
 */
export function setFeatureFlag(flag: FeatureFlag, enabled: boolean): void {
  try {
    localStorage.setItem(`jf_flag_${flag}`, String(enabled))
  } catch (e) {
    // Silently fail if localStorage is not available
  }
}

/**
 * Clear a feature flag override
 */
export function clearFeatureFlag(flag: FeatureFlag): void {
  try {
    localStorage.removeItem(`jf_flag_${flag}`)
  } catch (e) {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get user ID (for debugging and admin purposes)
 *
 * Note: This exposes the user ID, so use carefully.
 */
export async function debugGetUserId(): Promise<string> {
  return await getUserId()
}

/**
 * Calculate which bucket the user falls into (0-99)
 *
 * Useful for debugging and understanding rollout behavior.
 */
export async function debugGetUserBucket(flag: FeatureFlag): Promise<number> {
  const userId = await getUserId()
  return hashString(userId + flag)
}

/**
 * Manual override for testing (not for production use)
 *
 * This is ONLY for testing and should NOT be used in production code.
 * Use user opt-in/opt-out or localStorage overrides instead.
 */
export function __TEST_ONLY_setRolloutPercentage(
  flag: FeatureFlag,
  percentage: number
): void {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Rollout percentage must be between 0 and 100')
  }
  FEATURE_FLAG_CONFIG[flag].rolloutPercentage = percentage
}

/**
 * Reset user ID (for testing only)
 */
export async function __TEST_ONLY_resetUserId(): Promise<void> {
  await chrome.storage.local.remove('userId')
}
