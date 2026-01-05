// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { buildDom } from '../../../src/lib/buildDom'

describe('Lazy Rendering', () => {
  describe('Default behavior (no lazy threshold)', () => {
    it('renders eagerly without lazyThreshold option', () => {
      const data = [1, 2, 3]
      const el = buildDom(data as any, false)

      // blockInner should be present immediately
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      expect(blockInner?.children.length).toBe(3)
    })

    it('renders large objects eagerly without lazyThreshold option', () => {
      const data = { a: 1, b: 2, c: 3 }
      const el = buildDom(data, false)

      // blockInner should be present immediately
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      expect(blockInner?.children.length).toBe(3)
    })
  })

  describe('Lazy threshold for arrays', () => {
    it('renders eagerly when size < lazyThreshold', () => {
      const data = [1, 2]
      const el = buildDom(data as any, false, undefined as any, { lazyThreshold: 3 })

      // Should be rendered eagerly
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      expect(blockInner?.children.length).toBe(2)
    })

    it('defers rendering when size >= lazyThreshold', () => {
      const data = [1, 2, 3]
      const el = buildDom(data as any, false, undefined as any, { lazyThreshold: 3 })

      // Before expansion, no blockInner children present
      expect(el.querySelector('.blockInner')).toBeNull()

      // Expander should be present
      const expander = el.querySelector('.e')
      expect(expander).not.toBeNull()
    })

    it('populates children on expander click', () => {
      const data = [1, 2, 3]
      const el = buildDom(data as any, false, undefined as any, { lazyThreshold: 3 })

      // Before click, no blockInner
      expect(el.querySelector('.blockInner')).toBeNull()

      // Click expander
      const expander = el.querySelector('.e') as HTMLElement
      expander?.dispatchEvent(new Event('click', { bubbles: true }))

      // After click, children appear
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      expect(blockInner?.children.length).toBe(3)
    })

    it('only populates once on multiple clicks', () => {
      const data = [1, 2, 3]
      const el = buildDom(data as any, false, undefined as any, { lazyThreshold: 3 })

      const expander = el.querySelector('.e') as HTMLElement

      // First click
      expander?.dispatchEvent(new Event('click', { bubbles: true }))
      const firstBlockInner = el.querySelector('.blockInner')
      expect(firstBlockInner?.children.length).toBe(3)

      // Second click shouldn't duplicate
      expander?.dispatchEvent(new Event('click', { bubbles: true }))
      const blockInners = el.querySelectorAll('.blockInner')
      expect(blockInners.length).toBe(1) // Still only one blockInner
    })
  })

  describe('Lazy threshold for objects', () => {
    it('renders eagerly when size < lazyThreshold', () => {
      const data = { a: 1, b: 2 }
      const el = buildDom(data, false, undefined as any, { lazyThreshold: 3 })

      // Should be rendered eagerly
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      expect(blockInner?.children.length).toBe(2)
    })

    it('defers rendering when size >= lazyThreshold', () => {
      const data = { a: 1, b: 2, c: 3 }
      const el = buildDom(data, false, undefined as any, { lazyThreshold: 3 })

      // Before expansion, no blockInner
      expect(el.querySelector('.blockInner')).toBeNull()
    })

    it('populates children on expander click', () => {
      const data = { a: 1, b: 2, c: 3 }
      const el = buildDom(data, false, undefined as any, { lazyThreshold: 3 })

      // Before click, no blockInner
      expect(el.querySelector('.blockInner')).toBeNull()

      // Click expander
      const expander = el.querySelector('.e') as HTMLElement
      expander?.dispatchEvent(new Event('click', { bubbles: true }))

      // After click, children appear
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      expect(blockInner?.children.length).toBe(3)
    })
  })

  describe('Custom onDemandRender handler', () => {
    it('uses custom handler when provided', () => {
      let populateCalled = false
      let populateFn: (() => void) | null = null

      const data = [1, 2, 3]
      const el = buildDom(data as any, false, undefined as any, {
        lazyThreshold: 3,
        onDemandRender: (entry, populate) => {
          populateCalled = true
          populateFn = populate
        },
      })

      // Custom handler should have been called
      expect(populateCalled).toBe(true)
      expect(populateFn).not.toBeNull()

      // Before populating, no children
      expect(el.querySelector('.blockInner')).toBeNull()

      // Manually call populate
      populateFn?.()

      // After populating, children appear
      const blockInner = el.querySelector('.blockInner')
      expect(blockInner).not.toBeNull()
      expect(blockInner?.children.length).toBe(3)
    })

    it('does not set up default click handler when custom handler provided', () => {
      const data = [1, 2, 3]
      const el = buildDom(data as any, false, undefined as any, {
        lazyThreshold: 3,
        onDemandRender: () => {
          // Custom handler that does nothing
        },
      })

      // Click expander (default handler should not be attached)
      const expander = el.querySelector('.e') as HTMLElement
      expander?.dispatchEvent(new Event('click', { bubbles: true }))

      // Children should not appear (because custom handler doesn't populate)
      expect(el.querySelector('.blockInner')).toBeNull()
    })
  })

  describe('Nested lazy rendering', () => {
    it('applies lazy threshold to nested collections', () => {
      const data = {
        outer: [1, 2, 3],
      }
      const el = buildDom(data, false, undefined as any, { lazyThreshold: 2 })

      // Outer object has 1 entry, should render eagerly
      const outerBlockInner = el.querySelector('.blockInner')
      expect(outerBlockInner).not.toBeNull()

      // Find the nested array entry (it's the value of the "outer" key)
      const entries = el.querySelectorAll('.entry')
      // First entry is the root, second is the objProp, third should be the array value
      let arrayEntry: Element | null = null
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        if (entry.querySelector('.b')?.textContent === '[') {
          arrayEntry = entry
          break
        }
      }
      expect(arrayEntry).not.toBeNull()

      // Nested array has 3 entries, should be lazy (no blockInner yet)
      const nestedBlockInner = arrayEntry?.querySelector('.blockInner')
      expect(nestedBlockInner).toBeNull()

      // Click the nested array's expander
      const nestedExpander = arrayEntry?.querySelector('.e') as HTMLElement
      expect(nestedExpander).not.toBeNull()
      nestedExpander?.dispatchEvent(new Event('click', { bubbles: true }))

      // Now nested array should be populated
      const populatedBlockInner = arrayEntry?.querySelector('.blockInner')
      expect(populatedBlockInner).not.toBeNull()
      expect(populatedBlockInner?.children.length).toBe(3)
    })
  })

  describe('Empty collections', () => {
    it('handles empty arrays with lazy threshold', () => {
      const data: any[] = []
      const el = buildDom(data, false, undefined as any, { lazyThreshold: 1 })

      // Empty array should not have blockInner (eager or lazy)
      expect(el.querySelector('.blockInner')).toBeNull()

      // Should not have expander
      expect(el.querySelector('.e')).toBeNull()
    })

    it('handles empty objects with lazy threshold', () => {
      const data = {}
      const el = buildDom(data, false, undefined as any, { lazyThreshold: 1 })

      // Empty object should not have blockInner
      expect(el.querySelector('.blockInner')).toBeNull()

      // Should not have expander
      expect(el.querySelector('.e')).toBeNull()
    })
  })

  describe('Backwards compatibility', () => {
    it('maintains exact DOM structure for eager rendering', () => {
      const data = [1, 2, 3]

      // Without options
      const eagerEl = buildDom(data as any, false)

      // With empty options
      const emptyOptsEl = buildDom(data as any, false, undefined as any, {})

      // With lazyThreshold but below threshold
      const belowThresholdEl = buildDom(data as any, false, undefined as any, {
        lazyThreshold: 10,
      })

      // All should have the same DOM structure
      expect(eagerEl.querySelector('.blockInner')?.children.length).toBe(3)
      expect(emptyOptsEl.querySelector('.blockInner')?.children.length).toBe(3)
      expect(belowThresholdEl.querySelector('.blockInner')?.children.length).toBe(3)
    })
  })
})
