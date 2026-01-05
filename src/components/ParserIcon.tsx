import { h } from 'preact'
import { useState, useCallback, useRef, useEffect } from 'preact/hooks'
import type { ParserType } from '../lib/parser-selection'
import './ParserIcon.css'

export interface ParserIconProps {
  parser: ParserType
  onParserChange?: (parser: ParserType) => void
}

/**
 * Icon-based parser indicator for the toolbar.
 * Shows current parser with an icon, click to toggle.
 */
export function ParserIcon({ parser, onParserChange }: ParserIconProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    setShowMenu(prev => !prev)
  }, [])

  const handleSelect = useCallback((selectedParser: ParserType) => {
    if (onParserChange) {
      onParserChange(selectedParser)
    }
    setShowMenu(false)
  }, [onParserChange])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [showMenu])

  const icon = parser === 'native' ? '⚡' : '🎯'
  const label = parser === 'native' ? 'Native Parser (fast)' : 'ExactJSON (precise)'

  return h(
    'div',
    { className: 'parser-icon-container', ref: menuRef },
    h('button', {
      className: 'parser-icon-button',
      onClick: handleToggle,
      'aria-label': label,
      title: label,
    }, icon),

    showMenu && h(
      'div',
      { className: 'parser-icon-menu' },
        h(
          'button',
          {
            className: `parser-icon-option ${parser === 'custom' ? 'active' : ''}`,
            onClick: () => handleSelect('custom'),
          },
          [
            h('span', { className: 'parser-icon-option-icon' }, '🎯'),
            h('div', { className: 'parser-icon-option-text' }, [
              h('div', { className: 'parser-icon-option-label' }, 'ExactJSON'),
              h('div', { className: 'parser-icon-option-desc' }, 'Precise, preserves numbers & order'),
            ]),
          ]
        ),
        h(
          'button',
          {
            className: `parser-icon-option ${parser === 'native' ? 'active' : ''}`,
            onClick: () => handleSelect('native'),
          },
          [
            h('span', { className: 'parser-icon-option-icon' }, '⚡'),
            h('div', { className: 'parser-icon-option-text' }, [
              h('div', { className: 'parser-icon-option-label' }, 'Native Parser'),
              h('div', { className: 'parser-icon-option-desc' }, 'Fast, uses JSON.parse()'),
            ]),
          ]
        )
    )
  )
}
