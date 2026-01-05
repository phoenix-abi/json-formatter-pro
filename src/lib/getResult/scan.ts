export type ScanOutcome = HTMLPreElement | 'multiple' | 'textual' | null

export const findSingleBodyPre = (doc: Document): ScanOutcome => {
  let pre: HTMLPreElement | null = null
  const bodyChildren = doc.body.children
  const length = bodyChildren.length

  for (let i = 0; i < length; i++) {
    const child = bodyChildren[i]

    switch (child.tagName) {
      case 'PRE': {
        if (pre != null) return 'multiple'
        pre = child as HTMLPreElement
        break
      }
      case 'P':
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6': {
        return 'textual'
      }
    }
  }

  return pre
}

export const isRendered = (el: Element): boolean => el.checkVisibility?.() !== false
