/**
 * Tree flattening utilities
 *
 * Converts nested JSON into a flat array based on expansion state.
 * Uses the Integration Contract's DataAdapter for polymorphic data access.
 */

import { ParsedData } from '../integration/types'
import { createAdapter } from '../integration/adapters'
import { FlatNode, TreeState } from './types'

/**
 * Flattens a JSON tree into an array of visible nodes.
 *
 * Only includes nodes that should be rendered (children of collapsed nodes excluded).
 * Works with both JsonValue (Phase I) and JsonNode (Phase II) via the DataAdapter.
 *
 * @param value - The JSON value to flatten
 * @param state - Current tree state (expanded paths)
 * @param keyName - Object key or null for array element
 * @param depth - Current depth in tree
 * @param path - JSON path for this node
 * @param indexInParent - Position in parent array/object
 * @param siblingCount - Total number of siblings
 * @param input - Optional input string for on-demand raw text computation
 * @returns Array of flat nodes
 */
export function flattenTree(
  value: ParsedData,
  state: TreeState,
  keyName: string | null = null,
  depth: number = 0,
  path: string = '$',
  indexInParent: number = 0,
  siblingCount: number = 1,
  input?: string
): FlatNode[] {
  // Create appropriate adapter based on data type
  const adapter = createAdapter(value, input)
  const meta = adapter.getMetadata(value)

  const isExpanded = state.expandedPaths.has(path)

  const node: FlatNode = {
    id: path,
    depth,
    key: keyName,
    value, // Store original data (polymorphic)
    type: meta.type,
    path,
    hasChildren: meta.hasChildren,
    isExpanded,
    childCount: meta.childCount,
    indexInParent,
    isLastSibling: indexInParent === siblingCount - 1,
    displayValue: meta.displayValue,
    rawText: meta.rawText, // Lossless display (undefined for Phase I)
  }

  const result: FlatNode[] = [node]

  // Only recurse if expanded
  if (isExpanded && meta.hasChildren) {
    const children = Array.from(adapter.getChildren(value))

    for (const child of children) {
      const childPath =
        child.key !== null ? `${path}.${child.key}` : `${path}[${child.index}]`

      const childNodes = flattenTree(
        child.value,
        state,
        child.key,
        depth + 1,
        childPath,
        child.index,
        children.length,
        input
      )

      result.push(...childNodes)
    }

    // Add closing node for expanded containers
    if (meta.type === 'object' || meta.type === 'array') {
      const closingType = meta.type === 'object' ? 'object_close' : 'array_close'
      const closingNode: FlatNode = {
        id: `${path}__close`,
        depth,
        key: null,
        value: null as any, // Sentinel value
        type: closingType as any,
        path: `${path}__close`,
        hasChildren: false,
        isExpanded: false,
        childCount: 0,
        indexInParent: -1,
        isLastSibling: node.isLastSibling,
        displayValue: null,
      }
      result.push(closingNode)
    }
  }

  return result
}
