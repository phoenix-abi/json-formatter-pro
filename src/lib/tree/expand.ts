/**
 * Tree expansion utilities
 *
 * Functions for managing expansion state of tree nodes.
 */

import { ParsedData } from '../integration/types'
import { createAdapter } from '../integration/adapters'
import { TreeState, FlatNode } from './types'

/**
 * Toggles the expansion state of a node
 */
export function toggleNode(state: TreeState, path: string): TreeState {
  const newExpanded = new Set(state.expandedPaths)

  if (newExpanded.has(path)) {
    newExpanded.delete(path)
  } else {
    newExpanded.add(path)
  }

  return { expandedPaths: newExpanded }
}

/**
 * Expands a node and all its ancestors (for deep linking)
 */
export function expandPath(state: TreeState, path: string): TreeState {
  const newExpanded = new Set(state.expandedPaths)

  if (path === '$') {
    newExpanded.add('$')
    return { expandedPaths: newExpanded }
  }

  // Build paths incrementally by parsing the path string
  let currentPath = '$'
  newExpanded.add(currentPath)

  let i = 1 // Skip the '$'
  while (i < path.length) {
    if (path[i] === '.') {
      // Object property
      i++ // Skip the '.'
      let propName = ''
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        propName += path[i]
        i++
      }
      currentPath += `.${propName}`
      newExpanded.add(currentPath)
    } else if (path[i] === '[') {
      // Array index
      let indexStr = '['
      i++ // Skip the '['
      while (i < path.length && path[i] !== ']') {
        indexStr += path[i]
        i++
      }
      indexStr += ']'
      i++ // Skip the ']'
      currentPath += indexStr
      newExpanded.add(currentPath)
    } else {
      i++
    }
  }

  return { expandedPaths: newExpanded }
}

/**
 * Expands all nodes up to a given depth
 */
export function expandToDepth(
  value: ParsedData,
  maxDepth: number,
  path: string = '$',
  depth: number = 0,
  input?: string
): Set<string> {
  const expanded = new Set<string>()

  if (depth >= maxDepth) return expanded

  const adapter = createAdapter(value, input)
  const meta = adapter.getMetadata(value)

  if (!meta.hasChildren) return expanded

  expanded.add(path)

  // Recurse into children
  for (const child of adapter.getChildren(value)) {
    const childPath =
      child.key !== null ? `${path}.${child.key}` : `${path}[${child.index}]`

    const childExpanded = expandToDepth(child.value, maxDepth, childPath, depth + 1, input)

    childExpanded.forEach((p) => expanded.add(p))
  }

  return expanded
}

/**
 * Collapses all nodes
 */
export function collapseAll(): TreeState {
  return { expandedPaths: new Set() }
}

/**
 * Expands all siblings of a node at the same depth
 */
export function expandAllSiblings(
  state: TreeState,
  path: string,
  allNodes: FlatNode[]
): TreeState {
  const node = allNodes.find((n) => n.path === path)
  if (!node) return state

  const newExpanded = new Set(state.expandedPaths)

  // Find all siblings (same depth, same parent)
  const siblings = allNodes.filter(
    (n) =>
      n.depth === node.depth && getParentPath(n.path) === getParentPath(path)
  )

  siblings.forEach((sibling) => {
    if (sibling.hasChildren) {
      newExpanded.add(sibling.path)
    }
  })

  return { expandedPaths: newExpanded }
}

/**
 * Helper: Extract parent path from a JSON path
 */
function getParentPath(path: string): string {
  const lastDot = path.lastIndexOf('.')
  const lastBracket = path.lastIndexOf('[')
  const lastDelim = Math.max(lastDot, lastBracket)

  if (lastDelim === -1) return ''
  return path.substring(0, lastDelim)
}
