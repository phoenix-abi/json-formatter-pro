import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'

export interface PermissionManagerProps {
  tab: chrome.tabs.Tab | undefined
}

interface MessageState {
  text: string
  type: 'success' | 'error'
}

/**
 * Permission manager component for the popup
 */
export function PermissionManager({ tab }: PermissionManagerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [message, setMessage] = useState<MessageState | null>(null)

  useEffect(() => {
    if (tab?.url) {
      void checkPermission(tab.url)
    }
  }, [tab])

  // Auto-hide messages after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const checkPermission = async (url: string) => {
    try {
      const parsedUrl = new URL(url)
      const origin = `*://${parsedUrl.hostname}/*`
      const permitted = await chrome.permissions.contains({ origins: [origin] })
      setHasPermission(permitted)
    } catch {
      setHasPermission(null)
    }
  }

  const requestPermission = async () => {
    if (!tab?.url) return

    try {
      const parsedUrl = new URL(tab.url)
      const origin = `*://${parsedUrl.hostname}/*`
      const granted = await chrome.permissions.request({ origins: [origin] })

      if (granted) {
        setHasPermission(true)
        setMessage({ text: `✓ Access granted to ${parsedUrl.hostname}`, type: 'success' })
      } else {
        setMessage({ text: '⚠ Permission denied. Click the button to try again.', type: 'error' })
      }
    } catch (error) {
      console.error('Permission request error:', error)
      setMessage({ text: '⚠ Failed to request permission.', type: 'error' })
    }
  }

  const revokePermission = async () => {
    if (!tab?.url) return

    try {
      const parsedUrl = new URL(tab.url)
      const origin = `*://${parsedUrl.hostname}/*`
      const revoked = await chrome.permissions.remove({ origins: [origin] })

      if (revoked) {
        setHasPermission(false)
        setMessage({ text: `Access revoked for ${parsedUrl.hostname}`, type: 'success' })
      } else {
        setMessage({ text: '⚠ Failed to revoke permission.', type: 'error' })
      }
    } catch (error) {
      console.error('Permission revoke error:', error)
      setMessage({ text: '⚠ Failed to revoke permission.', type: 'error' })
    }
  }

  // Render based on tab URL
  if (!tab?.url) {
    return h(
      'div',
      { className: 'special-url-message' },
      'Extension not available on this page'
    )
  }

  // Special URLs
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('edge://')
  ) {
    return h(
      'div',
      { className: 'special-url-message' },
      'Cannot run on browser internal pages'
    )
  }

  if (tab.url.startsWith('file://')) {
    return h(
      'div',
      { className: 'special-url-message' },
      'For local files, enable "Allow access to file URLs" in extension settings'
    )
  }

  try {
    const parsedUrl = new URL(tab.url)
    const hostname = parsedUrl.hostname

    return h(
      'div',
      null,
      h(
        'div',
        { id: 'permission-status' },
        hasPermission
          ? h(
              'div',
              null,
              h('div', { className: 'status-active' }, `✓ Active on ${hostname}`),
              h(
                'button',
                { className: 'revoke-button', onClick: revokePermission },
                'Revoke Access'
              )
            )
          : h(
              'button',
              { className: 'grant-button', onClick: requestPermission },
              `Grant Access to ${hostname}`
            )
      ),
      message &&
        h(
          'div',
          { id: 'permission-message', className: `message ${message.type}` },
          message.text
        )
    )
  } catch {
    return h(
      'div',
      { className: 'special-url-message' },
      'Extension not available on this page'
    )
  }
}
