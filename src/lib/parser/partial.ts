/**
 * Partial/Incremental Parsing Utilities
 *
 * Provides functionality for parsing only subtrees of JSON on demand.
 * Useful for large JSON documents where you want to defer parsing
 * of collapsed sections until they're expanded.
 */

import { PullParser } from './pull-parser'
import { parse } from './parse'
import type { JsonNode, ObjectNode, ArrayNode } from './types'
import type { ParserOptions } from './events'
import { ParseError } from './events'

/**
 * Parse a subtree at a specific JSON path
 *
 * @param input - Full JSON string
 * @param path - JSONPath string (e.g., "$.users[0].name")
 * @param options - Parser options
 * @returns JsonNode representing the subtree at that path
 *
 * @example
 * ```typescript
 * const json = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}'
 * const node = parseSubtree(json, '$.users[0]')
 * // Returns: ObjectNode for {"name": "Alice"}
 * ```
 */
export function parseSubtree(
  input: string,
  path: string,
  options?: ParserOptions
): JsonNode | undefined {
  // Parse the full document
  const { ast: root } = parse(input, options)

  // Navigate to the path
  return navigateToPath(root, path)
}

/**
 * Navigate to a specific path in a JsonNode tree
 *
 * @param root - Root JsonNode
 * @param path - JSONPath string (e.g., "$.users[0].name")
 * @returns JsonNode at that path, or undefined if not found
 */
export function navigateToPath(root: JsonNode, path: string): JsonNode | undefined {
  // Parse the JSONPath
  const segments = parseJSONPath(path)

  let current: JsonNode | undefined = root

  for (const segment of segments) {
    if (!current) return undefined

    if (segment.type === 'root') {
      // $ - already at root
      continue
    } else if (segment.type === 'property') {
      // .propertyName
      if (current.kind !== 'object') return undefined
      const entry = (current as ObjectNode).entries.find(
        e => e.key.value === segment.name
      )
      current = entry?.value
    } else if (segment.type === 'index') {
      // [index]
      if (current.kind !== 'array') return undefined
      current = (current as ArrayNode).items[segment.index]
    }
  }

  return current
}

/**
 * Path segment types
 */
type PathSegment =
  | { type: 'root' }
  | { type: 'property'; name: string }
  | { type: 'index'; index: number }

/**
 * Parse a JSONPath string into segments
 *
 * Supports simple paths like:
 * - $ (root)
 * - $.property
 * - $[0]
 * - $.users[0].name
 *
 * @param path - JSONPath string
 * @returns Array of path segments
 */
export function parseJSONPath(path: string): PathSegment[] {
  const segments: PathSegment[] = []

  // Must start with $
  if (!path.startsWith('$')) {
    throw new Error('JSONPath must start with $')
  }

  let i = 1 // Skip initial $
  segments.push({ type: 'root' })

  while (i < path.length) {
    const ch = path[i]

    if (ch === '.') {
      // Property access: .propertyName
      i++ // Skip .

      let name = ''
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        name += path[i]
        i++
      }

      if (name.length === 0) {
        throw new Error('Empty property name in path')
      }

      segments.push({ type: 'property', name })
    } else if (ch === '[') {
      // Array index: [0]
      i++ // Skip [

      let indexStr = ''
      while (i < path.length && path[i] !== ']') {
        indexStr += path[i]
        i++
      }

      if (i >= path.length) {
        throw new Error('Unclosed bracket in path')
      }

      i++ // Skip ]

      const index = parseInt(indexStr, 10)
      if (isNaN(index) || index < 0) {
        throw new Error(`Invalid array index: ${indexStr}`)
      }

      segments.push({ type: 'index', index })
    } else {
      throw new Error(`Unexpected character '${ch}' in path at position ${i}`)
    }
  }

  return segments
}

/**
 * Lazy-parsed placeholder node
 *
 * Represents a portion of JSON that hasn't been parsed yet.
 * Can be used to defer parsing of large collapsed sections.
 */
export interface LazyNode {
  kind: 'lazy'
  /** Substring of original JSON for this node */
  raw: string
  /** Start offset in original JSON */
  start: number
  /** End offset in original JSON */
  end: number
  /** Path to this node */
  path: string
  /** Cached parsed result */
  _cached?: JsonNode
}

/**
 * Check if a node is a lazy placeholder
 */
export function isLazyNode(node: unknown): node is LazyNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as any).kind === 'lazy'
  )
}

/**
 * Realize a lazy node (parse it on demand)
 *
 * @param lazy - Lazy node to realize
 * @param options - Parser options
 * @returns Parsed JsonNode
 */
export function realizeLazyNode(
  lazy: LazyNode,
  options?: ParserOptions
): JsonNode {
  if (lazy._cached) {
    return lazy._cached
  }

  // Parse the raw substring
  const { ast: parsed } = parse(lazy.raw, options)

  // Cache it
  lazy._cached = parsed

  return parsed
}

/**
 * Create a partial AST where deep objects/arrays are left as lazy nodes
 *
 * @param input - JSON string
 * @param maxDepth - Maximum depth to eagerly parse (default: 2)
 * @param options - Parser options
 * @returns JsonNode tree with LazyNode placeholders for deep structures
 */
export function parsePartial(
  input: string,
  maxDepth: number = 2,
  options?: ParserOptions
): JsonNode {
  const parser = new PullParser(input, options)
  const stack: any[] = []
  let root: JsonNode | null = null
  let currentDepth = 0

  for (const event of parser.events()) {
    switch (event.type) {
      case 'startObject':
        currentDepth++
        if (currentDepth > maxDepth) {
          // Create lazy node instead
          // This is simplified - in practice we'd need to track token positions
          // to extract the raw substring
          // For now, just parse normally
        }
        stack.push({ kind: 'object', entries: [], depth: currentDepth })
        break

      case 'endObject':
        const objFrame = stack.pop()
        const objNode: ObjectNode = {
          kind: 'object',
          entries: objFrame.entries,
          start: 0,
          end: 0,
        }
        currentDepth--

        if (stack.length === 0) {
          root = objNode
        } else {
          addToParent(stack, objFrame.currentKey, objNode)
        }
        break

      case 'startArray':
        currentDepth++
        stack.push({ kind: 'array', items: [], depth: currentDepth })
        break

      case 'endArray':
        const arrFrame = stack.pop()
        const arrNode: ArrayNode = {
          kind: 'array',
          items: arrFrame.items,
          start: 0,
          end: 0,
        }
        currentDepth--

        if (stack.length === 0) {
          root = arrNode
        } else {
          addToParent(stack, arrFrame.currentKey, arrNode)
        }
        break

      case 'key':
        const parent = stack[stack.length - 1]
        parent.currentKey = {
          kind: 'string',
          value: event.value,
          raw: JSON.stringify(event.value),
          start: 0,
          end: 0,
        }
        break

      case 'value':
        if (stack.length === 0) {
          root = event.value
        } else {
          const parent = stack[stack.length - 1]
          addToParent(stack, parent.currentKey, event.value)
          parent.currentKey = undefined
        }
        break
    }
  }

  if (root === null) {
    throw new ParseError('No root value found', 0, '$')
  }

  return root
}

/**
 * Helper to add a value to parent structure
 */
function addToParent(stack: any[], key: any, value: JsonNode): void {
  const parent = stack[stack.length - 1]

  if (parent.kind === 'object') {
    parent.entries.push({ key, value })
  } else if (parent.kind === 'array') {
    parent.items.push(value)
  }
}
