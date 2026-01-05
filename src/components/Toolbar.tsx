import { h, ComponentChildren } from 'preact'
import './Toolbar.css'

export interface ToolbarProps {
  left?: ComponentChildren
  center?: ComponentChildren
  right?: ComponentChildren
  sticky?: boolean
}

/**
 * Toolbar container with sticky positioning and flexible layout.
 * Styled to match GitHub's toolbar design with clean spacing and borders.
 */
export function Toolbar({ left, center, right, sticky = true }: ToolbarProps) {
  return (
    <div class={`toolbar ${sticky ? 'sticky' : ''}`}>
      <div class="toolbar-content">
        {left && <div class="toolbar-left">{left}</div>}
        {center && <div class="toolbar-center">{center}</div>}
        {right && <div class="toolbar-right">{right}</div>}
      </div>
    </div>
  )
}
