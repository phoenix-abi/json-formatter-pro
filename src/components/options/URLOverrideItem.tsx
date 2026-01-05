import { h } from 'preact'
import type { ParserURLOverride } from '../../lib/parser-selection'

export interface URLOverrideItemProps {
  override: ParserURLOverride
  index: number
  onEnabledChange: (index: number, enabled: boolean) => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}

/**
 * Individual URL override item
 */
export function URLOverrideItem({
  override,
  index,
  onEnabledChange,
  onEdit,
  onDelete,
}: URLOverrideItemProps) {
  return h(
    'div',
    { className: 'url-override-item', 'data-index': index },
    h(
      'div',
      { className: 'override-info' },
      h('span', { className: 'override-pattern' }, override.pattern),
      h(
        'span',
        { className: 'override-parser' },
        override.parser === 'native' ? 'Native Parser' : 'ExactJSON'
      ),
      h(
        'label',
        { className: 'override-enabled' },
        h('input', {
          type: 'checkbox',
          className: 'override-enabled-checkbox',
          checked: override.enabled,
          onChange: (e: Event) => onEnabledChange(index, (e.target as HTMLInputElement).checked),
        }),
        ' Enabled'
      )
    ),
    h(
      'div',
      { className: 'override-actions' },
      h(
        'button',
        { className: 'button-secondary edit-override-btn', onClick: () => onEdit(index) },
        'Edit'
      ),
      h(
        'button',
        { className: 'button-danger delete-override-btn', onClick: () => onDelete(index) },
        'Delete'
      )
    )
  )
}
