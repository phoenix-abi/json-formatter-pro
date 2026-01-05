import { h } from 'preact'
import { URLOverrideItem } from './URLOverrideItem'
import type { ParserURLOverride } from '../../lib/parser-selection'

export interface URLOverridesListProps {
  overrides: ParserURLOverride[]
  onEnabledChange: (index: number, enabled: boolean) => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onAdd: () => void
}

/**
 * List of URL overrides with add button
 */
export function URLOverridesList({
  overrides,
  onEnabledChange,
  onEdit,
  onDelete,
  onAdd,
}: URLOverridesListProps) {
  return h(
    'div',
    { className: 'settings-group' },
    h('h3', null, 'Per-URL Parser Overrides'),
    h('p', { className: 'description' }, 'Override the default parser for specific URLs or patterns'),

    // List of overrides
    h(
      'div',
      { id: 'url-overrides-list' },
      overrides.length === 0
        ? h('p', { className: 'empty-state' }, 'No URL overrides configured')
        : overrides.map((override, index) =>
            h(URLOverrideItem, {
              key: override.pattern,
              override,
              index,
              onEnabledChange,
              onEdit,
              onDelete,
            })
          )
    ),

    // Add button
    h('button', { id: 'add-override-btn', className: 'button-primary', onClick: onAdd }, '+ Add Override')
  )
}
