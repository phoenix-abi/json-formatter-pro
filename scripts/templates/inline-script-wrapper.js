// ============================================================================
// Preview page data and initialization
// ============================================================================

// Set the fixture data
window.__FIXTURE_DATA__ = {fixtureData};

// ============================================================================
// Extension source code bundle (built by Vite)
// ============================================================================

{previewBundle}

// ============================================================================
// Preview page interactivity
// ============================================================================

// Initialize the page
async function init() {
  const parsedJsonRootStruct = window.__FIXTURE_DATA__

  // Build the DOM using the bundled buildDom function
  const rootEntry = buildDom(parsedJsonRootStruct, false)
  const parsedJsonContainer = document.getElementById('jsonFormatterParsed')
  parsedJsonContainer.appendChild(rootEntry)

  // Set up Preact toolbar
  const rawJsonContainer = document.getElementById('jsonFormatterRaw')
  const toolbarContainer = document.getElementById('toolbar-container')
  // Apply sticky positioning to the container
  toolbarContainer.style.cssText = 'position: sticky; top: 0; z-index: 1000;'

  const { h, render } = window.preact
  const { Toolbar, Toggle, ThemePicker } = window.components
  const { renderToolbar: createToolbar } = window.renderUI

  let isFormatted = true
  let currentTheme = 'system'

  const handleFormatToggle = (checked) => {
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
    // Re-render to update toggle state
    renderToolbarUI()
  }

  const handleThemeChange = (theme) => {
    currentTheme = theme
    // Re-render to update theme picker state
    renderToolbarUI()
  }

  const renderToolbarUI = () => {
    render(
      createToolbar(h, Toolbar, Toggle, ThemePicker, null, {
        h,
        iconUrl: '../../src/icons/icon32.png',
        isFormatted,
        onFormatToggle: handleFormatToggle,
        themeValue: currentTheme,
        useThemeStorage: false,
        onThemeChange: handleThemeChange,
        showParserSelector: false,
      }),
      toolbarContainer
    )
  }

  renderToolbarUI()

  // Set up collapse/expand handlers using shared function
  const { setupCollapseExpandHandlers } = window.renderUI
  setupCollapseExpandHandlers(document)
}

// Theme picker is now handled by Preact component
function setupThemeSwitcher() {
  // Theme changes are handled automatically by the ThemePicker component
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init()
    setupThemeSwitcher()
  })
} else {
  init()
  setupThemeSwitcher()
}
