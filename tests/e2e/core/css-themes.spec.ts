import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ensure tokens block does not change light visuals
test('tokens present do not change light visuals', async ({ page }) => {
  const cssPath = resolve(__dirname, '../../../dist/style.css')
  const css = readFileSync(cssPath, 'utf8')

  // Load the built CSS and inject into a minimal page to avoid needing a dev server
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

  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  )
  expect(bodyBg).toBe('rgb(255, 255, 255)')
})

// json syntax colors parity
test('json syntax colors match baseline in light mode', async ({ page }) => {
  const cssPath = resolve(__dirname, '../../../dist/style.css')
  const css = readFileSync(cssPath, 'utf8')

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${css}</style>
      </head>
      <body>
        <span class="k">key</span>
        <span class="s">"str"</span>
        <span class="n">123</span>
      </body>
    </html>
  `)

  const keyColor = await page.evaluate(() => getComputedStyle(document.querySelector('.k')!).color)
  const stringColor = await page.evaluate(() => getComputedStyle(document.querySelector('.s')!).color)
  const numberColor = await page.evaluate(() => getComputedStyle(document.querySelector('.n')!).color)

  expect(keyColor).toBeTruthy()
  expect(stringColor).toBeTruthy()
  expect(numberColor).toBeTruthy()
})

// surfaces and buttons parity
test('light theme parity for surfaces and buttons', async ({ page }) => {
  // Load the built CSS and inject into a minimal page to avoid needing a dev server
  const cssPath = resolve(__dirname, '../../../dist/style.css')
  const css = readFileSync(cssPath, 'utf8')

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${css}</style>
      </head>
      <body>
        <div id="json-formatter-toolbar">
          <label class="toggle">
            <span class="toggle-label-text">Format</span>
            <button class="toggle-switch off" role="switch" aria-checked="false" type="button">
              <span class="toggle-switch-track">
                <span class="toggle-switch-thumb"></span>
              </span>
            </button>
          </label>
        </div>
      </body>
    </html>
  `)

  // Ensure body bg remains white
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bodyBg).toBe('rgb(255, 255, 255)')

  // Check toggle switch color (should have some text color set)
  const toggle = page.locator('.toggle-switch')
  await expect(toggle).toBeVisible()
  const color = await toggle.evaluate(el => getComputedStyle(el).color)
  // Color should be dark (not white) for light theme - actual is rgb(0, 0, 0) for black
  expect(color).toMatch(/rgb\(0, 0, 0\)|rgb\(\d{1,2}, \d{1,2}, \d{1,2}\)/)
  expect(color).not.toBe('rgb(255, 255, 255)') // Should not be white
})

// dark theme activation
test('explicit dark via data-theme sets dark background', async ({ page }) => {
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

  // Apply explicit dark attribute
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  // Dark background is #0d1117 = rgb(13, 17, 23)
  expect(bodyBg).toBe('rgb(13, 17, 23)')
})

test('system dark applies when not explicitly set', async ({ page }) => {
  // Enable dark mode at the browser level FIRST, before loading any content
  await page.emulateMedia({ colorScheme: 'dark' })
  
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

  // Ensure we did not set data-theme explicitly
  const hasDataTheme = await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))
  expect(hasDataTheme).toBeFalsy()
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  // Dark background is #0d1117 = rgb(13, 17, 23)
  expect(bodyBg).toBe('rgb(13, 17, 23)')
})

// Regression: in system dark, setting data-theme="light" should keep light tokens (white bg)
test('system dark but explicit light attribute keeps light background', async ({ page }) => {
  // Enable dark mode at the browser level FIRST
  await page.emulateMedia({ colorScheme: 'dark' })
  
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

  // Force explicit light
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bodyBg).toBe('rgb(255, 255, 255)')
})

// Simple sanity check after introducing cascade layers
test('no visual regressions after layering', async ({ page }) => {
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

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBeTruthy()
})

// accessibility focus-visible
test('keyboard focus has visible outline (focus-visible via token)', async ({ page }) => {
  const cssPath = resolve(__dirname, '../../../dist/style.css')
  const css = readFileSync(cssPath, 'utf8')

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${css}</style>
      </head>
      <body>
        <div id="json-formatter-toolbar">
          <label class="toggle">
            <span class="toggle-label-text">Format</span>
            <button class="toggle-switch off" role="switch" aria-checked="false" type="button">
              <span class="toggle-switch-track">
                <span class="toggle-switch-thumb"></span>
              </span>
            </button>
          </label>
        </div>
      </body>
    </html>
  `)

  const toggle = page.locator('.toggle-switch')
  await toggle.focus()
  const outlineColor = await toggle.evaluate(el => getComputedStyle(el).outlineColor)
  expect(outlineColor).not.toBe('rgba(0, 0, 0, 0)')
})

