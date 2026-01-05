import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Checkbox } from '../Checkbox'
import { NumberInput } from '../NumberInput'

export interface AdvancedSettingsProps {
  showToolbarToggle: boolean
  showPerformanceMetrics: boolean
  enableCustomParser: boolean
  autoSwitchThreshold: number
  onChange: (settings: Partial<AdvancedSettingsProps>) => void
}

/**
 * Advanced settings section with accordion
 */
export function AdvancedSettings({
  showToolbarToggle,
  showPerformanceMetrics,
  enableCustomParser,
  autoSwitchThreshold,
  onChange,
}: AdvancedSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return h(
    'div',
    { className: 'settings-group advanced-settings' },
    // Accordion header
    h(
      'button',
      {
        className: `accordion-header ${isExpanded ? 'expanded' : ''}`,
        onClick: () => setIsExpanded(!isExpanded),
        type: 'button',
        'aria-expanded': isExpanded,
      },
      [
        h('h3', null, 'Advanced Settings'),
        h('span', { className: 'accordion-icon' }, isExpanded ? '▼' : '▶'),
      ]
    ),

    // Accordion content
    isExpanded && h(
      'div',
      { className: 'accordion-content' },

      // General settings
      h(Checkbox, {
        id: 'showPerformanceMetrics',
        checked: showPerformanceMetrics,
        onChange: (checked) => onChange({ showPerformanceMetrics: checked }),
        label: 'Show performance metrics after parsing',
      }),

      // Parser-specific settings (always shown - ExactJSON is now default)
      h(
        'div',
        { className: 'parser-settings-subsection' },
        h('h4', { className: 'subsection-title' }, 'Parser Settings'),

        h(Checkbox, {
          id: 'showToolbarToggle',
          checked: showToolbarToggle,
          onChange: (checked) => onChange({ showToolbarToggle: checked }),
          label: 'Show parser selection in toolbar (always visible)',
        }),

        h(Checkbox, {
          id: 'enableCustomParser',
          checked: enableCustomParser,
          onChange: (checked) => onChange({ enableCustomParser: checked }),
          label: 'Enable ExactJSON (disable to force native parser always)',
        }),

        h(NumberInput, {
          id: 'autoSwitchThreshold',
          value: autoSwitchThreshold,
          onChange: (value) => onChange({ autoSwitchThreshold: value }),
          label: 'Auto-switch to native parser for files larger than:',
          min: 0,
          max: 1000,
          suffix: 'MB',
          helpText: 'Set to 0 to disable auto-switching',
        })
      )
    )
  )
}
