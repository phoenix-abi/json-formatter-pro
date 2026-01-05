import { h } from 'preact'
import { Checkbox } from '../Checkbox'

export interface MetricsSectionProps {
  collectMetrics: boolean
  enableAutomaticTelemetry: boolean
  lastTelemetrySubmission: string | null
  onCollectMetricsChange: (enabled: boolean) => void
  onAutomaticTelemetryChange: (enabled: boolean) => void
  onViewMetrics: () => void
  onExportMetrics: () => void
  onClearMetrics: () => void
  statusMessage?: string
}

/**
 * Metrics and privacy settings section
 */
export function MetricsSection({
  collectMetrics,
  enableAutomaticTelemetry,
  lastTelemetrySubmission,
  onCollectMetricsChange,
  onAutomaticTelemetryChange,
  onViewMetrics,
  onExportMetrics,
  onClearMetrics,
  statusMessage,
}: MetricsSectionProps) {
  const lastSubmissionText = lastTelemetrySubmission
    ? new Date(lastTelemetrySubmission).toLocaleString()
    : 'Never'

  return h(
    'div',
    { className: 'settings-group', id: 'metrics-privacy-group' },
    h('h3', null, '📊 Metrics & Privacy'),
    h('p', { className: 'description' }, 'Help improve the extension by collecting local performance data'),

    // Privacy notice
    h(
      'div',
      { className: 'privacy-notice' },
      h(
        'p',
        null,
        h('strong', null, 'Your Privacy Matters:'),
        ' We respect your privacy and never automatically send any data from your computer. All metrics are stored locally on your device.'
      )
    ),

    // Collect metrics checkbox
    h(Checkbox, {
      id: 'collectMetrics',
      checked: collectMetrics,
      onChange: onCollectMetricsChange,
      label: '📈 Collect local metrics (opt-in)',
      helpText:
        'When enabled, the extension will collect anonymous performance data locally on your device. This includes parser type used, parse times, file sizes, and error rates. No URLs, JSON content, or personal information is ever collected.',
    }),

    // Automatic telemetry (only shown if metrics collection is enabled)
    collectMetrics &&
      h(Checkbox, {
        id: 'enableAutomaticTelemetry',
        checked: enableAutomaticTelemetry,
        onChange: onAutomaticTelemetryChange,
        label: '🌐 Automatically send metrics weekly (separate opt-in)',
        helpText: h(
          'div',
          null,
          h(
            'p',
            null,
            h('strong', null, 'Requires local metrics collection above.'),
            " When enabled, your collected metrics will be automatically sent to our server once per week. This helps us identify issues and improve the extension for all users. Includes: metrics summary, browser version, platform (Mac/Windows/Linux), language, and timezone. The data is sent via HTTPS to api.betterwebforall.com."
          ),
          h(
            'p',
            { style: { marginTop: '0.5rem' } },
            h('strong', null, 'Last submission:'),
            ' ',
            lastSubmissionText
          )
        ),
        className: 'automatic-telemetry-option',
      }),

    // Metrics controls (only shown if metrics collection is enabled)
    collectMetrics &&
      h(
        'div',
        { id: 'metrics-controls', style: { marginTop: '1rem' } },
        h('p', { className: 'help-text' }, h('strong', null, 'How it works:')),
        h(
          'ul',
          { className: 'feature-list', style: { marginLeft: '1.5rem' } },
          h('li', null, '✓ All data stored locally on your device'),
          h('li', null, '✓ No automatic data transmission'),
          h('li', null, '✓ You can view, export, and delete data anytime'),
          h('li', null, '✓ Submit metrics manually via email/help desk (optional)')
        ),
        h(
          'div',
          { style: { marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
          h(
            'button',
            { type: 'button', className: 'button-secondary', onClick: onViewMetrics },
            '📊 View Metrics'
          ),
          h(
            'button',
            { type: 'button', className: 'button-secondary', onClick: onExportMetrics },
            '💾 Export Metrics'
          ),
          h(
            'button',
            { type: 'button', className: 'button-danger', onClick: onClearMetrics },
            '🗑️ Clear All Data'
          )
        ),
        statusMessage &&
          h(
            'div',
            {
              id: 'metrics-status',
              style: { marginTop: '0.5rem', fontSize: '0.9em', color: 'var(--text-secondary)' },
            },
            statusMessage
          )
      )
  )
}
