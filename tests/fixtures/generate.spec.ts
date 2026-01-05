import { describe, it, expect } from 'vitest'
import {
  lcg,
  makeWideObject,
  makeDeepObject,
  makeArrayPrimitives,
  makeArrayObjects,
  makeMixed,
  makeApiResponse,
  makeTree,
  getJsonSize,
  fixtures,
} from './generate'

describe('Fixture Generator - Determinism', () => {
  describe('lcg', () => {
    it('should generate deterministic pseudo-random numbers', () => {
      const rnd1 = lcg(42)
      const rnd2 = lcg(42)

      const seq1 = [rnd1(), rnd1(), rnd1()]
      const seq2 = [rnd2(), rnd2(), rnd2()]

      expect(seq1).toEqual(seq2)
    })

    it('should generate different sequences for different seeds', () => {
      const rnd1 = lcg(42)
      const rnd2 = lcg(43)

      const seq1 = [rnd1(), rnd1(), rnd1()]
      const seq2 = [rnd2(), rnd2(), rnd2()]

      expect(seq1).not.toEqual(seq2)
    })

    it('should generate values in range [0, 1)', () => {
      const rnd = lcg(123)

      for (let i = 0; i < 100; i++) {
        const val = rnd()
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
      }
    })
  })

  describe('makeWideObject', () => {
    it('should generate objects with exact key count', () => {
      const obj = makeWideObject(10)
      expect(Object.keys(obj).length).toBe(10)
    })

    it('should generate deterministic objects', () => {
      const obj1 = makeWideObject(10, 42)
      const obj2 = makeWideObject(10, 42)

      expect(obj1).toEqual(obj2)
    })

    it('should use predictable key names', () => {
      const obj = makeWideObject(5, 42)
      const keys = Object.keys(obj)

      expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4'])
    })

    it('should include variety of value types', () => {
      const obj = makeWideObject(20, 42)
      const values = Object.values(obj)

      const types = new Set(values.map(v => typeof v === 'object' ? 'null' : typeof v))

      expect(types.has('number')).toBe(true)
      expect(types.has('string')).toBe(true)
      expect(types.has('boolean')).toBe(true)
      expect(types.has('null')).toBe(true)
    })

    it('should generate different objects with different seeds', () => {
      const obj1 = makeWideObject(10, 42)
      const obj2 = makeWideObject(10, 43)

      expect(obj1).not.toEqual(obj2)
    })
  })

  describe('makeDeepObject', () => {
    it('should generate objects with exact depth', () => {
      const obj = makeDeepObject(8, 42)

      let depth = 0
      let current = obj

      while (current && typeof current === 'object' && !current.leaf) {
        depth++
        const keys = Object.keys(current).filter(k => k.startsWith('level_'))
        expect(keys.length).toBe(1)
        current = current[keys[0]]
      }

      expect(depth).toBe(8)
    })

    it('should generate deterministic deep objects', () => {
      const obj1 = makeDeepObject(8, 42)
      const obj2 = makeDeepObject(8, 42)

      expect(obj1).toEqual(obj2)
    })

    it('should have leaf node at bottom', () => {
      const obj = makeDeepObject(5, 42)

      let current = obj
      for (let i = 0; i < 5; i++) {
        const keys = Object.keys(current).filter(k => k.startsWith('level_'))
        current = current[keys[0]]
      }

      expect(current).toHaveProperty('leaf', true)
      expect(current).toHaveProperty('value')
      expect(current).toHaveProperty('name')
    })
  })

  describe('makeArrayPrimitives', () => {
    it('should generate arrays with exact length', () => {
      const arr = makeArrayPrimitives(30)
      expect(arr.length).toBe(30)
    })

    it('should generate deterministic arrays', () => {
      const arr1 = makeArrayPrimitives(30, 42)
      const arr2 = makeArrayPrimitives(30, 42)

      expect(arr1).toEqual(arr2)
    })

    it('should include variety of primitive types', () => {
      const arr = makeArrayPrimitives(30, 42)

      const types = new Set(arr.map(v => typeof v === 'object' ? 'null' : typeof v))

      expect(types.has('number')).toBe(true)
      expect(types.has('string')).toBe(true)
      expect(types.has('boolean')).toBe(true)
      expect(types.has('null')).toBe(true)
    })
  })

  describe('makeArrayObjects', () => {
    it('should generate arrays with exact object count', () => {
      const arr = makeArrayObjects(10, 5)
      expect(arr.length).toBe(10)
    })

    it('should generate objects with correct key count', () => {
      const arr = makeArrayObjects(10, 5, 42)

      arr.forEach(obj => {
        expect(Object.keys(obj).length).toBe(5)
        expect(obj).toHaveProperty('id')
      })
    })

    it('should generate deterministic array of objects', () => {
      const arr1 = makeArrayObjects(10, 5, 42)
      const arr2 = makeArrayObjects(10, 5, 42)

      expect(arr1).toEqual(arr2)
    })

    it('should have sequential IDs', () => {
      const arr = makeArrayObjects(10, 3, 42)

      arr.forEach((obj, i) => {
        expect(obj.id).toBe(i)
      })
    })
  })

  describe('makeMixed', () => {
    it('should generate structures close to target size', () => {
      const targetBytes = 1024
      const obj = makeMixed(targetBytes, 42)
      const actualBytes = JSON.stringify(obj).length

      // Allow generous tolerance due to metadata overhead
      // (actual size includes keys, formatting, and structural overhead)
      expect(actualBytes).toBeGreaterThan(targetBytes * 0.5)
      expect(actualBytes).toBeLessThan(targetBytes * 3)
    })

    it('should generate deterministic mixed structures', () => {
      const obj1 = makeMixed(1024, 42)
      const obj2 = makeMixed(1024, 42)

      expect(obj1).toEqual(obj2)
    })

    it('should include arrays and objects', () => {
      const obj = makeMixed(1024, 42)

      const hasArray = Object.values(obj).some(v => Array.isArray(v))
      const hasObject = Object.values(obj).some(v =>
        v && typeof v === 'object' && !Array.isArray(v)
      )

      expect(hasArray).toBe(true)
      expect(hasObject).toBe(true)
    })
  })

  describe('makeApiResponse', () => {
    it('should have API response structure', () => {
      const response = makeApiResponse(10, 42)

      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('timestamp')
      expect(response).toHaveProperty('data')
      expect(response).toHaveProperty('metadata')
      expect(Array.isArray(response.data)).toBe(true)
    })

    it('should include correct number of items', () => {
      const response = makeApiResponse(10, 42)
      expect(response.data.length).toBe(10)
    })

    it('should be deterministic', () => {
      const resp1 = makeApiResponse(10, 42)
      const resp2 = makeApiResponse(10, 42)

      expect(resp1).toEqual(resp2)
    })
  })

  describe('makeTree', () => {
    it('should create tree with correct breadth', () => {
      const tree = makeTree(3, 2, 42)

      expect(tree.children.length).toBe(2)
    })

    it('should create leaf nodes at specified depth', () => {
      const tree = makeTree(2, 2, 42)

      expect(tree.type).toBe('node')
      expect(tree.children[0].type).toBe('node')
      expect(tree.children[0].children[0].type).toBe('leaf')
    })

    it('should be deterministic', () => {
      const tree1 = makeTree(3, 2, 42)
      const tree2 = makeTree(3, 2, 42)

      expect(tree1).toEqual(tree2)
    })
  })

  describe('getJsonSize', () => {
    it('should return correct size for simple values', () => {
      expect(getJsonSize(42)).toBe(2)
      expect(getJsonSize('hello')).toBe(7) // "hello" with quotes
      expect(getJsonSize(true)).toBe(4)
      expect(getJsonSize(null)).toBe(4)
    })

    it('should return correct size for objects', () => {
      const obj = { a: 1 }
      expect(getJsonSize(obj)).toBe(JSON.stringify(obj).length)
    })

    it('should return correct size for arrays', () => {
      const arr = [1, 2, 3]
      expect(getJsonSize(arr)).toBe(JSON.stringify(arr).length)
    })
  })
})

describe('Fixture Generator - Named Fixtures', () => {
  describe('Small fixtures', () => {
    it('should generate small_flat with appropriate size', () => {
      const obj = fixtures.small_flat()
      const size = getJsonSize(obj)

      expect(size).toBeGreaterThan(100)
      expect(size).toBeLessThan(2000)
    })

    it('should generate small_deep with appropriate depth', () => {
      const obj = fixtures.small_deep()
      const size = getJsonSize(obj)

      expect(size).toBeGreaterThan(100)
      expect(size).toBeLessThan(2000)
    })

    it('should generate consistent small fixtures', () => {
      const obj1 = fixtures.small_mixed()
      const obj2 = fixtures.small_mixed()

      expect(obj1).toEqual(obj2)
    })
  })

  describe('Medium fixtures', () => {
    it('should generate medium_flat with appropriate size', () => {
      const obj = fixtures.medium_flat()
      const size = getJsonSize(obj)

      expect(size).toBeGreaterThan(10 * 1024)
      expect(size).toBeLessThan(200 * 1024)
    })

    it('should generate medium_mixed with appropriate size', () => {
      const obj = fixtures.medium_mixed()
      const size = getJsonSize(obj)

      expect(size).toBeGreaterThan(50 * 1024)
      expect(size).toBeLessThan(200 * 1024)
    })
  })

  describe('Large fixtures', () => {
    it('should generate large_flat with appropriate size', () => {
      const obj = fixtures.large_flat()
      const size = getJsonSize(obj)

      expect(size).toBeGreaterThan(200 * 1024)
      expect(size).toBeLessThan(2 * 1024 * 1024)
    })

    it('should generate large_mixed with appropriate size', () => {
      const obj = fixtures.large_mixed()
      const size = getJsonSize(obj)

      expect(size).toBeGreaterThan(500 * 1024)
      expect(size).toBeLessThan(2 * 1024 * 1024)
    })
  })

  describe('All fixtures determinism', () => {
    it('should generate consistent results across all fixtures', () => {
      const fixtureNames = Object.keys(fixtures) as Array<keyof typeof fixtures>

      fixtureNames.forEach(name => {
        const fixture1 = fixtures[name]()
        const fixture2 = fixtures[name]()

        expect(fixture1).toEqual(fixture2)
      })
    })
  })
})
