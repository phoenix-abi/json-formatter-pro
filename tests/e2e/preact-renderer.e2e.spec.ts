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
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
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
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
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
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Wait for tree container
    await expect(page.locator('.json-tree-container')).toBeVisible()

    // Should see "users" key (depth 1, within initialExpandDepth=3)
    await expect(page.locator('.k').filter({ hasText: 'users' })).toBeVisible()

    // Should see array items (depth 2)
    const firstItem = page.locator('.entry').filter({ has: page.locator('.k', { hasText: 'name' }) }).first()
    await expect(firstItem).toBeVisible()

    // Find the expander for the first array item
    const expanders = page.locator('.e')
    const firstItemExpander = expanders.nth(1) // 0=root, 1=users, 2=first item

    // Click to collapse
    await firstItemExpander.click()

    // Name should be hidden after collapse
    await expect(page.locator('.k').filter({ hasText: 'name' }).first()).toBeHidden()

    // Click to expand again
    await firstItemExpander.click()

    // Name should be visible again
    await expect(page.locator('.k').filter({ hasText: 'name' }).first()).toBeVisible()
  })

  test('renders large JSON with virtualization', async ({ page }) => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: `Item ${i}`,
    }))
    const json = JSON.stringify(largeArray)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Should render quickly with tree container
    await expect(page.locator('.json-tree-container')).toBeVisible({ timeout: 2000 })

    // Should use virtualization (not all 1000+ nodes in DOM)
    const entries = await page.locator('.entry').count()
    expect(entries).toBeLessThan(200) // Only visible + overscan rows
  })

  test('linkifies URLs in strings', async ({ page }) => {
    const json = JSON.stringify({
      website: 'https://example.com',
      path: '/api/endpoint',
      http: 'http://insecure.com',
    })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
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

  test('handles primitives', async ({ page }) => {
    const json = JSON.stringify(42)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('.json-tree-container')).toBeVisible()
    await expect(page.locator('.n').filter({ hasText: '42' })).toBeVisible()
  })

  test('handles null value', async ({ page }) => {
    const json = JSON.stringify(null)

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('.json-tree-container')).toBeVisible()
    await expect(page.locator('.nl').filter({ hasText: 'null' })).toBeVisible()
  })

  test('handles boolean values', async ({ page }) => {
    const json = JSON.stringify({ flag: true, disabled: false })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
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
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
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
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
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
      `<!doctype html><html lang="en"><head><title>Test</title></head><body>
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
