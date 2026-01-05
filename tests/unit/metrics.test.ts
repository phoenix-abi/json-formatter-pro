/**
 * Metrics System Tests
 *
 * Tests the privacy-focused metrics collection system including:
 * - Opt-in enforcement (disabled by default)
 * - Local storage only (no automatic transmission)
 * - Metrics collection and retrieval
 * - Export and clear functionality
 * - Error sanitization
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
  isMetricsEnabled,
  getMetricsSettings,
  setMetricsSettings,
  logParserMetric,
  getMetrics,
  getMetricsSummary,
  exportMetrics,
  clearMetrics,
  sanitizeErrorMessage,
  buildTelemetryPayload,
  submitTelemetry,
  shouldSubmitTelemetry,
  __TEST_ONLY__,
} from '../../src/lib/metrics'

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
    // Add runtime mock for manifest fetching
  },
  runtime: {
    getURL: (path: string) => `chrome-extension://mock-id/${path}`,
  },
} as any

// Mock fetch for manifest.json
global.fetch = vi.fn((url: string) => {
  if (url.includes('manifest.json')) {
    return Promise.resolve({
      json: () => Promise.resolve({ version: '1.0.0' }),
    } as Response)
  }
  return Promise.reject(new Error('Not found'))
})

describe('Metrics System', () => {
  beforeEach(async () => {
    // Reset storage before each test
    ;(global as any).__mockStorage = {}
  })

  describe('Opt-In Enforcement', () => {
    test('metrics collection is disabled by default', async () => {
      const enabled = await isMetricsEnabled()
      expect(enabled).toBe(false)
    })

    test('metrics collection respects opt-in setting', async () => {
      await setMetricsSettings({ collectMetrics: true })
      const enabled = await isMetricsEnabled()
      expect(enabled).toBe(true)
    })

    test('logParserMetric does nothing when metrics disabled', async () => {
      // Ensure metrics disabled
      await setMetricsSettings({ collectMetrics: false })

      // Log a metric
      await logParserMetric({
        parser: 'native',
        selectionReason: 'user-preference',
        fileSizeBytes: 1024,
        parseTimeMs: 10.5,
        success: true,
        featureFlags: {
          customParserEnabled: false,
          preactRendererEnabled: true,
        },
      })

      // Check that no metrics were stored
      const metrics = await getMetrics()
      expect(metrics).toEqual([])
    })

    test('logParserMetric stores data when metrics enabled', async () => {
      // Enable metrics
      await setMetricsSettings({ collectMetrics: true })

      // Log a metric
      await logParserMetric({
        parser: 'native',
        selectionReason: 'user-preference',
        fileSizeBytes: 1024,
        parseTimeMs: 10.5,
        success: true,
        featureFlags: {
          customParserEnabled: false,
          preactRendererEnabled: true,
        },
      })

      // Check that metric was stored
      const metrics = await getMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].parser).toBe('native')
      expect(metrics[0].fileSizeBytes).toBe(1024)
    })
  })

  describe('Metrics Settings', () => {
    test('default settings have collectMetrics: false', async () => {
      const settings = await getMetricsSettings()
      expect(settings.collectMetrics).toBe(false)
      expect(settings.maxMetricsCount).toBe(1000)
    })

    test('can update metrics settings', async () => {
      await setMetricsSettings({ collectMetrics: true, maxMetricsCount: 500 })
      const settings = await getMetricsSettings()
      expect(settings.collectMetrics).toBe(true)
      expect(settings.maxMetricsCount).toBe(500)
    })

    test('partial settings update preserves other fields', async () => {
      await setMetricsSettings({ collectMetrics: true, maxMetricsCount: 200 })
      await setMetricsSettings({ collectMetrics: false })
      const settings = await getMetricsSettings()
      expect(settings.collectMetrics).toBe(false)
      expect(settings.maxMetricsCount).toBe(200) // Preserved
    })
  })

  describe('Metrics Collection', () => {
    beforeEach(async () => {
      // Enable metrics for these tests
      await setMetricsSettings({ collectMetrics: true })
    })

    test('stores complete metric with timestamp and environment', async () => {
      await logParserMetric({
        parser: 'custom',
        selectionReason: 'user-preference',
        fileSizeBytes: 2048,
        parseTimeMs: 25.5,
        success: true,
        featureFlags: {
          customParserEnabled: true,
          preactRendererEnabled: true,
        },
      })

      const metrics = await getMetrics()
      expect(metrics.length).toBe(1)

      const metric = metrics[0]
      expect(metric.timestamp).toBeDefined()
      expect(metric.parser).toBe('custom')
      expect(metric.selectionReason).toBe('user-preference')
      expect(metric.fileSizeBytes).toBe(2048)
      expect(metric.parseTimeMs).toBe(25.5)
      expect(metric.success).toBe(true)
      expect(metric.featureFlags.customParserEnabled).toBe(true) // ExactJSON is always enabled now
      expect(metric.environment).toBeDefined()
      expect(metric.environment.browser).toBeDefined()
      expect(metric.environment.extensionVersion).toBeDefined()
    })

    test('stores error information when parse fails', async () => {
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 512,
        parseTimeMs: 5.0,
        success: false,
        error: {
          type: 'SyntaxError',
          message: 'Unexpected token',
        },
        featureFlags: {
          customParserEnabled: false,
          preactRendererEnabled: true,
        },
      })

      const metrics = await getMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].success).toBe(false)
      expect(metrics[0].error).toBeDefined()
      expect(metrics[0].error!.type).toBe('SyntaxError')
      expect(metrics[0].error!.message).toBe('Unexpected token')
    })

    test('enforces maxMetricsCount limit', async () => {
      // Set low limit
      await setMetricsSettings({ collectMetrics: true, maxMetricsCount: 3 })

      // Log 5 metrics
      for (let i = 0; i < 5; i++) {
        await logParserMetric({
          parser: 'native',
          selectionReason: 'default',
          fileSizeBytes: i * 100,
          parseTimeMs: i * 10,
          success: true,
          featureFlags: {
            customParserEnabled: false,
            preactRendererEnabled: true,
          },
        })
      }

      // Should only keep last 3
      const metrics = await getMetrics()
      expect(metrics.length).toBe(3)
      expect(metrics[0].fileSizeBytes).toBe(200) // Oldest kept is index 2
      expect(metrics[2].fileSizeBytes).toBe(400) // Newest is index 4
    })
  })

  describe('Metrics Summary', () => {
    beforeEach(async () => {
      await setMetricsSettings({ collectMetrics: true })
    })

    test('returns empty summary when no metrics', async () => {
      const summary = await getMetricsSummary()
      expect(summary.totalParses).toBe(0)
      expect(summary.successRate).toBe(0)
      expect(summary.avgParseTimeMs).toBe(0)
      expect(summary.parserUsage.native).toBe(0)
      expect(summary.parserUsage.custom).toBe(0)
      expect(summary.errors).toEqual([])
    })

    test('calculates correct statistics', async () => {
      // Log 4 successful parses (3 native, 1 custom)
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1000,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 2000,
        parseTimeMs: 20,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 3000,
        parseTimeMs: 30,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })
      await logParserMetric({
        parser: 'custom',
        selectionReason: 'user-preference',
        fileSizeBytes: 4000,
        parseTimeMs: 40,
        success: true,
        featureFlags: { customParserEnabled: true, preactRendererEnabled: true },
      })

      // Log 1 failed parse
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 500,
        parseTimeMs: 5,
        success: false,
        error: { type: 'SyntaxError', message: 'Invalid JSON' },
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const summary = await getMetricsSummary()

      expect(summary.totalParses).toBe(5)
      expect(summary.successRate).toBe(80) // 4/5 = 80%
      expect(summary.avgParseTimeMs).toBe(21) // (10+20+30+40+5)/5 = 21
      expect(summary.parserUsage.native).toBe(4)
      expect(summary.parserUsage.custom).toBe(1)
      expect(summary.errors.length).toBe(1)
      expect(summary.errors[0].type).toBe('SyntaxError')
      expect(summary.errors[0].count).toBe(1)
    })

    test('groups errors by type', async () => {
      await setMetricsSettings({ collectMetrics: true })

      // Log multiple errors of different types
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 100,
        parseTimeMs: 1,
        success: false,
        error: { type: 'SyntaxError', message: 'Error 1' },
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 100,
        parseTimeMs: 1,
        success: false,
        error: { type: 'SyntaxError', message: 'Error 2' },
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 100,
        parseTimeMs: 1,
        success: false,
        error: { type: 'RangeError', message: 'Error 3' },
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const summary = await getMetricsSummary()

      expect(summary.errors.length).toBe(2)
      // Should be sorted by count descending
      expect(summary.errors[0].type).toBe('SyntaxError')
      expect(summary.errors[0].count).toBe(2)
      expect(summary.errors[1].type).toBe('RangeError')
      expect(summary.errors[1].count).toBe(1)
    })
  })

  describe('Export and Clear', () => {
    beforeEach(async () => {
      await setMetricsSettings({ collectMetrics: true })
    })

    test('export includes summary and metrics', async () => {
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const exported = await exportMetrics()
      const data = JSON.parse(exported)

      expect(data.exportDate).toBeDefined()
      expect(data.summary).toBeDefined()
      expect(data.summary.totalParses).toBe(1)
      expect(data.metrics).toBeDefined()
      expect(data.metrics.length).toBe(1)
    })

    test('clear removes all metrics', async () => {
      // Log some metrics
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      let metrics = await getMetrics()
      expect(metrics.length).toBe(1)

      // Clear
      await clearMetrics()

      metrics = await getMetrics()
      expect(metrics.length).toBe(0)
    })
  })

  describe('Error Sanitization', () => {
    test('removes URLs from error messages', () => {
      const message = 'Failed to fetch https://example.com/api/data'
      const sanitized = sanitizeErrorMessage(message)
      expect(sanitized).toBe('Failed to fetch [URL]')
    })

    test('removes file paths from error messages', () => {
      const message = 'Error in C:\\Users\\John\\Documents\\file.json'
      const sanitized = sanitizeErrorMessage(message)
      expect(sanitized).toContain('[PATH]')
    })

    test('removes long quoted strings', () => {
      const longString = 'x'.repeat(100)
      const message = `Parse error: "${longString}"`
      const sanitized = sanitizeErrorMessage(message)
      expect(sanitized).toBe('Parse error: "[LONG_STRING]"')
    })

    test('preserves short error messages', () => {
      const message = 'Unexpected token at position 42'
      const sanitized = sanitizeErrorMessage(message)
      expect(sanitized).toBe(message)
    })
  })

  describe('Privacy Compliance', () => {
    test('does not store URLs or hostnames', async () => {
      await setMetricsSettings({ collectMetrics: true })

      await logParserMetric({
        parser: 'native',
        selectionReason: 'user-preference',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const metrics = await getMetrics()
      const metricString = JSON.stringify(metrics)

      // Should not contain any URL-like patterns
      expect(metricString).not.toMatch(/https?:\/\//)
      expect(metricString).not.toMatch(/example\.com/)
    })

    test('metrics can be safely exported', async () => {
      await setMetricsSettings({ collectMetrics: true })

      await logParserMetric({
        parser: 'custom',
        selectionReason: 'user-preference',
        fileSizeBytes: 2048,
        parseTimeMs: 25,
        success: true,
        featureFlags: { customParserEnabled: true, preactRendererEnabled: true },
      })

      const exported = await exportMetrics()

      // Should be valid JSON
      expect(() => JSON.parse(exported)).not.toThrow()

      // Should contain only safe data
      const data = JSON.parse(exported)
      expect(data.metrics[0]).toHaveProperty('parser')
      expect(data.metrics[0]).toHaveProperty('parseTimeMs')
      expect(data.metrics[0]).toHaveProperty('fileSizeBytes')
      expect(data.metrics[0]).not.toHaveProperty('url')
      expect(data.metrics[0]).not.toHaveProperty('hostname')
      expect(data.metrics[0]).not.toHaveProperty('content')
    })
  })

  describe('Automatic Telemetry', () => {
    beforeEach(async () => {
      await setMetricsSettings({ collectMetrics: true })
    })

    test('automatic telemetry is disabled by default', async () => {
      const settings = await getMetricsSettings()
      expect(settings.enableAutomaticTelemetry).toBe(false)
    })

    test('can enable automatic telemetry', async () => {
      await setMetricsSettings({ enableAutomaticTelemetry: true })
      const settings = await getMetricsSettings()
      expect(settings.enableAutomaticTelemetry).toBe(true)
    })

    test('buildTelemetryPayload includes required fields', async () => {
      // Log some metrics first
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const payload = await buildTelemetryPayload()

      expect(payload.product).toBe('JSON Formatter Pro')
      expect(payload.version).toBeDefined()
      expect(payload.summary).toBeDefined()
      expect(payload.systemInfo).toBeDefined()
      expect(payload.systemInfo.browser).toBeDefined()
      expect(payload.systemInfo.platform).toBeDefined()
      expect(payload.systemInfo.language).toBeDefined()
      expect(payload.systemInfo.timezone).toBeDefined()
      expect(payload.submissionDate).toBeDefined()
      expect(payload.metricsCount).toBe(1)
    })

    test('shouldSubmitTelemetry returns false when disabled', async () => {
      await setMetricsSettings({ enableAutomaticTelemetry: false })
      const should = await shouldSubmitTelemetry()
      expect(should).toBe(false)
    })

    test('shouldSubmitTelemetry returns false when no metrics', async () => {
      await setMetricsSettings({ enableAutomaticTelemetry: true })
      await clearMetrics()
      const should = await shouldSubmitTelemetry()
      expect(should).toBe(false)
    })

    test('shouldSubmitTelemetry returns true when never submitted before', async () => {
      await setMetricsSettings({ enableAutomaticTelemetry: true })

      // Add some metrics
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const should = await shouldSubmitTelemetry()
      expect(should).toBe(true)
    })

    test('shouldSubmitTelemetry returns false when submitted recently', async () => {
      // Set last submission to 3 days ago
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      await setMetricsSettings({
        enableAutomaticTelemetry: true,
        lastTelemetrySubmission: threeDaysAgo.toISOString(),
      })

      // Add some metrics
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const should = await shouldSubmitTelemetry()
      expect(should).toBe(false) // Not yet 7 days
    })

    test('shouldSubmitTelemetry returns true when 7+ days since last submission', async () => {
      // Set last submission to 8 days ago
      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

      await setMetricsSettings({
        enableAutomaticTelemetry: true,
        lastTelemetrySubmission: eightDaysAgo.toISOString(),
      })

      // Add some metrics
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const should = await shouldSubmitTelemetry()
      expect(should).toBe(true)
    })

    test('submitTelemetry returns false when disabled', async () => {
      await setMetricsSettings({ enableAutomaticTelemetry: false })
      const success = await submitTelemetry()
      expect(success).toBe(false)
    })

    test('submitTelemetry returns false when no metrics', async () => {
      await setMetricsSettings({ enableAutomaticTelemetry: true })
      await clearMetrics()
      const success = await submitTelemetry()
      expect(success).toBe(false)
    })

    test('submitTelemetry updates lastTelemetrySubmission on success', async () => {
      // Mock successful fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response)
      )

      await setMetricsSettings({ enableAutomaticTelemetry: true })

      // Add some metrics
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const beforeSettings = await getMetricsSettings()
      expect(beforeSettings.lastTelemetrySubmission).toBeUndefined()

      const success = await submitTelemetry()
      expect(success).toBe(true)

      const afterSettings = await getMetricsSettings()
      expect(afterSettings.lastTelemetrySubmission).toBeDefined()
    })

    test('submitTelemetry handles network errors gracefully', async () => {
      // Mock failed fetch
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      await setMetricsSettings({ enableAutomaticTelemetry: true })

      // Add some metrics
      await logParserMetric({
        parser: 'native',
        selectionReason: 'default',
        fileSizeBytes: 1024,
        parseTimeMs: 10,
        success: true,
        featureFlags: { customParserEnabled: false, preactRendererEnabled: true },
      })

      const success = await submitTelemetry()
      expect(success).toBe(false)
    })
  })
})
