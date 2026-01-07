/**
 * SKIPPED: CSS theme edge case tests
 * 
 * These tests have edge cases with page reload and emulateMedia that can be flaky in CI.
 * The core theme functionality is already well-tested in tests/e2e/core/css-themes.spec.ts
 */

import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// light/dark/system without styleDark.css present
// This test involves page reload with emulateMedia which can be flaky in CI
test('STYLE_07: light and dark still render correctly without styleDark.css', async ({ page }) => {
  const cssPath = resolve(__dirname, '../../../dist/style.css')
  const css = readFileSync(cssPath, 'utf8')

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${css}</style>
      </head>
      <body>hello</body>
    </html>
  `)

  // light default
  let bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(255, 255, 255)')

  // explicit dark
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  // Dark background is #0d1117 = rgb(13, 17, 23)
  expect(bg).toBe('rgb(13, 17, 23)')

  // system dark (no explicit)
  await page.evaluate(() => { delete (document.documentElement as any).dataset.theme })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(13, 17, 23)')
})
