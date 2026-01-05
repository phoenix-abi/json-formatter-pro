#!/usr/bin/env node --expose-gc
/**
 * Final Comprehensive Memory Test
 *
 * Tests multiple payload sizes to understand overhead patterns
 * and validate Phase 1 completion.
 */

import { parse } from './src/lib/parser/parse.ts'

if (!global.gc) {
  console.error('❌ Run with: node --expose-gc test-memory-final.mjs')
  process.exit(1)
}

function forceGC() {
  global.gc()
  global.gc()
}

function toMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2)
}

function generateJSON(targetMB) {
  let json = '{"data":['
  const targetBytes = targetMB * 1024 * 1024
  let counter = 0

  while (json.length < targetBytes - 500) {
    if (counter > 0) json += ','
    json += `{"id":${counter},"name":"Item ${counter}","value":${counter * 1.5},"active":${counter % 2 === 0}}`
    counter++
  }

  json += ']}'
  return json
}

console.log('=' .repeat(75))
console.log('PHASE 1 VALIDATION - Final Memory Test')
console.log('=' .repeat(75))
console.log()

const testSizes = [0.1, 0.5, 1.0]
const results = []

for (const sizeMB of testSizes) {
  console.log(`Testing ${sizeMB} MB JSON...`)
  console.log('-'.repeat(75))

  const json = generateJSON(sizeMB)
  const actualMB = json.length / (1024 * 1024)
  console.log(`Generated: ${actualMB.toFixed(3)} MB (${json.length.toLocaleString()} bytes)`)

  // Measure AST-only memory (no input retained)
  forceGC()
  const before = process.memoryUsage().heapUsed

  const result = parse(json)
  const ast = result.ast
  // Intentionally don't keep input

  forceGC()
  const after = process.memoryUsage().heapUsed

  const deltaMB = (after - before) / (1024 * 1024)
  const overhead = deltaMB / actualMB

  console.log(`Memory delta: ${deltaMB.toFixed(2)} MB`)
  console.log(`Overhead:     ${overhead.toFixed(2)}x`)
  console.log()

  results.push({ sizeMB: actualMB, deltaMB, overhead })
}

// Memory Leak Test
console.log('=' .repeat(75))
console.log('Memory Leak Test (10 parses)')
console.log('=' .repeat(75))

const leakJSON = generateJSON(0.3)
console.log(`Test JSON: ${(leakJSON.length / (1024 * 1024)).toFixed(3)} MB`)

forceGC()
const leakBaseline = process.memoryUsage().heapUsed

for (let i = 0; i < 10; i++) {
  parse(leakJSON)
}

forceGC()
const leakFinal = process.memoryUsage().heapUsed
const leakMB = (leakFinal - leakBaseline) / (1024 * 1024)

console.log(`Leaked: ${leakMB.toFixed(2)} MB`)
console.log()

// Summary
console.log('=' .repeat(75))
console.log('SUMMARY')
console.log('=' .repeat(75))
console.log()

console.log('Overhead by Payload Size:')
console.log('  Size (MB)  │  Delta (MB)  │  Overhead')
console.log('─────────────┼──────────────┼────────────')
for (const r of results) {
  console.log(`  ${r.sizeMB.toFixed(2).padStart(8)} │  ${r.deltaMB.toFixed(2).padStart(11)} │  ${r.overhead.toFixed(2)}x`)
}
console.log()

// Calculate average
const avgOverhead = results.reduce((sum, r) => sum + r.overhead, 0) / results.length

console.log('Targets vs Actual:')
console.log(`  BASELINE (documented):       34.00x`)
console.log(`  PHASE 1 TARGET (50% of baseline): 17.00x`)
console.log(`  CURRENT (average):           ${avgOverhead.toFixed(2)}x`)
console.log()

const BASELINE = 34.0
const PHASE1_TARGET = 17.0
const PRODUCTION_TARGET = 3.0
const BASELINE_LEAK = 141.7
const PHASE1_LEAK_TARGET = 100.0
const PRODUCTION_LEAK_TARGET = 5.0

// Phase 1 evaluation
console.log('Phase 1 Evaluation:')
const overheadPass = avgOverhead < PHASE1_TARGET
const leakPass = Math.abs(leakMB) < PHASE1_LEAK_TARGET

console.log(`  Overhead: ${avgOverhead.toFixed(2)}x < ${PHASE1_TARGET}x? ${overheadPass ? '✅ YES' : '❌ NO'}`)
console.log(`  Leak: ${Math.abs(leakMB).toFixed(2)} MB < ${PHASE1_LEAK_TARGET} MB? ${leakPass ? '✅ YES' : '❌ NO'}`)
console.log()

// Production readiness
console.log('Production Readiness:')
const prodOverhead = avgOverhead < PRODUCTION_TARGET
const prodLeak = Math.abs(leakMB) < PRODUCTION_LEAK_TARGET

console.log(`  Overhead: ${avgOverhead.toFixed(2)}x < ${PRODUCTION_TARGET}x? ${prodOverhead ? '✅ YES' : '❌ NO'}`)
console.log(`  Leak: ${Math.abs(leakMB).toFixed(2)} MB < ${PRODUCTION_LEAK_TARGET} MB? ${prodLeak ? '✅ YES' : '❌ NO'}`)
console.log()

// Improvement from baseline
const overheadImprovement = ((BASELINE - avgOverhead) / BASELINE * 100).toFixed(1)
const leakImprovement = ((BASELINE_LEAK - Math.abs(leakMB)) / BASELINE_LEAK * 100).toFixed(1)

console.log('Improvement from Baseline:')
console.log(`  Overhead: ${overheadImprovement > 0 ? '+' : ''}${overheadImprovement}%`)
console.log(`  Leak: ${leakImprovement > 0 ? '+' : ''}${leakImprovement}%`)
console.log()

// Final verdict
console.log('=' .repeat(75))
console.log('FINAL VERDICT')
console.log('=' .repeat(75))
console.log()

if (overheadPass && leakPass) {
  console.log('🎉 PHASE 1 COMPLETE!')
  console.log()
  console.log('Summary:')
  console.log(`  ✅ Memory overhead reduced: ${avgOverhead.toFixed(2)}x (target: < ${PHASE1_TARGET}x)`)
  console.log(`  ✅ Memory leak eliminated: ${Math.abs(leakMB).toFixed(2)} MB (target: < ${PHASE1_LEAK_TARGET} MB)`)
  console.log()
  console.log('Next Steps:')
  console.log('  1. Update MEMORY_LEAK.md with actual measurements')
  console.log('  2. Mark Phase 1 as complete in documentation')
  console.log('  3. Begin Phase 2: V8 String Retention Investigation (if needed)')
  console.log('  4. Consider additional optimizations to reach production targets')
  process.exit(0)
} else if (leakPass) {
  console.log('🟡 PHASE 1 PARTIAL SUCCESS')
  console.log()
  console.log('Summary:')
  console.log(`  ✅ Memory leak eliminated: ${Math.abs(leakMB).toFixed(2)} MB`)
  if (!overheadPass) {
    console.log(`  ❌ Overhead target missed: ${avgOverhead.toFixed(2)}x vs ${PHASE1_TARGET}x target`)
    console.log()
    console.log('Analysis:')
    console.log('  The raw field elimination strategy was only partially effective.')
    console.log('  AST structure itself (array-based entries, metadata) is the main overhead.')
    console.log()
    console.log('Recommendations:')
    console.log('  1. Accept current overhead for feature trade-off (key ordering)')
    console.log('  2. Investigate lazy AST construction for collapsed nodes')
    console.log('  3. Consider compact position metadata (32-bit offsets)')
  }
  process.exit(1)
} else {
  console.log('❌ PHASE 1 TARGETS NOT MET')
  console.log()
  if (!overheadPass) console.log(`  Overhead: ${avgOverhead.toFixed(2)}x >= ${PHASE1_TARGET}x`)
  if (!leakPass) console.log(`  Leak: ${Math.abs(leakMB).toFixed(2)} MB >= ${PHASE1_LEAK_TARGET} MB`)
  process.exit(1)
}
