import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { PermissionManager } from './PermissionManager'
import { ParserStatus } from './ParserStatus'

/**
 * Main popup app component
 */
export function PopupApp() {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | undefined>(undefined)

  useEffect(() => {
    void loadCurrentTab()
  }, [])

  const loadCurrentTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    setCurrentTab(tab)
  }

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  return h(
    'div',
    { className: 'popup-container' },
    // Header with branding and options link
    h(
      'header',
      { className: 'popup-header' },
      h(
        'div',
        { className: 'popup-branding' },
        h('img', {
          src: '../icons/icon32.png',
          alt: '',
          className: 'popup-icon',
        }),
        h('span', { className: 'popup-title' }, 'JSON Formatter Pro')
      ),
      h('button', {
        className: 'popup-options-button',
        onClick: handleOpenOptions,
        'aria-label': 'Options',
        title: 'Options',
      }, '⚙️')
    ),

    // Permission section
    h(
      'fieldset',
      { id: 'permission-section' },
      h('legend', null, 'Domain Access'),
      h(PermissionManager, { tab: currentTab })
    ),

    // Parser section (always shown - ExactJSON is now default)
    h(
      'fieldset',
      { id: 'parser-section' },
      h('legend', null, 'JSON Parser'),
      h(ParserStatus, { tab: currentTab })
    )
  )
}
