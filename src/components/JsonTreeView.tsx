/**
 * JsonTreeView Component
 *
 * Virtual scrolling tree view for JSON data using react-window.
 * Automatically switches between direct rendering (small trees) and
 * virtualized rendering (large trees) for optimal performance.
 */

import { h } from 'preact'
import { useState, useMemo, useCallback } from 'preact/hooks'
import { List } from 'react-window'
import { ParsedData } from '../lib/integration/types'
import { flattenTree } from '../lib/tree/flatten'
import { toggleNode, expandToDepth, expandAllSiblings } from '../lib/tree/expand'
import { TreeState, FlatNode } from '../lib/tree/types'
import { JsonNode } from './JsonNode'

interface JsonTreeViewProps {
  /** Parsed JSON data to render */
  data: ParsedData

  /** Original input string for on-demand raw text computation (required for custom parser) */
  input?: string

  /** Initial depth to expand (default: 3) */
  initialExpandDepth?: number

  /** Row height in pixels (default: 24) */
  rowHeight?: number

  /** Enable virtual scrolling (default: true for large trees) */
  virtual?: boolean
}

export function JsonTreeView({
  data,
  input,
  initialExpandDepth = 3,
  rowHeight = 24,
  virtual = true,
}: JsonTreeViewProps) {
  // Initialize expansion state
  const [treeState, setTreeState] = useState<TreeState>(() => ({
    expandedPaths: expandToDepth(data, initialExpandDepth, '$', 0, input),
  }))

  // Flatten tree based on current expansion state (memoized)
  const flatNodes = useMemo(() => {
    return flattenTree(data, treeState, null, 0, '$', 0, 1, input)
  }, [data, treeState, input])

  // Handle node toggle
  const handleToggle = useCallback(
    (path: string, options?: { expandAllSiblings?: boolean }) => {
      setTreeState((prevState) => {
        if (options?.expandAllSiblings) {
          return expandAllSiblings(prevState, path, flatNodes)
        } else {
          return toggleNode(prevState, path)
        }
      })
    },
    [flatNodes]
  )

  // Row renderer for react-window
  const Row = useCallback(
    ({ index, style }: { index: number; style: any }) => {
      const node = flatNodes[index]
      return <JsonNode node={node} onToggle={handleToggle} style={style} />
    },
    [flatNodes, handleToggle]
  )

  // Calculate container height
  const containerHeight = useMemo(() => {
    // In test environments, window.innerHeight may be 0 or undefined
    const windowHeight =
      typeof window !== 'undefined' && window.innerHeight > 0
        ? window.innerHeight
        : 600
    const maxHeight = windowHeight - 60
    const contentHeight = flatNodes.length * rowHeight
    // Ensure minimum height of 100px for react-window
    return Math.max(100, Math.min(maxHeight, contentHeight))
  }, [flatNodes.length, rowHeight])

  // For small trees, render directly without virtualization
  if (!virtual || flatNodes.length < 100) {
    return (
      <div class="json-tree-container" role="tree">
        {flatNodes.map((node) => (
          <JsonNode key={node.id} node={node} onToggle={handleToggle} />
        ))}
      </div>
    )
  }

  // Large trees: use virtual scrolling
  return (
    <div class="json-tree-container" role="tree">
      <List
        height={containerHeight}
        itemCount={flatNodes.length}
        itemSize={rowHeight}
        width="100%"
        overscanCount={10}
        itemData={flatNodes}
      >
        {Row}
      </List>
    </div>
  )
}
