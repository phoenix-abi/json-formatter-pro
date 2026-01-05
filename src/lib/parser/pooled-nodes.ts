/**
 * Poolable AST Node Types
 *
 * These are mutable versions of JsonNode types optimized for object pooling.
 * Each type implements reset() to allow reuse across multiple parse operations.
 */

import type { Poolable } from './object-pool'
import type {
  JsonNode,
  ObjectNode,
  ArrayNode,
  JsonString,
  JsonNumber,
  JsonBoolean,
  JsonNull,
} from './types'

/**
 * Poolable Object Node
 */
export class PooledObjectNode implements Poolable, ObjectNode {
  kind: 'object' = 'object'
  entries: Array<{ key: JsonString; value: JsonNode }> = []
  start: number = 0
  end: number = 0

  init(
    entries: Array<{ key: JsonString; value: JsonNode }>,
    start: number,
    end: number
  ): this {
    this.entries = entries
    this.start = start
    this.end = end
    return this
  }

  reset(): void {
    this.entries = []
    this.start = 0
    this.end = 0
  }
}

/**
 * Poolable Array Node
 */
export class PooledArrayNode implements Poolable, ArrayNode {
  kind: 'array' = 'array'
  items: JsonNode[] = []
  start: number = 0
  end: number = 0

  init(items: JsonNode[], start: number, end: number): this {
    this.items = items
    this.start = start
    this.end = end
    return this
  }

  reset(): void {
    this.items = []
    this.start = 0
    this.end = 0
  }
}

/**
 * Poolable String Node
 */
export class PooledStringNode implements Poolable, JsonString {
  kind: 'string' = 'string'
  value: string = ''
  raw: string = ''
  start: number = 0
  end: number = 0

  init(value: string, raw: string, start: number, end: number): this {
    this.value = value
    this.raw = raw
    this.start = start
    this.end = end
    return this
  }

  reset(): void {
    this.value = ''
    this.raw = ''
    this.start = 0
    this.end = 0
  }
}

/**
 * Poolable Number Node
 */
export class PooledNumberNode implements Poolable, JsonNumber {
  kind: 'number' = 'number'
  value?: number
  bigInt?: bigint
  decimal?: string
  raw: string = ''
  start: number = 0
  end: number = 0

  init(
    raw: string,
    start: number,
    end: number,
    value?: number,
    bigInt?: bigint,
    decimal?: string
  ): this {
    this.raw = raw
    this.start = start
    this.end = end
    this.value = value
    this.bigInt = bigInt
    this.decimal = decimal
    return this
  }

  reset(): void {
    this.value = undefined
    this.bigInt = undefined
    this.decimal = undefined
    this.raw = ''
    this.start = 0
    this.end = 0
  }
}

/**
 * Poolable Boolean Node
 */
export class PooledBooleanNode implements Poolable, JsonBoolean {
  kind: 'boolean' = 'boolean'
  value: boolean = false
  raw: string = ''
  start: number = 0
  end: number = 0

  init(value: boolean, raw: string, start: number, end: number): this {
    this.value = value
    this.raw = raw
    this.start = start
    this.end = end
    return this
  }

  reset(): void {
    this.value = false
    this.raw = ''
    this.start = 0
    this.end = 0
  }
}

/**
 * Poolable Null Node
 */
export class PooledNullNode implements Poolable, JsonNull {
  kind: 'null' = 'null'
  value: null = null
  raw: string = ''
  start: number = 0
  end: number = 0

  init(raw: string, start: number, end: number): this {
    this.raw = raw
    this.start = start
    this.end = end
    return this
  }

  reset(): void {
    this.value = null
    this.raw = ''
    this.start = 0
    this.end = 0
  }
}
