import { describe, it, expect } from 'vitest'
import {
  matchesURLPattern,
  selectParser,
  getReasonDescription,
  getParserDisplayName,
  getParserDescription,
  getParserFeatures,
  isValidURLPattern,
  setSessionOverride,
  getSessionOverride,
  clearSessionOverride,
  clearAllSessionOverrides,
  DEFAULT_PARSER_SETTINGS,
  type ParserSettings,
  type ParserURLOverride,
} from '../../src/lib/parser-selection'

describe('URL Pattern Matching', () => {
  describe('matchesURLPattern', () => {
    it('should match exact URLs', () => {
      expect(matchesURLPattern('https://api.example.com/data', 'https://api.example.com/data')).toBe(true)
      expect(matchesURLPattern('https://api.example.com/other', 'https://api.example.com/data')).toBe(false)
    })

    it('should match wildcards at the end', () => {
      expect(matchesURLPattern('https://api.example.com/v1/users', 'https://api.example.com/*')).toBe(true)
      expect(matchesURLPattern('https://api.example.com/', 'https://api.example.com/*')).toBe(true)
      expect(matchesURLPattern('https://api.other.com/v1', 'https://api.example.com/*')).toBe(false)
    })

    it('should match subdomain wildcards', () => {
      expect(matchesURLPattern('https://api.example.com/data', '*.example.com*')).toBe(true)
      expect(matchesURLPattern('https://www.example.com/page', '*.example.com*')).toBe(true)
      expect(matchesURLPattern('https://example.com/page', '*.example.com*')).toBe(false)
    })

    it('should match path wildcards', () => {
      expect(matchesURLPattern('https://any.com/api/v1/users', '*/api/v1/*')).toBe(true)
      expect(matchesURLPattern('https://example.com/api/v1/data', '*/api/v1/*')).toBe(true)
      expect(matchesURLPattern('https://example.com/api/v2/data', '*/api/v1/*')).toBe(false)
    })

    it('should be case-insensitive', () => {
      expect(matchesURLPattern('https://API.EXAMPLE.COM/data', 'https://api.example.com/*')).toBe(true)
      expect(matchesURLPattern('https://api.example.com/DATA', 'https://api.example.com/*')).toBe(true)
    })

    it('should handle localhost patterns', () => {
      expect(matchesURLPattern('http://localhost:3000/api', '*localhost:*')).toBe(true)
      expect(matchesURLPattern('http://localhost:8080/data', '*localhost:*')).toBe(true)
      expect(matchesURLPattern('http://127.0.0.1:3000/api', '*localhost:*')).toBe(false)
    })

    it('should escape regex special characters', () => {
      expect(matchesURLPattern('https://api.example.com/data.json', 'https://api.example.com/data.json')).toBe(true)
      expect(matchesURLPattern('https://api.example.com/data?id=1', 'https://api.example.com/data?id=1')).toBe(true)
    })
  })

  describe('isValidURLPattern', () => {
    it('should accept valid patterns', () => {
      expect(isValidURLPattern('api.example.com/*')).toBe(true)
      expect(isValidURLPattern('*.example.com')).toBe(true)
      expect(isValidURLPattern('localhost:*')).toBe(true)
      expect(isValidURLPattern('https://api.example.com/v1/*')).toBe(true)
    })

    it('should reject empty or whitespace patterns', () => {
      expect(isValidURLPattern('')).toBe(false)
      expect(isValidURLPattern('   ')).toBe(false)
    })

    it('should reject patterns with only wildcards', () => {
      expect(isValidURLPattern('*')).toBe(false)
      expect(isValidURLPattern('***')).toBe(false)
    })

    it('should reject patterns with invalid characters', () => {
      expect(isValidURLPattern('api.example.com/<script>')).toBe(false)
      expect(isValidURLPattern('api.example.com/[test]')).toBe(false)
    })
  })
})

describe('Parser Selection Logic', () => {
  const baseSettings: ParserSettings = {
    ...DEFAULT_PARSER_SETTINGS,
    defaultParser: 'native',
  }

  describe('selectParser', () => {
    it('should use default parser when no overrides', () => {
      const result = selectParser('https://example.com/data.json', baseSettings)
      expect(result.parser).toBe('native')
      expect(result.reason.type).toBe('default')
    })

    it('should respect custom default parser', () => {
      const settings: ParserSettings = {
        ...baseSettings,
        defaultParser: 'custom',
      }
      const result = selectParser('https://example.com/data.json', settings)
      expect(result.parser).toBe('custom')
      expect(result.reason.type).toBe('default')
    })

    it('should use URL override when pattern matches', () => {
      const override: ParserURLOverride = {
        pattern: '*api.example.com/*',
        parser: 'custom',
        enabled: true,
      }
      const settings: ParserSettings = {
        ...baseSettings,
        urlOverrides: [override],
      }
      const result = selectParser('https://api.example.com/v1/data', settings)
      expect(result.parser).toBe('custom')
      expect(result.reason.type).toBe('url-override')
      if (result.reason.type === 'url-override') {
        expect(result.reason.pattern).toBe('*api.example.com/*')
      }
    })

    it('should skip disabled URL overrides', () => {
      const override: ParserURLOverride = {
        pattern: '*api.example.com/*',
        parser: 'custom',
        enabled: false,
      }
      const settings: ParserSettings = {
        ...baseSettings,
        urlOverrides: [override],
      }
      const result = selectParser('https://api.example.com/v1/data', settings)
      expect(result.parser).toBe('native')
      expect(result.reason.type).toBe('default')
    })

    it('should use most specific URL override', () => {
      const overrides: ParserURLOverride[] = [
        { pattern: '*.example.com*', parser: 'native', enabled: true },
        { pattern: '*api.example.com/*', parser: 'custom', enabled: true },
      ]
      const settings: ParserSettings = {
        ...baseSettings,
        urlOverrides: overrides,
      }
      const result = selectParser('https://api.example.com/v1/data', settings)
      expect(result.parser).toBe('custom')
      expect(result.reason.type).toBe('url-override')
      if (result.reason.type === 'url-override') {
        expect(result.reason.pattern).toBe('*api.example.com/*')
      }
    })

    it('should use session override over URL override', () => {
      const override: ParserURLOverride = {
        pattern: '*api.example.com/*',
        parser: 'custom',
        enabled: true,
      }
      const settings: ParserSettings = {
        ...baseSettings,
        urlOverrides: [override],
      }
      const result = selectParser(
        'https://api.example.com/v1/data',
        settings,
        'native' // session override
      )
      expect(result.parser).toBe('native')
      expect(result.reason.type).toBe('manual-session')
    })

    it('should use auto-size limit over session override', () => {
      const result = selectParser(
        'https://example.com/data.json',
        { ...baseSettings, autoSwitchThreshold: 10 },
        'custom', // session wants custom
        15 // but file is 15MB
      )
      expect(result.parser).toBe('native')
      expect(result.reason.type).toBe('auto-size-limit')
      if (result.reason.type === 'auto-size-limit') {
        expect(result.reason.thresholdMB).toBe(10)
      }
    })

    it('should not auto-switch if file is below threshold', () => {
      const result = selectParser(
        'https://example.com/data.json',
        { ...baseSettings, autoSwitchThreshold: 10 },
        undefined,
        5 // file is 5MB, below 10MB threshold
      )
      expect(result.parser).toBe('native')
      expect(result.reason.type).toBe('default')
    })

    it('should not auto-switch if threshold is 0', () => {
      const result = selectParser(
        'https://example.com/data.json',
        { ...baseSettings, autoSwitchThreshold: 0 },
        undefined,
        100 // file is 100MB but auto-switch disabled
      )
      expect(result.parser).toBe('native')
      expect(result.reason.type).toBe('default')
    })

    it('should use feature flag as highest priority', () => {
      const settings: ParserSettings = {
        ...baseSettings,
        defaultParser: 'custom',
        enableCustomParser: false,
        urlOverrides: [
          { pattern: 'api.example.com/*', parser: 'custom', enabled: true },
        ],
      }
      const result = selectParser(
        'https://api.example.com/v1/data',
        settings,
        'custom', // even with session override
        undefined
      )
      expect(result.parser).toBe('native')
      expect(result.reason.type).toBe('feature-disabled')
    })
  })
})

describe('Session Overrides', () => {
  const url = 'https://example.com/data.json'

  it('should set and get session override', () => {
    setSessionOverride(url, 'custom')
    expect(getSessionOverride(url)).toBe('custom')
  })

  it('should return undefined for non-existent session override', () => {
    expect(getSessionOverride('https://nonexistent.com/data')).toBeUndefined()
  })

  it('should clear specific session override', () => {
    setSessionOverride(url, 'custom')
    clearSessionOverride(url)
    expect(getSessionOverride(url)).toBeUndefined()
  })

  it('should clear all session overrides', () => {
    setSessionOverride('https://example1.com/data', 'custom')
    setSessionOverride('https://example2.com/data', 'native')
    clearAllSessionOverrides()
    expect(getSessionOverride('https://example1.com/data')).toBeUndefined()
    expect(getSessionOverride('https://example2.com/data')).toBeUndefined()
  })
})

describe('Helper Functions', () => {
  describe('getParserDisplayName', () => {
    it('should return display names', () => {
      expect(getParserDisplayName('native')).toBe('Native Parser')
      expect(getParserDisplayName('custom')).toBe('ExactJSON')
    })
  })

  describe('getParserDescription', () => {
    it('should return descriptions', () => {
      expect(getParserDescription('native')).toBe('Fast, uses built-in JSON.parse()')
      expect(getParserDescription('custom')).toBe('Exact parsing with lossless numbers and key order')
    })
  })

  describe('getParserFeatures', () => {
    it('should return feature lists', () => {
      const nativeFeatures = getParserFeatures('native')
      expect(nativeFeatures).toContain('Fast parsing')
      expect(nativeFeatures.length).toBeGreaterThan(0)

      const customFeatures = getParserFeatures('custom')
      expect(customFeatures).toContain('Preserves large number precision')
      expect(customFeatures.length).toBeGreaterThan(0)
    })
  })

  describe('getReasonDescription', () => {
    it('should describe default reason', () => {
      const desc = getReasonDescription({ type: 'default', parser: 'native' })
      expect(desc).toBe('Default setting')
    })

    it('should describe URL override reason', () => {
      const desc = getReasonDescription({
        type: 'url-override',
        pattern: 'api.example.com/*',
        parser: 'custom',
      })
      expect(desc).toContain('URL override')
      expect(desc).toContain('api.example.com/*')
    })

    it('should describe manual session reason', () => {
      const desc = getReasonDescription({ type: 'manual-session', parser: 'custom' })
      expect(desc).toContain('Manually selected')
    })

    it('should describe auto-size limit reason', () => {
      const desc = getReasonDescription({
        type: 'auto-size-limit',
        thresholdMB: 10,
        parser: 'native',
      })
      expect(desc).toContain('File too large')
      expect(desc).toContain('10')
    })

    it('should describe feature disabled reason', () => {
      const desc = getReasonDescription({ type: 'feature-disabled', parser: 'native' })
      expect(desc).toContain('ExactJSON disabled')
    })
  })
})

describe('DEFAULT_PARSER_SETTINGS', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_PARSER_SETTINGS.defaultParser).toBe('custom')
    expect(DEFAULT_PARSER_SETTINGS.urlOverrides).toEqual([])
    expect(DEFAULT_PARSER_SETTINGS.showToolbarToggle).toBe(true)
    expect(DEFAULT_PARSER_SETTINGS.showPerformanceMetrics).toBe(false)
    expect(DEFAULT_PARSER_SETTINGS.autoSwitchThreshold).toBe(10)
    expect(DEFAULT_PARSER_SETTINGS.enableCustomParser).toBe(true)
  })
})
