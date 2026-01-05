/**
 * Performance timing initialization.
 *
 * This module records the extension start time as early as possible for
 * accurate Time-To-First-Display (TTFD) measurements.
 *
 * Imported as a side-effect in content.ts to execute before any other code.
 */

declare global {
  interface Window {
    __jsonFormatterStartTime?: number
  }
}

// Record the precise moment the extension content script begins execution
window.__jsonFormatterStartTime = performance.now()
