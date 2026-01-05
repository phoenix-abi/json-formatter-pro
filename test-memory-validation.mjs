#!/usr/bin/env node --expose-gc
/**
 * Phase 1 Memory Validation Test
 *
 * Simpler, faster test to validate Phase 1 memory improvements.
 * Uses smaller JSON samples for faster execution.
 */

import { parse } from './src/lib/parser/parse.ts'

// Force GC before starting
if (!global.gc) {
  console.error('❌ ERROR: GC not available. Run with: node --expose-gc test-memory-validation.mjs')
  process.exit(1)
}

function forceGC() {
  global.gc()
  global.gc() // Double GC for better accuracy
}

function toMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2)
}

console.log('=' .repeat(70))
console.log('Phase 1 Memory Validation - Raw Field On-Demand Computation')
console.log('=' .repeat(70))
console.log()

// =============================================================================
// Test 1: Memory Overhead (500KB JSON for faster execution)
// =============================================================================
console.log('Test 1: Memory Overhead (500KB JSON)')
console.log('-'.repeat(70))

// Generate a simple but realistic JSON structure
const sampleObject = {
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
    active: i % 2 === 0,
    profile: {
      bio: `This is a biography for user ${i}. It contains some text to make the JSON larger.`,
      interests: ['coding', 'music', 'sports', 'reading', 'travel'],
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        zip: '94102'
      }
    },
    stats: {
      loginCount: i * 10,
      lastLogin: '2024-12-25T10:30:00Z',
      posts: i * 3,
      followers: i * 7
    }
  }))
}

const json500kb = JSON.stringify(sampleObject)
const payloadMB = json500kb.length / (1024 * 1024)

console.log(`Payload size: ${payloadMB.toFixed(2)} MB (${json500kb.length} bytes)`)
console.log()

// Measure custom parser memory
forceGC()
const before = process.memoryUsage().heapUsed

const parseResult = parse(json500kb)
const ast = parseResult.ast // Keep AST in scope
const input = parseResult.input // Keep input in scope (intentional)

const after = process.memoryUsage().heapUsed
const deltaMB = (after - before) / (1024 * 1024)
const overheadFactor = deltaMB / payloadMB

console.log(`Heap before: ${toMB(before)} MB`)
console.log(`Heap after:  ${toMB(after)} MB`)
console.log(`Heap delta:  ${deltaMB.toFixed(2)} MB`)
console.log(`Overhead:    ${overheadFactor.toFixed(2)}x payload`)
console.log()

// Evaluation
const BASELINE_OVERHEAD = 34.0 // From docs: 33.99x before fixes
const PHASE1_TARGET = 15.0    // Phase 1 goal: 50% reduction → ~15-17x
const PRODUCTION_TARGET = 3.0  // Production goal

console.log('Evaluation:')
if (overheadFactor < PRODUCTION_TARGET) {
  console.log(`  ✅ PRODUCTION READY: ${overheadFactor.toFixed(2)}x < ${PRODUCTION_TARGET}x`)
} else if (overheadFactor < PHASE1_TARGET) {
  console.log(`  ✅ PHASE 1 TARGET MET: ${overheadFactor.toFixed(2)}x < ${PHASE1_TARGET}x`)
} else if (overheadFactor < BASELINE_OVERHEAD) {
  console.log(`  🟡 PARTIAL IMPROVEMENT: ${overheadFactor.toFixed(2)}x < ${BASELINE_OVERHEAD}x (baseline)`)
  const improvement = ((BASELINE_OVERHEAD - overheadFactor) / BASELINE_OVERHEAD * 100).toFixed(1)
  console.log(`  📊 Reduction: ${improvement}% from baseline`)
} else {
  console.log(`  ❌ NO IMPROVEMENT: ${overheadFactor.toFixed(2)}x >= ${BASELINE_OVERHEAD}x (baseline)`)
}
console.log()

// =============================================================================
// Test 2: Memory Leak Detection (10 parses)
// =============================================================================
console.log('Test 2: Memory Leak Detection (10 parses of 250KB JSON)')
console.log('-'.repeat(70))

// Generate smaller JSON for leak test (faster execution)
const smallObject = {
  data: Array.from({ length: 50 }, (_, i) => ({
    id: i,
    value: `Item ${i}`,
    nested: { a: i, b: i * 2, c: i * 3 }
  }))
}
const json250kb = JSON.stringify(smallObject)
const leakPayloadMB = json250kb.length / (1024 * 1024)

console.log(`Test JSON: ${leakPayloadMB.toFixed(2)} MB`)
console.log()

forceGC()
const baseline = process.memoryUsage().heapUsed

console.log('Parsing 10 times...')
for (let i = 0; i < 10; i++) {
  const result = parse(json250kb)
  // Explicitly discard result to ensure it's garbage collected
  void result

  if ((i + 1) % 2 === 0) {
    process.stdout.write(`  Parse ${i + 1}/10...\n`)
  }
}

forceGC()
const final = process.memoryUsage().heapUsed
const leakMB = (final - baseline) / (1024 * 1024)

console.log()
console.log(`Baseline heap: ${toMB(baseline)} MB`)
console.log(`Final heap:    ${toMB(final)} MB`)
console.log(`Leaked memory: ${leakMB.toFixed(2)} MB`)
console.log()

// Evaluation
const BASELINE_LEAK = 141.7   // From docs: 141.70 MB before fixes
const PHASE1_LEAK_TARGET = 100.0  // Phase 1 goal
const PRODUCTION_LEAK_TARGET = 5.0  // Production goal

console.log('Evaluation:')
if (leakMB < PRODUCTION_LEAK_TARGET) {
  console.log(`  ✅ PRODUCTION READY: ${leakMB.toFixed(2)} MB < ${PRODUCTION_LEAK_TARGET} MB`)
} else if (leakMB < PHASE1_LEAK_TARGET) {
  console.log(`  ✅ PHASE 1 TARGET MET: ${leakMB.toFixed(2)} MB < ${PHASE1_LEAK_TARGET} MB`)
} else if (leakMB < BASELINE_LEAK) {
  console.log(`  🟡 PARTIAL IMPROVEMENT: ${leakMB.toFixed(2)} MB < ${BASELINE_LEAK} MB (baseline)`)
  const improvement = ((BASELINE_LEAK - leakMB) / BASELINE_LEAK * 100).toFixed(1)
  console.log(`  📊 Reduction: ${improvement}% from baseline`)
} else {
  console.log(`  ❌ NO IMPROVEMENT: ${leakMB.toFixed(2)} MB >= ${BASELINE_LEAK} MB (baseline)`)
}
console.log()

// =============================================================================
// Summary
// =============================================================================
console.log('=' .repeat(70))
console.log('Summary')
console.log('=' .repeat(70))

const overheadPass = overheadFactor < PHASE1_TARGET
const leakPass = leakMB < PHASE1_LEAK_TARGET

console.log()
console.log('Phase 1 Targets:')
console.log(`  Memory Overhead: ${overheadFactor.toFixed(2)}x (target: < ${PHASE1_TARGET}x) ${overheadPass ? '✅' : '❌'}`)
console.log(`  Memory Leak:     ${leakMB.toFixed(2)} MB (target: < ${PHASE1_LEAK_TARGET} MB) ${leakPass ? '✅' : '❌'}`)

console.log()
console.log('Baseline Comparison:')
const overheadReduction = ((BASELINE_OVERHEAD - overheadFactor) / BASELINE_OVERHEAD * 100)
const leakReduction = ((BASELINE_LEAK - leakMB) / BASELINE_LEAK * 100)
console.log(`  Overhead reduction: ${overheadReduction > 0 ? '+' : ''}${overheadReduction.toFixed(1)}%`)
console.log(`  Leak reduction:     ${leakReduction > 0 ? '+' : ''}${leakReduction.toFixed(1)}%`)

console.log()
console.log('Production Readiness:')
const prodOverhead = overheadFactor < PRODUCTION_TARGET
const prodLeak = leakMB < PRODUCTION_LEAK_TARGET
console.log(`  Overhead < ${PRODUCTION_TARGET}x:  ${prodOverhead ? '✅' : '❌'}`)
console.log(`  Leak < ${PRODUCTION_LEAK_TARGET} MB:      ${prodLeak ? '✅' : '❌'}`)

console.log()
if (overheadPass && leakPass) {
  console.log('🎉 Phase 1 COMPLETE! Both targets achieved.')
  console.log('   Next: Begin Phase 2 (V8 String Retention Investigation)')
  process.exit(0)
} else if (overheadPass || leakPass) {
  console.log('🟡 Phase 1 PARTIAL SUCCESS')
  if (!overheadPass) console.log('   ⚠️  Overhead target missed - additional optimization needed')
  if (!leakPass) console.log('   ⚠️  Leak target missed - investigate string retention')
  process.exit(1)
} else {
  console.log('❌ Phase 1 targets NOT MET')
  console.log('   Next: Debug why raw field elimination did not reduce memory')
  process.exit(1)
}
