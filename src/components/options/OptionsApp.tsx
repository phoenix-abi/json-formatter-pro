import { h } from 'preact'
import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import { DefaultParserSelector } from './DefaultParserSelector'
import { BetaFeatures } from './BetaFeatures'
import { CustomParserOptions } from './CustomParserOptions'
import { URLOverridesList } from './URLOverridesList'
import { AddOverrideDialog } from './AddOverrideDialog'
import { MetricsSection } from './MetricsSection'
import { AdvancedSettings } from './AdvancedSettings'
import {
  getParserSettings,
  setParserSettings,
  addParserURLOverride,
  removeParserURLOverride,
  updateParserURLOverride
} from '../../lib/storage'
import {
  getMetricsSettings,
  setMetricsSettings,
  getMetricsSummary,
  exportMetrics,
  clearMetrics
} from '../../lib/metrics'
import {
  DEFAULT_PARSER_SETTINGS,
  isValidURLPattern,
  type ParserType,
  type ParserSettings
} from '../../lib/parser-selection'
import { getRolloutPercentage, FeatureFlag } from '../../lib/featureFlags'
import { ThemePicker, type Theme } from '../ThemePicker'

interface SaveStatus {
  message: string
  type: 'success' | 'error'
}

/**
 * Main options page component
 */
export function OptionsApp() {
  const [settings, setSettings] = useState<ParserSettings>(DEFAULT_PARSER_SETTINGS)
  const [theme, setTheme] = useState<Theme>('system')
  const [rolloutPercentage, setRolloutPercentage] = useState(0)
  const [collectMetrics, setCollectMetrics] = useState(false)
  const [enableAutomaticTelemetry, setEnableAutomaticTelemetry] = useState(false)
  const [lastTelemetrySubmission, setLastTelemetrySubmission] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null)
  const [metricsStatus, setMetricsStatus] = useState<string>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isFirstRender = useRef(true)

  // Load settings on mount
  useEffect(() => {
    void loadSettings()
  }, [])

  // Auto-hide save status after 3 seconds
  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => setSaveStatus(null), 3000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [saveStatus])

  // Auto-hide metrics status after 5 seconds
  useEffect(() => {
    if (metricsStatus) {
      const timer = setTimeout(() => setMetricsStatus(''), 5000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [metricsStatus])

  const loadSettings = async () => {
    const parserSettings = await getParserSettings()
    setSettings(parserSettings)
    setRolloutPercentage(getRolloutPercentage(FeatureFlag.UseCustomParser))

    const metricsSettings = await getMetricsSettings()
    setCollectMetrics(metricsSettings.collectMetrics)
    setEnableAutomaticTelemetry(metricsSettings.enableAutomaticTelemetry || false)
    setLastTelemetrySubmission(metricsSettings.lastTelemetrySubmission || null)

    // Load theme setting
    const savedTheme = await chrome.storage.local.get('themeOverride')
    setTheme(savedTheme.themeOverride || 'system')
  }


  // Auto-save settings whenever they change
  const autoSaveSettings = useCallback(async (newSettings: ParserSettings) => {
    await setParserSettings(newSettings)
    setSaveStatus({ message: 'Saved', type: 'success' })
  }, [])

  // Auto-save with debounce to avoid excessive writes
  useEffect(() => {
    // Skip auto-save on initial render (during settings load)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => {
      void autoSaveSettings(settings)
    }, 500) // Debounce 500ms

    return () => clearTimeout(timer)
  }, [settings, autoSaveSettings])

  const handleOverrideEnabledChange = useCallback(
    async (index: number, enabled: boolean) => {
      const override = settings.urlOverrides[index]
      if (override) {
        await updateParserURLOverride(override.pattern, { enabled })
        await loadSettings()
      }
    },
    [settings.urlOverrides]
  )

  const handleOverrideEdit = useCallback(
    async (index: number) => {
      const override = settings.urlOverrides[index]
      if (override) {
        const newParser = prompt(
          `Edit parser for pattern: ${override.pattern}\n\nEnter 'native' or 'custom':`,
          override.parser
        )
        if (newParser === 'native' || newParser === 'custom') {
          await updateParserURLOverride(override.pattern, { parser: newParser })
          await loadSettings()
          setSaveStatus({ message: 'Override updated!', type: 'success' })
        }
      }
    },
    [settings.urlOverrides]
  )

  const handleOverrideDelete = useCallback(
    async (index: number) => {
      const override = settings.urlOverrides[index]
      if (override && confirm(`Delete override for pattern: ${override.pattern}?`)) {
        await removeParserURLOverride(override.pattern)
        await loadSettings()
        setSaveStatus({ message: 'Override deleted!', type: 'success' })
      }
    },
    [settings.urlOverrides]
  )

  const handleOverrideAdd = useCallback(async (pattern: string, parser: ParserType) => {
    if (!isValidURLPattern(pattern)) {
      alert('Invalid URL pattern. Please use valid characters and include at least one non-wildcard character.')
      return
    }

    await addParserURLOverride({ pattern, parser, enabled: true })
    await loadSettings()
    setIsDialogOpen(false)
    setSaveStatus({ message: 'Override added successfully!', type: 'success' })
  }, [])

  const handleCollectMetricsChange = useCallback(async (enabled: boolean) => {
    setCollectMetrics(enabled)
    await setMetricsSettings({ collectMetrics: enabled })

    if (!enabled) {
      setEnableAutomaticTelemetry(false)
      await setMetricsSettings({ enableAutomaticTelemetry: false })
    }

    setMetricsStatus(
      enabled
        ? 'Metrics collection enabled. Data will be stored locally on your device.'
        : 'Metrics collection disabled.'
    )
  }, [])

  const handleAutomaticTelemetryChange = useCallback(async (enabled: boolean) => {
    setEnableAutomaticTelemetry(enabled)
    await setMetricsSettings({ enableAutomaticTelemetry: enabled })

    setMetricsStatus(
      enabled
        ? 'Automatic telemetry enabled. Metrics will be sent weekly to api.betterwebforall.com.'
        : 'Automatic telemetry disabled.'
    )
  }, [])

  const handleThemeChange = useCallback(async (newTheme: Theme) => {
    setTheme(newTheme)
    await chrome.storage.local.set({ themeOverride: newTheme })
    setSaveStatus({ message: 'Theme updated!', type: 'success' })
  }, [])

  const handleViewMetrics = useCallback(async () => {
    try {
      const summary = await getMetricsSummary()

      if (summary.totalParses === 0) {
        alert('No metrics collected yet. Visit some JSON pages to start collecting data.')
        return
      }

      const nativeCount = summary.parserUsage.native
      const customCount = summary.parserUsage.custom
      const nativePercent = ((nativeCount / summary.totalParses) * 100).toFixed(1)
      const customPercent = ((customCount / summary.totalParses) * 100).toFixed(1)

      const message = `Metrics Summary
===============

Total Parses: ${summary.totalParses}
Success Rate: ${summary.successRate.toFixed(1)}%
Average Parse Time: ${summary.avgParseTimeMs.toFixed(2)}ms

Parser Usage:
- Native: ${nativeCount} (${nativePercent}%)
- Custom: ${customCount} (${customPercent}%)

${summary.errors.length > 0 ? `Errors:\n${summary.errors.map(e => `- ${e.type}: ${e.count}`).join('\n')}` : 'No errors recorded'}

Date Range:
${summary.dateRange.oldest} to ${summary.dateRange.newest}`

      alert(message)
    } catch (error) {
      console.error('Error viewing metrics:', error)
      setMetricsStatus('Error loading metrics')
    }
  }, [])

  const handleExportMetrics = useCallback(async () => {
    try {
      const exported = await exportMetrics()

      // Copy to clipboard
      await navigator.clipboard.writeText(exported)
      setMetricsStatus('✅ Metrics copied to clipboard! Paste into email or help desk submission.')

      // Also trigger download
      const blob = new Blob([exported], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `json-formatter-metrics-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting metrics:', error)
      setMetricsStatus('Error exporting metrics')
    }
  }, [])

  const handleClearMetrics = useCallback(async () => {
    if (confirm('Are you sure you want to delete all collected metrics? This cannot be undone.')) {
      try {
        await clearMetrics()
        setMetricsStatus('✅ All metrics cleared')
      } catch (error) {
        console.error('Error clearing metrics:', error)
        setMetricsStatus('Error clearing metrics')
      }
    }
  }, [])

  return h(
    'div',
    null,
    // Header
    h(
      'header',
      null,
      h('img', { src: '../icons/icon128.png', alt: 'JSON Formatter Pro Logo' }),
      h('h1', null, 'JSON Formatter Pro')
    ),

    // Main content
    h(
      'main',
      null,

      // Theme Settings
      h('div', null,
        h('h2', null, 'Appearance'),
        h('div', { style: { 'padding-bottom': '3em' } },
          h('label', { style: { 'padding-right': '1em' } }, 'Theme'),
          h(ThemePicker, {
            theme,
            useStorage: false,
            onThemeChange: handleThemeChange
          })
        )
      ),

      h(
        'section',
        { id: 'parser-settings' },
        h('h2', null, 'JSON Parser Settings'),

        // Default Parser Selection (always shown - ExactJSON is now default)
        h(DefaultParserSelector, {
          value: settings.defaultParser,
          onChange: (value) => setSettings({ ...settings, defaultParser: value })
        }),

        // Beta Features (always shown so users can enroll)
        h(BetaFeatures, {
          rolloutPercentage,
          betaEnrollment: settings.forceEnableCustomParser || false,
          onBetaEnrollmentChange: (enabled) => {
            // When beta is enabled: force enable = true, force disable = false
            // When beta is disabled: force enable = false, force disable = true
            setSettings({
              ...settings,
              forceEnableCustomParser: enabled,
              forceDisableCustomParser: !enabled
            })
          }
        }),

        // Custom Parser Options (always shown - ExactJSON is now default)
        h(CustomParserOptions, {
          options: settings.customParserOptions,
          onChange: (partialOptions) =>
            setSettings({
              ...settings,
              customParserOptions: { ...settings.customParserOptions, ...partialOptions }
            })
        }),

        // URL Overrides (always shown - ExactJSON is now default)
        h(URLOverridesList, {
          overrides: settings.urlOverrides,
          onEnabledChange: handleOverrideEnabledChange,
          onEdit: handleOverrideEdit,
          onDelete: handleOverrideDelete,
          onAdd: () => setIsDialogOpen(true)
        }),

        // Metrics & Privacy
        h(MetricsSection, {
          collectMetrics,
          enableAutomaticTelemetry,
          lastTelemetrySubmission,
          onCollectMetricsChange: handleCollectMetricsChange,
          onAutomaticTelemetryChange: handleAutomaticTelemetryChange,
          onViewMetrics: handleViewMetrics,
          onExportMetrics: handleExportMetrics,
          onClearMetrics: handleClearMetrics,
          statusMessage: metricsStatus
        }),

        // Advanced Settings
        h(AdvancedSettings, {
          showToolbarToggle: settings.showToolbarToggle,
          showPerformanceMetrics: settings.showPerformanceMetrics,
          enableCustomParser: settings.enableCustomParser,
          autoSwitchThreshold: settings.autoSwitchThreshold,
          onChange: (partial) => setSettings({ ...settings, ...partial })
        }),

        // Auto-save status indicator
        saveStatus &&
        h(
          'div',
          { className: 'settings-actions' },
          h(
            'span',
            { className: `save-status ${saveStatus.type}`, style: { display: 'inline' } },
            saveStatus.message
          )
        )
      ),

      // About section
      h(
        'section',
        { id: 'about' },
        h('h2', null, 'Help'),
        h('p', null, 'For assistance, please visit us:'),
        h(
          'ul',
          null,
          h(
            'a',
            null,
            h(
              'a',
              { href: 'https://betterwebforall.com/json_formatter_pro', target: '_blank' },
              'Website'
            )
          )
        )
      )
    ),

    // Add Override Dialog
    h(AddOverrideDialog, {
      isOpen: isDialogOpen,
      onClose: () => setIsDialogOpen(false),
      onSubmit: handleOverrideAdd
    })
  )
}
