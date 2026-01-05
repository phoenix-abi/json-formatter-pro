import { templates, type Templates } from '../templates'

export const renderNull = (t: Templates = templates): HTMLSpanElement =>
  t.t_null.cloneNode(true) as HTMLSpanElement
