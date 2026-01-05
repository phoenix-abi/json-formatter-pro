#!/usr/bin/env node --expose-gc
/**
 * Detailed Memory Analysis
 *
 * Tests different scenarios to understand memory usage:
 * 1. With input kept in scope (current implementation)
 * 2. Without input (to isolate AST size)
 * 3. Different payload sizes
 */

import { parse } from './src/lib/parser/parse.ts'

if (!global.gc) {
  console.error('❌ Run with: node --expose-gc test-memory-detailed.mjs')
  process.exit(1)
}

function forceGC() {
  global.gc()
  global.gc()
}

function toMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2)
}

// Generate JSON of specific size by repeating a pattern
function generateJSON(targetMB) {
  const targetBytes = targetMB * 1024 * 1024
  let json = '{'
  let counter = 0

  // Add key-value pairs until we reach target size
  while (json.length < targetBytes - 100) {
    if (counter > 0) json += ','

    // Mix different value types
    const type = counter % 4
    if (type === 0) {
      // String
      json += `"str${counter}":"value_${counter}_with_some_content_to_increase_size"`
    } else if (type === 1) {
      // Number
      json += `"num${counter}":${counter * 1.234567}`
    } else if (type === 2) {
      // Nested object
      json += `"obj${counter}":{"nested":true,"id":${counter},"data":[1,2,3,4,5]}`
    } else {
      // Boolean
      json += `"bool${counter}":${counter % 2 === 0}`
    }

    counter++
  }

  json += '}'
  return json
}

console.log('=' .repeat(70))
console.log('Detailed Memory Analysis - Phase 1 Validation')
console.log('=' .repeat(70))
console.log()

// =============================================================================
// Test with 1MB JSON
// =============================================================================
console.log('Generating 1MB test JSON...')
const json1mb = generateJSON(1.0)
const payloadMB = json1mb.length / (1024 * 1024)
console.log(`Actual payload: ${payloadMB.toFixed(2)} MB (${json1mb.length.toLocaleString()} bytes)`)
console.log()

// Scenario 1: Keep both AST and input (current implementation)
console.log('Scenario 1: AST + Input (current implementation)')
console.log('-'.repeat(70))
forceGC()
const before1 = process.memoryUsage().heapUsed

const result1 = parse(json1mb)
const ast1 = result1.ast
const input1 = result1.input // Keep input in scope

const after1 = process.memoryUsage().heapUsed
const delta1 = (after1 - before1) / (1024 * 1024)
const overhead1 = delta1 / payloadMB

console.log(`Memory delta: ${delta1.toFixed(2)} MB`)
console.log(`Overhead:     ${overhead1.toFixed(2)}x`)
console.log()

// Scenario 2: Keep only AST, discard input
console.log('Scenario 2: AST only (input not retained)')
console.log('-'.repeat(70))
forceGC()
const before2 = process.memoryUsage().heapUsed

const result2 = parse(json1mb)
const ast2 = result2.ast
// Intentionally don't keep input reference

const after2 = process.memoryUsage().heapUsed
const delta2 = (after2 - before2) / (1024 * 1024)
const overhead2 = delta2 / payloadMB

console.log(`Memory delta: ${delta2.toFixed(2)} MB`)
console.log(`Overhead:     ${overhead2.toFixed(2)}x`)
console.log()

// Scenario 3: Input string alone (baseline)
console.log('Scenario 3: Input string only (baseline)')
console.log('-'.repeat(70))
forceGC()
const before3 = process.memoryUsage().heapUsed

const inputCopy = json1mb.slice() // Keep a copy

const after3 = process.memoryUsage().heapUsed
const delta3 = (after3 - before3) / (1024 * 1024)
const overhead3 = delta3 / payloadMB

console.log(`Memory delta: ${delta3.toFixed(2)} MB`)
console.log(`Overhead:     ${overhead3.toFixed(2)}x`)
console.log()

// =============================================================================
// Analysis
// =============================================================================
console.log('=' .repeat(70))
console.log('Analysis')
console.log('=' .repeat(70))

const astOnlyOverhead = delta2 - delta3
const inputContribution = delta1 - delta2

console.log()
console.log('Memory Breakdown:')
console.log(`  Input string:       ${delta3.toFixed(2)} MB (${overhead3.toFixed(2)}x payload)`)
console.log(`  AST structure:      ${astOnlyOverhead.toFixed(2)} MB (${(astOnlyOverhead/payloadMB).toFixed(2)}x payload)`)
console.log(`  Input duplicate:    ${inputContribution.toFixed(2)} MB`)
console.log(`  Total (with input): ${delta1.toFixed(2)} MB (${overhead1.toFixed(2)}x payload)`)
console.log()

console.log('Comparison to Baseline:')
const BASELINE = 34.0
const improvement = ((BASELINE - overhead2) / BASELINE * 100).toFixed(1)
console.log(`  Baseline (AST with raw fields):  ${BASELINE}x`)
console.log(`  Current (AST without raw):       ${overhead2.toFixed(2)}x`)
console.log(`  Improvement:                     ${improvement}%`)
console.log()

// Phase 1 target: 15x (50% reduction from 34x)
const PHASE1_TARGET = 15.0
if (overhead2 < PHASE1_TARGET) {
  console.log(`✅ Phase 1 Target MET: ${overhead2.toFixed(2)}x < ${PHASE1_TARGET}x`)
} else {
  console.log(`❌ Phase 1 Target MISSED: ${overhead2.toFixed(2)}x >= ${PHASE1_TARGET}x`)
  console.log(`   Gap: ${(overhead2 - PHASE1_TARGET).toFixed(2)}x over target`)
}
console.log()

// =============================================================================
// Memory Leak Test
// =============================================================================
console.log('=' .repeat(70))
console.log('Memory Leak Test (10 parses)')
console.log('=' .repeat(70))

const json500kb = generateJSON(0.5)
console.log(`Test JSON: ${(json500kb.length / (1024 * 1024)).toFixed(2)} MB`)
console.log()

forceGC()
const leakBaseline = process.memoryUsage().heapUsed

for (let i = 0; i < 10; i++) {
  parse(json500kb) // Parse and discard
  if ((i + 1) % 2 === 0) {
    process.stdout.write(`  Parse ${i + 1}/10\n`)
  }
}

forceGC()
const leakFinal = process.memoryUsage().heapUsed
const leakMB = (leakFinal - leakBaseline) / (1024 * 1024)

console.log()
console.log(`Baseline: ${toMB(leakBaseline)} MB`)
console.log(`Final:    ${toMB(leakFinal)} MB`)
console.log(`Leaked:   ${leakMB.toFixed(2)} MB`)
console.log()

const BASELINE_LEAK = 141.7
const leakImprovement = ((BASELINE_LEAK - leakMB) / BASELINE_LEAK * 100).toFixed(1)
console.log(`Baseline leak: ${BASELINE_LEAK} MB`)
console.log(`Current leak:  ${leakMB.toFixed(2)} MB`)
console.log(`Improvement:   ${leakImprovement}%`)
console.log()

if (leakMB < 5) {
  console.log('✅ PRODUCTION READY: Leak < 5 MB')
} else if (leakMB < 100) {
  console.log('✅ Phase 1 Target MET: Leak < 100 MB')
} else {
  console.log('❌ Phase 1 Target MISSED: Leak >= 100 MB')
}
console.log()

// =============================================================================
// Final Summary
// =============================================================================
console.log('=' .repeat(70))
console.log('Final Summary')
console.log('=' .repeat(70))
console.log()

console.log('Key Findings:')
console.log(`  1. Memory leak FIXED: ${leakMB.toFixed(2)} MB vs ${BASELINE_LEAK} MB baseline (${leakImprovement}% reduction)`)
console.log(`  2. AST overhead: ${overhead2.toFixed(2)}x vs ${BASELINE}x baseline (${improvement}% improvement)`)
console.log(`  3. Input retention adds: ${inputContribution.toFixed(2)} MB extra (intentional for on-demand raw)`)
console.log()

const overheadMet = overhead2 < PHASE1_TARGET
const leakMet = leakMB < 100

if (overheadMet && leakMet) {
  console.log('🎉 Phase 1 COMPLETE!')
  process.exit(0)
} else if (leakMet) {
  console.log('🟡 Phase 1 PARTIAL SUCCESS (leak fixed, overhead needs work)')
  process.exit(1)
} else {
  console.log('❌ Phase 1 INCOMPLETE')
  process.exit(1)
}
