import { createBlankSpan, templates, type Templates } from '../templates'

export const isLikelyUrl = (s: string): boolean =>
  s.startsWith('https://') || s.startsWith('http://') || s.startsWith('/')

export const escapeJsonStringForDisplay = (value: string): string => {
  const quoted = JSON.stringify(value)
  return quoted.substring(1, quoted.length - 1)
}

export const renderString = (value: string, t: Templates = templates): HTMLSpanElement => {
  const container = t.t_string.cloneNode(false) as HTMLSpanElement
  const inner = createBlankSpan()
  const escaped = escapeJsonStringForDisplay(value)

  if (isLikelyUrl(value)) {
    const a = document.createElement('a')
    a.href = value
    a.textContent = escaped
    inner.appendChild(a)
  } else {
    inner.textContent = escaped
  }

  container.appendChild(t.t_dblqText.cloneNode(false))
  container.appendChild(inner)
  container.appendChild(t.t_dblqText.cloneNode(false))

  return container
}
