/**
 * Content script that exposes parsed JSON data to the browser console.
 *
 * This script runs in the MAIN world context to make the parsed JSON available
 * as a global `window.json` property for developer console access.
 *
 * Fast exit on non-JSON pages to minimize performance impact.
 */

interface WindowWithJson extends Window {
  json?: unknown
}

declare const window: WindowWithJson

// Immediately invoked function to avoid polluting global scope
void (function exposeJsonGlobal() {
  // Fast bailout: Check if this is a formatted JSON page
  const containerElement = document.getElementById('jsonFormatterRaw')
  if (!containerElement) {
    return // Not a JSON formatter page
  }

  const preElement = containerElement.querySelector('pre')
  if (!preElement) {
    return // Missing expected pre element
  }

  // Small delay to ensure DOM and content are fully settled
  const SETTLE_DELAY_MS = 120

  setTimeout(function revealJsonToConsole() {
    try {
      const rawJsonText = preElement.innerText
      const parsedData = JSON.parse(rawJsonText)

      // Define read-only, non-enumerable property on window
      Object.defineProperty(window, 'json', {
        value: parsedData,
        writable: false,
        enumerable: false,
        configurable: true,
      })

      console.log('JSON Formatter Pro: Global "json" variable available. Type "json" in console to inspect.')
    } catch (parseError) {
      console.error('JSON Formatter Pro: Unable to create global json variable', parseError)
    }
  }, SETTLE_DELAY_MS)
})()
