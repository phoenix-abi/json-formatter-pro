import { h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import './Select.css'

export interface SelectOption<T = string> {
  value: T
  label: string
}

export interface SelectProps<T = string> {
  /** Current selected value */
  value?: T
  /** Available options */
  options: SelectOption<T>[]
  /** Callback when selection changes */
  onChange?: (value: T) => void
  /** Aria label for accessibility */
  ariaLabel: string
  /** Whether to sync with chrome.storage */
  useStorage?: boolean
  /** Storage key for persisting selection */
  storageKey?: string
}

/**
 * Generic select/dropdown component.
 * Styled to match GitHub's dropdown design.
 */
export function Select<T extends string = string>({
  value: initialValue,
  options,
  onChange,
  ariaLabel,
  useStorage = false,
  storageKey = 'selectValue',
}: SelectProps<T>) {
  const [value, setValue] = useState<T>(initialValue || (options[0]?.value as T))

  // Load value from storage on mount
  useEffect(() => {
    if (useStorage && typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(storageKey).then((result) => {
        if (result[storageKey]) {
          const storedValue = result[storageKey] as T
          setValue(storedValue)
        }
      })

      // Listen for external changes
      const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area === 'local' && changes[storageKey]) {
          const newValue = (changes[storageKey].newValue || options[0]?.value) as T
          setValue(newValue)
        }
      }
      chrome.storage.onChanged.addListener(listener)

      return () => {
        chrome.storage.onChanged.removeListener(listener)
      }
    }
  }, [useStorage, storageKey, options])

  const handleChange = useCallback(
    async (e: Event) => {
      const select = e.target as HTMLSelectElement
      const newValue = select.value as T
      setValue(newValue)

      // Call callback
      if (onChange) {
        onChange(newValue)
      }

      // Persist to storage if enabled
      if (useStorage && typeof chrome !== 'undefined' && chrome.storage) {
        try {
          await chrome.storage.local.set({ [storageKey]: newValue })
        } catch (error) {
          console.warn('Failed to save selection to storage:', error)
        }
      }
    },
    [useStorage, storageKey, onChange]
  )

  return (
    <select class="select" value={value} onChange={handleChange} aria-label={ariaLabel}>
      {options.map((option) =>
        h('option', { key: String(option.value), value: option.value }, option.label)
      )}
    </select>
  )
}
