#!/usr/bin/env node
/**
 * Run Performance Tests with Output Capture
 *
 * This script runs performance tests and captures the output to a timestamped file
 * while still displaying it on the console.
 *
 * Usage:
 *   node scripts/run-perf-with-output.mjs [vitest args...]
 */

import { spawn } from 'node:child_process'
import { writeFileSync, existsSync, unlinkSync, symlinkSync, mkdirSync, lstatSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RESULTS_DIR = resolve('test-results/perf')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
const textFile = join(RESULTS_DIR, `${timestamp}.txt`)
const latestFile = join(RESULTS_DIR, 'latest.txt')

// Ensure output directory exists
mkdirSync(RESULTS_DIR, { recursive: true })

// Get vitest command and args from command line
const vitestArgs = process.argv.slice(2)
const vitestCmd = vitestArgs.length > 0 ? vitestArgs : ['run', '--config', 'vitest.config.perf.ts']

// Run vitest with output capture
const vitest = spawn('npx', ['vitest', ...vitestCmd], {
  stdio: ['inherit', 'pipe', 'pipe']
})

let output = ''

// Capture stdout
vitest.stdout.on('data', (data) => {
  const str = data.toString()
  process.stdout.write(str)
  output += str
})

// Capture stderr
vitest.stderr.on('data', (data) => {
  const str = data.toString()
  process.stderr.write(str)
  output += str
})

// Handle completion
vitest.on('close', (code) => {
  // Write output to file
  try {
    writeFileSync(textFile, output, 'utf-8')

    // Update symlink (remove old one first if it exists)
    try {
      // Check if file/symlink exists
      try {
        const stats = lstatSync(latestFile)
        // Remove existing file or symlink
        unlinkSync(latestFile)
      } catch (err) {
        // File doesn't exist, that's fine
        if (err.code !== 'ENOENT') {
          throw err
        }
      }

      // Create new symlink
      symlinkSync(`${timestamp}.txt`, latestFile)
    } catch (err) {
      // Symlink creation might fail on some systems (e.g., Windows without admin)
      console.warn(`Warning: Could not create symlink (${err.message})`)
    }

    console.log('')
    console.log('📄 Performance test output saved to:')
    console.log(`   ${textFile}`)
    console.log('')
    console.log('💡 View saved results with:')
    console.log('   npm run perf:results')
    console.log('   cat test-results/perf/latest.txt')
    console.log('')
  } catch (error) {
    console.error(`Failed to save output: ${error}`)
  }

  process.exit(code || 0)
})
