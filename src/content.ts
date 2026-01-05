import './lib/beforeAll'
import { getResult } from './lib/getResult'
import { storage, getParserSettings } from './lib/storage'
import { themeStorageKey, type Theme } from './lib/constants'
import { renderToolbar } from './lib/renderUI'
import { isFeatureEnabled, FeatureFlag } from './lib/featureFlags'
import { parse as parseCustom } from './lib/parser/parse'
import { selectParser, getSessionOverride, setActiveParser, type ParserType } from './lib/parser-selection'
import { logParserMetric, sanitizeErrorMessage } from './lib/metrics'
// Use file URLs for stylesheets so we can inject <link> elements (debuggable & CSP-safe)
// @ts-ignore
import lightCssUrl from './style.css?url'

// Resolve to full extension URLs so links don't end up relative to the page URL
const LIGHT_CSS_HREF: string = chrome.runtime.getURL(lightCssUrl as string)
// Icon is copied by viteStaticCopy, so we reference it directly
const ICON_URL: string = chrome.runtime.getURL('icons/icon32.png')

const PERFORMANCE_DEBUGGING = false

// ---------- Stylesheet helpers ----------
const LIGHT_ID = 'jf-style-light'

function ensureBaseStyle() {
  if (!document.getElementById(LIGHT_ID)) {
    const link = document.createElement('link')
    link.id = LIGHT_ID
    link.rel = 'stylesheet'
    link.href = LIGHT_CSS_HREF
    document.head.appendChild(link)
  }
}

// Dark stylesheet is no longer used; dark/light are driven by tokens in style.css

function applyTheme(value: Theme) {
  ensureBaseStyle()
  const root = document.documentElement
  switch (value) {
    case 'light': {
      // Explicitly mark light to suppress @media (prefers-color-scheme: dark) overrides
      root.dataset.theme = 'light'
      break
    }
    case 'dark': {
      root.dataset.theme = 'dark'
      break
    }
    case 'system':
    default: {
      // Allow system preference to take over by removing explicit attribute
      root.removeAttribute('data-theme')
      break
    }
  }
}

const resultPromise = (async () => {
  const result = getResult(document)
  if (!result.formatted) return result

  const { element: originalPreElement } = result

  // Store original JSON text for re-parsing with different parsers
  const originalJsonText = originalPreElement.textContent || ''

  const themeValue = (await storage.get<Theme>(themeStorageKey, 'system')) || 'system'
  // Apply stylesheet links per current theme
  applyTheme(themeValue)

  {
    // Detach the pre
    originalPreElement.remove()

    // Add inner containers
    const parsedJsonContainer = document.createElement('div')
    parsedJsonContainer.id = 'jsonFormatterParsed'
    document.body.appendChild(parsedJsonContainer)

    const rawJsonContainer = document.createElement('div')
    rawJsonContainer.hidden = true
    rawJsonContainer.id = 'jsonFormatterRaw'
    rawJsonContainer.append(originalPreElement)
    document.body.appendChild(rawJsonContainer)

    // JSON validation complete: Successfully parsed valid JSON structure.
    // Initialize interactive UI components and event handling
    {
      // Ensure our base stylesheet link exists (idempotent)
      ensureBaseStyle()

      // Render Preact toolbar
      const { render, h } = await import('preact')
      const { Toolbar, Toggle, ParserIcon } = await import('./components')

      // Create toolbar container with sticky positioning
      const toolbarContainer = document.createElement('div')
      toolbarContainer.id = 'json-formatter-toolbar'
      toolbarContainer.style.cssText = 'position: sticky; top: 0; z-index: 1000;'
      document.body.prepend(toolbarContainer)

      // Track formatting state
      let isFormatted = true

      // Function to render/update toolbar (called on state changes)
      const updateToolbar = () => {
        render(
          renderToolbar(h, Toolbar, Toggle, ParserIcon, {
            h,
            iconUrl: ICON_URL,
            isFormatted,
            onFormatToggle: handleFormatToggle,
            currentParser: selection.parser,
            onParserChange: handleParserChange,
            showParserSelector: true, // Always show parser selector - ExactJSON is now default
          }),
          toolbarContainer
        )
      }

      const handleFormatToggle = (checked: boolean) => {
        isFormatted = checked
        if (checked) {
          // Show parsed/formatted view
          rawJsonContainer.hidden = true
          parsedJsonContainer.hidden = false
        } else {
          // Show raw view
          rawJsonContainer.hidden = false
          parsedJsonContainer.hidden = true
        }
        // Re-render toolbar to update toggle visual state
        updateToolbar()
      }

      // Function to render JSON content with selected parser
      const renderJsonContent = async (parser: ParserType) => {
        // Get parser settings
        const settings = await getParserSettings()

        // Clear existing content - unmount any Preact components first
        const shouldUsePreact = await isFeatureEnabled(FeatureFlag.UsePreactRenderer)
        if (shouldUsePreact) {
          const { render } = await import('preact')
          render(null, parsedJsonContainer) // Properly unmount Preact
        } else {
          parsedJsonContainer.innerHTML = ''
        }

        // Parse JSON with selected parser
        let dataToRender: any
        const startTime = performance.now()
        let parseSuccess = false
        let parseError: { type: string; message: string } | undefined

        try {
          if (parser === 'custom') {
            // Use ExactJSON with configured options
            const parseResult = parseCustom(originalJsonText, settings.customParserOptions)
            dataToRender = parseResult.ast

            // Log errors if in tolerant mode
            if (parseResult.errors && parseResult.errors.length > 0) {
              console.warn('Parser recovered from errors:', parseResult.errors)
            }

            console.log('Custom parser used with options:', settings.customParserOptions)
          } else {
            // Use native JSON.parse()
            dataToRender = JSON.parse(originalJsonText)
            console.log('Native parser used')
          }
          parseSuccess = true
        } catch (error) {
          console.error('Parser error:', error)

          // Capture error details for metrics
          const errorObj = error as Error
          parseError = {
            type: errorObj.name || 'Error',
            message: sanitizeErrorMessage(errorObj.message || 'Unknown error'),
          }

          // Fallback to native parser on ExactJSON error
          if (parser === 'custom') {
            console.warn('Custom parser failed, falling back to native parser')
            try {
              dataToRender = JSON.parse(originalJsonText)
              parseSuccess = true
              // Clear error since fallback succeeded
              parseError = undefined
            } catch (fallbackError) {
              // Both parsers failed
              throw fallbackError
            }
          } else {
            throw error
          }
        }

        const parseTime = performance.now() - startTime
        console.log(`Parse time: ${parseTime.toFixed(2)}ms`)

        // Log metrics (only if user opted in)
        const preactRendererEnabled = await isFeatureEnabled(FeatureFlag.UsePreactRenderer)

        await logParserMetric({
          parser,
          selectionReason: selection.reason.type,
          fileSizeBytes: originalJsonText.length,
          parseTimeMs: parseTime,
          success: parseSuccess,
          error: parseError,
          featureFlags: {
            customParserEnabled: true, // ExactJSON is now always enabled
            preactRendererEnabled,
          },
        })

        // Render JSON using Preact virtual scrolling renderer
        const { render, h } = await import('preact')
        const { JsonTreeView } = await import('./components/JsonTreeView')

        render(
          h(JsonTreeView, {
            data: dataToRender,
            input: originalJsonText,
            initialExpandDepth: 3,
          }),
          parsedJsonContainer
        )
      }

      // Handle parser change - triggers re-parse and re-render
      const handleParserChange = async (parser: ParserType) => {
        console.log('Parser changed to:', parser)
        // Re-render with selected parser
        await renderJsonContent(parser)
      }

      // Determine initial parser based on settings and feature flags
      const settings = await getParserSettings()
      const sessionOverride = getSessionOverride(window.location.href)
      const fileSizeMB = originalJsonText.length / (1024 * 1024)

      // ExactJSON is now fully enabled, no feature flag check needed
      let selection = selectParser(
        window.location.href,
        settings,
        sessionOverride,
        fileSizeMB
      )

      console.log('Parser selection:', {
        parser: selection.parser,
        reason: selection.reason,
        fileSize: `${fileSizeMB.toFixed(2)} MB`,
      })

      // Store the active parser for the popup to read (via chrome.storage.local)
      await setActiveParser(window.location.href, selection.parser)

      // Render toolbar with Preact (initial render)
      updateToolbar()

      // Initial render with selected parser
      await renderJsonContent(selection.parser)
    }
  }

  // Hide any legacy JSON formatter containers from other extensions
  const legacyContainers = document.getElementsByClassName('json-formatter-container')
  for (const container of legacyContainers) {
    (container as HTMLElement).style.display = 'none'
  }

  return result
})()

// Note: Theme changes are now handled by the jf-theme-picker component

// Performance measurement for development debugging
if (PERFORMANCE_DEBUGGING) {
  resultPromise.then((formattingResult) => {
    const startTime = window.__jsonFormatterStartTime
    if (startTime === undefined) {
      console.warn('JSON Formatter Pro: Start time not recorded')
      return
    }

    const endTime = performance.now()
    const durationMs = endTime - startTime
    const roundedDuration = Math.round(durationMs * 10) / 10

    console.group('JSON Formatter Pro Performance')
    console.log('Result:', formattingResult)
    console.log('Time to First Display:', `${roundedDuration}ms`)
    console.groupEnd()
  })
}
