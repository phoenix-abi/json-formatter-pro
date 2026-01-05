#!/usr/bin/env node
/**
 * Quick memory test for Fix #1
 */

const { parse } = require('./dist/parser.js')

// Generate test JSON
function generateJSON(sizeMB) {
  const obj = {}
  const targetBytes = sizeMB * 1024 * 1024
  let counter = 0

  while (JSON.stringify(obj).length < targetBytes) {
    obj[`key_${counter}`] = `value_${counter}_with_content`
    counter++
  }

  return JSON.stringify(obj)
}

// Test memory usage
console.log('Testing memory leak fix...\n')

// Force GC if available
if (global.gc) {
  global.gc()
} else {
  console.warn('Warning: GC not available. Run with --expose-gc flag for accurate results.\n')
}

const baseline = process.memoryUsage().heapUsed / (1024 * 1024)
console.log(`Baseline heap: ${baseline.toFixed(2)} MB`)

// Generate test data
const json = generateJSON(0.5)
console.log(`Test JSON size: ${(json.length / (1024 * 1024)).toFixed(2)} MB\n`)

// Parse 10 times
console.log('Parsing 10 times...')
for (let i = 0; i < 10; i++) {
  parse(json)
  if (i === 0 || i === 4 || i === 9) {
    const current = process.memoryUsage().heapUsed / (1024 * 1024)
    console.log(`  After parse ${i + 1}: ${current.toFixed(2)} MB`)
  }
}

// Force GC
if (global.gc) {
  console.log('\nForcing garbage collection...')
  global.gc()
}

const after = process.memoryUsage().heapUsed / (1024 * 1024)
const leak = after - baseline

console.log(`\nFinal Results:`)
console.log(`  Baseline: ${baseline.toFixed(2)} MB`)
console.log(`  After 10 parses + GC: ${after.toFixed(2)} MB`)
console.log(`  Memory retained: ${leak.toFixed(2)} MB`)

if (leak < 5) {
  console.log(`\n✅ PASS: Memory leak < 5 MB`)
} else {
  console.log(`\n❌ FAIL: Memory leak ${leak.toFixed(2)} MB (target: < 5 MB)`)
  process.exit(1)
}
