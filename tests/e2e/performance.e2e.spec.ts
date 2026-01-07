/**
 * Performance E2E Tests
 * 
 * These tests check rendering performance with large JSON payloads.
 * They are separated from the main e2e test suite because they:
 * - Take significantly longer to run (>20s each)
 * - Test edge cases with very large data sets
 * - May be sensitive to CI environment performance
 * 
 * Run these tests separately when:
 * - Working on performance optimizations
 * - Investigating performance regressions
 * - Benchmarking changes to rendering code
 * 
 * Run with: npm run test:e2e:perf
 */

import { test as base, expect, chromium, Page } from '@playwright/test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../../dist')
const manifestPath = resolve(distDir, 'manifest.json')

// Test fixture for extension-loaded tests
const testExtension = base.extend<{ page: Page }>({
  page: async ({}, use) => {
    if (!existsSync(manifestPath)) {
      base.skip(true, 'dist/manifest.json not found. Run `npm run build` before e2e tests.')
    }

    const userDataDir = mkdtempSync(join(os.tmpdir(), 'pw-json-formatter-'))

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      bypassCSP: true,
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

// Test fixture for Preact renderer tests
const testPreact = base.extend<{ page: Page }>({
  page: async ({}, use) => {
    if (!existsSync(manifestPath)) {
      base.skip(true, 'dist/manifest.json not found. Run `npm run build` before e2e tests.')
    }

    const userDataDir = mkdtempSync(join(os.tmpdir(), 'pw-json-formatter-preact-'))

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      bypassCSP: true,
    })

    const page = context.pages()[0] ?? (await context.newPage())

    await page.addInitScript(() => {
      localStorage.setItem('jf_flag_usePreactRenderer', 'true')
    })

    try {
      await use(page)
    } finally {
      await context.close()
      try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
    }
  },
})

async function serveHtml(page: Page, html: string, url = 'https://example.com/') {
  await page.route('**/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: html })
  })
  await page.goto(url, { waitUntil: 'load' })
}

testExtension.describe('Performance Tests - Content Script', () => {
  testExtension('handles large payloads (1000 items) without freezing', async ({ page }) => {
    // Build a large JSON string with 1000 items
    const entries = 1000
    const bigObj = {
      items: Array.from({ length: entries }, (_, i) => ({ i, v: 'x'.repeat(10) })),
    }
    const json = JSON.stringify(bigObj)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Expect the UI to come up and not time out
    // Large JSON takes longer - allow up to 30s
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible({ timeout: 30000 })
    
    // Wait for parsing and rendering to complete  
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible({ timeout: 30000 })
    
    // Check that tree container appeared
    await expect(page.locator('.json-tree-container')).toBeVisible({ timeout: 15000 })
    
    // Verify some content rendered
    const keys = page.locator('.k')
    expect(await keys.count()).toBeGreaterThan(0)
  })

  testExtension('handles very large payloads (5000 items)', async ({ page }) => {
    // Build a very large JSON string with 5000 items
    const entries = 5000
    const bigObj = {
      items: Array.from({ length: entries }, (_, i) => ({ i, v: 'x'.repeat(10) })),
    }
    const json = JSON.stringify(bigObj)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Very large JSON - allow up to 60s
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible({ timeout: 60000 })
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible({ timeout: 60000 })
    await expect(page.locator('.json-tree-container')).toBeVisible({ timeout: 30000 })
    
    // Verify rendering
    const keys = page.locator('.k')
    expect(await keys.count()).toBeGreaterThan(0)
  })
})

testPreact.describe('Performance Tests - Preact Renderer', () => {
  testPreact('renders large JSON (200+ items) with virtualization', async ({ page }) => {
    // Large array to test virtualization
    const largeArray = Array.from({ length: 200 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
    }))
    const json = JSON.stringify(largeArray)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Wait for toolbar first to ensure extension loaded
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible({ timeout: 30000 })

    // Wait for parsed container
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible({ timeout: 30000 })

    // Should render with tree container
    await expect(page.locator('.json-tree-container')).toBeVisible({ timeout: 30000 })

    // Verify some content is visible
    const keys = page.locator('.k')
    const keyCount = await keys.count()
    
    // Should have rendered some nodes (at least a few visible items)
    expect(keyCount).toBeGreaterThan(5)
  })

  testPreact('renders very large JSON (1000+ items) with virtualization', async ({ page }) => {
    // Very large array
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
    }))
    const json = JSON.stringify(largeArray)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Very large JSON - allow up to 60s
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible({ timeout: 60000 })
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible({ timeout: 60000 })
    await expect(page.locator('.json-tree-container')).toBeVisible({ timeout: 60000 })

    // Verify virtualization is working - not all items should be in DOM
    const keys = page.locator('.k')
    const keyCount = await keys.count()
    
    // Should have some content but not all 1000+ items
    expect(keyCount).toBeGreaterThan(10)
    expect(keyCount).toBeLessThan(500) // Virtualization should limit DOM nodes
  })
})
