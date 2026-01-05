import { JsonValue } from '../types'
import { isJsonArray, isJsonObject } from '../getValueType'

export const hasOwn = (obj: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key)

export const getCollectionSize = (v: JsonValue): number =>
  isJsonArray(v) ? v.length : isJsonObject(v) ? Object.keys(v).length : 0

export const hasEntries = (v: JsonValue): boolean => getCollectionSize(v) > 0
