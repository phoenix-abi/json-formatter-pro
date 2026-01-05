import type { h as hType } from 'preact'
import type { ParserType } from './parser-selection'

export interface RenderToolbarOptions {
  h: typeof hType
  iconUrl: string
  isFormatted: boolean
  onFormatToggle: (checked: boolean) => void
  // Parser selection options
  currentParser?: ParserType
  onParserChange?: (parser: ParserType) => void
  showParserSelector?: boolean
}

/**
 * Renders the JSON Formatter Pro toolbar with branding, format toggle, and parser selector.
 * This is used by both the content script and preview pages.
 */
export function renderToolbar(
  h: typeof hType,
  Toolbar: any,
  Toggle: any,
  ParserIcon: any,
  options: RenderToolbarOptions
) {
  const {
    iconUrl,
    isFormatted,
    onFormatToggle,
    currentParser,
    onParserChange,
    showParserSelector = true,
  } = options

  // Handler to open options page in new tab
  const openOptionsPage = (e: any) => {
    e.preventDefault()
    // Send message to background script to open options page
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'openOptions' })
    }
  }

  return h(Toolbar, {
    left: h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        },
      },
      [
        h('img', {
          src: iconUrl,
          alt: 'JSON Formatter Pro',
          style: { width: '24px', height: '24px' },
        }),
        h(
          'span',
          {
            style: {
              fontWeight: '600',
              fontSize: '14px',
              color: 'var(--fg, #24292f)',
            },
          },
          'JSON Formatter Pro'
        ),
      ]
    ),
    right: h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        },
      },
      [
        h(Toggle, {
          label: 'Format',
          checked: isFormatted,
          onChange: onFormatToggle,
        }),
        // Parser icon (conditionally rendered)
        showParserSelector && currentParser
          ? h(ParserIcon, {
              parser: currentParser,
              onParserChange: onParserChange,
            })
          : null,
        // Options gear icon using emoji
        h('a', {
          href: '#',
          'aria-label': 'Open Options Page',
          title: 'Open Options Page',
          onClick: openOptionsPage,
          style: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--jf-secondary-text-color, #656d76)',
            textDecoration: 'none',
            fontSize: '16px',
          },
          onMouseEnter: (e: any) => {
            e.target.style.backgroundColor = 'var(--jf-hover-bg, #f3f4f6)'
          },
          onMouseLeave: (e: any) => {
            e.target.style.backgroundColor = 'transparent'
          },
        }, '⚙️')
      ].filter(Boolean)
    ),
  })
}

/**
 * Creates collapse/expand event handlers for JSON tree nodes.
 * This is used by both the content script and preview pages.
 */
export function setupCollapseExpandHandlers(document: Document) {
  function collapse(elements: HTMLElement[] | HTMLCollection) {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i] as HTMLElement
      el.classList.add('collapsed') // hides contents and shows an ellipsis
    }
  }

  function expand(elements: HTMLElement[] | HTMLCollection) {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i] as HTMLElement
      el.classList.remove('collapsed')
    }
  }

  function generalClick(ev: MouseEvent) {
    const elem = ev.target
    if (!(elem instanceof HTMLElement)) return

    if (elem.className === 'e') {
      // It's a click on an expander.
      ev.preventDefault()

      const parent = elem.parentNode
      if (!(parent instanceof HTMLElement)) return

      // Expand or collapse
      if (parent.classList.contains('collapsed')) {
        // EXPAND
        if (ev.metaKey || ev.ctrlKey) {
          const gp = parent.parentNode
          if (gp instanceof HTMLElement) {
            expand(gp.children)
          }
        } else {
          expand([parent])
        }
      } else {
        // COLLAPSE
        if (ev.metaKey || ev.ctrlKey) {
          const gp = parent.parentNode
          if (gp instanceof HTMLElement) {
            collapse(gp.children)
          }
        } else {
          collapse([parent])
        }
      }
    }
  }

  document.addEventListener('mousedown', generalClick)
}
