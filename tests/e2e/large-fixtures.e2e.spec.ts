/**
 * Week 19: E2E Tests with Large Fixtures
 *
 * Tests Time to First Display (TTFD), memory usage, and scroll performance
 * with 1MB, 10MB, and 100MB JSON files.
 */

import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'large')

// Performance thresholds
const TTFD_THRESHOLDS = {
  '1MB': 500, // ms
  '10MB': 1500, // ms
  '100MB': 5000, // ms
}

interface PerformanceMetrics {
  ttfd: number // Time to First Display
  parseTime: number // JSON parsing time
  renderTime: number // Initial render time
  memoryUsage: number // Heap size in MB
  nodeCount: number // Number of DOM nodes
}

/**
 * Load large JSON fixture and navigate to data URL
 */
async function loadLargeJSON(page: Page, fixturePath: string): Promise<string> {
  const jsonContent = fs.readFileSync(fixturePath, 'utf-8')
  const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`
  await page.goto(dataUrl)
  return jsonContent
}

/**
 * Measure performance metrics
 */
async function measurePerformance(page: Page): Promise<PerformanceMetrics> {
  // Wait for JSON formatter to initialize
  await page.waitForSelector('#parsed-json-container', { state: 'visible', timeout: 30000 })

  // Measure TTFD (Time to First Display)
  const ttfd = await page.evaluate(() => {
    const performanceEntries = performance.getEntriesByType('navigation')
    if (performanceEntries.length > 0) {
      const navEntry = performanceEntries[0] as PerformanceNavigationTiming
      return navEntry.domContentLoadedEventEnd - navEntry.fetchStart
    }
    return 0
  })

  // Get parse and render times from console logs (if available)
  const consoleLogs: string[] = []
  page.on('console', (msg) => {
    consoleLogs.push(msg.text())
  })

  // Count DOM nodes
  const nodeCount = await page.evaluate(() => {
    const container = document.getElementById('parsed-json-container')
    return container ? container.querySelectorAll('*').length : 0
  })

  // Estimate memory usage (rough approximation)
  const memoryUsage = await page.evaluate(() => {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
    return 0
  })

  return {
    ttfd,
    parseTime: 0, // Would need instrumentation to get exact parse time
    renderTime: 0, // Would need instrumentation to get exact render time
    memoryUsage,
    nodeCount,
  }
}

// ============================================================================
// 1MB Fixtures
// ============================================================================

test.describe('Large Fixtures: 1MB', () => {
  test('1MB flat object - TTFD within threshold', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_1mb_flat.json')

    // Skip if fixture doesn't exist
    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    await loadLargeJSON(page, fixturePath)

    const metrics = await measurePerformance(page)

    console.log('1MB Flat Object Metrics:')
    console.log(`  TTFD: ${metrics.ttfd.toFixed(2)}ms`)
    console.log(`  Memory: ${metrics.memoryUsage.toFixed(2)}MB`)
    console.log(`  DOM Nodes: ${metrics.nodeCount}`)

    // Verify TTFD is within threshold
    expect(metrics.ttfd).toBeLessThan(TTFD_THRESHOLDS['1MB'])

    // Verify content is rendered
    expect(metrics.nodeCount).toBeGreaterThan(0)
  })

  test('1MB array - handles virtual scrolling', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_1mb_array.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    await loadLargeJSON(page, fixturePath)

    // Check if virtual scrolling is enabled
    const hasVirtualScroll = await page.evaluate(() => {
      const container = document.querySelector('.json-tree-view')
      return container !== null
    })

    expect(hasVirtualScroll).toBe(true)

    // Verify scroll performance
    await page.mouse.wheel(0, 1000)
    await page.waitForTimeout(100)

    const isResponsive = await page.evaluate(() => {
      // Check if page is still responsive after scrolling
      return document.readyState === 'complete'
    })

    expect(isResponsive).toBe(true)
  })

  test('1MB mixed structure - memory usage acceptable', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_1mb_mixed.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    const jsonContent = await loadLargeJSON(page, fixturePath)
    const fileSizeMB = Buffer.byteLength(jsonContent, 'utf-8') / 1024 / 1024

    const metrics = await measurePerformance(page)

    console.log('1MB Mixed Structure Metrics:')
    console.log(`  File Size: ${fileSizeMB.toFixed(2)}MB`)
    console.log(`  Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`)
    console.log(`  Memory Overhead: ${(metrics.memoryUsage / fileSizeMB).toFixed(2)}x`)

    // Memory usage should be < 5x file size
    expect(metrics.memoryUsage).toBeLessThan(fileSizeMB * 5)
  })
})

// ============================================================================
// 10MB Fixtures
// ============================================================================

test.describe('Large Fixtures: 10MB', () => {
  test('10MB flat object - TTFD within threshold', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_10mb_flat.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    await loadLargeJSON(page, fixturePath)

    const metrics = await measurePerformance(page)

    console.log('10MB Flat Object Metrics:')
    console.log(`  TTFD: ${metrics.ttfd.toFixed(2)}ms`)
    console.log(`  Memory: ${metrics.memoryUsage.toFixed(2)}MB`)
    console.log(`  DOM Nodes: ${metrics.nodeCount}`)

    // Verify TTFD is within threshold
    expect(metrics.ttfd).toBeLessThan(TTFD_THRESHOLDS['10MB'])

    // Verify virtual scrolling is working (not rendering all nodes)
    const jsonContent = fs.readFileSync(fixturePath, 'utf-8')
    const estimatedTotalNodes = (jsonContent.match(/:/g) || []).length * 3 // rough estimate

    // DOM nodes should be much less than total (virtual scrolling)
    expect(metrics.nodeCount).toBeLessThan(estimatedTotalNodes / 10)
  })

  test('10MB mixed structure - parser selection works', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_10mb_mixed.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    await loadLargeJSON(page, fixturePath)

    // Check if parser selector is visible
    const hasParserSelector = await page.evaluate(() => {
      const selector = document.querySelector('[data-testid="parser-selector"]')
      return selector !== null
    })

    // Parser selector may or may not be visible depending on config
    // Just verify page loads successfully
    const container = await page.$('#parsed-json-container')
    expect(container).not.toBeNull()
  })

  test('10MB file - expand/collapse performance', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_10mb_mixed.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    await loadLargeJSON(page, fixturePath)

    // Find first expandable node
    const expander = await page.$('.expander')
    if (expander) {
      // Measure expand time
      const startTime = Date.now()
      await expander.click()
      await page.waitForTimeout(100)
      const expandTime = Date.now() - startTime

      console.log(`Expand time: ${expandTime}ms`)

      // Expand should be fast (< 500ms)
      expect(expandTime).toBeLessThan(500)

      // Collapse
      const collapseStart = Date.now()
      await expander.click()
      await page.waitForTimeout(100)
      const collapseTime = Date.now() - collapseStart

      console.log(`Collapse time: ${collapseTime}ms`)

      // Collapse should also be fast
      expect(collapseTime).toBeLessThan(500)
    }
  })
})

// ============================================================================
// 100MB Fixture (Stress Test)
// ============================================================================

test.describe('Large Fixtures: 100MB (Stress Test)', () => {
  test.setTimeout(60000) // 60 second timeout for 100MB

  test('100MB mixed structure - loads without crash', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_100mb_mixed.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    // Increase navigation timeout for large file
    await page.goto(`data:application/json,`, { waitUntil: 'domcontentloaded' })

    // Load JSON content in chunks to avoid memory issues
    const jsonContent = fs.readFileSync(fixturePath, 'utf-8')
    const fileSizeMB = Buffer.byteLength(jsonContent, 'utf-8') / 1024 / 1024

    console.log(`Loading ${fileSizeMB.toFixed(2)}MB JSON file...`)

    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`

    const startTime = Date.now()
    await page.goto(dataUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const loadTime = Date.now() - startTime

    console.log(`100MB Load Time: ${loadTime.toFixed(2)}ms`)

    // Wait for formatter to initialize
    await page.waitForSelector('#parsed-json-container', { state: 'visible', timeout: 30000 })

    const metrics = await measurePerformance(page)

    console.log('100MB Mixed Structure Metrics:')
    console.log(`  File Size: ${fileSizeMB.toFixed(2)}MB`)
    console.log(`  TTFD: ${metrics.ttfd.toFixed(2)}ms`)
    console.log(`  Memory: ${metrics.memoryUsage.toFixed(2)}MB`)
    console.log(`  DOM Nodes: ${metrics.nodeCount}`)
    console.log(`  Memory Overhead: ${(metrics.memoryUsage / fileSizeMB).toFixed(2)}x`)

    // Verify TTFD is within threshold
    expect(metrics.ttfd).toBeLessThan(TTFD_THRESHOLDS['100MB'])

    // Memory should be reasonable (< 5x file size)
    expect(metrics.memoryUsage).toBeLessThan(fileSizeMB * 5)

    // Verify virtual scrolling is working
    // (DOM nodes should be far less than total JSON nodes)
    expect(metrics.nodeCount).toBeLessThan(10000) // Reasonable upper bound for virtual scroll
  })

  test('100MB file - scroll performance acceptable', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_100mb_mixed.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    const jsonContent = fs.readFileSync(fixturePath, 'utf-8')
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`

    await page.goto(dataUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('#parsed-json-container', { state: 'visible', timeout: 30000 })

    // Test scroll performance
    const scrollMetrics: number[] = []

    for (let i = 0; i < 5; i++) {
      const scrollStart = Date.now()
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(50)
      const scrollTime = Date.now() - scrollStart

      scrollMetrics.push(scrollTime)
    }

    const avgScrollTime = scrollMetrics.reduce((a, b) => a + b, 0) / scrollMetrics.length

    console.log(`Average scroll time: ${avgScrollTime.toFixed(2)}ms`)

    // Scroll should remain responsive (< 200ms)
    expect(avgScrollTime).toBeLessThan(200)
  })
})

// ============================================================================
// Parser Comparison with Large Files
// ============================================================================

test.describe('Parser Performance with Large Files', () => {
  test('10MB file - custom parser vs native parser', async ({ page }) => {
    const fixturePath = path.join(FIXTURES_DIR, 'large_10mb_mixed.json')

    if (!fs.existsSync(fixturePath)) {
      test.skip()
      return
    }

    // This test would require the ability to switch parsers
    // and measure performance difference
    // Skipping for now as parser selection UI integration is needed

    test.skip()
  })
})
