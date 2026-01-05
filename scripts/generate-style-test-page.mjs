#!/usr/bin/env node

/**
 * Generates static HTML test pages for stylesheet development.
 * This page mimics the exact DOM structure created by the extension,
 * allowing developers to iterate on styles without rebuilding/reloading.
 *
 * Usage:
 *   npm run style:preview                           # Generate all fixtures
 *   npm run style:preview small__mixed              # Generate specific fixture
 *   npm run style:preview small__mixed medium__flat # Generate multiple fixtures
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, basename, extname } from 'path'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const fixturesDir = join(projectRoot, 'tests', 'fixtures')
const outputDir = join(projectRoot, 'tests', 'preview')
const templatesDir = join(__dirname, 'templates')

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

// Parse command-line arguments
const args = process.argv.slice(2)
const specificFixtures = args.length > 0 ? args : null

// Load templates
const TEST_PAGE_TEMPLATE = readFileSync(join(templatesDir, 'test-page.html'), 'utf-8')
const INDEX_TEMPLATE = readFileSync(join(templatesDir, 'index.html'), 'utf-8')
const INLINE_SCRIPT_WRAPPER = readFileSync(join(templatesDir, 'inline-script-wrapper.js'), 'utf-8')

// Load the Vite-built bundle
const PREVIEW_BUNDLE_PATH = join(templatesDir, 'preview-bundle.js')

/**
 * Check if the preview bundle needs to be rebuilt based on source file changes
 */
function isBundleStale() {
  if (!existsSync(PREVIEW_BUNDLE_PATH)) {
    return true
  }

  const bundleTime = statSync(PREVIEW_BUNDLE_PATH).mtime
  
  // Source files that should trigger bundle rebuild
  const sourceFiles = [
    join(projectRoot, 'src/lib/buildDom.ts'),
    join(projectRoot, 'src/lib/renderUI.ts'),
    join(projectRoot, 'src/lib/getResult.ts'),
    join(projectRoot, 'src/lib/parser-selection.ts'),
    join(projectRoot, 'src/components/JsonTreeView.tsx'),
    join(projectRoot, 'src/components/JsonNode.tsx'),
    join(projectRoot, 'src/components/Toolbar.tsx'),
    join(projectRoot, 'src/components/Toggle.tsx'),
    join(projectRoot, 'src/components/ThemePicker.tsx'),
    join(projectRoot, 'src/components/Select.tsx'),
    join(projectRoot, 'src/components/ParserSelector.tsx'),
    join(projectRoot, 'src/components/index.ts'),
    join(projectRoot, 'scripts/preview-bundle-entry.ts'),
    join(projectRoot, 'vite.config.preview.mjs'),
    join(projectRoot, 'src/style.css') // CSS changes should also trigger rebuild
  ]

  return sourceFiles.some(file => {
    if (!existsSync(file)) return false
    return statSync(file).mtime > bundleTime
  })
}

/**
 * Rebuild the preview bundle if needed
 */
function ensureFreshBundle() {
  if (isBundleStale()) {
    console.log('🔄 Preview bundle is stale, rebuilding...')
    try {
      execSync('npm run style:preview:bundle', { 
        stdio: 'inherit',
        cwd: projectRoot
      })
      console.log('✅ Bundle rebuilt successfully')
    } catch (error) {
      console.error('❌ Failed to rebuild bundle:', error.message)
      process.exit(1)
    }
  } else {
    console.log('✅ Preview bundle is fresh')
  }
}

// Ensure bundle is up-to-date before proceeding
ensureFreshBundle()

if (!existsSync(PREVIEW_BUNDLE_PATH)) {
  console.error('❌ Preview bundle not found!')
  console.error('   Run: npm run style:preview:bundle')
  console.error(`   Expected: ${PREVIEW_BUNDLE_PATH}`)
  process.exit(1)
}
const PREVIEW_BUNDLE = readFileSync(PREVIEW_BUNDLE_PATH, 'utf-8')

/**
 * Extract JSON from a fixture file (either .json or .html)
 */
function extractJson(filepath) {
  const content = readFileSync(filepath, 'utf-8')
  const ext = extname(filepath)

  if (ext === '.json') {
    return JSON.parse(content)
  } else if (ext === '.html') {
    // Extract JSON from <pre> tag
    const preMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
    if (!preMatch) {
      throw new Error(`No <pre> tag found in ${filepath}`)
    }
    const jsonText = preMatch[1].trim()
    try {
      return JSON.parse(jsonText)
    } catch (e) {
      // Not valid JSON, skip this fixture
      return null
    }
  }
  return null
}

/**
 * Get list of fixtures to process
 */
function getFixtures() {
  const allFiles = readdirSync(fixturesDir)
  const jsonFiles = allFiles.filter((f) => f.endsWith('.json') || f.endsWith('.html'))

  if (specificFixtures) {
    // Filter to only requested fixtures
    return jsonFiles.filter((f) => {
      const baseName = basename(f, extname(f))
      return specificFixtures.some((requested) => baseName.includes(requested))
    })
  }

  // Return only .json files by default (not .html fixtures which may not be valid JSON)
  return jsonFiles.filter((f) => f.endsWith('.json'))
}

/**
 * Create the inline script that initializes the preview page
 */
function createInlineScript(jsonData) {
  const fixtureData = JSON.stringify(jsonData, null, 2)

  return INLINE_SCRIPT_WRAPPER
    .replace(/{fixtureData}/g, fixtureData)
    .replace(/{previewBundle}/g, PREVIEW_BUNDLE)
}

/**
 * Generate HTML for a test page using template and replacements
 */
function generateHtml(fixtureName, jsonData) {
  const rawJson = JSON.stringify(jsonData, null, 2)
  const rawJsonEscaped = rawJson.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inlineScript = createInlineScript(jsonData)

  return TEST_PAGE_TEMPLATE.replace(/{fixtureName}/g, fixtureName)
    .replace(/{rawJson}/g, rawJson)
    .replace(/{rawJsonEscaped}/g, rawJsonEscaped)
    .replace(/{inlineScript}/g, inlineScript)
}

/**
 * Generate index page using template and replacements
 */
function generateIndex(generatedFiles) {
  const fileListHtml = generatedFiles
    .map((file) => `    <li><a href="${file}">${file.replace('.html', '')}</a></li>`)
    .join('\n')

  return INDEX_TEMPLATE.replace(/{generatedFileList}/g, fileListHtml)
}

// Main execution
try {
  const fixtures = getFixtures()

  if (fixtures.length === 0) {
    console.log('⚠️  No fixtures found to process')
    console.log('   Use: npm run style:preview [fixture-name]')
    process.exit(0)
  }

  console.log(`Generating style test pages for ${fixtures.length} fixture(s)...\n`)

  const generatedFiles = []

  for (const fixture of fixtures) {
    const fixturePath = join(fixturesDir, fixture)
    const fixtureName = basename(fixture, extname(fixture))

    try {
      const jsonData = extractJson(fixturePath)
      if (!jsonData) {
        console.log(`⏭️  Skipped ${fixture} (not valid JSON)`)
        continue
      }

      const html = generateHtml(fixtureName, jsonData)
      const outputPath = join(outputDir, `${fixtureName}.html`)

      writeFileSync(outputPath, html, 'utf-8')
      generatedFiles.push(`${fixtureName}.html`)

      console.log(`✅ Generated ${fixtureName}.html`)
    } catch (error) {
      console.error(`❌ Error processing ${fixture}:`, error.message)
    }
  }

  // Generate index page
  if (generatedFiles.length > 0) {
    const indexHtml = generateIndex(generatedFiles.sort())
    const indexPath = join(outputDir, 'index.html')
    writeFileSync(indexPath, indexHtml, 'utf-8')
    console.log(`\n✅ Generated index.html\n`)
  }

  console.log(`📂 Output directory: tests/preview/`)
  console.log(`📖 Open tests/preview/index.html in your browser`)
  console.log(`\n💡 Tip: Use VS Code Live Server or similar for automatic refresh`)
  console.log(`\n🔄 Preview pages use Vite-bundled extension source from src/lib/`)
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}
