/**
 * Large Fixture Generator for Week 19 E2E Testing
 *
 * Generates JSON files of specific sizes (1MB, 10MB, 100MB) for
 * testing performance, memory usage, and TTFD with large datasets.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface GeneratorOptions {
  targetSizeBytes: number
  outputPath: string
  pattern: 'nested' | 'flat' | 'array' | 'mixed'
}

/**
 * Generate a large JSON file with the specified pattern
 */
function generateLargeJSON(options: GeneratorOptions): void {
  const { targetSizeBytes, outputPath, pattern } = options

  console.log(`Generating ${(targetSizeBytes / 1024 / 1024).toFixed(1)}MB ${pattern} JSON...`)

  let json = ''
  let currentSize = 0

  switch (pattern) {
    case 'flat':
      json = generateFlatObject(targetSizeBytes)
      break
    case 'nested':
      json = generateNestedObject(targetSizeBytes)
      break
    case 'array':
      json = generateLargeArray(targetSizeBytes)
      break
    case 'mixed':
      json = generateMixedStructure(targetSizeBytes)
      break
  }

  // Write to file
  fs.writeFileSync(outputPath, json, 'utf-8')

  const actualSize = Buffer.byteLength(json, 'utf-8')
  console.log(`✓ Generated: ${outputPath}`)
  console.log(`  Target: ${(targetSizeBytes / 1024 / 1024).toFixed(2)}MB`)
  console.log(`  Actual: ${(actualSize / 1024 / 1024).toFixed(2)}MB`)
  console.log(`  Keys/Items: ${countElements(json)}`)
}

/**
 * Generate flat object with many keys
 */
function generateFlatObject(targetSize: number): string {
  const entries: string[] = []
  let currentSize = 2 // Start with '{}'

  let index = 0
  while (currentSize < targetSize) {
    const key = `key_${index}`
    const value = generateRandomValue(index)
    const entry = `"${key}":${value}`

    currentSize += entry.length + 1 // +1 for comma

    entries.push(entry)
    index++
  }

  return `{${entries.join(',')}}`
}

/**
 * Generate deeply nested object
 */
function generateNestedObject(targetSize: number): string {
  const depth = Math.floor(Math.log2(targetSize / 100)) // Logarithmic depth
  return generateNestedLevel(0, depth, targetSize)
}

function generateNestedLevel(currentDepth: number, maxDepth: number, remainingSize: number): string {
  if (currentDepth >= maxDepth || remainingSize < 50) {
    return `{"value":${currentDepth},"data":"${'x'.repeat(Math.min(20, Math.floor(remainingSize / 2)))}"}"`
  }

  const childSize = Math.floor(remainingSize / 3)
  const child = generateNestedLevel(currentDepth + 1, maxDepth, childSize)

  return `{"level":${currentDepth},"child":${child},"sibling":${generateRandomValue(currentDepth)}}`
}

/**
 * Generate large array
 */
function generateLargeArray(targetSize: number): string {
  const items: string[] = []
  let currentSize = 2 // Start with '[]'

  let index = 0
  while (currentSize < targetSize) {
    const item = generateArrayItem(index)
    currentSize += item.length + 1 // +1 for comma

    items.push(item)
    index++
  }

  return `[${items.join(',')}]`
}

function generateArrayItem(index: number): string {
  const type = index % 5

  switch (type) {
    case 0:
      return `{"id":${index},"name":"item_${index}","active":true}`
    case 1:
      return `["element_${index}",${index},${index % 2 === 0}]`
    case 2:
      return `${index * 1000 + Math.floor(Math.random() * 1000)}`
    case 3:
      return `"string_value_${index}_${'padding'.repeat(Math.floor(index % 10))}"`
    case 4:
      return `{"nested":{"value":${index},"metadata":{"timestamp":${Date.now()}}}}`
    default:
      return 'null'
  }
}

/**
 * Generate mixed structure (realistic data)
 */
function generateMixedStructure(targetSize: number): string {
  const sections: string[] = []
  let currentSize = 2 // Start with '{}'

  // Metadata section
  sections.push('"metadata":{"version":"1.0","generated":' + Date.now() + ',"size_target":' + targetSize + '}')
  currentSize += sections[0].length + 1

  // Users array
  const usersArray: string[] = []
  while (currentSize < targetSize * 0.4) {
    const user = generateUser(usersArray.length)
    usersArray.push(user)
    currentSize += user.length + 1
  }
  sections.push(`"users":[${usersArray.join(',')}]`)

  // Products array
  const productsArray: string[] = []
  while (currentSize < targetSize * 0.7) {
    const product = generateProduct(productsArray.length)
    productsArray.push(product)
    currentSize += product.length + 1
  }
  sections.push(`"products":[${productsArray.join(',')}]`)

  // Analytics data
  const analyticsEntries: string[] = []
  while (currentSize < targetSize * 0.95) {
    const entry = generateAnalyticsEntry(analyticsEntries.length)
    analyticsEntries.push(entry)
    currentSize += entry.length + 1
  }
  sections.push(`"analytics":{${analyticsEntries.join(',')}}`)

  return `{${sections.join(',')}}`
}

function generateUser(index: number): string {
  return JSON.stringify({
    id: index + 1000,
    username: `user_${index}`,
    email: `user${index}@example.com`,
    profile: {
      name: `User ${index}`,
      age: 20 + (index % 60),
      location: `City ${index % 100}`,
    },
    settings: {
      theme: index % 2 === 0 ? 'light' : 'dark',
      notifications: index % 3 === 0,
      language: ['en', 'es', 'fr', 'de'][index % 4],
    },
    created: Date.now() - index * 86400000,
  })
}

function generateProduct(index: number): string {
  return JSON.stringify({
    id: index + 5000,
    sku: `SKU-${String(index).padStart(6, '0')}`,
    name: `Product ${index}`,
    description: `This is product number ${index} with various features`.repeat(2),
    price: (Math.random() * 1000).toFixed(2),
    inStock: index % 4 !== 0,
    categories: ['Electronics', 'Home', 'Sports', 'Books'][index % 4],
    tags: [`tag${index % 10}`, `category${index % 5}`, `type${index % 3}`],
    metadata: {
      weight: (Math.random() * 10).toFixed(2),
      dimensions: {
        width: Math.floor(Math.random() * 100),
        height: Math.floor(Math.random() * 100),
        depth: Math.floor(Math.random() * 100),
      },
    },
  })
}

function generateAnalyticsEntry(index: number): string {
  const date = new Date(Date.now() - index * 3600000).toISOString().split('T')[0]
  const value = JSON.stringify({
    views: Math.floor(Math.random() * 10000),
    clicks: Math.floor(Math.random() * 1000),
    conversions: Math.floor(Math.random() * 100),
    revenue: (Math.random() * 5000).toFixed(2),
  })
  return `"${date}":${value}`
}

function generateRandomValue(index: number): string {
  const type = index % 6

  switch (type) {
    case 0:
      return `${index}`
    case 1:
      return `"string_${index}"`
    case 2:
      return `${index % 2 === 0}`
    case 3:
      return 'null'
    case 4:
      return `{"nested":"value_${index}"}`
    case 5:
      return `[${index},${index + 1},${index + 2}]`
    default:
      return '0'
  }
}

function countElements(json: string): number {
  // Rough count of keys/items
  const keys = (json.match(/"[^"]+"\s*:/g) || []).length
  const arrayItems = (json.match(/,/g) || []).length - keys
  return keys + arrayItems
}

// ============================================================================
// Main Execution
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, 'large')

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`Created directory: ${OUTPUT_DIR}`)
}

console.log('Generating large JSON test fixtures for Week 19...\n')

// 1MB fixtures (multiple patterns)
generateLargeJSON({
  targetSizeBytes: 1 * 1024 * 1024, // 1MB
  outputPath: path.join(OUTPUT_DIR, 'large_1mb_flat.json'),
  pattern: 'flat',
})

generateLargeJSON({
  targetSizeBytes: 1 * 1024 * 1024,
  outputPath: path.join(OUTPUT_DIR, 'large_1mb_array.json'),
  pattern: 'array',
})

generateLargeJSON({
  targetSizeBytes: 1 * 1024 * 1024,
  outputPath: path.join(OUTPUT_DIR, 'large_1mb_mixed.json'),
  pattern: 'mixed',
})

// 10MB fixtures
console.log()
generateLargeJSON({
  targetSizeBytes: 10 * 1024 * 1024, // 10MB
  outputPath: path.join(OUTPUT_DIR, 'large_10mb_flat.json'),
  pattern: 'flat',
})

generateLargeJSON({
  targetSizeBytes: 10 * 1024 * 1024,
  outputPath: path.join(OUTPUT_DIR, 'large_10mb_mixed.json'),
  pattern: 'mixed',
})

// 100MB fixture (one pattern - this will take a while)
console.log()
generateLargeJSON({
  targetSizeBytes: 100 * 1024 * 1024, // 100MB
  outputPath: path.join(OUTPUT_DIR, 'large_100mb_mixed.json'),
  pattern: 'mixed',
})

console.log('\n✅ All large fixtures generated successfully!')
console.log(`\nOutput directory: ${OUTPUT_DIR}`)
console.log('\nTo use in E2E tests, import these fixtures and measure:')
console.log('  - TTFD (Time to First Display)')
console.log('  - Memory usage')
console.log('  - Scroll performance')
console.log('  - Virtual scrolling effectiveness')
