import { test as base, expect, chromium, Page } from '@playwright/test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../../../dist')
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
      headless: false,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
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

test.describe('Toolbar component e2e', () => {
  test('renders toolbar with Preact components', async ({ page }) => {
    const json = JSON.stringify({ message: 'test', value: 123 })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Toolbar should be added by the content script
    const toolbar = page.locator('#json-formatter-toolbar')
    await expect(toolbar).toBeVisible()

    // Toggle component should be visible
    const toggle = toolbar.locator('.toggle')
    await expect(toggle).toBeVisible()

    // Options gear button should be visible (rendered as an anchor tag)
    const optionsButton = toolbar.locator('a[aria-label="Open Options Page"]')
    await expect(optionsButton).toBeVisible()
  })

test('options gear button opens options page', async ({ page }) => {
    const json = JSON.stringify({ test: 'data' })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Wait for toolbar to be visible
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible()

    // Find options gear button
    const optionsButton = page.locator('a[aria-label="Open Options Page"]')
    await expect(optionsButton).toBeVisible()

    // Get all pages before clicking
    const pagesBefore = await page.context().pages()
    const pageUrlsBefore = pagesBefore.map(p => p.url())

    // Click the options button
    await optionsButton.click()

    // Simple polling approach - check for new page
    let newPage: any = null
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2000)
      const pagesAfter = await page.context().pages()
      
      // Find page with different URL that wasn't in original list
      for (const p of pagesAfter) {
        const url = p.url()
        if (!pageUrlsBefore.includes(url) && url.includes('options.html')) {
          newPage = p
          break
        }
      }
      
      if (newPage) {
        break
      }
    }

    // Verify a new page was created
    expect(newPage).toBeTruthy()

    if (newPage) {
      // Wait for the page to load content
      await newPage.waitForSelector('body', { timeout: 5000 })
      
      // Verify the options page has loaded by checking for expected content
      await expect(newPage.locator('body')).toContainText('JSON Formatter Pro')

      // Clean up
      await newPage.close()
    }
  })

  test('toggle switches between raw and parsed views', async ({ page }) => {
    const json = JSON.stringify({ a: 1, b: { c: 'test' } })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    // Wait for toolbar
    await expect(page.locator('#json-formatter-toolbar')).toBeVisible()

    // Parsed view should be visible by default
    const parsedContainer = page.locator('#jsonFormatterParsed')
    const rawContainer = page.locator('#jsonFormatterRaw')

    await expect(parsedContainer).toBeVisible()
    await expect(rawContainer).toBeHidden()

    // Find the Format toggle and click it to switch to raw
    const formatToggle = page.locator('[role="switch"][aria-label*="Format"]')
    await expect(formatToggle).toBeVisible()
    await formatToggle.click()

    // Raw view should now be visible
    await expect(parsedContainer).toBeHidden()
    await expect(rawContainer).toBeVisible()

    // Click Format toggle again to switch back to parsed
    await formatToggle.click()

    await expect(parsedContainer).toBeVisible()
    await expect(rawContainer).toBeHidden()
  })

  test('toggle button states reflect current mode', async ({ page }) => {
    const json = JSON.stringify({ test: 'data' })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('#json-formatter-toolbar')).toBeVisible()

    const formatToggle = page.locator('[role="switch"][aria-label*="Format"]')

    // Initially, parsed should be selected (toggle is on)
    await expect(formatToggle).toHaveClass(/on/)
    await expect(formatToggle).not.toHaveClass(/off/)
    await expect(formatToggle).toHaveAttribute('aria-checked', 'true')

    // Click toggle to switch to raw
    await formatToggle.click()

    // Now raw should be selected (toggle is off)
    await expect(formatToggle).toHaveClass(/off/)
    await expect(formatToggle).not.toHaveClass(/on/)
    await expect(formatToggle).toHaveAttribute('aria-checked', 'false')
  })

  test('toolbar is sticky positioned', async ({ page }) => {
    const json = JSON.stringify({ scroll: 'test' })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
        <div style="height: 2000px;"></div>
      </body></html>`
    )

    const toolbar = page.locator('#json-formatter-toolbar')
    await expect(toolbar).toBeVisible()

    // Toolbar should have sticky class
    await expect(toolbar.locator('.toolbar')).toHaveClass(/sticky/)

    // Get toolbar position before scroll
    const toolbarBefore = await toolbar.boundingBox()
    expect(toolbarBefore).not.toBeNull()

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500))

    // Toolbar should still be visible at top
    await expect(toolbar).toBeVisible()

    // Get toolbar position after scroll
    const toolbarAfter = await toolbar.boundingBox()
    expect(toolbarAfter).not.toBeNull()

    // Toolbar should stay near the top (sticky behavior)
    expect(toolbarAfter!.y).toBeLessThanOrEqual(toolbarBefore!.y + 10)
  })

  test('parser selector is visible in toolbar', async ({ page }) => {
    const json = JSON.stringify({ parser: 'test' })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('#json-formatter-toolbar')).toBeVisible({ timeout: 10000 })

    // Parser icon button should be visible (shows emoji icon)
    const parserIcon = page.locator('.parser-icon-button, button[aria-label*="Parser"], button[title*="Parser"]')
    await expect(parserIcon).toBeVisible({ timeout: 5000 })
    
    // Should have a parser emoji (either ⚡ or 🎯)
    const buttonText = await parserIcon.textContent()
    expect(buttonText).toMatch(/[⚡🎯]/)
  })

  test('parser selector switches between parsers', async ({ page }) => {
    const json = JSON.stringify({ numbers: [1, 2, 3], text: 'test' })

    await serveHtml(
      page,
      `<!doctype html><html lang="en"><head><title></title></head><body>
        <pre>${json}</pre>
      </body></html>`
    )

    await expect(page.locator('#json-formatter-toolbar')).toBeVisible({ timeout: 10000 })

    // Wait for initial render
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()

    // Parser icon button should be visible
    const parserIcon = page.locator('.parser-icon-button, button[aria-label*="Parser"]')
    await expect(parserIcon).toBeVisible()

    // Click parser icon to open menu
    await parserIcon.click()
    await page.waitForTimeout(300)

    // Menu should appear with parser options
    const menu = page.locator('.parser-icon-menu')
    await expect(menu).toBeVisible()

    // Should have option buttons (Native and ExactJSON)
    const options = page.locator('.parser-icon-option')
    expect(await options.count()).toBeGreaterThanOrEqual(2)
    
    // Click on one of the options (the non-active one)
    const inactiveOption = options.filter({ hasNotClass: 'active' }).first()
    await inactiveOption.click()
    
    // Wait a bit for re-render
    await page.waitForTimeout(500)

    // Content should still be visible after parser change
    await expect(page.locator('#jsonFormatterParsed')).toBeVisible()
  })

})
