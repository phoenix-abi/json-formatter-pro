/**
 * Accessibility enhancements for JSON formatter DOM tree.
 * Opt-in functionality to add keyboard navigation and ARIA support.
 */

/**
 * Enable accessibility features on a DOM root.
 * Adds keyboard navigation and ARIA attributes to expander elements.
 *
 * @param root - The root element or document to bind listeners to
 */
export const enableA11y = (root: Document | HTMLElement = document): void => {
  const scope: HTMLElement = (root as any).body ?? (root as HTMLElement)

  // Handle click events on expanders
  scope.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target || !target.classList.contains('e')) return
    toggleEntry(target)
  })

  // Handle keyboard events on expanders (Enter and Space)
  scope.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (!target || !target.classList.contains('e')) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleEntry(target)
    }
  })
}

/**
 * Toggle the expanded/collapsed state of an entry via its expander.
 *
 * @param expander - The expander element (.e)
 */
const toggleEntry = (expander: HTMLElement): void => {
  const entry = expander.closest('.entry') as HTMLElement | null
  if (!entry) return

  const expanded = entry.getAttribute('aria-expanded') === 'true'
  entry.setAttribute('aria-expanded', expanded ? 'false' : 'true')

  // Toggle the collapsed class for CSS-based show/hide
  if (expanded) {
    entry.classList.add('collapsed')
  } else {
    entry.classList.remove('collapsed')
  }
}

/**
 * Initialize expander accessibility attributes.
 * Should be called after buildDom creates the tree.
 *
 * @param root - The root element containing expanders
 */
export const initExpanderA11y = (root: HTMLElement): void => {
  const expanders = root.querySelectorAll('.e')
  expanders.forEach((exp) => {
    const el = exp as HTMLElement
    el.setAttribute('tabindex', '0')
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', 'Toggle expand/collapse')

    const entry = el.closest('.entry') as HTMLElement | null
    if (entry) {
      entry.setAttribute('aria-expanded', 'true') // Default expanded
      entry.setAttribute('role', 'treeitem')
    }
  })

  // Add group role to block inner elements
  const blockInners = root.querySelectorAll('.blockInner')
  blockInners.forEach((inner) => {
    ;(inner as HTMLElement).setAttribute('role', 'group')
  })
}
