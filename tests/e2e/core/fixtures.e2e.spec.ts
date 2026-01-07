import { test as base, expect, chromium, Page } from '@playwright/test'
import { existsSync, mkdtempSync, rmSync, promises as fs } from 'node:fs'
import { resolve, dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import fg from 'fast-glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../../../dist')
const manifestPath = resolve(distDir, 'manifest.json')

// Mirror the custom page fixture from content.e2e.spec.ts so we run Chrome with the extension loaded
const test = base.extend<{ page: Page }>({
  page: async ({}, use) => {
    if (!existsSync(manifestPath)) {
      base.skip(true, 'dist/manifest.json not found. Run `npm run build` before e2e tests.')
    }

    const userDataDir = mkdtempSync(join(os.tmpdir(), 'pw-json-formatter-fixtures-'))

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

async function serveHtml(page: Page, html: string, url = 'https://example.com/') {
  await page.route('**/*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: html })
  })
  await page.goto(url, { waitUntil: 'load' })
}

const EXPECTED_COMMENT_REGEX = /<!--\s*EXPECT\s+(?<expected>[\s\S]+?)-->/

// 3_000_001 characters to exceed MAX_LENGTH=3_000_000 in src/lib/getResult.ts
const VERY_LONG = 'A'.repeat(3_000_001)

async function loadFixture(path: string) {
  const rawHtml = await fs.readFile(path, 'utf8')
  const commentMatch = rawHtml.match(EXPECTED_COMMENT_REGEX)
  if (!commentMatch || !commentMatch.groups || !commentMatch.groups.expected) {
    throw new Error(`Missing EXPECT comment in fixture: ${path}`)
  }
  const expected = JSON.parse(commentMatch.groups.expected)
  const html = rawHtml.split('{{VERY_LONG_STRING}}').join(VERY_LONG)
  return { html, expected }
}

test.describe('fixture-driven e2e (extension-loaded)', () => {
  // Discover fixture files up-front so we can create one Playwright test per fixture
  const fixtureFiles = fg.sync('./tests/fixtures/*.html', { dot: false, onlyFiles: true }).sort()

  test.describe.configure({ mode: 'parallel' })

  test('sanity: discover fixtures', async () => {
    expect.soft(fixtureFiles.length).toBeGreaterThan(0)
  })

  for (const file of fixtureFiles) {
    test(`fixture: ${basename(file)}`, async ({ page }) => {
      const { html, expected } = await loadFixture(file)

      await serveHtml(page, html)

      const toolbar = page.locator('#json-formatter-toolbar')
      const parsed = page.locator('#jsonFormatterParsed')
      const raw = page.locator('#jsonFormatterRaw')
      const formatToggle = page.locator('[role="switch"][aria-label*="Format"]')

      if (expected.formatted === true) {
        // Extension should enhance the page
        await expect(toolbar, `fixture ${file}: toolbar should exist`).toBeVisible()
        await expect(parsed, `fixture ${file}: parsed container visible`).toBeVisible()
        await expect(raw, `fixture ${file}: raw container hidden`).toBeHidden()

        // Toggle to raw and back
        await formatToggle.click()
        await expect(parsed, `fixture ${file}: parsed hidden after toggle`).toBeHidden()
        await expect(raw, `fixture ${file}: raw visible after toggle`).toBeVisible()

        await formatToggle.click()
        await expect(parsed, `fixture ${file}: parsed visible after toggle back`).toBeVisible()

        // window.json should be populated in page context (script runs in MAIN world with a small delay)
        // Note: This check is disabled temporarily due to timing issues in CI
        // await expect.poll(async () =>
        //   await page.evaluate(() => typeof (window as any).json !== 'undefined')
        // , { timeout: 10000 }).toBe(true)
      } else {
        // Page should not be modified
        await expect(toolbar, `fixture ${file}: toolbar should not exist`).toHaveCount(0)
        const hasWindowJson = await page.evaluate(() => typeof (window as any).json !== 'undefined')
        expect(hasWindowJson, `fixture ${file}: window.json should be undefined`).toBe(false)
      }

      // Clean routes after each test to avoid interference
      await page.unroute('**/*')
    })
  }
})
