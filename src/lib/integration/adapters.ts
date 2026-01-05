/**
 * Data Adapter Implementations
 *
 * Provides concrete implementations of the DataAdapter interface
 * for different parser outputs (JSON.parse vs Custom Parser).
 */

import {
  DataAdapter,
  ParsedData,
  ValueMetadata,
  ChildEntry,
  JsonValue,
  JsonNode,
  isJsonNode,
  isJsonValue,
} from './types'
import { getValueType } from '../getValueType'
import {
  TYPE_STRING,
  TYPE_NUMBER,
  TYPE_BOOL,
  TYPE_NULL,
  TYPE_OBJECT,
  TYPE_ARRAY,
} from '../constants'

// ============================================================================
// JsonValueAdapter - For JSON.parse() values (Phase I)
// ============================================================================

/**
 * Adapter for standard JSON.parse() values
 *
 * This adapter works with the native JavaScript types returned by JSON.parse(),
 * providing a uniform interface for the renderer layer.
 */
export class JsonValueAdapter implements DataAdapter {
  getMetadata(data: ParsedData): ValueMetadata {
    if (!isJsonValue(data)) {
      throw new Error('JsonValueAdapter expects JsonValue')
    }

    const typeNum = getValueType(data as JsonValue)
    const type = this.mapTypeToString(typeNum)

    let displayValue: string | null = null
    let hasChildren = false
    let childCount = 0

    // Primitives have display values
    if (typeNum === TYPE_STRING) {
      displayValue = String(data)
    } else if (typeNum === TYPE_NUMBER) {
      displayValue = String(data)
    } else if (typeNum === TYPE_BOOL) {
      displayValue = String(data)
    } else if (typeNum === TYPE_NULL) {
      displayValue = 'null'
    }
    // Containers have children
    else if (typeNum === TYPE_OBJECT) {
      hasChildren = true
      const obj = data as Record<string, JsonValue>
      childCount = Object.keys(obj).filter((k) => obj.hasOwnProperty(k)).length
    } else if (typeNum === TYPE_ARRAY) {
      hasChildren = true
      childCount = (data as JsonValue[]).length
    }

    return {
      type,
      displayValue,
      hasChildren,
      childCount,
    }
  }

  *getChildren(data: ParsedData): IterableIterator<ChildEntry> {
    if (!isJsonValue(data)) return

    const typeNum = getValueType(data as JsonValue)

    if (typeNum === TYPE_OBJECT) {
      const obj = data as Record<string, JsonValue>
      const keys = Object.keys(obj).filter((k) => obj.hasOwnProperty(k))

      for (let i = 0; i < keys.length; i++) {
        yield {
          key: keys[i],
          value: obj[keys[i]],
          index: i,
        }
      }
    } else if (typeNum === TYPE_ARRAY) {
      const arr = data as JsonValue[]

      for (let i = 0; i < arr.length; i++) {
        yield {
          key: null,
          value: arr[i],
          index: i,
        }
      }
    }
  }

  getChild(
    data: ParsedData,
    keyOrIndex: string | number
  ): ParsedData | undefined {
    if (!isJsonValue(data)) return undefined

    const typeNum = getValueType(data as JsonValue)

    if (typeNum === TYPE_OBJECT && typeof keyOrIndex === 'string') {
      const obj = data as Record<string, JsonValue>
      return obj.hasOwnProperty(keyOrIndex) ? obj[keyOrIndex] : undefined
    } else if (typeNum === TYPE_ARRAY && typeof keyOrIndex === 'number') {
      const arr = data as JsonValue[]
      return keyOrIndex >= 0 && keyOrIndex < arr.length
        ? arr[keyOrIndex]
        : undefined
    }

    return undefined
  }

  private mapTypeToString(
    typeNum: number
  ): 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array' {
    switch (typeNum) {
      case TYPE_STRING:
        return 'string'
      case TYPE_NUMBER:
        return 'number'
      case TYPE_BOOL:
        return 'boolean'
      case TYPE_NULL:
        return 'null'
      case TYPE_OBJECT:
        return 'object'
      case TYPE_ARRAY:
        return 'array'
      default:
        return 'null'
    }
  }
}

// ============================================================================
// JsonNodeAdapter - For Custom Parser (Phase II)
// ============================================================================

/**
 * Adapter for custom parser JsonNode values
 *
 * This adapter works with the custom parser's AST nodes (JsonNode),
 * providing lossless metadata and preserving key ordering.
 *
 * Accepts optional input string for on-demand raw text computation.
 */
export class JsonNodeAdapter implements DataAdapter {
  constructor(private input?: string) {}

  getMetadata(data: ParsedData): ValueMetadata {
    if (!isJsonNode(data)) {
      throw new Error('JsonNodeAdapter expects JsonNode')
    }

    const node = data as JsonNode
    const type = this.mapKindToType(node.kind)

    let displayValue: string | null = null
    let hasChildren = false
    let childCount = 0
    let rawText: string | undefined = undefined

    // Primitives have display values
    if (node.kind === 'string') {
      displayValue = node.value
      // rawText may be undefined (omitted for memory savings in parser)
      rawText = node.raw
    } else if (node.kind === 'number') {
      // For numbers, prioritize lossless representations
      if (node.bigInt !== undefined) {
        displayValue = node.bigInt.toString()
      } else if (node.decimal !== undefined) {
        displayValue = node.decimal
      } else if (node.value !== undefined) {
        displayValue = String(node.value)
      }
      // Compute raw on-demand from input (memory optimization)
      if (this.input) {
        rawText = this.input.substring(node.start, node.end)
      } else {
        rawText = node.raw  // Fallback to stored raw (if present)
      }
    } else if (node.kind === 'boolean') {
      displayValue = String(node.value)
    } else if (node.kind === 'null') {
      displayValue = 'null'
    }
    // Containers have children
    else if (node.kind === 'object') {
      hasChildren = true
      childCount = node.entries.length
    } else if (node.kind === 'array') {
      hasChildren = true
      childCount = node.items.length
    }

    return {
      type,
      displayValue,
      hasChildren,
      childCount,
      sourceRange: { start: node.start, end: node.end },
      rawText,
    }
  }

  *getChildren(data: ParsedData): IterableIterator<ChildEntry> {
    if (!isJsonNode(data)) return

    const node = data as JsonNode

    if (node.kind === 'object') {
      for (let i = 0; i < node.entries.length; i++) {
        const entry = node.entries[i]
        yield {
          key: entry.key.value,
          value: entry.value,
          index: i,
        }
      }
    } else if (node.kind === 'array') {
      for (let i = 0; i < node.items.length; i++) {
        yield {
          key: null,
          value: node.items[i],
          index: i,
        }
      }
    }
  }

  getChild(
    data: ParsedData,
    keyOrIndex: string | number
  ): ParsedData | undefined {
    if (!isJsonNode(data)) return undefined

    const node = data as JsonNode

    if (node.kind === 'object' && typeof keyOrIndex === 'string') {
      const entry = node.entries.find((e) => e.key.value === keyOrIndex)
      return entry ? entry.value : undefined
    } else if (node.kind === 'array' && typeof keyOrIndex === 'number') {
      return keyOrIndex >= 0 && keyOrIndex < node.items.length
        ? node.items[keyOrIndex]
        : undefined
    }

    return undefined
  }

  private mapKindToType(
    kind: string
  ): 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array' {
    switch (kind) {
      case 'string':
        return 'string'
      case 'number':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'null':
        return 'null'
      case 'object':
        return 'object'
      case 'array':
        return 'array'
      default:
        return 'null'
    }
  }
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Creates appropriate adapter based on data type
 *
 * This factory function automatically selects the right adapter
 * for the given data, enabling polymorphic data handling.
 *
 * @param data - The parsed data (JsonValue or JsonNode)
 * @param input - Optional original input string for on-demand raw computation
 */
export function createAdapter(data: ParsedData, input?: string): DataAdapter {
  if (isJsonNode(data)) {
    return new JsonNodeAdapter(input)
  } else {
    return new JsonValueAdapter()
  }
}
