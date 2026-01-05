import type { Reporter } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Custom Vitest reporter for performance metrics.
 * Prints a summary table of all performance metrics collected during the test run
 * and writes the complete data to a JSON file.
 */
class PerfReporter implements Reporter {
  onTestRunEnd() {
    try {
      // Read from the most recent JSON file since the reporter runs in a different
      // process context than the tests (due to Vitest's test isolation)
      const perfDir = join(process.cwd(), 'test-results', 'perf')

      let files: string[]
      try {
        files = readdirSync(perfDir).filter(f => f.endsWith('.json'))
      } catch {
        // Directory doesn't exist or no files - no metrics collected
        return
      }

      if (files.length === 0) {
        return
      }

      // Get the most recent file
      const latestFile = files
        .map(f => ({ name: f, path: join(perfDir, f) }))
        .sort((a, b) => b.name.localeCompare(a.name))[0]

      const data = JSON.parse(readFileSync(latestFile.path, 'utf8'))

      // Nothing to report if no samples were collected
      if (!data || !data.samples || data.samples.length === 0) {
        return
      }

      // Print summary table
      printPerfSummary(data.samples)

      // Print output file location
      console.log(
        `\n📊 Performance metrics written to ${latestFile.path}\n`
      )
    } catch (error) {
      // Never fail the test run due to reporter errors
      console.error('Error in performance reporter:', error)
    }
  }
}

/**
 * Print a formatted table of performance metrics
 */
function printPerfSummary(
  samples: Array<{
    suite: string
    case: string
    metrics: Record<string, number>
    n: number
  }>
): void {
  console.log('\n' + '='.repeat(80))
  console.log('📈 Performance Benchmark Summary')
  console.log('='.repeat(80))

  // Extract relevant metrics and format rows
  const rows = samples.map(s => ({
    suite: s.suite,
    case: s.case,
    avg_ms: s.metrics.avg_ms?.toFixed(3) ?? s.metrics.ms?.toFixed(3) ?? '-',
    p50_ms: s.metrics.p50_ms?.toFixed(3) ?? '-',
    p95_ms: s.metrics.p95_ms?.toFixed(3) ?? '-',
    n: String(s.n),
    extra: getExtraInfo(s.metrics),
  }))

  // Calculate column widths
  const headers = {
    suite: 'Suite',
    case: 'Test Case',
    avg_ms: 'Avg (ms)',
    p50_ms: 'p50 (ms)',
    p95_ms: 'p95 (ms)',
    n: 'Iters',
    extra: 'Extra',
  }

  const widths = {
    suite: Math.max(
      headers.suite.length,
      ...rows.map(r => r.suite.length)
    ),
    case: Math.max(
      headers.case.length,
      ...rows.map(r => r.case.length)
    ),
    avg_ms: Math.max(
      headers.avg_ms.length,
      ...rows.map(r => r.avg_ms.length)
    ),
    p50_ms: Math.max(
      headers.p50_ms.length,
      ...rows.map(r => r.p50_ms.length)
    ),
    p95_ms: Math.max(
      headers.p95_ms.length,
      ...rows.map(r => r.p95_ms.length)
    ),
    n: Math.max(headers.n.length, ...rows.map(r => r.n.length)),
    extra: Math.max(
      headers.extra.length,
      ...rows.map(r => r.extra.length)
    ),
  }

  // Helper to pad strings
  const pad = (str: string, width: number) => str.padEnd(width)

  // Print header
  console.log(
    '\n' +
      [
        pad(headers.suite, widths.suite),
        pad(headers.case, widths.case),
        pad(headers.avg_ms, widths.avg_ms),
        pad(headers.p50_ms, widths.p50_ms),
        pad(headers.p95_ms, widths.p95_ms),
        pad(headers.n, widths.n),
        pad(headers.extra, widths.extra),
      ].join('  ')
  )

  console.log('-'.repeat(80))

  // Group by suite for better readability
  const suites = [...new Set(rows.map(r => r.suite))]

  suites.forEach(suite => {
    const suiteRows = rows.filter(r => r.suite === suite)

    suiteRows.forEach(row => {
      console.log(
        [
          pad(row.suite, widths.suite),
          pad(row.case, widths.case),
          pad(row.avg_ms, widths.avg_ms),
          pad(row.p50_ms, widths.p50_ms),
          pad(row.p95_ms, widths.p95_ms),
          pad(row.n, widths.n),
          pad(row.extra, widths.extra),
        ].join('  ')
      )
    })

    // Blank line between suites
    if (suites.indexOf(suite) < suites.length - 1) {
      console.log('')
    }
  })

  console.log('-'.repeat(80))
  console.log(`Total: ${samples.length} benchmark${samples.length === 1 ? '' : 's'}`)
}

/**
 * Extract interesting extra information from metrics
 */
function getExtraInfo(metrics: Record<string, number>): string {
  const extras: string[] = []

  if (metrics.input_size_bytes) {
    extras.push(`${formatBytes(metrics.input_size_bytes)}`)
  }

  if (metrics.array_length) {
    extras.push(`len=${metrics.array_length}`)
  }

  if (metrics.key_count) {
    extras.push(`keys=${metrics.key_count}`)
  }

  if (metrics.depth) {
    extras.push(`depth=${metrics.depth}`)
  }

  if (metrics.sibling_count) {
    extras.push(`siblings=${metrics.sibling_count}`)
  }

  if (metrics.toggles_per_iter) {
    extras.push(`toggles=${metrics.toggles_per_iter}`)
  }

  return extras.join(', ')
}

/**
 * Format bytes into human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// Export as both default and named for Vitest compatibility
export default PerfReporter
export { PerfReporter }
