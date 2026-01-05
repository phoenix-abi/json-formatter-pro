/**
 * Type detection and type guards for JSON values.
 *
 * Provides runtime type checking with TypeScript type narrowing support.
 */

import type { JsonValue, JsonArray, JsonObject } from './types'
import {
  TYPE_STRING,
  TYPE_NUMBER,
  TYPE_BOOL,
  TYPE_NULL,
  TYPE_ARRAY,
  TYPE_OBJECT,
} from './constants'

/**
 * Type guard to check if a value is a JSON array.
 *
 * @param value - The value to check
 * @returns True if the value is an array
 */
export function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value)
}

/**
 * Type guard to check if a value is a JSON object (not array, not null).
 *
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
export function isJsonObject(value: JsonValue): value is JsonObject {
  // Check for null and non-object types first
  if (value === null || typeof value !== 'object') {
    return false
  }

  // Exclude arrays (arrays are objects in JavaScript)
  return !Array.isArray(value)
}

/**
 * Determines the JSON type of a value and returns a type constant.
 *
 * This is used for switch statements and rendering logic.
 *
 * @param value - The JSON value to classify
 * @returns A numeric type constant (TYPE_STRING, TYPE_NUMBER, etc.)
 */
export function getValueType(value: JsonValue): number {
  // Check primitive types first (most common, fastest)
  const primitiveType = typeof value

  if (primitiveType === 'string') {
    return TYPE_STRING
  }

  if (primitiveType === 'number') {
    return TYPE_NUMBER
  }

  if (primitiveType === 'boolean') {
    return TYPE_BOOL
  }

  // Handle null (typeof null === 'object' in JavaScript)
  if (value === null) {
    return TYPE_NULL
  }

  // Handle arrays before objects (arrays are objects)
  if (Array.isArray(value)) {
    return TYPE_ARRAY
  }

  // Everything else is an object
  return TYPE_OBJECT
}
