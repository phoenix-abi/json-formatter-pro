import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import {
  selectParser,
  getReasonDescription,
  getParserDisplayName,
  getSessionOverride,
  setSessionOverride,
  getActiveParser,
} from '../../lib/parser-selection'
import { getParserSettings } from '../../lib/storage'
import type { ParserType } from '../../lib/parser-selection'

export interface ParserStatusProps {
  tab: chrome.tabs.Tab | undefined
  onParserChange?: () => void
}

interface MessageState {
  text: string
  type: 'success' | 'error'
}

/**
 * Parser status component for the popup
 */
export function ParserStatus({ tab, onParserChange }: ParserStatusProps) {
  const [parser, setParser] = useState<ParserType | null>(null)
  const [reason, setReason] = useState<any>(null)
  const [message, setMessage] = useState<MessageState | null>(null)

  useEffect(() => {
    if (tab?.url) {
      void loadParserStatus(tab.url)
    }
  }, [tab])

  // Auto-hide messages after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [message])

  const loadParserStatus = async (url: string) => {
    try {
      // First, try to get the actual active parser from the content script
      // This is set by the content script after running full selectParser logic (including file size)
      // Uses chrome.storage.session to communicate between content script and popup
      const activeParser = await getActiveParser(url)

      if (activeParser) {
        // Use the parser that's actually active on the page
        console.log('[Popup] Using active parser from content script:', activeParser)
        setParser(activeParser)
        setReason({ type: 'active-on-page', parser: activeParser })
        return
      }

      console.log('[Popup] No active parser found in storage, falling back to selectParser')

      // Fallback: compute parser selection without file size
      // (This happens if popup is opened before page loads, or on non-JSON pages)
      const settings = await getParserSettings()
      const sessionOverride = getSessionOverride(url)
      let selection = selectParser(url, settings, sessionOverride)

      // ExactJSON is now fully enabled, no need to check feature flags
      console.log('[Popup] Fallback selection:', {
        parser: selection.parser,
      })

      console.log('[Popup] Final parser:', selection.parser)
      setParser(selection.parser)
      setReason(selection.reason)
    } catch (error) {
      console.error('Error loading parser status:', error)
      setParser(null)
      setReason(null)
    }
  }

  const handleToggleParser = async () => {
    if (!tab?.url || !parser) return

    const otherParser: ParserType = parser === 'native' ? 'custom' : 'native'

    // Set session override
    setSessionOverride(tab.url, otherParser)

    // Update local state
    setParser(otherParser)
    setMessage({
      text: `Parser switched to ${getParserDisplayName(otherParser)} for this page`,
      type: 'success',
    })

    // Reload the tab
    if (tab.id) {
      chrome.tabs.reload(tab.id)
    }

    // Notify parent
    if (onParserChange) {
      onParserChange()
    }
  }

  const handleOpenSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  // Check if parser is available for this page
  if (!tab?.url) {
    return h(
      'div',
      { className: 'parser-unavailable' },
      'Parser selection not available on this page'
    )
  }

  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('file://') ||
    !tab.url.startsWith('http')
  ) {
    return h(
      'div',
      { className: 'parser-unavailable' },
      'Parser selection not available on this page'
    )
  }

  if (!parser) {
    return h('div', { className: 'parser-unavailable' }, 'Loading...')
  }

  return h(
    'div',
    null,
    h(
      'div',
      { id: 'parser-status' },
      h(
        'div',
        { className: 'parser-status-container' },
        h(
          'div',
          { className: 'parser-current' },
          h('strong', null, 'Current Parser:'),
          ' ',
          h('span', { className: 'parser-name' }, getParserDisplayName(parser))
        ),
        h(
          'div',
          { className: 'parser-reason' },
          h('small', null, getReasonDescription(reason))
        ),
        h(
          'div',
          { className: 'parser-info' },
          h('small', null, 'Parser selection only applies to JSON pages')
        )
      )
    ),

    h(
      'div',
      { id: 'parser-actions' },
      h(
        'button',
        { className: 'parser-toggle-button', onClick: handleToggleParser },
        `Switch to ${getParserDisplayName(parser === 'native' ? 'custom' : 'native')}`
      ),
      h(
        'a',
        { href: '#', className: 'parser-settings-link', onClick: (e: Event) => {
          e.preventDefault()
          handleOpenSettings()
        }},
        '⚙ Parser Settings'
      )
    ),

    message &&
      h(
        'div',
        { id: 'permission-message', className: `message ${message.type}` },
        message.text
      )
  )
}
