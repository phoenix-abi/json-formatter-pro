import type { JsonValue } from '../types'
import { findSingleBodyPre, isRendered } from './scan'
import { MAX_LENGTH, isTooLong, startsLikeJson } from './policy'
import { tryParseJson } from './parse'

export type Result =
  | {
      formatted: true
      note: string
      rawLength: number
      element: HTMLPreElement
      parsed: JsonValue
    }
  | { formatted: false; note: string; rawLength: number | null }

export function getResult(document = globalThis.document): Result {
  if (document.title)
    return {
      formatted: false,
      note: 'document.title is contentful',
      rawLength: null,
    }

  const found = findSingleBodyPre(document)
  if (found === 'multiple')
    return {
      formatted: false,
      note: 'Multiple body > pre elements',
      rawLength: null,
    }
  if (found === 'textual')
    return {
      formatted: false,
      note: 'body contains textual elements',
      rawLength: null,
    }
  if (!found) return { formatted: false, note: 'No body > pre', rawLength: null }

  const pre = found
  if (!isRendered(pre))
    return {
      formatted: false,
      note: 'body > pre is not rendered',
      rawLength: null,
    }

  const raw = pre.textContent ?? ''
  const rawLength = raw.length

  if (!raw)
    return { formatted: false, note: 'No content in body > pre', rawLength }

  if (isTooLong(rawLength, MAX_LENGTH))
    return { formatted: false, note: 'Too long', rawLength }

  if (!startsLikeJson(raw))
    return { formatted: false, note: 'Does not start with { or [', rawLength }

  const parsed = tryParseJson(raw)
  if (!parsed.ok)
    return { formatted: false, note: 'Does not parse as JSON', rawLength }

  return {
    formatted: true,
    note: 'done',
    element: pre,
    rawLength,
    parsed: parsed.parsed,
  }
}

export { MAX_LENGTH }
