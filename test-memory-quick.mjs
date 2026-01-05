#!/usr/bin/env node
/**
 * Quick Memory Test for Week 21 Fixes
 *
 * Tests:
 * 1. Memory overhead for 1MB JSON
 * 2. Memory leak across 10 parses
 */

import { parse } from './src/lib/parser/parse.ts'

// Generate test JSON
function generateJSON(sizeMB) {
  const obj = {}
  const targetBytes = sizeMB * 1024 * 1024
  let counter = 0

  while (JSON.stringify(obj).length < targetBytes) {
    const key = `key_${counter % 100}` // Repeat keys to test interning
    obj[key] = counter % 3 === 0
      ? `value_${counter}_content`
      : counter % 3 === 1
      ? { nested: counter, data: [1, 2, 3] }
      : counter * 1.5
    counter++
  }

  return JSON.stringify(obj)
}

console.log('='.repeat(60))
console.log('Week 21 Memory Leak Fixes - Validation Test')
console.log('='.repeat(60))
console.log()

// Force GC if available
if (!global.gc) {
  console.warn('⚠️  GC not available. Run with --expose-gc for accurate results.')
  console.warn('   Example: node --expose-gc test-memory-quick.mjs\n')
}

// Test 1: Memory Overhead
console.log('Test 1: Memory Overhead (1MB JSON)')
console.log('-'.repeat(60))

const json1mb = generateJSON(1.0)
const payloadMB = json1mb.length / (1024 * 1024)
console.log(`Payload size: ${payloadMB.toFixed(2)} MB`)

if (global.gc) global.gc()
const before1 = process.memoryUsage().heapUsed

// Parse with custom parser
const result = parse(json1mb)

if (global.gc) global.gc()
const after1 = process.memoryUsage().heapUsed

const deltaMB = (after1 - before1) / (1024 * 1024)
const overheadFactor = deltaMB / payloadMB

console.log(`Heap delta: ${deltaMB.toFixed(2)} MB`)
console.log(`Overhead: ${overheadFactor.toFixed(2)}x payload`)

if (overheadFactor < 3) {
  console.log('✅ PASS: Overhead < 3x (production target)')
} else if (overheadFactor < 10) {
  console.log('⚠️  PARTIAL: Overhead < 10x (Phase 1 progress)')
} else {
  console.log('❌ FAIL: Overhead still too high')
}

console.log()

// Test 2: Memory Leak Detection
console.log('Test 2: Memory Leak (10 parses)')
console.log('-'.repeat(60))

const json500kb = generateJSON(0.5)
console.log(`Test JSON: ${(json500kb.length / (1024 * 1024)).toFixed(2)} MB`)

if (global.gc) {
  global.gc()
  global.gc() // Double GC to be sure
}

const baseline = process.memoryUsage().heapUsed / (1024 * 1024)
console.log(`Baseline heap: ${baseline.toFixed(2)} MB`)

// Parse 10 times
console.log('Parsing 10 times...')
for (let i = 0; i < 10; i++) {
  parse(json500kb)
}

// Force GC
if (global.gc) {
  global.gc()
  global.gc()
}

const final = process.memoryUsage().heapUsed / (1024 * 1024)
const leak = final - baseline

console.log(`Final heap: ${final.toFixed(2)} MB`)
console.log(`Memory retained: ${leak.toFixed(2)} MB`)

if (leak < 5) {
  console.log('✅ PASS: Leak < 5 MB (production target)')
} else if (leak < 50) {
  console.log('⚠️  PARTIAL: Leak < 50 MB (Phase 1 progress)')
} else {
  console.log('❌ FAIL: Leak still too high')
}

console.log()

// Summary
console.log('='.repeat(60))
console.log('Summary')
console.log('='.repeat(60))
console.log(`Overhead: ${overheadFactor.toFixed(2)}x (target: < 3x, Phase 1 goal: < 30x)`)
console.log(`Leak: ${leak.toFixed(2)} MB (target: < 5 MB, Phase 1 goal: < 100 MB)`)

// Compare to before fixes (from original tests)
const beforeOverhead = 35.04
const beforeLeak = 125.74

const overheadImprovement = ((beforeOverhead - overheadFactor) / beforeOverhead) * 100
const leakImprovement = ((beforeLeak - leak) / beforeLeak) * 100

console.log()
console.log('Improvement from baseline:')
console.log(`  Overhead: ${overheadImprovement > 0 ? '+' : ''}${overheadImprovement.toFixed(1)}%`)
console.log(`  Leak: ${leakImprovement > 0 ? '+' : ''}${leakImprovement.toFixed(1)}%`)

console.log()
if (overheadFactor < 30 && leak < 100) {
  console.log('✅ Week 21 Phase 1 targets achieved!')
  process.exit(0)
} else {
  console.log('⚠️  Additional fixes needed for Phase 1 targets')
  process.exit(1)
}
