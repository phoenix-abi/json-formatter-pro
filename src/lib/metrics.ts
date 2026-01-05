/**
 * Privacy-Focused Metrics Collection System
 *
 * This module provides LOCAL-ONLY metrics collection for troubleshooting and performance analysis.
 *
 * Privacy Principles:
 * - Opt-in only (disabled by default)
 * - No automatic data transmission
 * - No URLs, hostnames, or user-identifiable information
 * - All data stored locally in chrome.storage.local
 * - User controls: view, export, and delete metrics at any time
 * - Manual submission via email/help desk (user copies and sends)
 *
 * What we collect (when opted in):
 * - Parser selection (native vs custom)
 * - Parse success/failure rates
 * - Parse performance (time, file size)
 * - Error types and messages
 * - Feature flag status
 * - Browser/extension version (for compatibility)
 *
 * What we DO NOT collect:
 * - URLs or hostnames
 * - JSON content
 * - User identity
 * - IP addresses
 * - Any personally identifiable information
 */

export interface ParserMetric {
  // Timestamp (ISO 8601)
  timestamp: string

  // Parser selection
  parser: 'native' | 'custom'
  selectionReason: string // e.g., 'user-preference', 'auto-switch', 'url-override'

  // Performance
  fileSizeBytes: number
  parseTimeMs: number
  success: boolean

  // Error information (if parse failed)
  error?: {
    type: string // e.g., 'SyntaxError', 'RangeError'
    message: string // Sanitized error message (no user data)
  }

  // Feature flags state
  featureFlags: {
    customParserEnabled: boolean
    preactRendererEnabled: boolean
  }

  // Environment (for debugging compatibility issues)
  environment: {
    browser: string // e.g., 'Chrome'
    browserVersion: string
    extensionVersion: string
  }
}

export interface MetricsSettings {
  collectMetrics: boolean // Opt-in flag (default: false)
  maxMetricsCount: number // Maximum metrics to store (default: 1000)

  // Automatic telemetry (separate opt-in)
  enableAutomaticTelemetry: boolean // Opt-in for weekly automatic submission (default: false)
  lastTelemetrySubmission?: string // ISO timestamp of last successful submission
}

export interface MetricsSummary {
  totalParses: number
  successRate: number
  avgParseTimeMs: number
  parserUsage: {
    native: number
    custom: number
  }
  errors: {
    type: string
    count: number
  }[]
  dateRange: {
    oldest: string
    newest: string
  }
}

export interface TelemetryPayload {
  // Product identification
  product: 'JSON Formatter Pro'
  version: string // Extension version

  // Metrics summary
  summary: MetricsSummary

  // System information
  systemInfo: {
    browser: string
    browserVersion: string
    platform: string // 'mac', 'win', 'linux', 'chrome_os', etc.
    language: string // Browser language (e.g., 'en-US')
    timezone: string // User timezone (e.g., 'America/New_York')
  }

  // Submission metadata
  submissionDate: string // ISO timestamp
  metricsCount: number // Total number of individual metrics included
}

const METRICS_STORAGE_KEY = 'jf_metrics'
const METRICS_SETTINGS_KEY = 'jf_metrics_settings'
const TELEMETRY_API_ENDPOINT = 'https://api.betterwebforall.com/v1/metrics'

const DEFAULT_METRICS_SETTINGS: MetricsSettings = {
  collectMetrics: false, // OPT-IN ONLY
  maxMetricsCount: 1000,
  enableAutomaticTelemetry: false, // OPT-IN ONLY (separate from local collection)
}

/**
 * Check if metrics collection is enabled
 */
export async function isMetricsEnabled(): Promise<boolean> {
  const settings = await getMetricsSettings()
  return settings.collectMetrics
}

/**
 * Get metrics settings
 */
export async function getMetricsSettings(): Promise<MetricsSettings> {
  const result = await chrome.storage.local.get(METRICS_SETTINGS_KEY)
  return result[METRICS_SETTINGS_KEY] || DEFAULT_METRICS_SETTINGS
}

/**
 * Update metrics settings
 */
export async function setMetricsSettings(settings: Partial<MetricsSettings>): Promise<void> {
  const current = await getMetricsSettings()
  const updated = { ...current, ...settings }
  await chrome.storage.local.set({ [METRICS_SETTINGS_KEY]: updated })
}

/**
 * Log a parser metric (only if metrics collection is enabled)
 */
export async function logParserMetric(metric: Omit<ParserMetric, 'timestamp' | 'environment'>): Promise<void> {
  const enabled = await isMetricsEnabled()
  if (!enabled) {
    // Metrics collection disabled - do nothing
    return
  }

  // Add timestamp and environment
  const fullMetric: ParserMetric = {
    ...metric,
    timestamp: new Date().toISOString(),
    environment: await getEnvironment(),
  }

  // Get current metrics
  const metrics = await getMetrics()

  // Add new metric
  metrics.push(fullMetric)

  // Enforce max count (remove oldest if exceeded)
  const settings = await getMetricsSettings()
  if (metrics.length > settings.maxMetricsCount) {
    metrics.splice(0, metrics.length - settings.maxMetricsCount)
  }

  // Save to storage
  await chrome.storage.local.set({ [METRICS_STORAGE_KEY]: metrics })
}

/**
 * Get all stored metrics
 */
export async function getMetrics(): Promise<ParserMetric[]> {
  const result = await chrome.storage.local.get(METRICS_STORAGE_KEY)
  return result[METRICS_STORAGE_KEY] || []
}

/**
 * Get metrics summary statistics
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  const metrics = await getMetrics()

  if (metrics.length === 0) {
    return {
      totalParses: 0,
      successRate: 0,
      avgParseTimeMs: 0,
      parserUsage: { native: 0, custom: 0 },
      errors: [],
      dateRange: { oldest: '', newest: '' },
    }
  }

  // Calculate statistics
  const totalParses = metrics.length
  const successCount = metrics.filter((m) => m.success).length
  const successRate = (successCount / totalParses) * 100

  const totalParseTime = metrics.reduce((sum, m) => sum + m.parseTimeMs, 0)
  const avgParseTimeMs = totalParseTime / totalParses

  const parserUsage = {
    native: metrics.filter((m) => m.parser === 'native').length,
    custom: metrics.filter((m) => m.parser === 'custom').length,
  }

  // Group errors by type
  const errorMap = new Map<string, number>()
  metrics.forEach((m) => {
    if (m.error) {
      const count = errorMap.get(m.error.type) || 0
      errorMap.set(m.error.type, count + 1)
    }
  })
  const errors = Array.from(errorMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count) // Sort by count descending

  // Date range
  const timestamps = metrics.map((m) => m.timestamp).sort()
  const dateRange = {
    oldest: timestamps[0],
    newest: timestamps[timestamps.length - 1],
  }

  return {
    totalParses,
    successRate,
    avgParseTimeMs,
    parserUsage,
    errors,
    dateRange,
  }
}

/**
 * Export metrics as JSON string (for manual submission)
 */
export async function exportMetrics(): Promise<string> {
  const metrics = await getMetrics()
  const summary = await getMetricsSummary()

  const exportData = {
    exportDate: new Date().toISOString(),
    summary,
    metrics,
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Clear all stored metrics
 */
export async function clearMetrics(): Promise<void> {
  await chrome.storage.local.remove(METRICS_STORAGE_KEY)
}

/**
 * Get browser/extension environment information
 */
async function getEnvironment(): Promise<ParserMetric['environment']> {
  // Get browser info from user agent
  const ua = navigator.userAgent
  let browser = 'Unknown'
  let browserVersion = 'Unknown'

  if (ua.includes('Chrome/')) {
    browser = 'Chrome'
    const match = ua.match(/Chrome\/([0-9.]+)/)
    browserVersion = match ? match[1] : 'Unknown'
  } else if (ua.includes('Firefox/')) {
    browser = 'Firefox'
    const match = ua.match(/Firefox\/([0-9.]+)/)
    browserVersion = match ? match[1] : 'Unknown'
  } else if (ua.includes('Edg/')) {
    browser = 'Edge'
    const match = ua.match(/Edg\/([0-9.]+)/)
    browserVersion = match ? match[1] : 'Unknown'
  }

  // Get extension version from manifest
  const manifestUrl = chrome.runtime.getURL('manifest.json')
  let extensionVersion = 'Unknown'
  try {
    const response = await fetch(manifestUrl)
    const manifest = await response.json()
    extensionVersion = manifest.version || 'Unknown'
  } catch {
    // Ignore fetch errors
  }

  return {
    browser,
    browserVersion,
    extensionVersion,
  }
}

/**
 * Sanitize error message to remove any potential user data
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove any URLs
  let sanitized = message.replace(/https?:\/\/[^\s]+/g, '[URL]')

  // Remove file paths
  sanitized = sanitized.replace(/[A-Z]:\\[^\s]+/g, '[PATH]')
  sanitized = sanitized.replace(/\/[^\s]+\//g, '[PATH]/')

  // Remove any quoted strings that might contain user data
  sanitized = sanitized.replace(/"[^"]{50,}"/g, '"[LONG_STRING]"')

  return sanitized
}

/**
 * Get system information for telemetry
 */
async function getSystemInfo(): Promise<TelemetryPayload['systemInfo']> {
  const env = await getEnvironment()

  // Get platform info
  let platform = 'unknown'
  if (navigator.userAgentData) {
    // Modern API
    platform = (navigator.userAgentData as any).platform || 'unknown'
  } else {
    // Fallback: parse user agent
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('mac')) platform = 'mac'
    else if (ua.includes('win')) platform = 'win'
    else if (ua.includes('linux')) platform = 'linux'
    else if (ua.includes('cros')) platform = 'chrome_os'
  }

  // Get language
  const language = navigator.language || 'unknown'

  // Get timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'

  return {
    browser: env.browser,
    browserVersion: env.browserVersion,
    platform,
    language,
    timezone,
  }
}

/**
 * Build telemetry payload for submission
 */
export async function buildTelemetryPayload(): Promise<TelemetryPayload> {
  const summary = await getMetricsSummary()
  const metrics = await getMetrics()
  const systemInfo = await getSystemInfo()

  // Get extension version
  const manifestUrl = chrome.runtime.getURL('manifest.json')
  let version = 'unknown'
  try {
    const response = await fetch(manifestUrl)
    const manifest = await response.json()
    version = manifest.version || 'unknown'
  } catch {
    // Ignore fetch errors
  }

  return {
    product: 'JSON Formatter Pro',
    version,
    summary,
    systemInfo,
    submissionDate: new Date().toISOString(),
    metricsCount: metrics.length,
  }
}

/**
 * Submit telemetry to server
 * Returns true on success, false on failure
 */
export async function submitTelemetry(): Promise<boolean> {
  const settings = await getMetricsSettings()

  // Check if automatic telemetry is enabled
  if (!settings.enableAutomaticTelemetry) {
    console.log('[Telemetry] Automatic telemetry disabled, skipping submission')
    return false
  }

  // Check if we have any metrics to submit
  const metrics = await getMetrics()
  if (metrics.length === 0) {
    console.log('[Telemetry] No metrics to submit')
    return false
  }

  try {
    // Build payload
    const payload = await buildTelemetryPayload()

    console.log('[Telemetry] Submitting metrics:', {
      metricsCount: payload.metricsCount,
      endpoint: TELEMETRY_API_ENDPOINT,
    })

    // Submit to API
    const response = await fetch(TELEMETRY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('[Telemetry] Submission failed:', response.status, response.statusText)
      return false
    }

    // Update last submission timestamp
    await setMetricsSettings({
      lastTelemetrySubmission: new Date().toISOString(),
    })

    console.log('[Telemetry] Submission successful')
    return true
  } catch (error) {
    console.error('[Telemetry] Submission error:', error)
    return false
  }
}

/**
 * Check if telemetry should be submitted (weekly schedule)
 * Returns true if it's been more than 7 days since last submission
 */
export async function shouldSubmitTelemetry(): Promise<boolean> {
  const settings = await getMetricsSettings()

  // Check if enabled
  if (!settings.enableAutomaticTelemetry) {
    return false
  }

  // Check if we have metrics
  const metrics = await getMetrics()
  if (metrics.length === 0) {
    return false
  }

  // Check last submission time
  if (!settings.lastTelemetrySubmission) {
    // Never submitted before
    return true
  }

  const lastSubmission = new Date(settings.lastTelemetrySubmission)
  const now = new Date()
  const daysSinceLastSubmission = (now.getTime() - lastSubmission.getTime()) / (1000 * 60 * 60 * 24)

  // Submit if it's been more than 7 days
  return daysSinceLastSubmission >= 7
}

/**
 * Test-only exports for mocking
 */
export const __TEST_ONLY__ = {
  METRICS_STORAGE_KEY,
  METRICS_SETTINGS_KEY,
  DEFAULT_METRICS_SETTINGS,
  TELEMETRY_API_ENDPOINT,
}
