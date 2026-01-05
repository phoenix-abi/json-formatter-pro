import { h } from 'preact'
import { useCallback } from 'preact/hooks'
import './Toggle.css'

export interface ToggleProps {
  /** Label text displayed next to the switch */
  label: string
  /** Whether the switch is in the ON position */
  checked: boolean
  /** Callback when the switch is toggled */
  onChange: (checked: boolean) => void
  /** Optional custom aria-label (defaults to "${label} ${checked ? 'enabled' : 'disabled'}") */
  ariaLabel?: string
}

/**
 * Generic toggle switch component.
 * Displays an on/off switch with a customizable label.
 */
export function Toggle({ label, checked, onChange, ariaLabel }: ToggleProps) {
  const handleToggle = useCallback(() => {
    onChange(!checked)
  }, [checked, onChange])

  const defaultAriaLabel = `${label} ${checked ? 'enabled' : 'disabled'}`

  return (
    <label class="toggle">
      <span class="toggle-label-text">{label}</span>
      <button
        class={`toggle-switch ${checked ? 'on' : 'off'}`}
        onClick={handleToggle}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || defaultAriaLabel}
        type="button"
      >
        <span class="toggle-switch-track">
          <span class="toggle-switch-thumb"></span>
        </span>
      </button>
    </label>
  )
}
