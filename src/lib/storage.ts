import type { ParserSettings, ParserURLOverride } from './parser-selection'
import { DEFAULT_PARSER_SETTINGS } from './parser-selection'

// Storage keys
export const STORAGE_KEYS = {
  THEME_OVERRIDE: 'themeOverride',
  PARSER_SETTINGS: 'parserSettings',
} as const

// Simple wrapper around chrome.storage.local for Promise-based get/set and filtered change listeners
export class StorageLocal {
  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve) => {
      try {
        chrome.storage.local.get(key, (result) => {
          // result is an object with the requested key
          const value = (result as Record<string, unknown>)[key] as T | undefined
          resolve(value === undefined ? defaultValue : value)
        })
      } catch (_e) {
        resolve(defaultValue)
      }
    })
  }

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => resolve())
      } catch (_e) {
        // Swallow errors to keep API simple; callers can decide if they need to handle failures
        resolve()
      }
    })
  }

  // Listen for changes to a specific key in the local area. Returns an unsubscribe function.
  onChanged<T extends string>(
    key: string,
    callback: (newValue: T, oldValue: T | undefined) => void
  ): () => void {
    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      areaName
    ) => {
      if (areaName !== 'local') return
      const change = (changes as Record<string, chrome.storage.StorageChange>)[key]
      if (!change) return
      callback(change.newValue as T, change.oldValue as T | undefined)
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }
}

export const storage = new StorageLocal()

// Parser Settings Functions

/**
 * Get parser settings from storage (with defaults)
 */
export async function getParserSettings(): Promise<ParserSettings> {
  const settings = await storage.get<ParserSettings>(
    STORAGE_KEYS.PARSER_SETTINGS,
    DEFAULT_PARSER_SETTINGS
  )
  return settings || DEFAULT_PARSER_SETTINGS
}

/**
 * Update parser settings (partial update)
 */
export async function setParserSettings(
  updates: Partial<ParserSettings>
): Promise<void> {
  const current = await getParserSettings()
  const updated: ParserSettings = { ...current, ...updates }
  await storage.set(STORAGE_KEYS.PARSER_SETTINGS, updated)
}

/**
 * Get URL overrides from parser settings
 */
export async function getParserURLOverrides(): Promise<ParserURLOverride[]> {
  const settings = await getParserSettings()
  return settings.urlOverrides
}

/**
 * Add a new URL override
 */
export async function addParserURLOverride(
  override: ParserURLOverride
): Promise<void> {
  const settings = await getParserSettings()
  const urlOverrides = [...settings.urlOverrides, override]
  await setParserSettings({ urlOverrides })
}

/**
 * Update an existing URL override by pattern
 */
export async function updateParserURLOverride(
  pattern: string,
  updates: Partial<ParserURLOverride>
): Promise<void> {
  const settings = await getParserSettings()
  const urlOverrides = settings.urlOverrides.map((override) =>
    override.pattern === pattern ? { ...override, ...updates } : override
  )
  await setParserSettings({ urlOverrides })
}

/**
 * Remove a URL override by pattern
 */
export async function removeParserURLOverride(pattern: string): Promise<void> {
  const settings = await getParserSettings()
  const urlOverrides = settings.urlOverrides.filter(
    (override) => override.pattern !== pattern
  )
  await setParserSettings({ urlOverrides })
}

/**
 * Listen for parser settings changes
 */
export function onParserSettingsChanged(
  callback: (newSettings: ParserSettings, oldSettings: ParserSettings | undefined) => void
): () => void {
  return storage.onChanged<ParserSettings>(STORAGE_KEYS.PARSER_SETTINGS, callback)
}
