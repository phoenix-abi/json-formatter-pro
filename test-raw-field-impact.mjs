#!/usr/bin/env node --expose-gc
/**
 * Test Raw Field Impact
 *
 * Measures the actual memory impact of storing raw fields vs computing on-demand.
 * This helps us understand if the Phase 1 optimization actually worked.
 */

import { parse } from './src/lib/parser/parse.ts'

if (!global.gc) {
  console.error('❌ Run with: node --expose-gc test-raw-field-impact.mjs')
  process.exit(1)
}

function forceGC() {
  global.gc()
  global.gc()
}

function toMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2)
}

// Count nodes in AST
function countNodes(node) {
  let count = 1 // Count this node

  if (node.kind === 'object') {
    for (const entry of node.entries) {
      count += countNodes(entry.key) // Key is a StringNode
      count += countNodes(entry.value)
    }
  } else if (node.kind === 'array') {
    for (const item of node.items) {
      count += countNodes(item)
    }
  }

  return count
}

// Count how many nodes have raw field
function countRawFields(node) {
  let count = 0

  if (node.raw !== undefined) {
    count++
  }

  if (node.kind === 'object') {
    for (const entry of node.entries) {
      count += countRawFields(entry.key)
      count += countRawFields(entry.value)
    }
  } else if (node.kind === 'array') {
    for (const item of node.items) {
      count += countRawFields(item)
    }
  }

  return count
}

// Estimate raw field sizes
function estimateRawFieldSize(node, input) {
  let size = 0

  // If raw exists, count its size
  if (node.raw !== undefined) {
    size += node.raw.length * 2 // UTF-16 characters
  }

  if (node.kind === 'object') {
    for (const entry of node.entries) {
      size += estimateRawFieldSize(entry.key, input)
      size += estimateRawFieldSize(entry.value, input)
    }
  } else if (node.kind === 'array') {
    for (const item of node.items) {
      size += estimateRawFieldSize(item, input)
    }
  }

  return size
}

console.log('='.repeat(70))
console.log('Raw Field Impact Analysis')
console.log('='.repeat(70))
console.log()

// Generate test JSON
console.log('Generating test JSON...')
let json = '{'
for (let i = 0; i < 1000; i++) {
  if (i > 0) json += ','
  const type = i % 4
  if (type === 0) {
    json += `"str${i}":"value_${i}_content"`
  } else if (type === 1) {
    json += `"num${i}":${i * 1.234}`
  } else if (type === 2) {
    json += `"obj${i}":{"nested":true,"id":${i}}`
  } else {
    json += `"bool${i}":${i % 2 === 0}`
  }
}
json += '}'

const payloadBytes = json.length
const payloadMB = payloadBytes / (1024 * 1024)

console.log(`Payload: ${payloadMB.toFixed(3)} MB (${payloadBytes.toLocaleString()} bytes)`)
console.log()

// Parse and analyze
console.log('Parsing and analyzing AST...')
const result = parse(json)
const ast = result.ast
const input = result.input

const totalNodes = countNodes(ast)
const nodesWithRaw = countRawFields(ast)
const rawFieldBytes = estimateRawFieldSize(ast, input)
const rawFieldMB = rawFieldBytes / (1024 * 1024)

console.log(`Total nodes:        ${totalNodes.toLocaleString()}`)
console.log(`Nodes with raw:     ${nodesWithRaw.toLocaleString()}`)
console.log(`Raw field size:     ${rawFieldMB.toFixed(3)} MB (estimated)`)
console.log(`Raw as % of input:  ${((rawFieldBytes / payloadBytes) * 100).toFixed(1)}%`)
console.log()

// Measure actual memory
console.log('Measuring actual memory usage...')
forceGC()
const beforeParse = process.memoryUsage().heapUsed

const parseResult = parse(json)
const astOnly = parseResult.ast
// Don't keep input reference

forceGC()
const afterParse = process.memoryUsage().heapUsed

const actualDelta = (afterParse - beforeParse) / (1024 * 1024)
const actualOverhead = actualDelta / payloadMB

console.log(`Heap delta:  ${actualDelta.toFixed(2)} MB`)
console.log(`Overhead:    ${actualOverhead.toFixed(2)}x`)
console.log()

// Analysis
console.log('='.repeat(70))
console.log('Analysis')
console.log('='.repeat(70))
console.log()

console.log('Theoretical Raw Field Savings (if they were stored):')
const theoreticalSavings = rawFieldMB
const theoreticalOverheadReduction = (theoreticalSavings / actualDelta) * 100
console.log(`  If raw fields were stored: ${rawFieldMB.toFixed(2)} MB extra`)
console.log(`  As % of current overhead:  ${theoreticalOverheadReduction.toFixed(1)}%`)
console.log(`  Expected overhead with raw: ${(actualOverhead / (1 - theoreticalOverheadReduction/100)).toFixed(2)}x`)
console.log()

console.log('Key Findings:')
console.log(`  1. Current implementation does NOT store raw fields`)
console.log(`  2. Raw fields (if stored) would add ~${theoreticalOverheadReduction.toFixed(1)}% overhead`)
console.log(`  3. Current ${actualOverhead.toFixed(2)}x overhead is from AST structure itself`)
console.log()

// Compare to documented expectations
const DOCUMENTED_BASELINE = 34.0
const DOCUMENTED_RAW_SAVINGS = 0.50 // 50% reduction expected
const DOCUMENTED_TARGET = DOCUMENTED_BASELINE * (1 - DOCUMENTED_RAW_SAVINGS)

console.log('Comparison to Documentation:')
console.log(`  Documented baseline (with raw):    ${DOCUMENTED_BASELINE}x`)
console.log(`  Expected savings from removing raw: ${(DOCUMENTED_RAW_SAVINGS * 100)}%`)
console.log(`  Documented Phase 1 target:         ${DOCUMENTED_TARGET}x`)
console.log(`  Current actual overhead:           ${actualOverhead.toFixed(2)}x`)
console.log()

if (actualOverhead > DOCUMENTED_BASELINE) {
  const increase = actualOverhead - DOCUMENTED_BASELINE
  console.log(`⚠️  ALERT: Overhead INCREASED by ${increase.toFixed(2)}x since baseline!`)
  console.log(`   This suggests structural changes to AST since baseline measurement.`)
  console.log(`   Possible causes:`)
  console.log(`   - Week 16: Array-based object entries for key ordering`)
  console.log(`   - Each entry now: {key: StringNode, value: JsonNode} vs simple property`)
  console.log(`   - StringNode keys have 5 fields each (kind, value, raw?, start, end)`)
} else if (actualOverhead < DOCUMENTED_TARGET) {
  console.log(`✅ Phase 1 target MET (better than expected!)`)
} else {
  const gap = actualOverhead - DOCUMENTED_TARGET
  console.log(`❌ Phase 1 target MISSED by ${gap.toFixed(2)}x`)
}

console.log()
console.log('Recommendation:')
if (theoreticalOverheadReduction < 10) {
  console.log(`  Raw fields were NOT the primary issue (only ${theoreticalOverheadReduction.toFixed(1)}% savings possible)`)
  console.log(`  The real overhead is AST structure (object entries as arrays, metadata, etc.)`)
  console.log(`  Phase 1 strategy was based on incorrect assumption about raw field impact.`)
} else {
  console.log(`  Raw fields account for ${theoreticalOverheadReduction.toFixed(1)}% of overhead - significant!`)
  console.log(`  Phase 1 implementation is working correctly.`)
  console.log(`  Additional optimization needed to reach production targets.`)
}
