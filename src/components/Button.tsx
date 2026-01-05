import { h, type ComponentChildren } from 'preact'
import './Button.css'

export interface ButtonProps {
  /** Button content */
  children: ComponentChildren
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger'
  /** Click handler */
  onClick?: (e: MouseEvent) => void
  /** Whether button is disabled */
  disabled?: boolean
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset'
  /** Optional aria-label for accessibility */
  ariaLabel?: string
}

/**
 * Button component with multiple variants.
 * - primary: Main action button (prominent)
 * - secondary: Default button style
 * - tertiary: Less prominent, minimal styling
 * - danger: For destructive actions (delete, remove, etc.)
 */
export function Button({
  children,
  variant = 'secondary',
  onClick,
  disabled = false,
  type = 'button',
  ariaLabel,
}: ButtonProps) {
  const handleClick = (e: MouseEvent) => {
    if (disabled) return
    onClick?.(e)
  }

  return (
    <button
      class={`btn btn-${variant}`}
      onClick={handleClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
