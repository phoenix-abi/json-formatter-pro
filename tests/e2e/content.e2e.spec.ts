import { test as base, expect, chromium, Page } from '@playwright/test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../../dist')
const manifestPath = resolve(distDir, 'manifest.json')

// Create a Playwright test with a custom page fixture that runs with the
// built extension loaded into Chromium.
const test = base.extend<{ page: Page }>({
  // Override the built-in page/context by launching a persistent context with the extension.
  page: async ({}, use) => {
    if (!existsSync(manifestPath)) {
      // Skip all tests in this file if the extension is not built
      base.skip(true, 'dist/manifest.json not found. Run `npm run build` before e2e tests.')
    }

    const userDataDir = mkdtempSync(join(os.tmpdir(), 'pw-json-formatter-'))

    const context = await chromium.launchPersistentContext(userDataDir, {
      // Use headless mode in CI, headful locally for debugging
      headless: !!process.env.CI,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
      ],
      // Our content script modifies the page; disabling/relaxing CSP helps in tests
      bypassCSP: true,
    })

    // Ensure there is a page to work with
    const page = context.pages()[0] ?? (await context.newPage())

    try {
      await use(page)
    } finally {
      await context.close()
      // Best-effort cleanup of the temp user data dir
      try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
    }
  },
})

// Helper to serve an HTML document at a fixed HTTPS URL so the extension's
// content scripts (which match <all_urls>) trigger naturally.
async function serveHtml(page: Page, html: string, url = 'https://example.com/') {
  await page.route('**/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: html })
  })
  await page.goto(url, { waitUntil: 'load' })
}

test.describe('content script e2e (extension-loaded)', () => {
  test('renders parsed view and toggles to raw', async ({ page }) => {
    const json = JSON.stringify({ a: 1, b: { c: 'https://example.com' } })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Toolbar should be added by the content script
    const toolbar = page.locator('#json-formatter-toolbar')
    await expect(toolbar).toBeVisible()

    // Parsed container visible by default
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()
    await expect(page.locator('#jsonFormatterRaw')).toBeHidden()

    // Should render an anchor for the URL
    const link = page.locator('#jsonFormatterParsed a[href="https://example.com"]')
    await expect(link).toHaveText('https://example.com')

    // Toggle to Raw using the Format toggle
    await page.locator('[role="switch"][aria-label*="Format"]').click()
    await expect(page.locator('#jsonFormatterParsed')).toBeHidden()
    await expect(page.locator('#jsonFormatterRaw')).toBeVisible()

    // Toggle back to Parsed using the Format toggle
    await page.locator('[role="switch"][aria-label*="Format"]').click()
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()
  })

  test('handles fairly large payloads without freezing', async ({ page }) => {
    // Build a big but sub-MAX_LENGTH JSON string (keep moderate for CI)
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

    // Expect the UI to come up and not time out
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible()
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()

    // There should be at least one expander for the root array/object
    await expect(page.locator('#jsonFormatterParsed .e').first()).toBeVisible()
  })
})
