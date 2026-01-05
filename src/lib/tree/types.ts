/**
 * Tree utilities types
 *
 * These types support flattening nested JSON into a linear array
 * for virtual scrolling, based on expansion state.
 */

import { ParsedData } from '../integration/types'

/**
 * A flat representation of a tree node for rendering
 *
 * The tree is flattened based on expansion state: only nodes
 * that should be visible are included in the flat array.
 */
export interface FlatNode {
  /** Unique ID for React key (JSON path) */
  id: string

  /** Indentation level (0, 1, 2, ...) */
  depth: number

  /** Object key or null for array element */
  key: string | null

  /** The actual parsed value (polymorphic: JsonValue or JsonNode) */
  value: ParsedData

  /** Value type (from adapter metadata) */
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

  /** JSON path (e.g., "$.users[0].name") */
  path: string

  /** Is this an object/array with children? */
  hasChildren: boolean

  /** Is this node currently expanded? */
  isExpanded: boolean

  /** Number of direct children */
  childCount: number

  /** Position within parent array (for ordering) */
  indexInParent: number

  /** Is this the last sibling? (affects comma rendering) */
  isLastSibling: boolean

  /** Display value for primitives */
  displayValue: string | null

  /** Raw lexeme for lossless display (Phase II feature) */
  rawText?: string
}

/**
 * Tree expansion state
 *
 * Tracks which paths are expanded. This drives the flattening process.
 */
export interface TreeState {
  /** Set of paths that are expanded */
  expandedPaths: Set<string>
}
