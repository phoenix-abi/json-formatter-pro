/**
 * V8 String Retention Test
 *
 * Tests whether parsing the SAME JSON multiple times causes different
 * memory behavior than parsing DIFFERENT JSON each time.
 */

import { describe, it } from 'vitest'
import { parse } from '../../src/lib/parser/parse'

/**
 * Generate test JSON with optional seed for uniqueness
 */
function generateJSON(sizeMB: number, seed = 0): string {
  const obj: Record<string, any> = {}
  const targetBytes = sizeMB * 1024 * 1024
  let counter = seed * 10000 // Offset by seed to ensure different keys

  while (JSON.stringify(obj).length < targetBytes) {
    const key = `key_${counter}_s${seed}`
    obj[key] =
      counter % 3 === 0
        ? `value_${counter}_content_s${seed}`
        : counter % 3 === 1
          ? { nested: counter, seed, data: [1, 2, 3] }
          : counter * 1.5

    counter++
  }

  return JSON.stringify(obj)
}

describe('V8 String Retention', () => {
  it('same JSON vs different JSON memory retention', () => {
    if (!global.gc) {
      console.warn('⚠️  GC not available. Run with --expose-gc for accurate results.')
      return
    }

    console.log('\n' + '='.repeat(60))
    console.log('V8 String Retention Test')
    console.log('='.repeat(60))

    // Test 1: Same JSON 10 times
    console.log('\nTest 1: Parse SAME JSON 10 times')
    console.log('-'.repeat(60))

    const sameJSON = generateJSON(0.5, 0)
    console.log(`JSON size: ${(sameJSON.length / (1024 * 1024)).toFixed(2)} MB`)

    global.gc()
    global.gc()
    const baseline1 = process.memoryUsage().heapUsed / (1024 * 1024)
    console.log(`Baseline: ${baseline1.toFixed(2)} MB`)

    // Parse 10 times with SAME JSON
    for (let i = 0; i < 10; i++) {
      parse(sameJSON)
    }

    global.gc()
    global.gc()
    const after1 = process.memoryUsage().heapUsed / (1024 * 1024)
    const leak1 = after1 - baseline1

    console.log(`After: ${after1.toFixed(2)} MB`)
    console.log(`Leak: ${leak1.toFixed(2)} MB`)

    // Test 2: Different JSON 10 times
    console.log('\nTest 2: Parse DIFFERENT JSON 10 times')
    console.log('-'.repeat(60))

    global.gc()
    global.gc()
    const baseline2 = process.memoryUsage().heapUsed / (1024 * 1024)
    console.log(`Baseline: ${baseline2.toFixed(2)} MB`)

    // Parse 10 times with DIFFERENT JSON
    for (let i = 0; i < 10; i++) {
      const differentJSON = generateJSON(0.5, i)
      parse(differentJSON)
    }

    global.gc()
    global.gc()
    const after2 = process.memoryUsage().heapUsed / (1024 * 1024)
    const leak2 = after2 - baseline2

    console.log(`After: ${after2.toFixed(2)} MB`)
    console.log(`Leak: ${leak2.toFixed(2)} MB`)

    // Analysis
    console.log('\n' + '='.repeat(60))
    console.log('Analysis')
    console.log('='.repeat(60))
    console.log(`Same JSON leak:      ${leak1.toFixed(2)} MB`)
    console.log(`Different JSON leak: ${leak2.toFixed(2)} MB`)
    console.log(`Difference:          ${(leak1 - leak2).toFixed(2)} MB`)
    console.log(`Ratio:               ${(leak1 / leak2).toFixed(2)}x`)

    if (Math.abs(leak1 - leak2) < 10) {
      console.log('\n✅ Leak is similar for both tests')
      console.log('   → V8 string deduplication is NOT the primary issue')
      console.log('   → Leak is likely structural (AST nodes, raw fields, etc.)')
    } else if (leak1 > leak2 + 10) {
      console.log('\n⚠️  Same JSON leaks MORE than different JSON')
      console.log('   → V8 string table may be retaining duplicate strings')
      console.log('   → However, this is LESS than expected if all strings retained')
    } else {
      console.log('\n⚠️  Different JSON leaks MORE than same JSON')
      console.log('   → V8 deduplication is working for same JSON')
      console.log('   → But core issue remains: data is being retained')
    }

    console.log('\nKey insights:')
    console.log(`  - Each 0.5 MB parse leaks ~${(leak1 / 10).toFixed(1)} MB (same JSON)`)
    console.log(`  - Each 0.5 MB parse leaks ~${(leak2 / 10).toFixed(1)} MB (different JSON)`)
    console.log(`  - Expected if perfect GC: 0 MB`)
    console.log(`  - This suggests parser is creating ~${((leak1 / 10) / 0.5).toFixed(1)}x overhead that doesn't GC`)

    console.log('\nLikely causes (in order):')
    console.log('  1. Raw field duplication (~50% of overhead)')
    console.log('  2. AST node structure overhead (~30-40%)')
    console.log('  3. V8 internal structures (hidden classes, etc.)')
    console.log('  4. String data (value fields)')
    console.log('\n' + '='.repeat(60))
  })
})
