/**
 * Entry point for the preview bundle.
 * This file exports all the necessary functions for the preview pages.
 * Vite will bundle this into a single JavaScript file.
 */

import { buildDom } from '../src/lib/buildDom'
import { h, render } from 'preact'
import { Toolbar, Toggle, ThemePicker } from '../src/components'
import { renderToolbar, setupCollapseExpandHandlers } from '../src/lib/renderUI'

// Re-export buildDom, Preact utilities, and UI helpers
export { buildDom, h, render, Toolbar, Toggle, ThemePicker, renderToolbar, setupCollapseExpandHandlers }

// Make functions available globally for the preview pages
if (typeof window !== 'undefined') {
  ;(window as any).buildDom = buildDom
  ;(window as any).preact = { h, render }
  ;(window as any).components = { Toolbar, Toggle, ThemePicker }
  ;(window as any).renderUI = { renderToolbar, setupCollapseExpandHandlers }
}
