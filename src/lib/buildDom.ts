/**
 * Legacy DOM tree builder for JSON structures.
 *
 * @deprecated This module is maintained for backward compatibility with tests
 * and legacy code. New code should use the Preact renderer (JsonTreeView) instead.
 *
 * The Preact renderer provides:
 * - Virtual scrolling for better performance with large JSON
 * - Modern component architecture
 * - Better maintainability
 *
 * This implementation has been completely rewritten to remove all original code
 * while maintaining API compatibility.
 */

import type { JsonValue } from './types'
import type { Templates } from './templates'
import { templates } from './templates'
import { assert } from './assert'
import { getValueType, isJsonArray, isJsonObject } from './getValueType'
import {
  TYPE_STRING,
  TYPE_NUMBER,
  TYPE_BOOL,
  TYPE_NULL,
  TYPE_OBJECT,
  TYPE_ARRAY,
} from './constants'
import { getCollectionSize, hasEntries } from './renderers/utils'
import { renderString } from './renderers/strings'
import { renderNumber } from './renderers/numbers'
import { renderBoolean } from './renderers/booleans'
import { renderNull } from './renderers/nulls'
import { renderObjectEntries } from './renderers/objects'
import { renderArrayElements } from './renderers/arrays'
import { appendKeyPreamble } from './renderers/keys'
import type { RenderOptions } from './renderers/types'

/**
 * Builds an interactive DOM tree from a JSON value.
 *
 * Creates a hierarchical span structure with CSS classes for styling and
 * interactive elements (expand/collapse buttons, ellipsis for collapsed state).
 *
 * @param value - JSON value to render (object, array, string, number, boolean, null)
 * @param keyName - Property name if this is an object entry, false for array elements
 * @param t - Template factory for creating DOM elements
 * @param options - Rendering configuration (lazy loading, custom handlers)
 * @returns HTMLSpanElement containing the rendered JSON tree
 *
 * @example
 * ```ts
 * const json = { name: "Alice", age: 30 }
 * const domTree = buildDom(json, false)
 * document.body.appendChild(domTree)
 * ```
 */
export function buildDom(
  value: JsonValue,
  keyName: string | false,
  t: Templates = templates,
  options: RenderOptions = {}
): HTMLSpanElement {
  const valueType = getValueType(value)
  const containerElement = t.t_entry.cloneNode(false) as HTMLSpanElement

  // Add expander for collections (objects/arrays) with content
  const itemCount = getCollectionSize(value)
  const hasContent = hasEntries(value)
  const isCollection = valueType === TYPE_OBJECT || valueType === TYPE_ARRAY

  if (isCollection && hasContent) {
    const expanderButton = t.t_exp.cloneNode(false)
    containerElement.appendChild(expanderButton)
  }

  // Add key prefix for object properties, mark as array element otherwise
  if (keyName !== false) {
    containerElement.classList.add('objProp')
    appendKeyPreamble(containerElement, keyName, t)
  } else {
    containerElement.classList.add('arrElem')
  }

  // Render value based on type
  renderValueByType(
    containerElement,
    value,
    valueType,
    itemCount,
    hasContent,
    t,
    options
  )

  return containerElement
}

/**
 * Renders the appropriate DOM structure based on JSON value type.
 */
function renderValueByType(
  container: HTMLSpanElement,
  value: JsonValue,
  type: number,
  itemCount: number,
  hasContent: boolean,
  t: Templates,
  options: RenderOptions
): void {
  switch (type) {
    case TYPE_STRING:
      assert(typeof value === 'string', 'Expected string value')
      container.appendChild(renderString(value, t))
      break

    case TYPE_NUMBER:
      container.appendChild(renderNumber(value as number, t))
      break

    case TYPE_BOOL:
      container.appendChild(renderBoolean(Boolean(value), t))
      break

    case TYPE_NULL:
      container.appendChild(renderNull(t))
      break

    case TYPE_OBJECT:
      assert(typeof value === 'object' && value !== null, 'Expected object value')
      renderObjectStructure(container, value, itemCount, hasContent, t, options)
      break

    case TYPE_ARRAY:
      assert(Array.isArray(value), 'Expected array value')
      renderArrayStructure(container, value, itemCount, hasContent, t, options)
      break

    default:
      throw new Error(`Unknown JSON type: ${type}`)
  }
}

/**
 * Renders an object's DOM structure with braces and properties.
 */
function renderObjectStructure(
  container: HTMLSpanElement,
  value: JsonValue,
  itemCount: number,
  hasContent: boolean,
  t: Templates,
  options: RenderOptions
): void {
  // Opening brace
  container.appendChild(t.t_oBrace.cloneNode(true))

  // Content rendering (if object is not empty)
  if (hasContent) {
    container.appendChild(t.t_ellipsis.cloneNode(false))

    const exceedsLazyThreshold =
      options.lazyThreshold !== undefined && itemCount >= options.lazyThreshold

    if (exceedsLazyThreshold) {
      setupLazyObjectRendering(container, value, t, options)
    } else {
      renderObjectContentEagerly(container, value, t, options)
    }
  }

  // Closing brace
  container.appendChild(t.t_cBrace.cloneNode(true))

  // Size annotation
  const itemLabel = itemCount === 1 ? 'item' : 'items'
  container.dataset.size = ` // ${itemCount} ${itemLabel}`
}

/**
 * Renders an array's DOM structure with brackets and elements.
 */
function renderArrayStructure(
  container: HTMLSpanElement,
  value: JsonValue,
  itemCount: number,
  hasContent: boolean,
  t: Templates,
  options: RenderOptions
): void {
  // Opening bracket
  container.appendChild(t.t_oBracket.cloneNode(true))

  // Content rendering (if array is not empty)
  if (hasContent) {
    container.appendChild(t.t_ellipsis.cloneNode(false))

    const exceedsLazyThreshold =
      options.lazyThreshold !== undefined && itemCount >= options.lazyThreshold

    if (exceedsLazyThreshold) {
      setupLazyArrayRendering(container, value, t, options)
    } else {
      renderArrayContentEagerly(container, value, t, options)
    }
  }

  // Closing bracket
  container.appendChild(t.t_cBracket.cloneNode(true))

  // Size annotation
  const itemLabel = itemCount === 1 ? 'item' : 'items'
  container.dataset.size = ` // ${itemCount} ${itemLabel}`
}

/**
 * Sets up lazy (on-demand) rendering for object properties.
 */
function setupLazyObjectRendering(
  container: HTMLSpanElement,
  value: JsonValue,
  t: Templates,
  options: RenderOptions
): void {
  const populateContent = () => {
    if (isJsonObject(value)) {
      const contentBlock = renderObjectEntries(
        value,
        (childValue, childKey) => buildDom(childValue, childKey, t, options),
        t
      )
      container.appendChild(contentBlock)
    }
  }

  if (options.onDemandRender) {
    options.onDemandRender(container, populateContent)
  } else {
    attachDefaultLazyHandler(container, populateContent)
  }
}

/**
 * Sets up lazy (on-demand) rendering for array elements.
 */
function setupLazyArrayRendering(
  container: HTMLSpanElement,
  value: JsonValue,
  t: Templates,
  options: RenderOptions
): void {
  const populateContent = () => {
    if (isJsonArray(value)) {
      const contentBlock = renderArrayElements(
        value,
        (childValue) => buildDom(childValue, false, t, options),
        t
      )
      container.appendChild(contentBlock)
    }
  }

  if (options.onDemandRender) {
    options.onDemandRender(container, populateContent)
  } else {
    attachDefaultLazyHandler(container, populateContent)
  }
}

/**
 * Attaches a one-time click handler to the expander button for lazy rendering.
 */
function attachDefaultLazyHandler(
  container: HTMLSpanElement,
  populate: () => void
): void {
  const expanderElement = container.querySelector('.e')
  if (expanderElement) {
    expanderElement.addEventListener('click', populate, { once: true })
  }
}

/**
 * Renders object properties immediately (eager rendering).
 */
function renderObjectContentEagerly(
  container: HTMLSpanElement,
  value: JsonValue,
  t: Templates,
  options: RenderOptions
): void {
  if (isJsonObject(value)) {
    const contentBlock = renderObjectEntries(
      value,
      (childValue, childKey) => buildDom(childValue, childKey, t, options),
      t
    )
    container.appendChild(contentBlock)
  }
}

/**
 * Renders array elements immediately (eager rendering).
 */
function renderArrayContentEagerly(
  container: HTMLSpanElement,
  value: JsonValue,
  t: Templates,
  options: RenderOptions
): void {
  if (isJsonArray(value)) {
    const contentBlock = renderArrayElements(
      value,
      (childValue) => buildDom(childValue, false, t, options),
      t
    )
    container.appendChild(contentBlock)
  }
}
