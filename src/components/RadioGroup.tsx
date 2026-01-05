import { h } from 'preact'

export interface RadioOption<T extends string = string> {
  value: T
  label: string
  description?: string
  features?: string[]
}

export interface RadioGroupProps<T extends string = string> {
  name: string
  value: T
  options: RadioOption<T>[]
  onChange: (value: T) => void
  className?: string
}

/**
 * Reusable radio group component with optional descriptions and feature lists
 */
export function RadioGroup<T extends string = string>({
  name,
  value,
  options,
  onChange,
  className = '',
}: RadioGroupProps<T>) {
  return h(
    'div',
    { className: `radio-group ${className}` },
    options.map((option) =>
      h(
        'label',
        { key: option.value, className: 'radio-option' },
        h('input', {
          type: 'radio',
          name,
          value: option.value,
          checked: value === option.value,
          onChange: () => onChange(option.value),
        }),
        h(
          'div',
          { className: 'radio-content' },
          h('span', { className: 'radio-label' }, option.label),
          option.description &&
            h('span', { className: 'radio-description' }, option.description),
          option.features &&
            option.features.length > 0 &&
            h(
              'ul',
              { className: 'feature-list' },
              option.features.map((feature) => h('li', { key: feature }, feature))
            )
        )
      )
    )
  )
}
