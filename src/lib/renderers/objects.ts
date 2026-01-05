import { templates, type Templates } from '../templates'
import type { JsonValue } from '../types'

export const renderObjectEntries = (
  obj: Record<string, JsonValue>,
  renderEntry: (value: JsonValue, key: string) => HTMLSpanElement,
  t: Templates = templates
): HTMLSpanElement => {
  const inner = t.t_blockInner.cloneNode(false) as HTMLSpanElement
  const keys = Object.keys(obj)

  keys.forEach((k, i) => {
    const child = renderEntry(obj[k], k)
    if (i < keys.length - 1) {
      child.appendChild(t.t_commaText.cloneNode())
    }
    inner.appendChild(child)
  })

  return inner
}
