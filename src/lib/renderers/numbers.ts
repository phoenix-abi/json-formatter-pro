import { templates, type Templates } from '../templates'

export const renderNumber = (value: number, t: Templates = templates): HTMLSpanElement => {
  const el = t.t_number.cloneNode(false) as HTMLSpanElement
  el.textContent = String(value)
  return el
}
