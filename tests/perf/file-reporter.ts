/**
 * File Reporter for Performance Tests
 *
 * This reporter saves test output to files for later review by developers and AI agents.
 * It runs in addition to the default console reporter.
 *
 * Output files:
 * - test-results/perf/YYYY-MM-DD_HH-MM-SS.txt - Human-readable test output
 * - test-results/perf/YYYY-MM-DD_HH-MM-SS.json - Machine-readable test results
 * - test-results/perf/latest.txt - Symlink to latest text output
 * - test-results/perf/latest.json - Symlink to latest JSON output
 */

import type { Reporter } from 'vitest'
import { writeFileSync, existsSync, unlinkSync, symlinkSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

class FileReporter implements Reporter {
  private startTime = 0
  private outputDir = resolve('test-results/perf')
  private timestamp = ''
  private textFile = ''
  private jsonFile = ''
  private output: string[] = []

  onInit() {
    this.startTime = Date.now()
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
    this.textFile = join(this.outputDir, `${this.timestamp}.txt`)
    this.jsonFile = join(this.outputDir, `${this.timestamp}.json`)

    // Ensure output directory exists
    mkdirSync(this.outputDir, { recursive: true })
  }

  onTestRunEnd() {
    const endTime = Date.now()
    const duration = endTime - this.startTime

    // Print summary to console
    console.log('')
    console.log('📄 Performance test results saved to:')
    console.log(`   Text: ${this.textFile}`)
    console.log(`   JSON: ${this.jsonFile}`)
    console.log('')
    console.log('💡 View saved results with:')
    console.log('   npm run perf:results')
    console.log('   cat test-results/perf/latest.txt')
    console.log('')

    // Write JSON metadata file
    this.writeJSONFile(duration)
    this.createSymlinks()
  }

  private writeJSONFile(duration: number) {
    try {
      const data = {
        timestamp: this.timestamp,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(Date.now()).toISOString(),
        duration,
        textFile: this.textFile
      }
      writeFileSync(this.jsonFile, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error(`Failed to write JSON metadata: ${error}`)
    }
  }

  private createSymlinks() {
    // Create symlinks to latest files
    const latestText = join(this.outputDir, 'latest.txt')
    const latestJSON = join(this.outputDir, 'latest.json')

    try {
      // Remove old symlinks if they exist
      if (existsSync(latestText)) unlinkSync(latestText)
      if (existsSync(latestJSON)) unlinkSync(latestJSON)

      // Create new symlinks (relative paths)
      symlinkSync(`${this.timestamp}.txt`, latestText)
      symlinkSync(`${this.timestamp}.json`, latestJSON)
    } catch (error) {
      // Symlinks may fail on Windows, that's okay
      console.warn(`Could not create symlinks (this is normal on Windows): ${error}`)
    }
  }
}

// Export as both default and named for Vitest compatibility
export default FileReporter
export { FileReporter }
