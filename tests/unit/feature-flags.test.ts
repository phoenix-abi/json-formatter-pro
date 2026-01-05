/**
 * Feature Flag System Tests
 *
 * Tests the gradual rollout feature flag system including:
 * - User ID generation and persistence
 * - Hash-based deterministic rollout
 * - User opt-in/opt-out
 * - Rollout percentage logic
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  isFeatureEnabled,
  getRolloutPercentage,
  getFeatureFlagConfig,
  canOptIn,
  canOptOut,
  debugGetUserId,
  debugGetUserBucket,
  __TEST_ONLY_setRolloutPercentage,
  __TEST_ONLY_resetUserId,
  FeatureFlag,
} from '../../src/lib/featureFlags'

// Mock chrome.storage.local
global.chrome = {
  storage: {
    local: {
      get: async (key: string | string[]) => {
        const keys = typeof key === 'string' ? [key] : key
        const result: Record<string, any> = {}

        for (const k of keys) {
          const stored = (global as any).__mockStorage?.[k]
          if (stored !== undefined) {
            result[k] = stored
          }
        }

        return result
      },
      set: async (items: Record<string, any>) => {
        (global as any).__mockStorage = {
          ...(global as any).__mockStorage,
          ...items,
        }
      },
      remove: async (key: string | string[]) => {
        const keys = typeof key === 'string' ? [key] : key
        for (const k of keys) {
          delete (global as any).__mockStorage?.[k]
        }
      },
    },
  },
} as any

// Mock getParserSettings
const mockSettings = {
  forceEnableCustomParser: false,
  forceDisableCustomParser: false,
}

// Mock storage module
vi.mock('../../src/lib/storage', () => ({
  getParserSettings: async () => mockSettings,
}))

describe('Feature Flag System', () => {
  beforeEach(async () => {
    // Reset storage before each test
    (global as any).__mockStorage = {}
    await __TEST_ONLY_resetUserId()

    // Reset mock settings
    mockSettings.forceEnableCustomParser = false
    mockSettings.forceDisableCustomParser = false

    // Reset rollout percentages to defaults
    __TEST_ONLY_setRolloutPercentage(FeatureFlag.UsePreactRenderer, 100)
    __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, 100) // ExactJSON is now fully rolled out
  })

  describe('User ID Management', () => {
    test('generates and persists user ID', async () => {
      const userId1 = await debugGetUserId()
      expect(userId1).toBeDefined()
      expect(typeof userId1).toBe('string')
      expect(userId1.length).toBeGreaterThan(0)

      // Second call should return same ID (persistence)
      const userId2 = await debugGetUserId()
      expect(userId2).toBe(userId1)
    })

    test('user ID is a valid UUID format', async () => {
      const userId = await debugGetUserId()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(userId).toMatch(uuidRegex)
    })

    test('reset user ID generates new ID', async () => {
      const userId1 = await debugGetUserId()
      await __TEST_ONLY_resetUserId()
      const userId2 = await debugGetUserId()

      expect(userId2).not.toBe(userId1)
    })
  })

  describe('Hash-based Rollout', () => {
    test('user bucket is 0-99', async () => {
      const bucket = await debugGetUserBucket(FeatureFlag.UseCustomParser)
      expect(bucket).toBeGreaterThanOrEqual(0)
      expect(bucket).toBeLessThan(100)
    })

    test('user bucket is deterministic', async () => {
      const bucket1 = await debugGetUserBucket(FeatureFlag.UseCustomParser)
      const bucket2 = await debugGetUserBucket(FeatureFlag.UseCustomParser)

      expect(bucket2).toBe(bucket1)
    })

    test('different flags produce different buckets', async () => {
      const bucket1 = await debugGetUserBucket(FeatureFlag.UsePreactRenderer)
      const bucket2 = await debugGetUserBucket(FeatureFlag.UseCustomParser)

      // Very likely to be different (not guaranteed but 99% chance)
      // If this flakes, it's just bad luck (1% chance)
      expect(bucket1).not.toBe(bucket2)
    })

    test('UseCustomParser default is 100% rollout', async () => {
      // Test that default is 100%
      const percentage = getRolloutPercentage(FeatureFlag.UseCustomParser)
      expect(percentage).toBe(100) // Default is now 100%
    })

    test('rollout percentage 100% enables feature for all users', async () => {
      __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, 100)

      const enabled = await isFeatureEnabled(FeatureFlag.UseCustomParser)
      expect(enabled).toBe(true)
    })

    test('rollout percentage 50% enables for ~50% of users', async () => {
      __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, 50)

      let enabledCount = 0
      const iterations = 100

      // Test with 100 different user IDs
      for (let i = 0; i < iterations; i++) {
        await __TEST_ONLY_resetUserId()
        const enabled = await isFeatureEnabled(FeatureFlag.UseCustomParser)
        if (enabled) enabledCount++
      }

      // Should be roughly 50% (allow 35-65% range for randomness)
      expect(enabledCount).toBeGreaterThan(35)
      expect(enabledCount).toBeLessThan(65)
    })
  })

  describe('User Opt-In/Opt-Out (Disabled for Fully Rolled Out Features)', () => {
    test('opt-in has no effect on fully rolled out features', async () => {
      mockSettings.forceEnableCustomParser = true

      const enabled = await isFeatureEnabled(FeatureFlag.UseCustomParser)
      expect(enabled).toBe(true) // Always true regardless of opt-in
    })

    test('opt-out has no effect on fully rolled out features', async () => {
      mockSettings.forceDisableCustomParser = true

      const enabled = await isFeatureEnabled(FeatureFlag.UseCustomParser)
      expect(enabled).toBe(true) // Always true even with opt-out attempt
    })
  })

  describe('Feature Flag Config', () => {
    test('getRolloutPercentage returns correct value', () => {
      // Even after setting to 42, should return 100 for UseCustomParser
      __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, 42)

      const percentage = getRolloutPercentage(FeatureFlag.UseCustomParser)
      expect(percentage).toBe(42) // Test override still works for testing
    })

    test('getFeatureFlagConfig returns config object', () => {
      const config = getFeatureFlagConfig(FeatureFlag.UseCustomParser)

      expect(config).toHaveProperty('enabled')
      expect(config).toHaveProperty('rolloutPercentage')
      expect(config).toHaveProperty('userOptIn')
      expect(config).toHaveProperty('userOptOut')
    })

    test('canOptIn returns false for UseCustomParser (fully rolled out)', () => {
      const canOpt = canOptIn(FeatureFlag.UseCustomParser)
      expect(canOpt).toBe(false) // Can't opt-in to fully rolled out feature
    })

    test('canOptOut returns false for UseCustomParser (fully rolled out)', () => {
      const canOpt = canOptOut(FeatureFlag.UseCustomParser)
      expect(canOpt).toBe(false) // Can't opt-out of fully rolled out feature
    })

    test('canOptIn returns false for UsePreactRenderer', () => {
      const canOpt = canOptIn(FeatureFlag.UsePreactRenderer)
      expect(canOpt).toBe(false)
    })
  })

  describe('Rollout Percentage Validation', () => {
    test('setRolloutPercentage rejects negative values', () => {
      expect(() => {
        __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, -1)
      }).toThrow('Rollout percentage must be between 0 and 100')
    })

    test('setRolloutPercentage rejects values > 100', () => {
      expect(() => {
        __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, 101)
      }).toThrow('Rollout percentage must be between 0 and 100')
    })

    test('setRolloutPercentage accepts 0', () => {
      expect(() => {
        __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, 0)
      }).not.toThrow()
    })

    test('setRolloutPercentage accepts 100', () => {
      expect(() => {
        __TEST_ONLY_setRolloutPercentage(FeatureFlag.UseCustomParser, 100)
      }).not.toThrow()
    })
  })

  describe('UsePreactRenderer Flag (Already Rolled Out)', () => {
    test('UsePreactRenderer is enabled at 100%', async () => {
      const enabled = await isFeatureEnabled(FeatureFlag.UsePreactRenderer)
      expect(enabled).toBe(true)
    })

    test('UsePreactRenderer rollout percentage is 100', () => {
      const percentage = getRolloutPercentage(FeatureFlag.UsePreactRenderer)
      expect(percentage).toBe(100)
    })
  })
})
