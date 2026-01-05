/**
 * Core JSON type definitions for native JSON.parse() output.
 *
 * These types represent the standard JavaScript values that can be produced
 * by JSON.parse() according to the JSON specification (RFC 8259).
 *
 * Note: For custom parser AST types, see src/lib/parser/types.ts
 * Note: For integration contract types, see src/lib/integration/types.ts
 */

/**
 * JSON primitive types: string, number, boolean, or null
 */
export type JsonPrimitive = string | number | boolean | null

/**
 * JSON object type: key-value pairs where values are any JSON type
 */
export type JsonObject = {
  [key: string]: JsonValue
}

/**
 * JSON array type: ordered list of JSON values
 */
export type JsonArray = Array<JsonValue>

/**
 * Any valid JSON value as produced by JSON.parse()
 *
 * This is a recursive type that encompasses all possible JSON structures:
 * - Primitives: string, number, boolean, null
 * - Arrays: ordered lists of JSON values
 * - Objects: unordered key-value maps
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
