/**
 * JsonNode Component
 *
 * Renders an individual tree node, matching the output of buildDom.
 * Supports all JSON types, expand/collapse, and URL linkification.
 */

import { h } from 'preact'
import { memo } from 'preact/compat'
import type { FlatNode } from '../lib/tree/types'

interface JsonNodeProps {
  node: FlatNode
  onToggle: (path: string, options?: { expandAllSiblings?: boolean }) => void
  style?: Record<string, any>
}

function JsonNodeComponent({ node, onToggle, style }: JsonNodeProps) {
  const {
    depth,
    key,
    type,
    hasChildren,
    isExpanded,
    childCount,
    path,
    isLastSibling,
    displayValue,
    rawText,
    value,
  } = node

  const indentPx = depth * 20

  const handleExpanderClick = (e: MouseEvent) => {
    e.preventDefault()

    // Cmd/Ctrl+Click: expand/collapse all siblings
    if (e.metaKey || e.ctrlKey) {
      onToggle(path, { expandAllSiblings: true })
    } else {
      onToggle(path)
    }
  }

  // Handle closing bracket/brace nodes
  if (type === 'object_close') {
    return (
      <span
        class="entry"
        style={{
          ...style,
          paddingLeft: `${indentPx}px`,
        }}
      >
        <span class="cBrace">{'}'}</span>
        {!isLastSibling && <span class="comma">,</span>}
      </span>
    )
  }

  if (type === 'array_close') {
    return (
      <span
        class="entry"
        style={{
          ...style,
          paddingLeft: `${indentPx}px`,
        }}
      >
        <span class="cBracket">{']'}</span>
        {!isLastSibling && <span class="comma">,</span>}
      </span>
    )
  }

  // Regular node rendering
  return (
    <span
      class={`entry ${key !== null ? 'objProp' : 'arrElem'} ${
        isExpanded ? '' : 'collapsed'
      }`}
      style={{
        ...style,
        paddingLeft: `${indentPx}px`,
      }}
      data-path={path}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
    >
      {/* Expander for objects/arrays */}
      {hasChildren && <span class="e" onClick={handleExpanderClick}></span>}

      {/* Key name for object properties */}
      {key !== null && (
        <>
          <span class="dblqText">"</span>
          <span class="k">{JSON.stringify(key).slice(1, -1)}</span>
          <span class="dblqText">"</span>
          <span class="colon">:&nbsp;</span>
        </>
      )}

      {/* Value rendering */}
      {type === 'string' && (
        <StringValue
          value={displayValue!}
          rawValue={
            typeof value === 'string'
              ? value
              : (value as any).value || displayValue!
          }
        />
      )}
      {type === 'number' && (
        <span class="n">{rawText || displayValue}</span>
      )}
      {type === 'boolean' && <span class="bl">{displayValue}</span>}
      {type === 'null' && <span class="nl">null</span>}

      {type === 'object' && (
        <>
          <span class="oBrace">{'{'}</span>
          {!isExpanded && hasChildren && <span class="ellipsis">...</span>}
          {!isExpanded && <span class="cBrace">{'}'}</span>}
          {!isExpanded && childCount > 0 && (
            <span class="size">
              {' '}
              // {childCount} {childCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </>
      )}

      {type === 'array' && (
        <>
          <span class="oBracket">{'['}</span>
          {!isExpanded && hasChildren && <span class="ellipsis">...</span>}
          {!isExpanded && <span class="cBracket">{']'}</span>}
          {!isExpanded && childCount > 0 && (
            <span class="size">
              {' '}
              // {childCount} {childCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </>
      )}

      {/* Comma after value (except for last sibling) */}
      {!isLastSibling && <span class="comma">,</span>}
    </span>
  )
}

/**
 * StringValue Component
 *
 * Renders string values with URL linkification
 */
interface StringValueProps {
  value: string
  rawValue: string
}

function StringValue({ value, rawValue }: StringValueProps) {
  const escapedString = JSON.stringify(value).slice(1, -1)
  const isUrl =
    rawValue.substring(0, 8) === 'https://' ||
    rawValue.substring(0, 7) === 'http://' ||
    rawValue[0] === '/'

  return (
    <span class="s">
      <span class="dblqText">"</span>
      {isUrl ? (
        <a href={rawValue} target="_blank" rel="noopener noreferrer">
          {escapedString}
        </a>
      ) : (
        <span>{escapedString}</span>
      )}
      <span class="dblqText">"</span>
    </span>
  )
}

// Memoize to prevent unnecessary re-renders
export const JsonNode = memo(JsonNodeComponent)
