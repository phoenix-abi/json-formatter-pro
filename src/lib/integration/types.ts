/**
 * Integration Contract v1.0
 *
 * This contract defines the interface between JSON parsers and renderers,
 * enabling independent evolution of both layers.
 *
 * See docs/UNIFIED_RENDERING_PLAN.md for full specification.
 */

// ============================================================================
// PART 1: Data Model
// ============================================================================

/**
 * Standard JSON value from JSON.parse() (Phase I)
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

/**
 * Lossless AST node from CustomParser (Phase II)
 *
 * Re-exported from parser/types.ts - defined in Week 8
 */
export type {
  JsonNode,
  ObjectNode,
  ArrayNode,
  StringNode,
  NumberNode,
  BooleanNode,
  NullNode,
  JsonString,
} from '../parser/types'

import type { JsonNode } from '../parser/types'
import { isJsonNode as isJsonNodeImpl } from '../parser/guards'

/**
 * Polymorphic data type that can come from any parser
 */
export type ParsedData = JsonValue | JsonNode

// ============================================================================
// PART 2: Type Guards
// ============================================================================

export { isJsonNode } from '../parser/guards'

export function isJsonValue(data: ParsedData): data is JsonValue {
  return !isJsonNodeImpl(data)
}

// ============================================================================
// PART 3: Data Adapter Interface
// ============================================================================

/**
 * Metadata about a parsed value, regardless of source parser
 */
export interface ValueMetadata {
  /** Semantic type for rendering */
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

  /** Display value (for primitives) or null (for containers) */
  displayValue: string | null

  /** Does this value have children? */
  hasChildren: boolean

  /** Number of direct children (0 for primitives) */
  childCount: number

  /** Source text range (optional, for advanced features) */
  sourceRange?: { start: number; end: number }

  /** Raw lexeme for lossless display (optional, Phase II) */
  rawText?: string
}

/**
 * Iterator entry for traversing container types
 */
export interface ChildEntry {
  /** Key name for objects, or null for array elements */
  key: string | null

  /** The child value */
  value: ParsedData

  /** Index within parent (for ordering) */
  index: number
}

/**
 * Common interface for accessing parsed data
 *
 * This adapter abstracts over JsonValue and JsonNode, providing
 * uniform access for the renderer layer.
 */
export interface DataAdapter {
  /**
   * Get metadata about this value
   */
  getMetadata(data: ParsedData): ValueMetadata

  /**
   * Get children of a container (object/array)
   * Returns empty iterator for primitives
   */
  getChildren(data: ParsedData): IterableIterator<ChildEntry>

  /**
   * Get a specific child by key (objects) or index (arrays)
   * Returns undefined if not found or if data is a primitive
   */
  getChild(data: ParsedData, keyOrIndex: string | number): ParsedData | undefined
}
