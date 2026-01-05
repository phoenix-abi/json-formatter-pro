import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'

interface PerfSample {
  suite: string
  case: string
  metrics: Record<string, number>
  n: number
}

interface PerfEnv {
  node: string
  os: string
  cpu: string
  ci: boolean
}

interface PerfReport {
  runId: string
  env: PerfEnv
  samples: PerfSample[]
}

class PerfCollector {
  private env: PerfEnv
  private samples: PerfSample[] = []

  constructor() {
    this.env = {
      node: process.version,
      os: `${os.platform()} ${os.release()}`,
      cpu: os.cpus()?.[0]?.model || 'unknown',
      ci: !!process.env.CI,
    }
  }

  appendSample(sample: PerfSample): void {
    this.samples.push(sample)
  }

  flush(runId?: string): void {
    if (!this.samples.length) return

    const id = runId || this.generateRunId()
    const outDir = path.resolve(process.cwd(), 'test-results', 'perf')
    fs.mkdirSync(outDir, { recursive: true })

    const report: PerfReport = {
      runId: id,
      env: this.env,
      samples: this.samples,
    }

    const file = path.join(outDir, `${id}.json`)
    fs.writeFileSync(file, JSON.stringify(report, null, 2))
  }

  private generateRunId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sha = this.getShortGitSha()
    return sha ? `${timestamp}+${sha}` : timestamp
  }

  private getShortGitSha(): string {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    } catch {
      return ''
    }
  }

  reset(): void {
    this.samples = []
  }
}

// Singleton instance
const collector = new PerfCollector()

export function appendSample(sample: PerfSample): void {
  collector.appendSample(sample)
}

export function flush(runId?: string): void {
  collector.flush(runId)
}

export function reset(): void {
  collector.reset()
}

export function getPerfCollector(): PerfCollector {
  return collector
}

/**
 * Peek at the current state without mutating.
 * Useful for reporters that need to inspect samples before flushing.
 */
export function peek(): PerfReport | null {
  if (collector['samples'].length === 0) {
    return null
  }

  return {
    runId: '',
    env: collector['env'],
    samples: collector['samples'],
  }
}
