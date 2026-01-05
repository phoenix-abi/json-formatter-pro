/**
 * Type Guards for JsonNode AST
 *
 * Provides runtime type checking for JsonNode types using TypeScript's
 * type guard feature (functions that return `value is Type`).
 */

import type {
  JsonNode,
  ObjectNode,
  ArrayNode,
  StringNode,
  NumberNode,
  BooleanNode,
  NullNode,
} from './types'

/**
 * Check if a JsonNode is an ObjectNode
 */
export function isObjectNode(node: JsonNode): node is ObjectNode {
  return node.kind === 'object'
}

/**
 * Check if a JsonNode is an ArrayNode
 */
export function isArrayNode(node: JsonNode): node is ArrayNode {
  return node.kind === 'array'
}

/**
 * Check if a JsonNode is a StringNode
 */
export function isStringNode(node: JsonNode): node is StringNode {
  return node.kind === 'string'
}

/**
 * Check if a JsonNode is a NumberNode
 */
export function isNumberNode(node: JsonNode): node is NumberNode {
  return node.kind === 'number'
}

/**
 * Check if a JsonNode is a BooleanNode
 */
export function isBooleanNode(node: JsonNode): node is BooleanNode {
  return node.kind === 'boolean'
}

/**
 * Check if a JsonNode is a NullNode
 */
export function isNullNode(node: JsonNode): node is NullNode {
  return node.kind === 'null'
}

/**
 * Check if a JsonNode is a container type (object or array)
 *
 * Useful for determining if a node has children.
 */
export function isContainerNode(node: JsonNode): node is ObjectNode | ArrayNode {
  return node.kind === 'object' || node.kind === 'array'
}

/**
 * Check if a JsonNode is a primitive type (string, number, boolean, null)
 *
 * Useful for determining if a node is a leaf in the tree.
 */
export function isPrimitiveNode(
  node: JsonNode
): node is StringNode | NumberNode | BooleanNode | NullNode {
  return (
    node.kind === 'string' ||
    node.kind === 'number' ||
    node.kind === 'boolean' ||
    node.kind === 'null'
  )
}

/**
 * Check if an unknown value is a JsonNode
 *
 * This is the primary type guard for distinguishing JsonNode from JsonValue
 * in the ParsedData union type (used by the Integration Contract).
 */
export function isJsonNode(value: unknown): value is JsonNode {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const node = value as Record<string, unknown>

  // Check for 'kind' discriminator
  if (typeof node.kind !== 'string') {
    return false
  }

  // Check for valid kind values
  const validKinds = ['object', 'array', 'string', 'number', 'boolean', 'null']
  if (!validKinds.includes(node.kind)) {
    return false
  }

  // Check for required position fields
  if (typeof node.start !== 'number' || typeof node.end !== 'number') {
    return false
  }

  return true
}
