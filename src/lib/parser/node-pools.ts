/**
 * AST Node Pools Manager
 *
 * Manages object pools for all JsonNode types.
 * Provides a unified interface for acquiring and releasing nodes.
 */

import { ObjectPool, type PoolStats } from './object-pool'
import {
  PooledObjectNode,
  PooledArrayNode,
  PooledStringNode,
  PooledNumberNode,
  PooledBooleanNode,
  PooledNullNode,
} from './pooled-nodes'

/**
 * Statistics for all node pools
 */
export interface NodePoolStats {
  object: PoolStats
  array: PoolStats
  string: PoolStats
  number: PoolStats
  boolean: PoolStats
  null: PoolStats
}

/**
 * Node pool manager with pools for each AST node type
 */
export class NodePools {
  private objectPool: ObjectPool<PooledObjectNode>
  private arrayPool: ObjectPool<PooledArrayNode>
  private stringPool: ObjectPool<PooledStringNode>
  private numberPool: ObjectPool<PooledNumberNode>
  private booleanPool: ObjectPool<PooledBooleanNode>
  private nullPool: ObjectPool<PooledNullNode>

  constructor(options?: {
    initialSize?: number
    maxSize?: number
  }) {
    const initialSize = options?.initialSize ?? 100
    const maxSize = options?.maxSize ?? 10000

    this.objectPool = new ObjectPool(
      () => new PooledObjectNode(),
      initialSize,
      maxSize
    )
    this.arrayPool = new ObjectPool(
      () => new PooledArrayNode(),
      initialSize,
      maxSize
    )
    this.stringPool = new ObjectPool(
      () => new PooledStringNode(),
      initialSize * 2, // Strings are more common
      maxSize * 2
    )
    this.numberPool = new ObjectPool(
      () => new PooledNumberNode(),
      initialSize,
      maxSize
    )
    this.booleanPool = new ObjectPool(
      () => new PooledBooleanNode(),
      10, // Fewer booleans typically
      1000
    )
    this.nullPool = new ObjectPool(
      () => new PooledNullNode(),
      10, // Fewer nulls typically
      1000
    )
  }

  /**
   * Acquire an object node from the pool
   */
  acquireObject(
    entries: Array<{ key: import('./types').JsonString; value: import('./types').JsonNode }>,
    start: number,
    end: number
  ): PooledObjectNode {
    return this.objectPool.acquire().init(entries, start, end)
  }

  /**
   * Acquire an array node from the pool
   */
  acquireArray(
    items: import('./types').JsonNode[],
    start: number,
    end: number
  ): PooledArrayNode {
    return this.arrayPool.acquire().init(items, start, end)
  }

  /**
   * Acquire a string node from the pool
   */
  acquireString(
    value: string,
    raw: string,
    start: number,
    end: number
  ): PooledStringNode {
    return this.stringPool.acquire().init(value, raw, start, end)
  }

  /**
   * Acquire a number node from the pool
   */
  acquireNumber(
    raw: string,
    start: number,
    end: number,
    value?: number,
    bigInt?: bigint,
    decimal?: string
  ): PooledNumberNode {
    return this.numberPool.acquire().init(raw, start, end, value, bigInt, decimal)
  }

  /**
   * Acquire a boolean node from the pool
   */
  acquireBoolean(
    value: boolean,
    raw: string,
    start: number,
    end: number
  ): PooledBooleanNode {
    return this.booleanPool.acquire().init(value, raw, start, end)
  }

  /**
   * Acquire a null node from the pool
   */
  acquireNull(raw: string, start: number, end: number): PooledNullNode {
    return this.nullPool.acquire().init(raw, start, end)
  }

  /**
   * Release all nodes back to their pools
   * Call this after parse() completes to enable node reuse
   */
  releaseAll(): void {
    this.objectPool.releaseAll()
    this.arrayPool.releaseAll()
    this.stringPool.releaseAll()
    this.numberPool.releaseAll()
    this.booleanPool.releaseAll()
    this.nullPool.releaseAll()
  }

  /**
   * Clear all pools and release memory
   */
  clear(): void {
    this.objectPool.clear()
    this.arrayPool.clear()
    this.stringPool.clear()
    this.numberPool.clear()
    this.booleanPool.clear()
    this.nullPool.clear()
  }

  /**
   * Get statistics for all pools
   */
  getStats(): NodePoolStats {
    return {
      object: this.objectPool.getStats(),
      array: this.arrayPool.getStats(),
      string: this.stringPool.getStats(),
      number: this.numberPool.getStats(),
      boolean: this.booleanPool.getStats(),
      null: this.nullPool.getStats(),
    }
  }

  /**
   * Get total number of objects across all pools
   */
  getTotalSize(): number {
    return (
      this.objectPool.size +
      this.arrayPool.size +
      this.stringPool.size +
      this.numberPool.size +
      this.booleanPool.size +
      this.nullPool.size
    )
  }

  /**
   * Get total objects in use across all pools
   */
  getTotalInUse(): number {
    const stats = this.getStats()
    return (
      stats.object.inUse +
      stats.array.inUse +
      stats.string.inUse +
      stats.number.inUse +
      stats.boolean.inUse +
      stats.null.inUse
    )
  }
}

/**
 * Global shared pool instance for parser
 * Reusing a single pool across parses provides maximum benefit
 */
let globalPools: NodePools | null = null

/**
 * Get the global shared pool instance
 * Creates it if it doesn't exist
 */
export function getGlobalPools(): NodePools {
  if (!globalPools) {
    globalPools = new NodePools()
  }
  return globalPools
}

/**
 * Reset the global pool (useful for testing)
 */
export function resetGlobalPools(): void {
  if (globalPools) {
    globalPools.clear()
  }
  globalPools = null
}
