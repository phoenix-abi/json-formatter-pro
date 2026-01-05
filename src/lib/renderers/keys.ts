import { templates, type Templates } from '../templates'

export const renderKeyName = (key: string, t: Templates = templates): HTMLSpanElement => {
  const span = t.t_key.cloneNode(false) as HTMLSpanElement
  span.textContent = JSON.stringify(key).slice(1, -1)
  return span
}

export const appendKeyPreamble = (entry: HTMLSpanElement, key: string, t: Templates = templates): void => {
  entry.appendChild(t.t_dblqText.cloneNode(false))
  entry.appendChild(renderKeyName(key, t))
  entry.appendChild(t.t_dblqText.cloneNode(false))
  entry.appendChild(t.t_colonAndSpace.cloneNode(false))
}
