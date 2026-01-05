import { templates, type Templates } from '../templates'

export const renderBoolean = (value: boolean, t: Templates = templates): HTMLSpanElement =>
  (value ? t.t_true : t.t_false).cloneNode(true) as HTMLSpanElement
