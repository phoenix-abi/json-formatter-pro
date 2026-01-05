import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Select, type SelectOption } from '../Select'
import { Checkbox } from '../Checkbox'
import { NumberInput } from '../NumberInput'
import type { CustomParserOptions } from '../../lib/parser-selection'
import type { NumberMode } from '../../lib/parser/types'

export interface CustomParserOptionsProps {
  options: CustomParserOptions
  onChange: (options: Partial<CustomParserOptions>) => void
}

const NUMBER_MODE_OPTIONS: SelectOption<NumberMode>[] = [
  { value: 'native', label: 'Native (standard JavaScript numbers)' },
  { value: 'bigint', label: 'BigInt (preserve large integers exactly)' },
  { value: 'decimal', label: 'Decimal (preserve decimal precision as strings)' },
  { value: 'string', label: 'String (keep all numbers as strings)' },
]

/**
 * Custom parser configuration options
 */
export function CustomParserOptions({ options, onChange }: CustomParserOptionsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return h(
    'div',
    { className: 'settings-group', id: 'custom-parser-options-group' },
    h('h3', null, 'ExactJSON Options'),
    h('p', { className: 'description' }, 'Configure behavior when using the custom parser'),

    // Number mode
    h(
      'div',
      { className: 'form-group' },
      h('label', { htmlFor: 'numberMode' }, 'Number Representation'),
      h(Select, {
        value: options.numberMode,
        options: NUMBER_MODE_OPTIONS,
        onChange: (value: string) => onChange({ numberMode: value as NumberMode }),
        ariaLabel: 'Number representation mode',
      }),
      h(
        'p',
        { className: 'help-text' },
        "How to handle numbers that exceed JavaScript's precision limits"
      )
    ),

    // Tolerant mode
    h(Checkbox, {
      id: 'tolerantMode',
      checked: options.tolerant,
      onChange: (checked) => onChange({ tolerant: checked }),
      label: 'Tolerant Mode (recover from common JSON errors)',
      helpText:
        'Enables recovery from trailing commas, missing commas/colons, etc. Useful for debugging malformed JSON.',
    }),

    // Advanced limits (collapsible)
    h(
      'details',
      { open: advancedOpen, onToggle: (e: Event) => setAdvancedOpen((e.target as HTMLDetailsElement).open) },
      h('summary', null, 'Advanced Limits'),
      h(
        'div',
        { className: 'advanced-limits' },
        h(NumberInput, {
          id: 'maxDepth',
          value: options.maxDepth,
          onChange: (value) => onChange({ maxDepth: value }),
          label: 'Maximum Nesting Depth:',
          min: 10,
          max: 10000,
          helpText: 'Prevents stack overflow from deeply nested structures',
        }),
        h(NumberInput, {
          id: 'maxKeyLength',
          value: options.maxKeyLength,
          onChange: (value) => onChange({ maxKeyLength: value }),
          label: 'Maximum Key Length:',
          min: 100,
          max: 100000,
          helpText: 'Security limit for object key lengths',
        }),
        h(NumberInput, {
          id: 'maxStringLength',
          value: options.maxStringLength,
          onChange: (value) => onChange({ maxStringLength: value }),
          label: 'Maximum String Length:',
          min: 1000,
          max: 100000000,
          helpText: 'Security limit for string values (in characters)',
        })
      )
    )
  )
}
