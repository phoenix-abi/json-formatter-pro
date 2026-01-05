#!/usr/bin/env node
/**
 * Performance baseline comparison script.
 * Compares a performance report against a baseline and detects regressions.
 *
 * Usage:
 *   node scripts/compare-perf.mjs [options]
 *
 * Options:
 *   --baseline <path>       Path to baseline JSON (default: perf-baselines/main.json)
 *   --report <path>         Path to report JSON (default: latest in test-results/perf/)
 *   --output-json <path>    Write comparison results to JSON file
 *   --tolerance.default.pct <number>   Override default percentage tolerance
 *   --tolerance.default.abs_ms <number>  Override default absolute tolerance (ms)
 *   --help                  Show this help message
 *
 * Exit codes:
 *   0 - All metrics within tolerance
 *   1 - Usage error
 *   2 - Performance regression detected
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Load and parse a JSON file
 */
function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    console.error(`Error loading ${filePath}: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Get the most recent JSON file from a directory
 */
function getLatestReport(dir) {
  try {
    const files = fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        path: path.join(dir, f),
        mtime: fs.statSync(path.join(dir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (files.length === 0) {
      console.error(`No JSON files found in ${dir}`)
      process.exit(1)
    }

    return files[0].path
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Determine which tolerance policy to use for a given suite and metric
 */
function getTolerance(suite, metricName, baseline, overrides) {
  const baselineTolerance = baseline.tolerance || {}

  // Determine which policy to use based on suite and metric type
  let policyKey = 'default'
  let absUnit = 'abs_ms'

  if (suite?.includes('interaction')) {
    policyKey = 'interaction'
  } else if (suite?.includes('memory')) {
    policyKey = 'memory'
    absUnit = 'abs_mb'
  } else if (suite?.includes('bundle')) {
    policyKey = 'bundle'
    absUnit = 'abs_kb'
  }

  const policy = baselineTolerance[policyKey] || {}

  // Apply overrides or defaults
  const pct = overrides?.pct ?? policy?.pct ?? 0.07
  const absThreshold = overrides?.[absUnit] ?? policy?.[absUnit] ?? getDefaultAbsThreshold(policyKey)

  return {
    pct,
    abs: absThreshold,
    unit: absUnit,
  }
}

/**
 * Get default absolute threshold based on policy type
 */
function getDefaultAbsThreshold(policyKey) {
  const defaults = {
    default: 2,        // 2ms for timing
    interaction: 15,   // 15ms for interactions
    memory: 8,         // 8MB for memory
    bundle: 1,         // 1KB for bundle size
  }
  return defaults[policyKey] || 2
}

/**
 * Get human-readable unit label for a metric
 */
function getUnitLabel(metricName, toleranceUnit) {
  // Check metric name for hints
  if (metricName.includes('_ms') || metricName.includes('ms_')) return 'ms'
  if (metricName.includes('_mb') || metricName.includes('mb_')) return 'MB'
  if (metricName.includes('_kb') || metricName.includes('kb_')) return 'KB'

  // Fall back to tolerance unit
  const unitMap = {
    abs_ms: 'ms',
    abs_mb: 'MB',
    abs_kb: 'KB',
  }
  return unitMap[toleranceUnit] || 'ms'
}

/**
 * Compare report against baseline and return results
 */
export function compare({ baseline, report, toleranceOverrides = {} }) {
  // Index baseline samples by suite|case
  const baselineIndex = new Map()
  for (const sample of baseline.samples || []) {
    const key = `${sample.suite}|${sample.case}`
    baselineIndex.set(key, sample)
  }

  const results = []
  const warnings = []
  let hasFailures = false

  // Compare each report sample against baseline
  for (const reportSample of report.samples || []) {
    const key = `${reportSample.suite}|${reportSample.case}`
    const baselineSample = baselineIndex.get(key)

    if (!baselineSample) {
      // Report has a test case not in baseline - this is informational only
      warnings.push(`New test case not in baseline: ${key}`)
      continue
    }

    const metricResults = {}

    // Compare each metric
    for (const [metricName, baselineValue] of Object.entries(baselineSample.metrics)) {
      const currentValue = reportSample.metrics[metricName]

      // Skip if metric is missing or baseline is zero
      if (typeof currentValue !== 'number' || typeof baselineValue !== 'number' || baselineValue === 0) {
        continue
      }

      // Get tolerance for this specific metric
      const tolerance = getTolerance(reportSample.suite, metricName, baseline, toleranceOverrides)

      const delta = (currentValue - baselineValue) / baselineValue
      const absDiff = Math.abs(currentValue - baselineValue)

      // Fail if both percentage AND absolute thresholds are exceeded
      const fail = Math.abs(delta) > tolerance.pct && absDiff > tolerance.abs

      if (fail) {
        hasFailures = true
      }

      metricResults[metricName] = {
        baseline: baselineValue,
        current: currentValue,
        delta,
        deltaPct: (delta * 100).toFixed(2),
        absDiff: absDiff.toFixed(3),
        status: fail ? 'FAIL' : 'PASS',
        unit: getUnitLabel(metricName, tolerance.unit),
      }
    }

    if (Object.keys(metricResults).length > 0) {
      results.push({
        suite: reportSample.suite,
        case: reportSample.case,
        metrics: metricResults,
      })
    }
  }

  // Check for baseline cases missing in report
  for (const [key] of baselineIndex) {
    const found = report.samples?.some(s => `${s.suite}|${s.case}` === key)
    if (!found) {
      warnings.push(`Baseline test case missing in report: ${key}`)
    }
  }

  return {
    results,
    warnings,
    hasFailures,
  }
}

/**
 * Print comparison results in human-readable format
 */
function printResults({ baseline, report, results, warnings, hasFailures }) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 Performance Baseline Comparison')
  console.log('='.repeat(80))
  console.log(`Baseline: ${baseline}`)
  console.log(`Report:   ${report}`)
  console.log('='.repeat(80))

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    warnings.forEach(w => console.log(`  - ${w}`))
  }

  if (results.length === 0) {
    console.log('\n✅ No comparable metrics found')
    return
  }

  // Group by suite
  const suites = new Map()
  for (const result of results) {
    if (!suites.has(result.suite)) {
      suites.set(result.suite, [])
    }
    suites.get(result.suite).push(result)
  }

  // Print results by suite
  for (const [suite, cases] of suites) {
    console.log(`\n📁 ${suite}`)
    console.log('-'.repeat(80))

    for (const testCase of cases) {
      const hasFailure = Object.values(testCase.metrics).some(m => m.status === 'FAIL')
      const icon = hasFailure ? '❌' : '✅'

      console.log(`\n  ${icon} ${testCase.case}`)

      for (const [metric, data] of Object.entries(testCase.metrics)) {
        const sign = data.delta >= 0 ? '+' : ''
        const color = data.status === 'FAIL' ? '\x1b[31m' : '\x1b[32m'
        const reset = '\x1b[0m'
        const unit = data.unit || 'ms'

        console.log(
          `    ${metric.padEnd(12)} ${color}${sign}${data.deltaPct}%${reset} ` +
          `(${data.baseline.toFixed(3)}${unit} → ${data.current.toFixed(3)}${unit}, ` +
          `Δ${sign}${data.absDiff}${unit})`
        )
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  if (hasFailures) {
    console.log('❌ FAILED: Performance regressions detected')
  } else {
    console.log('✅ PASSED: All metrics within tolerance')
  }
  console.log('='.repeat(80) + '\n')
}

/**
 * Parse command-line arguments
 */
function parseArgs(argv) {
  const args = {
    baseline: null,
    report: null,
    outputJson: null,
    toleranceOverrides: {},
    help: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--help' || arg === '-h') {
      args.help = true
    } else if (arg === '--baseline') {
      args.baseline = argv[++i]
    } else if (arg === '--report') {
      args.report = argv[++i]
    } else if (arg === '--output-json') {
      args.outputJson = argv[++i]
    } else if (arg === '--tolerance.default.pct') {
      args.toleranceOverrides.pct = parseFloat(argv[++i])
    } else if (arg === '--tolerance.default.abs_ms') {
      args.toleranceOverrides.abs_ms = parseFloat(argv[++i])
    } else {
      console.error(`Unknown argument: ${arg}`)
      args.help = true
    }
  }

  return args
}

/**
 * Show help message
 */
function showHelp() {
  const help = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
  const match = help.match(/\/\*\*([\s\S]*?)\*\//)
  if (match) {
    console.log(match[1].trim().replace(/^ \* ?/gm, ''))
  }
}

/**
 * Main entry point
 */
function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    showHelp()
    process.exit(args.help && process.argv.length === 3 ? 0 : 1)
  }

  // Set defaults
  const baselinePath = args.baseline || path.join(__dirname, '..', 'perf-baselines', 'main.json')
  const reportPath = args.report || getLatestReport(path.join(__dirname, '..', 'test-results', 'perf'))

  console.log(`Loading baseline from: ${baselinePath}`)
  console.log(`Loading report from:   ${reportPath}`)

  const baseline = loadJson(baselinePath)
  const report = loadJson(reportPath)

  const { results, warnings, hasFailures } = compare({
    baseline,
    report,
    toleranceOverrides: args.toleranceOverrides,
  })

  printResults({
    baseline: baselinePath,
    report: reportPath,
    results,
    warnings,
    hasFailures,
  })

  // Write JSON output if requested
  if (args.outputJson) {
    const output = {
      baseline: baselinePath,
      report: reportPath,
      results,
      warnings,
      hasFailures,
      timestamp: new Date().toISOString(),
    }
    fs.writeFileSync(args.outputJson, JSON.stringify(output, null, 2))
    console.log(`\n📝 Comparison results written to: ${args.outputJson}\n`)
  }

  process.exit(hasFailures ? 2 : 0)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
