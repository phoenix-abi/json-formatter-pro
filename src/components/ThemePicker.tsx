import { h } from 'preact'
import { useCallback } from 'preact/hooks'
import { Select, type SelectOption } from './Select'
import './ThemePicker.css'

export type Theme = 'system' | 'light' | 'dark'

export interface ThemePickerProps {
  theme?: Theme
  useStorage?: boolean
  storageKey?: string
  onThemeChange?: (theme: Theme) => void
}

const THEME_OPTIONS: SelectOption<Theme>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/**
 * Theme picker component for selecting System/Light/Dark themes.
 * Applies theme to document and optionally syncs with chrome.storage.
 */
export function ThemePicker({
  theme: initialTheme = 'system',
  useStorage = false,
  storageKey = 'themeOverride',
  onThemeChange,
}: ThemePickerProps) {
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.dataset.theme = newTheme
    }
  }

  const handleThemeChange = useCallback(
    (newTheme: Theme) => {
      applyTheme(newTheme)
      if (onThemeChange) {
        onThemeChange(newTheme)
      }
    },
    [onThemeChange]
  )

  return h(Select, {
    value: initialTheme,
    options: THEME_OPTIONS,
    onChange: handleThemeChange,
    ariaLabel: 'Select theme',
    useStorage,
    storageKey,
  })
}
