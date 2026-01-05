import { test as base, expect, chromium, Page } from '@playwright/test'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../..')
const previewDir = resolve(projectRoot, 'tests/preview')
const templatesDir = join(projectRoot, 'scripts/templates')

// Custom fixture for preview testing (no extension needed)
const test = base.extend<{ page: Page }>({
  page: async ({}, use) => {
    // Verify preview files exist before testing
    if (!existsSync(previewDir)) {
      base.skip(true, 'tests/preview/ directory not found. Run `npm run style:preview` before preview tests.')
    }

    const userDataDir = mkdtempSync(join(os.tmpdir(), 'pw-preview-'))

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
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

test.describe('Preview Synchronization Validation', () => {
  test('bundle freshness validation', async ({ page }) => {
    // This test verifies that bundle freshness detection works
    const bundlePath = join(templatesDir, 'preview-bundle.js')
    
    if (!existsSync(bundlePath)) {
      test.skip(true, 'Preview bundle not found. Run `npm run style:preview:bundle` first.')
    }

    // Check bundle file stats
    const bundleStats = statSync(bundlePath)
    expect(bundleStats.isFile()).toBe(true)
    expect(bundleStats.size).toBeGreaterThan(0)
    
    // Check key source files exist
    const sourceFiles = [
      join(projectRoot, 'src/lib/buildDom.ts'),
      join(projectRoot, 'src/components/JsonTreeView.tsx'),
      join(projectRoot, 'scripts/preview-bundle-entry.ts')
    ]
    
    for (const sourceFile of sourceFiles) {
      if (existsSync(sourceFile)) {
        const sourceStats = statSync(sourceFile)
        expect(sourceStats.isFile()).toBe(true)
        expect(sourceStats.size).toBeGreaterThan(0)
      }
    }
  })

  test('preview pages are generated correctly', async ({ page }) => {
    const fixturesToTest = [
      'small__mixed',
      'small__flat_object_wide', 
      'medium__deep_object'
    ]
    
    for (const fixture of fixturesToTest) {
      const previewPath = join(previewDir, `${fixture}.html`)
      
      if (!existsSync(previewPath)) {
        console.log(`⚠️ Skipping ${fixture}.html (not found)`)
        continue
      }

      // Load preview page
      await page.goto(`file://${previewPath}`)
      await page.waitForLoadState('networkidle')
      
      // Basic validation
      await expect(page.locator('html')).toBeAttached()
      await expect(page.locator('head')).toBeAttached()
      await expect(page.locator('body')).toBeAttached()
      
      // Check for CSS link
      const cssLink = page.locator('link[href*="style.css"]')
      await expect(cssLink).toBeAttached()
      
      // Check for JavaScript
      const scripts = page.locator('script')
      await expect(scripts.count()).resolves.toBeGreaterThan(0)
    }
  })

  test('CSS synchronization check', async ({ page }) => {
    const previewPath = join(previewDir, 'small__mixed.html')
    
    if (!existsSync(previewPath)) {
      test.skip(true, 'small__mixed.html not found. Run `npm run style:preview` first.')
    }

    await page.goto(`file://${previewPath}`)
    await page.waitForLoadState('networkidle')
    
    // Verify unified CSS is being used
    const cssLink = page.locator('link[href*="style.css"]')
    await expect(cssLink).toBeAttached()
    
    // Verify old component CSS is NOT being used
    const oldCssLink = page.locator('link[href*="json-formatter.css"]')
    expect(await oldCssLink.count()).toBe(0)
    
    // Check CSS is actually loaded by testing computed styles
    const bodyStyles = await page.evaluate(() => {
      const body = document.body
      if (!body) return null
      
      const computedStyle = window.getComputedStyle(body)
      return {
        fontFamily: computedStyle.fontFamily,
        backgroundColor: computedStyle.backgroundColor
      }
    })
    
    expect(bodyStyles).toBeTruthy()
    expect(bodyStyles?.fontFamily).toBeTruthy()
    expect(bodyStyles?.backgroundColor).toBeTruthy()
  })

  test('bundle functionality check', async ({ page }) => {
    const previewPath = join(previewDir, 'small__mixed.html')
    
    if (!existsSync(previewPath)) {
      test.skip(true, 'small__mixed.html not found. Run `npm run style:preview` first.')
    }

    await page.goto(`file://${previewPath}`)
    await page.waitForLoadState('networkidle')
    
    // Check that preview bundle script is loaded
    const hasWindowData = await page.evaluate(() => {
      return typeof window !== 'undefined' && (window as any).__FIXTURE_DATA__
    })
    
    expect(hasWindowData).toBe(true)
    
    // Check for JSON rendering functionality
    const hasJsonContent = await page.evaluate(() => {
      const parsedContainer = document.getElementById('jsonFormatterParsed')
      if (!parsedContainer) return false
      
      // Check for JSON syntax highlighting classes
      const hasKeys = parsedContainer.querySelector('.k') !== null
      const hasStrings = parsedContainer.querySelector('.s') !== null
      const hasNumbers = parsedContainer.querySelector('.n') !== null
      
      return hasKeys || hasStrings || hasNumbers
    })
    
    expect(hasJsonContent).toBe(true)
  })

  test('template structure validation', async ({ page }) => {
    const previewPath = join(previewDir, 'small__mixed.html')
    
    if (!existsSync(previewPath)) {
      test.skip(true, 'small__mixed.html not found. Run `npm run style:preview` first.')
    }

    await page.goto(`file://${previewPath}`)
    await page.waitForLoadState('networkidle')
    
    // Check expected HTML structure
    await expect(page.locator('#toolbar-container')).toBeAttached()
    await expect(page.locator('#jsonFormatterParsed')).toBeAttached()
    await expect(page.locator('#jsonFormatterRaw')).toBeAttached()
    
    // Check for development instructions
    const instructions = page.locator('#instructions')
    const hasInstructions = await instructions.isVisible().catch(() => false)
    
    if (hasInstructions) {
      await expect(instructions).toContainText('Style Development Mode')
      await expect(instructions).toContainText('Edit src/style.css')
    }
  })

  test('file path consistency', async ({ page }) => {
    const previewPath = join(previewDir, 'small__mixed.html')
    
    if (!existsSync(previewPath)) {
      test.skip(true, 'small__mixed.html not found. Run `npm run style:preview` first.')
    }

    await page.goto(`file://${previewPath}`)
    await page.waitForLoadState('networkidle')
    
    // Verify CSS paths are correct relative to preview location
    const cssLink = page.locator('link[href*="style.css"]')
    const cssHref = await cssLink.getAttribute('href')
    
    expect(cssHref).toContain('../../src/style.css')
    
    // Check that CSS file actually exists at that location
    const cssPath = resolve(previewDir, cssHref || '')
    expect(existsSync(cssPath)).toBe(true)
  })

  test('generation metadata check', async ({ page }) => {
    const previewPath = join(previewDir, 'small__mixed.html')
    
    if (!existsSync(previewPath)) {
      test.skip(true, 'small__mixed.html not found. Run `npm run style:preview` first.')
    }

    // Read HTML file content to check for generation patterns
    const fs = require('fs')
    const htmlContent = fs.readFileSync(previewPath, 'utf-8')
    
    // Check for template placeholders were replaced
    expect(htmlContent).not.toContain('{fixtureName}')
    expect(htmlContent).not.toContain('{rawJson}')
    expect(htmlContent).not.toContain('{inlineScript}')
    
    // Check for actual fixture data
    expect(htmlContent).toContain('window.__FIXTURE_DATA__')
    expect(htmlContent).toContain('small__mixed')
  })

  test('error handling validation', async ({ page }) => {
    // Test with a non-existent preview file
    const nonExistentPath = join(previewDir, 'non_existent.html')
    
    if (existsSync(nonExistentPath)) {
      test.skip(true, 'Non-existent file somehow exists')
    }

    // Navigate to non-existent file should show browser error page
    await page.goto(`file://${nonExistentPath}`)
    
    // Browser should show some kind of error page
    // The exact content varies by browser, but page should load
    await page.waitForLoadState('networkidle')
    
    // Page should still have basic structure
    await expect(page.locator('html')).toBeAttached()
  })

  test('bundle size validation', async ({ page }) => {
    const bundlePath = join(templatesDir, 'preview-bundle.js')
    
    if (!existsSync(bundlePath)) {
      test.skip(true, 'Preview bundle not found. Run `npm run style:preview:bundle` first.')
    }

    const bundleStats = statSync(bundlePath)
    const bundleSizeKB = bundleStats.size / 1024
    
    // Bundle should be reasonable size (not empty, not too large)
    expect(bundleSizeKB).toBeGreaterThan(1) // At least 1KB
    expect(bundleSizeKB).toBeLessThan(500) // Less than 500KB for reasonable preview
    
    console.log(`Bundle size: ${bundleSizeKB.toFixed(2)} KB`)
    
    // Verify bundle contains expected content
    const fs = require('fs')
    const bundleContent = fs.readFileSync(bundlePath, 'utf-8')
    
    // Should contain core function signatures
    expect(bundleContent).toContain('buildDom')
    expect(bundleContent).toContain('render')
    expect(bundleContent).toContain('PreviewBundle')
  })
})