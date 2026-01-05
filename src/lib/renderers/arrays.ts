import { templates, type Templates } from '../templates'
import type { JsonValue } from '../types'

export const renderArrayElements = (
  arr: JsonValue[],
  renderEntry: (value: JsonValue) => HTMLSpanElement,
  t: Templates = templates
): HTMLSpanElement => {
  const inner = t.t_blockInner.cloneNode(false) as HTMLSpanElement
  const lastIndex = arr.length - 1

  arr.forEach((val, i) => {
    const child = renderEntry(val)
    if (i < lastIndex) {
      child.appendChild(t.t_commaText.cloneNode())
    }
    inner.appendChild(child)
  })

  return inner
}
