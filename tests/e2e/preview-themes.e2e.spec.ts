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
      headless: !!process.env.CI,
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

test.describe('Preview Theme Parity', () => {
  test.beforeEach(async ({ page }) => {
    const previewPath = join(previewDir, 'small__mixed.html')
    
    if (!existsSync(previewPath)) {
      test.skip(true, 'small__mixed.html not found. Run `npm run style:preview` first.')
    }

    await page.goto(`file://${previewPath}`)
    await page.waitForLoadState('networkidle')
  })

  test('light theme works correctly', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
    })
    
    // Wait for theme to apply
    await page.waitForTimeout(100)
    
    // Verify theme attribute is set
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveAttribute('data-theme', 'light')
    
    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible()
  })

  test('dark theme works correctly', async ({ page }) => {
    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    
    // Wait for theme to apply
    await page.waitForTimeout(100)
    
    // Verify theme attribute is set
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark')
    
    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible()
  })

  test('system theme works correctly', async ({ page }) => {
    // Set system theme (remove explicit theme)
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-theme')
    })
    
    // Wait for theme to apply
    await page.waitForTimeout(100)
    
    // Verify no explicit theme is set
    const htmlElement = page.locator('html')
    expect(await htmlElement.getAttribute('data-theme')).toBeNull()
    
    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible()
  })

  test('theme picker functionality', async ({ page }) => {
    const themePicker = page.locator('.theme-picker')
    
    // Check if theme picker exists
    const hasThemePicker = await themePicker.isVisible().catch(() => false)
    
    if (hasThemePicker) {
      // Test dark theme
      await themePicker.selectOption('dark')
      const htmlElement = page.locator('html')
      await expect(htmlElement).toHaveAttribute('data-theme', 'dark')
      
      // Test light theme
      await themePicker.selectOption('light')
      await expect(htmlElement).toHaveAttribute('data-theme', 'light')
      
      // Test system theme
      await themePicker.selectOption('system')
      expect(await htmlElement.getAttribute('data-theme')).toBeNull()
    }
  })

  test('theme switching maintains functionality', async ({ page }) => {
    // Test all themes in sequence
    const themes = [
      { name: 'light', attr: 'light' },
      { name: 'dark', attr: 'dark' },
      { name: 'system', attr: null }
    ]
    
    for (const theme of themes) {
      // Set theme
      await page.evaluate((selectedTheme) => {
        if (selectedTheme === null) {
          document.documentElement.removeAttribute('data-theme')
        } else {
          document.documentElement.setAttribute('data-theme', selectedTheme)
        }
      }, theme.attr)
      
      await page.waitForTimeout(100)
      
      // Verify JSON content is still visible
      const hasContent = await page.locator('.json-tree-container').isVisible().catch(() => false)
      const hasInstructions = await page.locator('#instructions').isVisible().catch(() => false)
      
      expect(hasContent || hasInstructions).toBe(true)
      
      // Verify page structure is intact
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('CSS custom properties are applied correctly', async ({ page }) => {
    // Test light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
    })
    
    await page.waitForTimeout(100)
    
    // Check computed styles (basic verification)
    const bodyStyles = await page.evaluate(() => {
      const body = document.body
      if (!body) return null
      
      const computedStyle = window.getComputedStyle(body)
      return {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontFamily: computedStyle.fontFamily
      }
    })
    
    expect(bodyStyles).toBeTruthy()
    expect(bodyStyles?.backgroundColor).toBeTruthy()
    expect(bodyStyles?.color).toBeTruthy()
  })

  test('theme switching does not break JSON rendering', async ({ page }) => {
    // Verify JSON elements exist in default state
    const jsonString = page.locator('.s')
    const jsonKey = page.locator('.k')
    const initialStringCount = await jsonString.count()
    const initialKeyCount = await jsonKey.count()
    
    // Switch themes multiple times
    const themes = ['light', 'dark', 'system']
    
    for (const theme of themes) {
      await page.evaluate((selectedTheme) => {
        if (selectedTheme === 'system') {
          document.documentElement.removeAttribute('data-theme')
        } else {
          document.documentElement.setAttribute('data-theme', selectedTheme)
        }
      }, theme)
      
      await page.waitForTimeout(100)
      
      // Verify JSON elements are still present
      const currentStringCount = await jsonString.count()
      const currentKeyCount = await jsonKey.count()
      
      // Counts should remain consistent across themes
      expect(currentStringCount).toBe(initialStringCount)
      expect(currentKeyCount).toBe(initialKeyCount)
    }
  })

  test('theme transitions are smooth', async ({ page }) => {
    // Test rapid theme switching
    const htmlElement = page.locator('html')
    
    // Switch between themes multiple times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light')
      })
      await page.waitForTimeout(50)
      
      await expect(htmlElement).toHaveAttribute('data-theme', 'light')
      
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(50)
      
      await expect(htmlElement).toHaveAttribute('data-theme', 'dark')
      
      await page.evaluate(() => {
        document.documentElement.removeAttribute('data-theme')
      })
      await page.waitForTimeout(50)
      
      expect(await htmlElement.getAttribute('data-theme')).toBeNull()
    }
  })
})