/**
 * Full AST Parser
 *
 * Builds a complete JsonNode AST from JSON input.
 * Uses the PullParser internally and reconstructs the tree from events.
 */

import { PullParser } from './pull-parser'
import { parseDirect } from './parse-direct'
import type { JsonNode, ObjectNode, ArrayNode, JsonString } from './types'
import type { ParserOptions } from './events'
import { ParseError } from './events'

/**
 * Parse JSON into a full AST
 *
 * @param input - JSON string to parse
 * @param options - Parser configuration options
 * @returns ParserResult containing AST and original input for on-demand raw computation
 *
 * @example
 * ```typescript
 * const { ast, input } = parse('{"name": "Alice", "age": 30}')
 * console.log(ast.kind) // 'object'
 * console.log(ast.entries.length) // 2
 * ```
 */
export function parse(input: string, options?: ParserOptions): import('./types').ParserResult {
  // Use optimized direct parser instead of event-based parser
  // This eliminates one full traversal for better performance
  return parseDirect(input, options)
}

/**
 * Parse JSON using event-based parser (legacy)
 *
 * This is the original implementation using PullParser events.
 * Kept for compatibility and testing purposes.
 */
export function parseWithEvents(input: string, options?: ParserOptions): JsonNode {
  const parser = new PullParser(input, options)

  // Stack to track nested structures
  interface StackFrame {
    kind: 'object' | 'array'
    node: Partial<ObjectNode> | Partial<ArrayNode>
    currentKey?: JsonString
  }

  const stack: StackFrame[] = []
  let root: JsonNode | null = null

  for (const event of parser.events()) {
    switch (event.type) {
      case 'startObject': {
        const frame: StackFrame = {
          kind: 'object',
          node: {
            kind: 'object',
            entries: [],
          },
        }
        stack.push(frame)
        break
      }

      case 'endObject': {
        const frame = stack.pop()
        if (!frame || frame.kind !== 'object') {
          throw new ParseError('Unexpected endObject', 0, event.path)
        }

        // Infer start/end from entries or set to 0
        const objNode = frame.node as Partial<ObjectNode>
        const entries = objNode.entries!

        let start = 0
        let end = 0

        if (entries.length > 0) {
          start = entries[0].key.start
          end = entries[entries.length - 1].value.end
        }

        const completedNode: ObjectNode = {
          kind: 'object',
          entries: entries,
          start,
          end,
        }

        if (stack.length === 0) {
          root = completedNode
        } else {
          addValueToParent(stack, completedNode)
        }
        break
      }

      case 'startArray': {
        const frame: StackFrame = {
          kind: 'array',
          node: {
            kind: 'array',
            items: [],
          },
        }
        stack.push(frame)
        break
      }

      case 'endArray': {
        const frame = stack.pop()
        if (!frame || frame.kind !== 'array') {
          throw new ParseError('Unexpected endArray', 0, event.path)
        }

        // Infer start/end from items
        const arrNode = frame.node as Partial<ArrayNode>
        const items = arrNode.items!

        let start = 0
        let end = 0

        if (items.length > 0) {
          start = items[0].start
          end = items[items.length - 1].end
        }

        const completedNode: ArrayNode = {
          kind: 'array',
          items: items,
          start,
          end,
        }

        if (stack.length === 0) {
          root = completedNode
        } else {
          addValueToParent(stack, completedNode)
        }
        break
      }

      case 'key': {
        const frame = stack[stack.length - 1]
        if (!frame || frame.kind !== 'object') {
          throw new ParseError('Key event outside of object', 0, event.path)
        }

        // Store the key for the next value event
        // We need to create a JsonString node for the key
        // Since we don't have position info from the event, we'll set start/end to 0
        frame.currentKey = {
          kind: 'string',
          value: event.value,
          raw: JSON.stringify(event.value),
          start: 0,
          end: 0,
        }
        break
      }

      case 'value': {
        const value = event.value

        if (stack.length === 0) {
          // Root value (primitive)
          root = value
        } else {
          addValueToParent(stack, value)
        }
        break
      }
    }
  }

  if (root === null) {
    throw new ParseError('No root value found', 0, '$')
  }

  return root
}

/**
 * Helper: Add a value to the parent structure
 */
function addValueToParent(stack: any[], value: JsonNode): void {
  const parent = stack[stack.length - 1]

  if (parent.kind === 'object') {
    if (!parent.currentKey) {
      throw new ParseError('Value without key in object', 0, '$')
    }

    const objNode = parent.node as Partial<ObjectNode>
    objNode.entries!.push({
      key: parent.currentKey,
      value: value,
    })

    parent.currentKey = undefined
  } else if (parent.kind === 'array') {
    const arrNode = parent.node as Partial<ArrayNode>
    arrNode.items!.push(value)
  }
}
