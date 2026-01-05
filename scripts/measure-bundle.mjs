#!/usr/bin/env node
/**
 * Bundle size measurement script.
 *
 * Measures the size of built JavaScript and CSS files in both raw and compressed
 * formats (gzip and brotli). Results are written to test-results/perf/bundle-size.json.
 *
 * Usage:
 *   npm run bundle:measure
 *   node scripts/measure-bundle.mjs
 *
 * Prerequisites:
 *   - Run `npm run build` first to generate dist/ directory
 */

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Convert bytes to kilobytes
 */
function toKB(bytes) {
  return bytes / 1024
}

/**
 * Measure sizes for a single file
 */
function measureFile(filePath) {
  const content = fs.readFileSync(filePath)

  return {
    file: path.relative(process.cwd(), filePath),
    raw_kb: +toKB(content.length).toFixed(2),
    gzip_kb: +toKB(zlib.gzipSync(content, { level: 9 }).length).toFixed(2),
    br_kb: +toKB(zlib.brotliCompressSync(content).length).toFixed(2),
  }
}

/**
 * Find all JS and CSS files in dist directory
 */
function findBundleFiles(distDir) {
  try {
    const entries = fs.readdirSync(distDir, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
      const fullPath = path.join(distDir, entry.name)

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        files.push(...findBundleFiles(fullPath))
      } else if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
        files.push(fullPath)
      }
    }

    return files
  } catch (error) {
    console.error(`Error reading directory ${distDir}:`, error.message)
    return []
  }
}

/**
 * Generate bundle size report
 */
function generateReport(distDir) {
  const files = findBundleFiles(distDir)

  if (files.length === 0) {
    console.warn(`No JS/CSS files found in ${distDir}`)
    return null
  }

  const measurements = files.map(measureFile).sort((a, b) => a.file.localeCompare(b.file))

  return {
    runId: new Date().toISOString(),
    timestamp: Date.now(),
    files: measurements,
    totals: {
      raw_kb: +measurements.reduce((sum, f) => sum + f.raw_kb, 0).toFixed(2),
      gzip_kb: +measurements.reduce((sum, f) => sum + f.gzip_kb, 0).toFixed(2),
      br_kb: +measurements.reduce((sum, f) => sum + f.br_kb, 0).toFixed(2),
    },
  }
}

/**
 * Print report summary to console
 */
function printReport(report) {
  console.log('\n' + '='.repeat(80))
  console.log('📦 Bundle Size Report')
  console.log('='.repeat(80))

  if (!report) {
    console.log('\n⚠️  No bundle files found')
    return
  }

  console.log('\n' + 'File'.padEnd(50) + 'Raw (KB)'.padStart(10) + 'Gzip (KB)'.padStart(12) + 'Brotli (KB)'.padStart(13))
  console.log('-'.repeat(80))

  for (const file of report.files) {
    console.log(
      file.file.padEnd(50) +
      file.raw_kb.toFixed(2).padStart(10) +
      file.gzip_kb.toFixed(2).padStart(12) +
      file.br_kb.toFixed(2).padStart(13)
    )
  }

  console.log('-'.repeat(80))
  console.log(
    'Total'.padEnd(50) +
    report.totals.raw_kb.toFixed(2).padStart(10) +
    report.totals.gzip_kb.toFixed(2).padStart(12) +
    report.totals.br_kb.toFixed(2).padStart(13)
  )

  console.log('\n' + '='.repeat(80))
}

/**
 * Main entry point
 */
function main() {
  const distDir = path.resolve(process.cwd(), 'dist')

  if (!fs.existsSync(distDir)) {
    console.error('\n❌ Error: dist/ directory not found')
    console.error('   Run `npm run build` first to generate the bundle\n')
    process.exit(1)
  }

  console.log(`Measuring bundle sizes in ${distDir}...`)

  const report = generateReport(distDir)

  if (!report) {
    process.exit(1)
  }

  // Write JSON report
  const outputDir = path.resolve(process.cwd(), 'test-results', 'perf')
  fs.mkdirSync(outputDir, { recursive: true })

  const outputPath = path.join(outputDir, 'bundle-size.json')
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))

  printReport(report)

  console.log(`\n📊 Bundle size report written to ${path.relative(process.cwd(), outputPath)}\n`)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

// Export for testing
export { measureFile, generateReport, toKB }
