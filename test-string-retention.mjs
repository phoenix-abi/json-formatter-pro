#!/usr/bin/env node
/**
 * V8 String Retention Test
 *
 * Tests whether parsing the SAME JSON multiple times causes different
 * memory behavior than parsing DIFFERENT JSON each time.
 *
 * This helps identify if V8 string table deduplication is contributing
 * to the memory leak.
 */

import { parse } from './src/lib/parser/parse.ts'

// Generate test JSON
function generateJSON(sizeMB, seed = 0) {
  const obj = {}
  const targetBytes = sizeMB * 1024 * 1024
  let counter = seed

  while (JSON.stringify(obj).length < targetBytes) {
    // Use seed to generate different keys for different JSONs
    const key = `key_${counter}_${seed}`
    obj[key] = counter % 3 === 0
      ? `value_${counter}_content_${seed}`
      : counter % 3 === 1
      ? { nested: counter, seed, data: [1, 2, 3] }
      : counter * 1.5

    counter++
  }

  return JSON.stringify(obj)
}

console.log('='.repeat(60))
console.log('V8 String Retention Test')
console.log('='.repeat(60))
console.log()

if (!global.gc) {
  console.warn('⚠️  GC not available. Run with --expose-gc')
  console.warn('   Example: node --expose-gc test-string-retention.mjs\n')
  process.exit(1)
}

// Test 1: Same JSON 10 times
console.log('Test 1: Parse SAME JSON 10 times')
console.log('-'.repeat(60))

const sameJSON = generateJSON(0.5, 0)
console.log(`JSON size: ${(sameJSON.length / (1024 * 1024)).toFixed(2)} MB`)

// Baseline
global.gc()
global.gc()
const baseline1 = process.memoryUsage().heapUsed / (1024 * 1024)
console.log(`Baseline: ${baseline1.toFixed(2)} MB`)

// Parse 10 times with SAME JSON
console.log('Parsing...')
for (let i = 0; i < 10; i++) {
  parse(sameJSON)  // Same input every time
  if (i % 2 === 0) {
    process.stdout.write('.')
  }
}
console.log(' done\n')

// Force GC
global.gc()
global.gc()

const after1 = process.memoryUsage().heapUsed / (1024 * 1024)
const leak1 = after1 - baseline1

console.log(`After: ${after1.toFixed(2)} MB`)
console.log(`Leak: ${leak1.toFixed(2)} MB`)
console.log()

// Test 2: Different JSON 10 times
console.log('Test 2: Parse DIFFERENT JSON 10 times')
console.log('-'.repeat(60))

// Baseline
global.gc()
global.gc()
const baseline2 = process.memoryUsage().heapUsed / (1024 * 1024)
console.log(`Baseline: ${baseline2.toFixed(2)} MB`)

// Parse 10 times with DIFFERENT JSON
console.log('Parsing...')
for (let i = 0; i < 10; i++) {
  const differentJSON = generateJSON(0.5, i)  // Different seed each time
  parse(differentJSON)
  if (i % 2 === 0) {
    process.stdout.write('.')
  }
}
console.log(' done\n')

// Force GC
global.gc()
global.gc()

const after2 = process.memoryUsage().heapUsed / (1024 * 1024)
const leak2 = after2 - baseline2

console.log(`After: ${after2.toFixed(2)} MB`)
console.log(`Leak: ${leak2.toFixed(2)} MB`)
console.log()

// Summary
console.log('='.repeat(60))
console.log('Summary')
console.log('='.repeat(60))
console.log(`Same JSON leak:      ${leak1.toFixed(2)} MB`)
console.log(`Different JSON leak: ${leak2.toFixed(2)} MB`)
console.log(`Difference:          ${(leak1 - leak2).toFixed(2)} MB`)
console.log()

if (Math.abs(leak1 - leak2) < 10) {
  console.log('✅ Leak is similar for both tests')
  console.log('   → V8 string deduplication is NOT the issue')
  console.log('   → Leak is likely due to retained parser state or AST references')
} else if (leak1 > leak2 + 10) {
  console.log('⚠️  Same JSON leaks MORE than different JSON')
  console.log('   → Suggests V8 string table retention issue')
  console.log('   → Repeated identical strings may be building up in V8 internal tables')
} else {
  console.log('⚠️  Different JSON leaks MORE than same JSON')
  console.log('   → Suggests V8 string deduplication is helping with same JSON')
  console.log('   → But still have a leak from other sources')
}

console.log()
console.log('Next steps:')
if (leak1 > 50 && leak2 > 50) {
  console.log('  1. Both tests show significant leak (>50 MB)')
  console.log('  2. Issue is NOT primarily V8 string deduplication')
  console.log('  3. Look for:')
  console.log('     - Retained parser instances')
  console.log('     - Closure captures')
  console.log('     - Global state accumulation')
  console.log('  4. Implement Fix #2 (raw field elimination) ASAP')
}
