// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getParserSettings,
  setParserSettings,
  getParserURLOverrides,
  addParserURLOverride,
  updateParserURLOverride,
  removeParserURLOverride,
  onParserSettingsChanged,
} from '../../src/lib/storage'
import { DEFAULT_PARSER_SETTINGS, type ParserSettings } from '../../src/lib/parser-selection'

// Mock chrome.storage API
const mockStorage: Record<string, any> = {}

const mockChromeStorage = {
  local: {
    get: vi.fn((key: string, callback: (result: Record<string, any>) => void) => {
      callback({ [key]: mockStorage[key] })
    }),
    set: vi.fn((data: Record<string, any>, callback?: () => void) => {
      Object.assign(mockStorage, data)
      callback?.()
    }),
  },
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}

// @ts-ignore - mock chrome global
global.chrome = {
  storage: mockChromeStorage,
}

describe('Parser Settings Storage', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
    vi.clearAllMocks()
  })

  describe('getParserSettings', () => {
    it('should return default settings when nothing is stored', async () => {
      const settings = await getParserSettings()
      expect(settings).toEqual(DEFAULT_PARSER_SETTINGS)
    })

    it('should return stored settings', async () => {
      const stored: ParserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        defaultParser: 'custom',
        showPerformanceMetrics: true,
      }
      mockStorage.parserSettings = stored

      const settings = await getParserSettings()
      expect(settings.defaultParser).toBe('custom')
      expect(settings.showPerformanceMetrics).toBe(true)
    })
  })

  describe('setParserSettings', () => {
    it('should update settings with partial update', async () => {
      // First set some initial settings
      await setParserSettings({ defaultParser: 'custom' })

      // Then update a different field
      await setParserSettings({ showPerformanceMetrics: true })

      // Both updates should be persisted
      const settings = await getParserSettings()
      expect(settings.defaultParser).toBe('custom')
      expect(settings.showPerformanceMetrics).toBe(true)
    })

    it('should merge with existing settings', async () => {
      const initial: ParserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        defaultParser: 'custom',
        autoSwitchThreshold: 20,
      }
      mockStorage.parserSettings = initial

      await setParserSettings({ showToolbarToggle: false })

      const settings = await getParserSettings()
      expect(settings.defaultParser).toBe('custom')
      expect(settings.autoSwitchThreshold).toBe(20)
      expect(settings.showToolbarToggle).toBe(false)
    })
  })

  describe('getParserURLOverrides', () => {
    it('should return empty array when no overrides', async () => {
      const overrides = await getParserURLOverrides()
      expect(overrides).toEqual([])
    })

    it('should return stored URL overrides', async () => {
      const settings: ParserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        urlOverrides: [
          { pattern: 'api.example.com/*', parser: 'custom', enabled: true },
          { pattern: 'localhost:*', parser: 'native', enabled: true },
        ],
      }
      mockStorage.parserSettings = settings

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(2)
      expect(overrides[0].pattern).toBe('api.example.com/*')
      expect(overrides[1].pattern).toBe('localhost:*')
    })
  })

  describe('addParserURLOverride', () => {
    it('should add new URL override', async () => {
      const override = {
        pattern: 'api.example.com/*',
        parser: 'custom' as const,
        enabled: true,
      }

      await addParserURLOverride(override)

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(1)
      expect(overrides[0]).toEqual(override)
    })

    it('should append to existing overrides', async () => {
      const existing = {
        pattern: 'localhost:*',
        parser: 'native' as const,
        enabled: true,
      }
      mockStorage.parserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        urlOverrides: [existing],
      }

      const newOverride = {
        pattern: 'api.example.com/*',
        parser: 'custom' as const,
        enabled: true,
      }
      await addParserURLOverride(newOverride)

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(2)
      expect(overrides[0]).toEqual(existing)
      expect(overrides[1]).toEqual(newOverride)
    })
  })

  describe('updateParserURLOverride', () => {
    it('should update existing override by pattern', async () => {
      const override = {
        pattern: 'api.example.com/*',
        parser: 'custom' as const,
        enabled: true,
      }
      mockStorage.parserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        urlOverrides: [override],
      }

      await updateParserURLOverride('api.example.com/*', {
        parser: 'native',
        enabled: false,
      })

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(1)
      expect(overrides[0].pattern).toBe('api.example.com/*')
      expect(overrides[0].parser).toBe('native')
      expect(overrides[0].enabled).toBe(false)
    })

    it('should not affect other overrides', async () => {
      mockStorage.parserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        urlOverrides: [
          { pattern: 'api.example.com/*', parser: 'custom', enabled: true },
          { pattern: 'localhost:*', parser: 'native', enabled: true },
        ],
      }

      await updateParserURLOverride('api.example.com/*', { enabled: false })

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(2)
      expect(overrides[0].enabled).toBe(false)
      expect(overrides[1].enabled).toBe(true)
    })

    it('should do nothing if pattern not found', async () => {
      const override = {
        pattern: 'api.example.com/*',
        parser: 'custom' as const,
        enabled: true,
      }
      mockStorage.parserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        urlOverrides: [override],
      }

      await updateParserURLOverride('nonexistent.com/*', { enabled: false })

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(1)
      expect(overrides[0]).toEqual(override)
    })
  })

  describe('removeParserURLOverride', () => {
    it('should remove override by pattern', async () => {
      mockStorage.parserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        urlOverrides: [
          { pattern: 'api.example.com/*', parser: 'custom', enabled: true },
          { pattern: 'localhost:*', parser: 'native', enabled: true },
        ],
      }

      await removeParserURLOverride('api.example.com/*')

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(1)
      expect(overrides[0].pattern).toBe('localhost:*')
    })

    it('should do nothing if pattern not found', async () => {
      const override = {
        pattern: 'api.example.com/*',
        parser: 'custom' as const,
        enabled: true,
      }
      mockStorage.parserSettings = {
        ...DEFAULT_PARSER_SETTINGS,
        urlOverrides: [override],
      }

      await removeParserURLOverride('nonexistent.com/*')

      const overrides = await getParserURLOverrides()
      expect(overrides).toHaveLength(1)
      expect(overrides[0]).toEqual(override)
    })

    it('should handle removing from empty list', async () => {
      await removeParserURLOverride('api.example.com/*')

      const overrides = await getParserURLOverrides()
      expect(overrides).toEqual([])
    })
  })

  describe('onParserSettingsChanged', () => {
    it('should register change listener', () => {
      const callback = vi.fn()
      onParserSettingsChanged(callback)

      expect(mockChromeStorage.onChanged.addListener).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = onParserSettingsChanged(callback)

      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
      expect(mockChromeStorage.onChanged.removeListener).toHaveBeenCalledTimes(1)
    })
  })
})
