/**
 * Deterministic JSON Fixture Generator
 *
 * This module provides utilities to generate JSON fixtures with predictable
 * structure and content for performance benchmarking and testing.
 *
 * ## Determinism
 * All generators use a seeded Linear Congruential Generator (LCG) for
 * pseudo-random values, ensuring the same output across runs and environments.
 *
 * ## Size Categories
 * - Small: ~0.2-1 KB (quick tests, baseline)
 * - Medium: ~20-100 KB (realistic API responses)
 * - Large: ~1-2 MB (stress testing, edge cases)
 *
 * ## Shape Categories
 * - flat_object_wide: Many keys at one level, primitive values
 * - deep_object: Single-child nesting to specified depth
 * - array_primitives: Arrays of numbers, strings, booleans
 * - array_objects: Arrays of small objects
 * - mixed: Combination of arrays and objects with varied types
 */

/**
 * Linear Congruential Generator for deterministic pseudo-random numbers.
 * Returns values in the range [0, 1).
 *
 * @param seed - Initial seed value (default: 123456789)
 * @returns Function that generates next pseudo-random number
 */
export function lcg(seed = 123456789): () => number {
  let s = BigInt(seed)
  const a = 1664525n
  const c = 1013904223n
  const m = 2n ** 32n

  return () => {
    s = (a * s + c) % m
    return Number(s) / Number(m)
  }
}

/**
 * Generate a wide object with many keys at one level.
 * Keys are deterministic (k0, k1, ...) with pseudo-random primitive values.
 *
 * @param keys - Number of keys to generate
 * @param seed - Random seed for value generation
 * @returns Object with specified number of keys
 */
export function makeWideObject(keys: number, seed = 42): Record<string, any> {
  const rnd = lcg(seed)
  const obj: Record<string, any> = {}

  for (let i = 0; i < keys; i++) {
    const type = i % 5
    obj[`k${i}`] =
      type === 0 ? Math.floor(rnd() * 1e6) // integer
      : type === 1 ? `value_${i}_${Math.floor(rnd() * 1000)}` // string
      : type === 2 ? rnd() > 0.5 // boolean
      : type === 3 ? null // null
      : rnd() * 1000 // float
  }

  return obj
}

/**
 * Generate a deeply nested object with single-child nesting.
 * Each level has one key containing the next level.
 *
 * @param depth - Nesting depth (number of levels)
 * @param seed - Random seed for leaf values
 * @returns Deeply nested object
 */
export function makeDeepObject(depth: number, seed = 42): any {
  const rnd = lcg(seed)
  let obj: any = {
    leaf: true,
    value: Math.floor(rnd() * 1000),
    name: 'leaf_node',
  }

  for (let i = 0; i < depth; i++) {
    obj = {
      [`level_${depth - i}`]: obj,
      depth: depth - i,
    }
  }

  return obj
}

/**
 * Generate an array of primitive values (numbers, strings, booleans, null).
 *
 * @param n - Array length
 * @param seed - Random seed for value generation
 * @returns Array of mixed primitive values
 */
export function makeArrayPrimitives(n: number, seed = 42): any[] {
  const rnd = lcg(seed)
  const arr: any[] = []

  for (let i = 0; i < n; i++) {
    const type = i % 5
    arr.push(
      type === 0 ? Math.floor(rnd() * 1e6) // integer
      : type === 1 ? `item_${i}` // string
      : type === 2 ? rnd() > 0.5 // boolean
      : type === 3 ? null // null
      : rnd() * 1000 // float
    )
  }

  return arr
}

/**
 * Generate an array of small objects.
 * Each object has k keys with primitive values.
 *
 * @param n - Number of objects in array
 * @param k - Number of keys per object
 * @param seed - Random seed for value generation
 * @returns Array of objects
 */
export function makeArrayObjects(n: number, k = 5, seed = 42): any[] {
  const rnd = lcg(seed + 1000) // Different seed for variety
  const arr: any[] = []

  for (let i = 0; i < n; i++) {
    const obj: Record<string, any> = { id: i }

    for (let j = 0; j < k - 1; j++) {
      const type = (i + j) % 4
      obj[`field_${j}`] =
        type === 0 ? Math.floor(rnd() * 1000)
        : type === 1 ? `value_${i}_${j}`
        : type === 2 ? rnd() > 0.5
        : null
    }

    arr.push(obj)
  }

  return arr
}

/**
 * Generate a mixed structure combining arrays and objects.
 * Assembles structure until approximate target byte size is reached.
 *
 * @param targetBytes - Approximate target size in bytes
 * @param seed - Random seed for value generation
 * @returns Mixed JSON structure
 */
export function makeMixed(targetBytes: number, seed = 42): any {
  const rnd = lcg(seed)
  let currentSize = 2 // Start with {}

  const root: Record<string, any> = {
    id: Math.floor(rnd() * 1e6),
    timestamp: '2024-01-01T00:00:00Z',
    active: true,
  }

  currentSize += JSON.stringify(root).length

  // Add arrays
  let arrayIndex = 0
  while (currentSize < targetBytes * 0.4) {
    const arraySize = Math.floor(rnd() * 20) + 5
    const arr = makeArrayPrimitives(arraySize, seed + arrayIndex)
    root[`array_${arrayIndex}`] = arr
    currentSize += JSON.stringify(arr).length
    arrayIndex++
  }

  // Add nested objects
  let objIndex = 0
  while (currentSize < targetBytes * 0.7) {
    const keyCount = Math.floor(rnd() * 10) + 5
    const obj = makeWideObject(keyCount, seed + objIndex + 1000)
    root[`object_${objIndex}`] = obj
    currentSize += JSON.stringify(obj).length
    objIndex++
  }

  // Add array of objects
  let arrayObjIndex = 0
  while (currentSize < targetBytes * 0.9) {
    const n = Math.floor(rnd() * 10) + 3
    const k = Math.floor(rnd() * 5) + 3
    const arrObj = makeArrayObjects(n, k, seed + arrayObjIndex + 2000)
    root[`items_${arrayObjIndex}`] = arrObj
    currentSize += JSON.stringify(arrObj).length
    arrayObjIndex++
  }

  return root
}

/**
 * Generate a realistic API response structure.
 * Useful for testing common API payload patterns.
 *
 * @param itemCount - Number of items in the response
 * @param seed - Random seed for value generation
 * @returns API response-like structure
 */
export function makeApiResponse(itemCount: number, seed = 42): any {
  const rnd = lcg(seed)

  return {
    status: 'success',
    timestamp: '2024-01-01T00:00:00Z',
    page: 1,
    per_page: itemCount,
    total: itemCount * 10,
    data: makeArrayObjects(itemCount, 8, seed),
    metadata: {
      request_id: `req_${Math.floor(rnd() * 1e9)}`,
      duration_ms: Math.floor(rnd() * 1000),
      cached: rnd() > 0.5,
    },
  }
}

/**
 * Generate a deeply nested tree structure.
 * Each node has multiple children, creating a tree with specified depth and breadth.
 *
 * @param depth - Tree depth
 * @param breadth - Number of children per node
 * @param seed - Random seed for value generation
 * @returns Tree structure
 */
export function makeTree(depth: number, breadth: number, seed = 42): any {
  const rnd = lcg(seed + depth * 100)

  if (depth === 0) {
    return {
      type: 'leaf',
      value: Math.floor(rnd() * 1000),
      name: `leaf_${Math.floor(rnd() * 100)}`,
    }
  }

  const children: any[] = []
  for (let i = 0; i < breadth; i++) {
    children.push(makeTree(depth - 1, breadth, seed + i))
  }

  return {
    type: 'node',
    depth,
    children,
    id: Math.floor(rnd() * 1e6),
  }
}

/**
 * Get the approximate size in bytes of a JSON value.
 *
 * @param value - JSON value to measure
 * @returns Size in bytes
 */
export function getJsonSize(value: any): number {
  return JSON.stringify(value).length
}

/**
 * Named fixture generators for specific test scenarios.
 * These provide standard fixtures with known characteristics.
 */
export const fixtures = {
  /** Small flat object (~500 bytes) */
  small_flat: () => makeWideObject(20, 42),

  /** Small deep object (~300 bytes, depth 8) */
  small_deep: () => makeDeepObject(8, 42),

  /** Small array of primitives (~200 bytes) */
  small_array_primitives: () => makeArrayPrimitives(30, 42),

  /** Small array of objects (~800 bytes) */
  small_array_objects: () => makeArrayObjects(10, 5, 42),

  /** Small mixed structure (~1KB) */
  small_mixed: () => makeMixed(1024, 42),

  /** Medium flat object (~50KB) */
  medium_flat: () => makeWideObject(2000, 42),

  /** Medium deep object (~2KB, depth 12) */
  medium_deep: () => makeDeepObject(12, 42),

  /** Medium array of primitives (~20KB) */
  medium_array_primitives: () => makeArrayPrimitives(3000, 42),

  /** Medium array of objects (~60KB) */
  medium_array_objects: () => makeArrayObjects(500, 8, 42),

  /** Medium mixed structure (~80KB) */
  medium_mixed: () => makeMixed(80 * 1024, 42),

  /** Large flat object (~500KB) */
  large_flat: () => makeWideObject(20000, 42),

  /** Large array of primitives (~500KB) */
  large_array_primitives: () => makeArrayPrimitives(80000, 42),

  /** Large array of objects (~1.5MB) */
  large_array_objects: () => makeArrayObjects(10000, 10, 42),

  /** Large mixed structure (~1MB) */
  large_mixed: () => makeMixed(1024 * 1024, 42),

  /** API response with 100 items (~20KB) */
  api_response_100: () => makeApiResponse(100, 42),

  /** API response with 1000 items (~200KB) */
  api_response_1000: () => makeApiResponse(1000, 42),

  /** Tree structure (depth 6, breadth 3) - wide but not too deep */
  tree_medium: () => makeTree(6, 3, 42),
}
