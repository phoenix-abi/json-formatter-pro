import { h } from 'preact'
import { RadioGroup, type RadioOption } from '../RadioGroup'
import type { ParserType } from '../../lib/parser-selection'

export interface DefaultParserSelectorProps {
  value: ParserType
  onChange: (value: ParserType) => void
}

const PARSER_OPTIONS: RadioOption<ParserType>[] = [
  {
    value: 'custom',
    label: 'ExactJSON',
    description: 'Exact parsing (4-11x slower) with advanced features',
    features: [
      '✓ Preserves large number precision (no rounding)',
      '✓ Maintains exact key order from server',
      '✓ Better for financial/scientific data',
      '⚠ Slower performance',
    ],
  },
  {
    value: 'native',
    label: 'Native Parser',
    description: 'Fast parsing using built-in JSON.parse()',
    features: [
      '✓ Fast parsing',
      '✓ Works for most JSON files',
      '⚠ May lose precision on very large numbers',
      '⚠ Reorders numeric object keys',
    ],
  },
]

/**
 * Default parser selection component
 */
export function DefaultParserSelector({ value, onChange }: DefaultParserSelectorProps) {
  return h(
    'div',
    { className: 'settings-group' },
    h('h3', null, 'Default Parser'),
    h('p', { className: 'description' }, 'Choose which JSON parser to use by default'),
    h(RadioGroup, {
      name: 'defaultParser',
      value,
      options: PARSER_OPTIONS,
      onChange: (value: string) => onChange(value as ParserType),
    })
  )
}
