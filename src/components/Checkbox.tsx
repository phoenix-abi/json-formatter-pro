import { h } from 'preact'

export interface CheckboxProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  helpText?: string
  className?: string
}

/**
 * Reusable checkbox component with optional help text
 */
export function Checkbox({
  id,
  checked,
  onChange,
  label,
  helpText,
  className = '',
}: CheckboxProps) {
  return h(
    'label',
    { className: `checkbox-option ${className}`, htmlFor: id },
    h('input', {
      id,
      type: 'checkbox',
      checked,
      onChange: (e: Event) => onChange((e.target as HTMLInputElement).checked),
    }),
    h('span', null, label),
    helpText && h('p', { className: 'help-text' }, helpText)
  )
}
