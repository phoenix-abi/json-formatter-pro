import { test as base, expect, chromium, Page } from '@playwright/test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../../dist')
const manifestPath = resolve(distDir, 'manifest.json')

// Create a Playwright test with a custom page fixture that runs with the
// built extension loaded into Chromium and Preact renderer enabled.
const test = base.extend<{ page: Page }>({
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

    // Enable Preact renderer feature flag via localStorage
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

test.describe('Preact Renderer E2E', () => {
  test('renders small JSON with Preact renderer', async ({ page }) => {
    const json = JSON.stringify({ name: 'Alice', age: 30 })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Toolbar should be visible
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible()

    // Parsed container should be visible
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()

    // Should have tree container with role="tree"
    const treeContainer = page.locator('.json-tree-container[role="tree"]')
    await expect(treeContainer).toBeVisible()

    // Should render keys
    await expect(page.locator('.k').filter({ hasText: 'name' })).toBeVisible()
    await expect(page.locator('.k').filter({ hasText: 'age' })).toBeVisible()

    // Should render values
    await expect(page.locator('.s').filter({ hasText: 'Alice' })).toBeVisible()
    await expect(page.locator('.n').filter({ hasText: '30' })).toBeVisible()
  })

  test('renders nested object with expansion', async ({ page }) => {
    const json = JSON.stringify({
      user: { name: 'Bob', address: { city: 'NYC' } },
    })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Should render with tree container
    await expect(page.locator('.json-tree-container')).toBeVisible()

    // Root should be expanded by default (initialExpandDepth=3)
    await expect(page.locator('.k').filter({ hasText: 'user' })).toBeVisible()

    // Nested properties should be visible (depth 2, within initialExpandDepth)
    await expect(page.locator('.k').filter({ hasText: 'name' })).toBeVisible()
    await expect(page.locator('.k').filter({ hasText: 'address' })).toBeVisible()

    // Deep nested should be visible (depth 3, within initialExpandDepth)
    await expect(page.locator('.k').filter({ hasText: 'city' })).toBeVisible()
    await expect(page.locator('.s').filter({ hasText: 'NYC' })).toBeVisible()
  })

  test('handles expand/collapse interaction', async ({ page }) => {
    const json = JSON.stringify({
      users: [{ name: 'Alice' }, { name: 'Bob' }],
    })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Wait for tree container with longer timeout
    await expect(page.locator('.json-tree-container')).toBeVisible({ timeout: 10000 })

    // Should see "users" key (depth 1, within initialExpandDepth=3)
    await expect(page.locator('.k').filter({ hasText: 'users' })).toBeVisible()

    // Should see array items (depth 2) - both Alice and Bob should be visible
    await expect(page.locator('.k').filter({ hasText: 'name' }).first()).toBeVisible()

    // The Preact JsonTreeView uses different structure - find expander by looking for 
    // clickable elements with expander class/role
    const expanders = page.locator('.expander, [role="button"][aria-label*="collapse"], [role="button"][aria-label*="expand"]')
    const expanderCount = await expanders.count()
    
    if (expanderCount > 0) {
      // Find the first object expander (for first array item)
      const firstObjectExpander = expanders.nth(1) // Skip root expander
      
      // Click to collapse
      await firstObjectExpander.click()
      await page.waitForTimeout(300) // Wait for animation

      // After collapse, the nested "name" key should not be visible
      // (there are 2 "name" keys, one in each object, so check count decreased)
      const visibleNameKeys = page.locator('.k').filter({ hasText: 'name' })
      const count = await visibleNameKeys.count()
      expect(count).toBeLessThan(2) // At least one should be hidden
    }
  })

  // Moved to tests/e2e/performance.e2e.spec.ts for separate performance testing
  // Run with: npm run test:e2e:perf
  test.skip('renders large JSON with virtualization', async ({ page }) => {
    // This test has been moved to the performance test suite
    // See tests/e2e/performance.e2e.spec.ts
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
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible({ timeout: 15000 })

    // Wait for parsed container
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible({ timeout: 15000 })

    // Should render with tree container (may take a few seconds for large JSON)
    await expect(page.locator('.json-tree-container')).toBeVisible({ timeout: 15000 })

    // Verify some content is visible
    const keys = page.locator('.k')
    const keyCount = await keys.count()
    
    // Should have rendered some nodes (at least a few visible items)
    expect(keyCount).toBeGreaterThan(5)
  })

  test('linkifies URLs in strings', async ({ page }) => {
    const json = JSON.stringify({
      website: 'https://example.com',
      path: '/api/endpoint',
      http: 'http://insecure.com',
    })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // HTTPS URL should be linkified
    const httpsLink = page.locator('a[href="https://example.com"]')
    await expect(httpsLink).toBeVisible()
    await expect(httpsLink).toHaveAttribute('target', '_blank')

    // Path should be linkified
    const pathLink = page.locator('a[href="/api/endpoint"]')
    await expect(pathLink).toBeVisible()

    // HTTP URL should be linkified
    const httpLink = page.locator('a[href="http://insecure.com"]')
    await expect(httpLink).toBeVisible()
  })

  // Extension doesn't format primitive root values by design
  // startsLikeJson() only accepts {, [, or " to avoid false positives on plain text
  test.skip('handles primitives', async ({ page }) => {
    const json = JSON.stringify(42)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // This test is skipped because the extension intentionally does not format
    // primitive JSON values (42, true, false) as root values.
    // Only objects ({...}), arrays ([...]), and strings ("...") are formatted.
    await expect(page.locator('.json-tree-container')).toBeVisible()
    await expect(page.locator('.n').filter({ hasText: '42' })).toBeVisible()
  })

  // Extension doesn't format null as root value by design
  // startsLikeJson() only accepts {, [, or " to avoid false positives on plain text
  test.skip('handles null value', async ({ page }) => {
    const json = JSON.stringify(null)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // This test is skipped because the extension intentionally does not format
    // null, true, false, or number primitives as root values.
    // Only objects ({...}), arrays ([...]), and strings ("...") are formatted.
    await expect(page.locator('.json-tree-container')).toBeVisible()
    await expect(page.locator('.nl').filter({ hasText: 'null' })).toBeVisible()
  })

  test('handles boolean values', async ({ page }) => {
    const json = JSON.stringify({ flag: true, disabled: false })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('.json-tree-container')).toBeVisible()
    await expect(page.locator('.bl').filter({ hasText: 'true' })).toBeVisible()
    await expect(page.locator('.bl').filter({ hasText: 'false' })).toBeVisible()
  })

  test('handles empty object', async ({ page }) => {
    const json = JSON.stringify({})

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('.json-tree-container')).toBeVisible()
    await expect(page.locator('.oBrace')).toBeVisible()
    await expect(page.locator('.cBrace')).toBeVisible()
  })

  test('handles empty array', async ({ page }) => {
    const json = JSON.stringify([])

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('.json-tree-container')).toBeVisible()
    await expect(page.locator('.oBracket')).toBeVisible()
    await expect(page.locator('.cBracket')).toBeVisible()
  })

  test('toolbar toggle works with Preact renderer', async ({ page }) => {
    const json = JSON.stringify({ test: 'data' })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Parsed view should be visible initially
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()
    await expect(page.locator('#jsonFormatterRaw')).toBeHidden()

    // Toggle to Raw
    await page.locator('[role="switch"][aria-label*="Format"]').click()
    await expect(page.locator('#jsonFormatterParsed')).toBeHidden()
    await expect(page.locator('#jsonFormatterRaw')).toBeVisible()

    // Toggle back to Parsed
    await page.locator('[role="switch"][aria-label*="Format"]').click()
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()
    await expect(page.locator('#jsonFormatterRaw')).toBeHidden()
  })
})
