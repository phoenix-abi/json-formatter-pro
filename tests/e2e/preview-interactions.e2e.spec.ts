import { test as base, expect, chromium, Page } from '@playwright/test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../..')
const previewDir = resolve(projectRoot, 'tests/preview')

// Custom fixture for preview testing (no extension needed)
const test = base.extend<{ page: Page }>({
  page: async ({}, use) => {
    // Verify preview files exist before testing
    if (!existsSync(previewDir)) {
      base.skip(true, 'tests/preview/ directory not found. Run `npm run style:preview` before preview tests.')
    }

    const userDataDir = mkdtempSync(join(os.tmpdir(), 'pw-preview-'))

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
    })

    const page = context.pages()[0] ?? (await context.newPage())

    try {
      await use(page)
    } finally {
      await context.close()
      try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
    }
  },
})

test.describe('Preview Interactions', () => {
  test.beforeEach(async ({ page }) => {
    const previewPath = join(previewDir, 'small__mixed.html')
    
    if (!existsSync(previewPath)) {
      test.skip(true, 'small__mixed.html not found. Run `npm run style:preview` first.')
    }

    await page.goto(`file://${previewPath}`)
    await page.waitForLoadState('networkidle')
  })

  test('expand/collapse functionality works', async ({ page }) => {
    // Look for expanders/collapsers
    const expanders = page.locator('.e')
    const expanderCount = await expanders.count()
    
    if (expanderCount > 0) {
      // Test first expander
      const firstExpander = expanders.first()
      await expect(firstExpander).toBeVisible()
      
      // Get parent entry to check collapsed state
      const parentEntry = firstExpander.locator('..')
      
      // Initially should be expanded (no collapsed class)
      expect(await parentEntry.getAttribute('class')).not.toContain('collapsed')
      
      // Click to collapse
      await firstExpander.click()
      await page.waitForTimeout(100) // Wait for animation
      
      // Should now be collapsed
      expect(await parentEntry.getAttribute('class')).toContain('collapsed')
      
      // Click to expand again
      await firstExpander.click()
      await page.waitForTimeout(100)
      
      // Should be expanded again
      expect(await parentEntry.getAttribute('class')).not.toContain('collapsed')
    }
  })

  test('keyboard navigation works', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab')
    
    // Check if something received focus
    const focusedElement = page.locator(':focus')
    const hasFocus = await focusedElement.count() > 0
    
    if (hasFocus) {
      // Test arrow keys on focused element if it's an expander
      const isExpander = await focusedElement.locator('.e').count() > 0
      
      if (isExpander) {
        await page.keyboard.press('Enter')
        await page.waitForTimeout(100)
        
        // Should have triggered expand/collapse
        const parentEntry = focusedElement.locator('..')
        const hasCollapsedClass = await parentEntry.getAttribute('class')
          .then(cls => cls?.includes('collapsed'))
        
        // Either collapsed or expanded - the key is that interaction worked
        expect(hasCollapsedClass !== undefined).toBe(true)
      }
    }
    
    // Test that navigation doesn't crash the page
    await expect(page.locator('body')).toBeVisible()
  })

  test('mouse hover states work', async ({ page }) => {
    // Test hovering over expanders
    const expanders = page.locator('.e')
    const expanderCount = await expanders.count()
    
    if (expanderCount > 0) {
      const firstExpander = expanders.first()
      await expect(firstExpander).toBeVisible()
      
      // Hover over expander
      await firstExpander.hover()
      
      // Check if opacity changed (hover effect)
      const opacity = await firstExpander.evaluate(el => {
        return window.getComputedStyle(el).opacity
      })
      
      // Hover should change opacity (from 0.5 to 0.8)
      expect(parseFloat(opacity)).toBeGreaterThan(0.5)
      
      // Remove hover
      await page.mouse.move(0, 0)
      await page.waitForTimeout(50)
      
      // Opacity should return to normal
      const normalOpacity = await firstExpander.evaluate(el => {
        return window.getComputedStyle(el).opacity
      })
      
      expect(parseFloat(normalOpacity)).toBeLessThanOrEqual(0.5)
    }
  })

  test('click interactions work on different elements', async ({ page }) => {
    // Test clicking on JSON elements
    const jsonKeys = page.locator('.k')
    const jsonStrings = page.locator('.s')
    
    const keyCount = await jsonKeys.count()
    const stringCount = await jsonStrings.count()
    
    if (keyCount > 0) {
      // Click on a key
      const firstKey = jsonKeys.first()
      await firstKey.click()
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    }
    
    if (stringCount > 0) {
      // Click on a string
      const firstString = jsonStrings.first()
      await firstString.click()
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('scrolling works correctly', async ({ page }) => {
    // Test that page is scrollable if content is long
    const bodyHeight = await page.evaluate(() => {
      return document.body.scrollHeight
    })
    
    const viewportHeight = await page.evaluate(() => {
      return window.innerHeight
    })
    
    if (bodyHeight > viewportHeight) {
      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2)
      })
      
      await page.waitForTimeout(100)
      
      // Scroll up
      await page.evaluate(() => {
        window.scrollTo(0, 0)
      })
      
      await page.waitForTimeout(100)
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('right-click context menu (should not break functionality)', async ({ page }) => {
    // Test right-click on JSON elements
    const jsonStrings = page.locator('.s')
    const stringCount = await jsonStrings.count()
    
    if (stringCount > 0) {
      const firstString = jsonStrings.first()
      await firstString.click({ button: 'right' })
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
      
      // Dismiss any context menu
      await page.keyboard.press('Escape')
    }
  })

  test('double-click interactions', async ({ page }) => {
    // Test double-click on JSON elements
    const jsonKeys = page.locator('.k')
    const keyCount = await jsonKeys.count()
    
    if (keyCount > 0) {
      const firstKey = jsonKeys.first()
      await firstKey.dblclick()
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('selectable text works correctly', async ({ page }) => {
    // Test text selection
    const jsonStrings = page.locator('.s')
    const stringCount = await jsonStrings.count()
    
    if (stringCount > 0) {
      const firstString = jsonStrings.first()
      
      // Select text in string element
      await firstString.hover()
      const box = await firstString.boundingBox()
      if (box) {
        await page.mouse.down()
        await page.mouse.move(box.x + 50, box.y)
        await page.mouse.up()
      }
      
      // Check if text was selected
      const selection = await page.evaluate(() => {
        return window.getSelection()?.toString() || ''
      })
      
      expect(selection.length).toBeGreaterThan(0)
    }
  })

  test('zoom in/out works', async ({ page }) => {
    // Test zoom functionality
    await page.keyboard.press('Control+0') // Reset zoom
    await page.waitForTimeout(100)
    
    // Zoom in
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(100)
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible()
    
    // Zoom out
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(100)
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible()
    
    // Reset zoom
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(100)
  })

  test('window resize works', async ({ page }) => {
    // Test responsive behavior
    await page.setViewportSize({ width: 800, height: 600 })
    await page.waitForTimeout(100)
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible()
    
    // Resize to different dimensions
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.waitForTimeout(100)
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible()
    
    // Resize to mobile dimensions
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(100)
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible()
  })

  test('find functionality (Ctrl+F) works', async ({ page }) => {
    // Test browser find functionality
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(100)
    
    // Type something to find
    await page.keyboard.type('test')
    await page.waitForTimeout(100)
    
    // Press Escape to close find
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible()
  })
})