/**
 * Generic Object Pool
 *
 * Reduces GC pressure by reusing objects instead of creating new ones.
 * Critical for parser performance where millions of AST nodes are created.
 */

export interface Poolable {
  /** Reset object to initial state for reuse */
  reset(): void
}

export interface PoolStats {
  /** Total objects created by pool */
  created: number
  /** Current number of objects in use */
  inUse: number
  /** Current number of available objects */
  available: number
  /** Peak number of objects in use */
  peakUsage: number
  /** Number of times an object was acquired */
  acquireCount: number
  /** Number of times an object was released */
  releaseCount: number
}

/**
 * Generic object pool with configurable factory and reset functions
 */
export class ObjectPool<T extends Poolable> {
  private available: T[] = []
  private inUse = new Set<T>()
  private stats: PoolStats = {
    created: 0,
    inUse: 0,
    available: 0,
    peakUsage: 0,
    acquireCount: 0,
    releaseCount: 0,
  }

  constructor(
    private factory: () => T,
    private initialSize: number = 0,
    private maxSize: number = Infinity
  ) {
    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory()
      this.available.push(obj)
      this.stats.created++
      this.stats.available++
    }
  }

  /**
   * Acquire an object from the pool
   * Creates a new object if pool is empty and under max size
   */
  acquire(): T {
    let obj: T

    if (this.available.length > 0) {
      // Reuse existing object
      obj = this.available.pop()!
      this.stats.available--
    } else if (this.stats.created < this.maxSize) {
      // Create new object
      obj = this.factory()
      this.stats.created++
    } else {
      // Pool exhausted - create temporary object that won't be tracked
      // This prevents memory leaks when maxSize is exceeded
      return this.factory()
    }

    this.inUse.add(obj)
    this.stats.inUse++
    this.stats.acquireCount++

    if (this.stats.inUse > this.stats.peakUsage) {
      this.stats.peakUsage = this.stats.inUse
    }

    return obj
  }

  /**
   * Release an object back to the pool
   * Object is reset and made available for reuse
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      // Object not from this pool or already released
      return
    }

    // Reset object to clean state
    obj.reset()

    this.inUse.delete(obj)
    this.available.push(obj)

    this.stats.inUse--
    this.stats.available++
    this.stats.releaseCount++
  }

  /**
   * Release all objects back to the pool
   * Useful for cleaning up after a parse operation
   */
  releaseAll(): void {
    for (const obj of this.inUse) {
      obj.reset()
      this.available.push(obj)
    }

    this.stats.available += this.stats.inUse
    this.stats.releaseCount += this.stats.inUse
    this.stats.inUse = 0

    this.inUse.clear()
  }

  /**
   * Clear the entire pool and release all memory
   */
  clear(): void {
    this.available = []
    this.inUse.clear()
    this.stats = {
      created: 0,
      inUse: 0,
      available: 0,
      peakUsage: 0,
      acquireCount: 0,
      releaseCount: 0,
    }
  }

  /**
   * Get pool statistics for monitoring and debugging
   */
  getStats(): Readonly<PoolStats> {
    return { ...this.stats }
  }

  /**
   * Get current pool size (available + in use)
   */
  get size(): number {
    return this.stats.created
  }
}
