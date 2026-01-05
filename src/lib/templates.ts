/**
 * DOM template factories for efficient node creation.
 *
 * These factories provide a lazy, on-demand pattern for creating DOM elements
 * without touching the global `document` object at module load time. This is
 * important for test environments and module isolation.
 *
 * Each template exposes a `cloneNode()` method that creates fresh nodes when
 * called, similar to the native HTMLTemplateElement API.
 */

/**
 * Factory interface for creating DOM nodes on demand.
 */
interface NodeFactory<T extends Node> {
  /**
   * Creates a fresh clone of the template node.
   * @param deep - Whether to perform a deep clone (ignored for most templates)
   */
  cloneNode(deep?: boolean): T
}

/**
 * Safely retrieves the global document object.
 * @throws {ReferenceError} If document is not available
 */
function getDocument(): Document {
  const doc = (globalThis as any).document as Document | undefined
  if (!doc) {
    throw new ReferenceError('document is not defined in this context')
  }
  return doc
}

/**
 * Creates a blank span element.
 * Exported for use in other modules that need raw span creation.
 */
export function createBlankSpan(): HTMLSpanElement {
  return getDocument().createElement('span')
}

/**
 * Creates a factory for span elements with optional class and text content.
 */
function createSpanFactory(
  className?: string,
  textContent?: string
): NodeFactory<HTMLSpanElement> {
  return {
    cloneNode(): HTMLSpanElement {
      const element = createBlankSpan()

      if (className !== undefined) {
        element.className = className
      }

      if (textContent !== undefined) {
        element.textContent = textContent
      }

      return element
    },
  }
}

/**
 * Creates a factory for text nodes with the specified content.
 */
function createTextFactory(content: string): NodeFactory<Text> {
  return {
    cloneNode(): Text {
      return getDocument().createTextNode(content)
    },
  }
}

/**
 * Pre-configured DOM element templates for JSON rendering.
 *
 * These templates are used throughout the buildDom process to create
 * consistent, reusable DOM structures with proper CSS classes.
 */
export const templates = {
  // Container elements
  t_entry: createSpanFactory('entry'),
  t_blockInner: createSpanFactory('blockInner'),

  // Interactive elements
  t_exp: createSpanFactory('e'),
  t_ellipsis: createSpanFactory('ell'),

  // Value type elements
  t_key: createSpanFactory('k'),
  t_string: createSpanFactory('s'),
  t_number: createSpanFactory('n'),

  // Literal values (with pre-filled text)
  t_null: createSpanFactory('nl', 'null'),
  t_true: createSpanFactory('bl', 'true'),
  t_false: createSpanFactory('bl', 'false'),

  // Structural punctuation (braces and brackets)
  t_oBrace: createSpanFactory('b', '{'),
  t_cBrace: createSpanFactory('b', '}'),
  t_oBracket: createSpanFactory('b', '['),
  t_cBracket: createSpanFactory('b', ']'),

  // Metadata
  t_sizeComment: createSpanFactory('sizeComment'),

  // Text nodes for punctuation
  t_colonAndSpace: createTextFactory(':\u00A0'), // Colon + non-breaking space
  t_commaText: createTextFactory(','),
  t_dblqText: createTextFactory('"'), // Double quote
}

/**
 * Type representing the templates object for type-safe usage.
 */
export type Templates = typeof templates
