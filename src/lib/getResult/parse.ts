import type { JsonValue } from '../types'

export type ParseResult =
  | { ok: true; parsed: JsonValue }
  | { ok: false }

export const tryParseJson = (text: string): ParseResult => {
  try {
    return { ok: true, parsed: JSON.parse(text) as JsonValue }
  } catch {
    return { ok: false }
  }
}
