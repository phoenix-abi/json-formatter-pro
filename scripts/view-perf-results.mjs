#!/usr/bin/env node
/**
 * View Performance Test Results
 *
 * This script displays the latest performance test results in a formatted way.
 * It can show either the latest run or a specific timestamped result.
 *
 * Usage:
 *   npm run perf:results              # View latest results
 *   npm run perf:results -- 2024-01-15_10-30-00  # View specific run
 *   npm run perf:results -- --list    # List all available results
 *   npm run perf:results -- --json    # View latest results as JSON
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RESULTS_DIR = resolve('test-results/perf')

function main() {
  const args = process.argv.slice(2)

  // List all available results
  if (args.includes('--list')) {
    listResults()
    return
  }

  // Show JSON output
  if (args.includes('--json')) {
    showJSON()
    return
  }

  // Show specific timestamp or latest
  const timestamp = args[0]
  showResults(timestamp)
}

function listResults() {
  if (!existsSync(RESULTS_DIR)) {
    console.log('No performance test results found.')
    console.log(`Run 'npm run test:perf' to generate results.`)
    return
  }

  const files = readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.txt') && f !== 'latest.txt')
    .map(f => {
      const path = join(RESULTS_DIR, f)
      const stats = statSync(path)
      return {
        name: f.replace('.txt', ''),
        path,
        mtime: stats.mtime
      }
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  if (files.length === 0) {
    console.log('No performance test results found.')
    return
  }

  console.log('\n📊 Available Performance Test Results:\n')
  console.log('Timestamp               Size      Date')
  console.log('-'.repeat(60))

  for (const file of files) {
    const size = statSync(file.path).size
    const sizeKB = (size / 1024).toFixed(1)
    const date = file.mtime.toLocaleString()
    const latest = file.name === getLatestTimestamp() ? ' (latest)' : ''
    console.log(`${file.name}  ${sizeKB.padStart(6)} KB  ${date}${latest}`)
  }

  console.log('\n💡 View results with:')
  console.log(`   npm run perf:results              # Latest`)
  console.log(`   npm run perf:results -- ${files[0].name}  # Specific run`)
  console.log()
}

function showJSON(timestamp) {
  const file = timestamp
    ? join(RESULTS_DIR, `${timestamp}.json`)
    : join(RESULTS_DIR, 'latest.json')

  if (!existsSync(file)) {
    console.error(`❌ Results not found: ${file}`)
    console.log('\n💡 List available results with: npm run perf:results -- --list')
    process.exit(1)
  }

  const data = readFileSync(file, 'utf-8')
  console.log(data)
}

function showResults(timestamp) {
  const file = timestamp
    ? join(RESULTS_DIR, `${timestamp}.txt`)
    : join(RESULTS_DIR, 'latest.txt')

  if (!existsSync(file)) {
    console.error(`❌ Results not found: ${file}`)
    console.log('\n💡 List available results with: npm run perf:results -- --list')
    console.log('💡 Run performance tests with: npm run test:perf')
    process.exit(1)
  }

  const content = readFileSync(file, 'utf-8')

  // Add some color if running in a terminal
  const isInteractive = process.stdout.isTTY

  if (isInteractive) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 Performance Test Results')
    console.log('='.repeat(80))
    console.log(`📄 Source: ${file}`)
    console.log('='.repeat(80) + '\n')
  }

  console.log(content)

  if (isInteractive) {
    console.log('\n' + '='.repeat(80))
    console.log('💡 Tips:')
    console.log('   - View JSON: npm run perf:results -- --json')
    console.log('   - List all:  npm run perf:results -- --list')
    console.log('   - Run tests: npm run test:perf')
    console.log('='.repeat(80) + '\n')
  }
}

function getLatestTimestamp() {
  const latestFile = join(RESULTS_DIR, 'latest.txt')
  if (!existsSync(latestFile)) return null

  try {
    // Read the symlink target
    const target = readFileSync(latestFile, 'utf-8').split('\n')[0]
    return target.replace('.txt', '')
  } catch {
    return null
  }
}

main()
