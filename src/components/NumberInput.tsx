import { h } from 'preact'

export interface NumberInputProps {
  id?: string
  value: number
  onChange: (value: number) => void
  label: string
  min?: number
  max?: number
  suffix?: string
  helpText?: string
  className?: string
}

/**
 * Reusable number input component with optional suffix and help text
 */
export function NumberInput({
  id,
  value,
  onChange,
  label,
  min,
  max,
  suffix,
  helpText,
  className = '',
}: NumberInputProps) {
  return h(
    'div',
    { className: `number-input-group ${className}` },
    h('label', { htmlFor: id }, label),
    h('input', {
      id,
      type: 'number',
      value: String(value),
      min,
      max,
      onChange: (e: Event) => onChange(parseInt((e.target as HTMLInputElement).value, 10)),
    }),
    suffix && h('span', null, suffix),
    helpText && h('p', { className: 'help-text' }, helpText)
  )
}
