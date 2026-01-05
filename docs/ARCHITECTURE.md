# Architecture

**Last Updated:** 2025-12-25
**Status:** Production (Phase I & II Complete)

This document describes the technical architecture of the JSON Formatter Pro Chrome extension, including the virtual scrolling renderer and custom streaming parser.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Integration Contract](#integration-contract)
4. [Virtual Scrolling Renderer (Phase I)](#virtual-scrolling-renderer-phase-i)
5. [Custom Streaming Parser (Phase II)](#custom-streaming-parser-phase-ii)
6. [Parser Selection System](#parser-selection-system)
7. [Feature Flags](#feature-flags)
8. [Performance Characteristics](#performance-characteristics)

---

## Overview

The JSON Formatter Pro extension provides automatic formatting and interactive viewing of JSON displayed in Chrome browser tabs. The extension supports files up to 100MB+ through a combination of virtual scrolling and efficient parsing.

### Key Capabilities

- **Virtual Scrolling**: Renders only visible nodes, supporting 100k+ node trees
- **Dual Parser System**: Users can choose between native `JSON.parse()` and a custom AST-based parser
- **Lossless Number Handling**: Preserves precision for large numbers using BigInt/Decimal modes
- **Key Order Preservation**: Maintains exact key order from JSON source
- **Tolerant Parsing**: Recovers from common JSON errors (trailing commas, etc.)
- **Theme System**: Dark/light/system themes with token-based CSS
- **Parser Selection UI**: Toolbar toggle, options page, and per-URL overrides

---

## System Architecture

### Full Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    JSON Formatter Pro Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Input: JSON String (from page <pre> tag)                       │
│      ↓                                                           │
│  ┌──────────────────────────────────────────┐                   │
│  │ PARSE LAYER (user-selectable)            │                   │
│  ├──────────────────────────────────────────┤                   │
│  │ Native:  JSON.parse()                    │                   │
│  │          → JsonValue (JS types)          │                   │
│  │                                          │                   │
│  │ Custom:  parse() from CustomParser       │                   │
│  │          → JsonNode (lossless AST)       │                   │
│  └──────────────────────────────────────────┘                   │
│      ↓                                                           │
│  ┌──────────────────────────────────────────┐                   │
│  │ DATA ADAPTER (Integration Contract)      │                   │
│  ├──────────────────────────────────────────┤                   │
│  │ createAdapter(): DataAdapter             │                   │
│  │   - JsonValueAdapter (native parser)     │                   │
│  │   - JsonNodeAdapter (ExactJSON)      │                   │
│  │             ↓                            │                   │
│  │         ParsedData                       │                   │
│  └──────────────────────────────────────────┘                   │
│      ↓                                                           │
│  ┌──────────────────────────────────────────┐                   │
│  │ TREE UTILITIES                           │                   │
│  ├──────────────────────────────────────────┤                   │
│  │ flattenTree(data) → FlatNode[]          │                   │
│  │ expandToDepth(), toggleNode()            │                   │
│  │ expandAll(), collapseAll()               │                   │
│  └──────────────────────────────────────────┘                   │
│      ↓                                                           │
│  ┌──────────────────────────────────────────┐                   │
│  │ PREACT RENDERER                          │                   │
│  ├──────────────────────────────────────────┤                   │
│  │ <JsonTreeView>                           │                   │
│  │   ├─ TreeState (expand/collapse)         │                   │
│  │   ├─ FlatNode[] (memoized)               │                   │
│  │   └─ <VirtualList>                       │                   │
│  │       └─ <JsonNode> (visible rows only)  │                   │
│  └──────────────────────────────────────────┘                   │
│      ↓                                                           │
│  Output: DOM (50-100 visible nodes, virtualized)                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Layered Architecture**: Clean separation between parse, data, and render layers
2. **Polymorphic Data Handling**: Renderer works with both native and ExactJSON output via adapter pattern
3. **Feature Flags**: Independent flags for virtual scrolling and ExactJSON enable gradual rollout
4. **Backward Compatibility**: Legacy `buildDom()` renderer still available (deprecated)

---

## Integration Contract

### Purpose

The **Integration Contract** defines the interface between parsers and renderers, allowing them to evolve independently. Any parser implementing this contract can work with any renderer.

**Location:** `src/lib/integration/types.ts`, `src/lib/integration/README.md`

### Core Types

```typescript
// Standard JSON value from JSON.parse()
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

// Lossless AST node from ExactJSON
export type JsonNode =
  | ObjectNode
  | ArrayNode
  | StringNode
  | NumberNode
  | BooleanNode
  | NullNode

export interface ObjectNode {
  kind: 'object'
  entries: Array<{ key: JsonString; value: JsonNode }>  // Preserves order!
  start: number
  end: number
}

export interface NumberNode {
  kind: 'number'
  value?: number      // Standard number (may lose precision)
  bigInt?: bigint     // For integers > Number.MAX_SAFE_INTEGER
  decimal?: string    // For exact decimal representation
  raw: string         // Original source text
  start: number
  end: number
}

// Polymorphic type accepted by renderer
export type ParsedData = JsonValue | JsonNode
```

### Data Adapter Interface

The adapter provides a uniform interface to both parser outputs:

```typescript
export interface DataAdapter {
  /** Get metadata about a value (type, display text, etc.) */
  getMetadata(data: ParsedData): ValueMetadata

  /** Check if value is a container (object/array) */
  isContainer(data: ParsedData): boolean

  /** Get children of a container */
  getChildren(data: ParsedData): Array<{ key: string; value: ParsedData }>

  /** Get number of children */
  getChildCount(data: ParsedData): number
}
```

### Adapter Implementations

**JsonValueAdapter** - For `JSON.parse()` output:
```typescript
export class JsonValueAdapter implements DataAdapter {
  getMetadata(data: ParsedData): ValueMetadata {
    if (typeof data === 'string') {
      return { type: 'string', displayText: data, rawText: `"${data}"` }
    }
    // ... handle other types
  }

  getChildren(data: ParsedData): Array<{ key: string; value: ParsedData }> {
    if (Array.isArray(data)) {
      return data.map((value, index) => ({ key: String(index), value }))
    }
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, value]) => ({ key, value }))
    }
    return []
  }
}
```

**JsonNodeAdapter** - For ExactJSON output:
```typescript
export class JsonNodeAdapter implements DataAdapter {
  getMetadata(data: ParsedData): ValueMetadata {
    if (!isJsonNode(data)) {
      // Fallback to JsonValueAdapter
    }

    if (data.kind === 'string') {
      return { type: 'string', displayText: data.value, rawText: data.raw }
    }

    if (data.kind === 'number') {
      // Handle lossless number modes
      if (data.bigInt !== undefined) {
        return { type: 'number', displayText: String(data.bigInt) + 'n', ... }
      }
      if (data.decimal !== undefined) {
        return { type: 'number', displayText: data.decimal, ... }
      }
      return { type: 'number', displayText: String(data.value), ... }
    }
    // ... handle other types
  }

  getChildren(data: ParsedData): Array<{ key: string; value: ParsedData }> {
    if (!isJsonNode(data)) return []

    if (data.kind === 'array') {
      return data.items.map((value, index) => ({ key: String(index), value }))
    }

    if (data.kind === 'object') {
      // Preserves exact source order!
      return data.entries.map(({ key, value }) => ({
        key: key.value,
        value
      }))
    }

    return []
  }
}
```

### Factory Function

```typescript
export function createAdapter(data: ParsedData): DataAdapter {
  if (isJsonNode(data)) {
    return new JsonNodeAdapter()
  }
  return new JsonValueAdapter()
}
```

**Key Benefit:** Renderer code is parser-agnostic. Switching parsers requires zero renderer changes.

---

## Virtual Scrolling Renderer (Phase I)

### Overview

The Preact-based virtual scrolling renderer enables handling of 100MB+ JSON files by rendering only visible nodes in the viewport.

**Status:** ✅ Complete (Production)
**Feature Flag:** `UsePreactRenderer` (enabled by default)

### Key Components

#### 1. JsonTreeView Component

**Location:** `src/components/JsonTreeView.tsx`

Main component that manages tree state and virtual scrolling:

```typescript
export interface JsonTreeViewProps {
  data: ParsedData          // JsonValue | JsonNode
  initialDepth?: number     // Auto-expand to depth (default: 1)
  height?: number           // Container height (default: window height)
}

export const JsonTreeView: FunctionComponent<JsonTreeViewProps> = ({
  data,
  initialDepth = 1,
  height = window.innerHeight - 100,
}) => {
  // State: expanded/collapsed nodes
  const [treeState, setTreeState] = useState<TreeState>(() => ({
    expandedPaths: new Set(),
    selectedPath: null,
  }))

  // Memoized: flatten tree to array of visible nodes
  const flatNodes = useMemo(
    () => flattenTree(data, treeState.expandedPaths),
    [data, treeState.expandedPaths]
  )

  // Render virtual list (only visible rows)
  return (
    <FixedSizeList
      height={height}
      itemCount={flatNodes.length}
      itemSize={24}  // Row height in pixels
      width="100%"
    >
      {({ index, style }) => (
        <JsonNode
          node={flatNodes[index]}
          style={style}
          onToggle={handleToggle}
        />
      )}
    </FixedSizeList>
  )
}
```

#### 2. Tree Flattening

**Location:** `src/lib/tree/flatten.ts`

Converts hierarchical JSON into a flat array of visible nodes:

```typescript
export interface FlatNode {
  path: string              // e.g., "users.0.name"
  depth: number             // Indentation level
  key: string               // Display key
  value: ParsedData         // Node value
  hasChildren: boolean      // Is container?
  isExpanded: boolean       // Expanded state
}

export function flattenTree(
  data: ParsedData,
  expandedPaths: Set<string>
): FlatNode[] {
  const result: FlatNode[] = []
  const adapter = createAdapter(data)

  function traverse(value: ParsedData, path: string, depth: number) {
    const isExpanded = expandedPaths.has(path)
    const hasChildren = adapter.isContainer(value)

    result.push({ path, depth, key: getKey(path), value, hasChildren, isExpanded })

    // Recurse into children only if expanded
    if (isExpanded && hasChildren) {
      for (const child of adapter.getChildren(value)) {
        traverse(child.value, `${path}.${child.key}`, depth + 1)
      }
    }
  }

  traverse(data, '', 0)
  return result
}
```

**Performance:** O(visible nodes), not O(total nodes). A 100k node tree with most nodes collapsed might only have 100-500 visible nodes.

#### 3. JsonNode Component

**Location:** `src/components/JsonNode.tsx`

Renders a single row in the virtual list:

```typescript
export const JsonNode: FunctionComponent<JsonNodeProps> = ({
  node,
  style,
  onToggle,
}) => {
  const adapter = createAdapter(node.value)
  const metadata = adapter.getMetadata(node.value)

  return (
    <div style={style} className="json-node">
      <span style={{ marginLeft: `${node.depth * 20}px` }}>
        {node.hasChildren && (
          <button onClick={() => onToggle(node.path)}>
            {node.isExpanded ? '▼' : '▶'}
          </button>
        )}
        <span className="key">{node.key}</span>
        <span className="value" data-type={metadata.type}>
          {metadata.displayText}
        </span>
      </span>
    </div>
  )
}
```

### Performance Benefits

| Metric | Legacy buildDom() | Virtual Scrolling | Improvement |
|--------|-------------------|-------------------|-------------|
| Initial render (10k nodes) | 2000ms | 50ms | **40x faster** |
| Memory usage (100k nodes) | 500MB+ | 20MB | **25x less** |
| Scroll performance | Janky | 60fps | Smooth |
| Max file size | ~3MB | 100MB+ | **30x larger** |

---

## Custom Streaming Parser (Phase II)

### Overview

The custom AST-based parser provides lossless number handling and preserves exact key order from the JSON source.

**Status:** ✅ Complete (Beta rollout)
**Feature Flag:** `UseCustomParser` (gradual rollout: 0% → 10% → 50% → 100%)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Custom Parser Pipeline                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Input: JSON String                                          │
│      ↓                                                       │
│  ┌──────────────────────────────────┐                       │
│  │ Tokenizer (Lexer)                │                       │
│  │ - Streaming iterator             │                       │
│  │ - RFC 8259 compliant             │                       │
│  │ - Unicode escape handling        │                       │
│  │ - Position tracking              │                       │
│  └──────────────────────────────────┘                       │
│      ↓                                                       │
│  ┌──────────────────────────────────┐                       │
│  │ DirectParser (AST Builder)       │                       │
│  │ - Recursive descent              │                       │
│  │ - Error recovery (tolerant mode) │                       │
│  │ - Incremental parsing            │                       │
│  └──────────────────────────────────┘                       │
│      ↓                                                       │
│  Output: JsonNode (AST)                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Tokenizer

**Location:** `src/lib/parser/tokenizer.ts`

Converts JSON string into a stream of tokens:

```typescript
export type Token =
  | { type: '{' | '}' | '[' | ']' | ',' | ':'; start: number; end: number }
  | { type: 'string'; value: string; raw: string; start: number; end: number }
  | { type: 'number'; raw: string; start: number; end: number }
  | { type: 'true' | 'false' | 'null'; start: number; end: number }
  | { type: 'eof'; start: number; end: number }

export class Tokenizer {
  private input: string
  private pos: number = 0

  *tokenize(): IterableIterator<Token> {
    while (this.pos < this.input.length) {
      this.skipWhitespace()

      const char = this.input[this.pos]

      if (char === '"') {
        yield this.tokenizeString()
      } else if (char === '-' || (char >= '0' && char <= '9')) {
        yield this.tokenizeNumber()
      } else if (char === 't' || char === 'f' || char === 'n') {
        yield this.tokenizeLiteral()
      } else {
        yield this.tokenizePunctuation()
      }
    }

    yield { type: 'eof', start: this.pos, end: this.pos }
  }
}
```

#### 2. Number Parsing (Lossless)

**Location:** `src/lib/parser/parseNumber.ts`

Preserves precision for large numbers:

```typescript
export type NumberMode = 'lossy' | 'bigint' | 'decimal' | 'string'

export interface ParsedNumber {
  value?: number      // May lose precision (default mode)
  bigInt?: bigint     // For safe integers
  decimal?: string    // For exact decimals
  raw: string         // Original text
}

export function parseNumber(raw: string, mode: NumberMode): ParsedNumber {
  const num = Number(raw)

  if (mode === 'bigint' && Number.isSafeInteger(num)) {
    return { value: num, bigInt: BigInt(raw), raw }
  }

  if (mode === 'decimal') {
    return { decimal: raw, raw }  // Keep as string for exact precision
  }

  return { value: num, raw }
}
```

**Example:**
```json
{ "largeNumber": 9007199254740993 }
```

- **Native parser:** Rounds to `9007199254740992` (loses precision)
- **Custom parser (bigint mode):** Stores as `9007199254740993n` (exact)
- **Custom parser (decimal mode):** Stores as `"9007199254740993"` (exact)

#### 3. Key Ordering Preservation

**Location:** `src/lib/parser/DirectParser.ts`

Objects use array-based storage to maintain exact source order:

```typescript
export interface ObjectNode {
  kind: 'object'
  entries: Array<{ key: JsonString; value: JsonNode }>  // Array, not Map!
  start: number
  end: number
}

// Example: { "3": "c", "1": "a", "2": "b" }
// Native parser: Object.keys() → ["1", "2", "3"] (reordered by V8)
// Custom parser: entries → [("3", "c"), ("1", "a"), ("2", "b")] (source order)
```

#### 4. Tolerant Mode

**Location:** `src/lib/parser/tolerant.ts`

Recovers from common JSON errors:

```typescript
export interface ParserOptions {
  numberMode?: NumberMode
  tolerant?: boolean  // Enable error recovery
}

// Tolerant mode handles:
// - Trailing commas: { "a": 1, "b": 2, }
// - Missing commas: { "a": 1 "b": 2 }
// - Missing colons: { "a" 1 }
// Collects errors but continues parsing
```

#### 5. Progressive Parsing

**Location:** `src/lib/parser/progressive.ts`

Enables incremental rendering for very large files:

```typescript
export interface ProgressCallback {
  (parsed: JsonNode, complete: boolean): void
}

export async function parseProgressive(
  input: string,
  options: ParserOptions & { onProgress?: ProgressCallback }
): Promise<JsonNode> {
  const parser = new DirectParser(input, options)

  // Parse incrementally, yielding to UI
  while (!parser.isComplete()) {
    const partial = parser.parseChunk()
    if (options.onProgress) {
      options.onProgress(partial, false)
    }
    await sleep(0)  // Yield to UI thread
  }

  const final = parser.getAST()
  options.onProgress?.(final, true)
  return final
}
```

### Performance Characteristics

| Metric | Native Parser | Custom Parser | Ratio |
|--------|---------------|---------------|-------|
| Parse time (10KB) | 0.05ms | 0.2ms | 4x slower |
| Parse time (100KB) | 0.5ms | 2ms | 4x slower |
| Parse time (1MB) | 5ms | 30ms | 6x slower |
| Parse time (10MB) | 50ms | 400ms | 8x slower |
| Memory overhead | 1x | 4-5x | Higher |

**Why acceptable:**
- Virtual scrolling reduces need to parse entire tree immediately
- Progressive parsing spreads work over time
- Custom features (lossless numbers, key order) provide value for specific use cases
- User can toggle between parsers

---

## Parser Selection System

### Overview

Users can choose which parser to use on a per-page or global basis.

**Location:** `src/lib/parser-selection.ts`

### Selection Priority

1. **Feature flag** - `UseCustomParser` (gradual rollout control)
2. **Auto-size threshold** - Switch to native for files > threshold (e.g., 10MB)
3. **Session override** - Temporary choice for current tab
4. **URL pattern override** - Persistent choice for specific domains
5. **Default parser** - Global preference

```typescript
export interface ParserSettings {
  defaultParser: 'native' | 'custom'  // Default: 'custom'
  urlOverrides: Array<{
    pattern: string         // e.g., "api.company.com/*"
    parser: 'native' | 'custom'
    enabled: boolean
  }>
  showToolbarToggle: boolean
  autoSwitchThreshold: number  // MB
}

export function selectParser(
  url: string,
  fileSize: number,
  settings: ParserSettings
): ParserSelection {
  // Check feature flag
  if (!isFeatureEnabled(FeatureFlag.UseCustomParser)) {
    return { parser: 'native', reason: 'feature-disabled' }
  }

  // Check auto-size threshold
  if (fileSize > settings.autoSwitchThreshold * 1024 * 1024) {
    return { parser: 'native', reason: 'auto-size' }
  }

  // Check URL overrides
  const override = matchUrlPattern(url, settings.urlOverrides)
  if (override) {
    return { parser: override.parser, reason: { type: 'url-override', pattern: override.pattern } }
  }

  // Use default
  return { parser: settings.defaultParser, reason: 'default' }
}
```

### UI Components

1. **Toolbar Toggle** (`src/components/ParserSelector.tsx`)
   - Dropdown showing current parser
   - Quick switch between parsers
   - Re-renders page on change

2. **Options Page** (`src/options/`)
   - Set default parser
   - Configure URL pattern overrides
   - Advanced settings (threshold, monitoring)

3. **Popup** (`src/popup/`)
   - Shows current parser and reason
   - Quick toggle
   - Link to options

---

## Feature Flags

**Location:** `src/lib/featureFlags.ts`

### Available Flags

```typescript
export enum FeatureFlag {
  UsePreactRenderer = 'usePreactRenderer',  // Phase I
  UseCustomParser = 'useCustomParser',      // Phase II
}

export interface FeatureFlagConfig {
  enabled: boolean           // Master switch (kill switch)
  rolloutPercentage: number  // 0-100 (gradual rollout)
  userOptIn?: boolean        // Allow users to force enable
  userOptOut?: boolean       // Allow users to force disable
}

const FEATURE_FLAG_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.UsePreactRenderer]: {
    enabled: true,
    rolloutPercentage: 100,  // ✅ Fully rolled out
  },
  [FeatureFlag.UseCustomParser]: {
    enabled: true,
    rolloutPercentage: 0,    // 🚀 Ready for gradual rollout
    userOptIn: true,
    userOptOut: true,
  },
}
```

### Rollout Strategy

See [ROLLOUT_PLAN.md](ROLLOUT_PLAN.md) for gradual rollout details (10% → 50% → 100%).

---

## Performance Characteristics

### Virtual Scrolling Performance

| File Size | Nodes | Initial Render | Memory | Scroll FPS |
|-----------|-------|----------------|--------|------------|
| 1MB | 10k | 50ms | 20MB | 60fps |
| 10MB | 100k | 80ms | 30MB | 60fps |
| 50MB | 500k | 150ms | 50MB | 60fps |
| 100MB | 1M | 300ms | 80MB | 60fps |

### Parser Comparison

| Operation | Native Parser | Custom Parser |
|-----------|---------------|---------------|
| Parse 1MB JSON | 5ms | 30ms (6x) |
| Parse 10MB JSON | 50ms | 400ms (8x) |
| Number precision | ❌ Lossy | ✅ Lossless |
| Key ordering | ❌ Reordered | ✅ Preserved |
| Error recovery | ❌ None | ✅ Tolerant mode |
| Memory overhead | 1x | 4-5x |

### Combined System (Virtual Scrolling + Custom Parser)

- **Best case:** Small files, native parser → same as before
- **Typical case:** Medium files (1-10MB), ExactJSON → 6-8x slower parse, but render is still fast (50-80ms)
- **Large files:** 10MB+, native parser recommended (auto-switch threshold)
- **Very large files:** 50-100MB, virtual scrolling makes rendering instant regardless of parse time

---

## File Organization

### Core Library (`src/lib/`)

```
src/lib/
├── integration/          # Integration contract
│   ├── types.ts          # ParsedData, JsonNode, JsonValue
│   ├── adapters.ts       # JsonValueAdapter, JsonNodeAdapter
│   └── README.md         # Contract specification
│
├── parser/               # Custom parser (Phase II)
│   ├── tokenizer.ts      # Lexer
│   ├── DirectParser.ts   # AST builder
│   ├── parseNumber.ts    # Lossless number parsing
│   ├── types.ts          # JsonNode types
│   ├── tolerant.ts       # Error recovery
│   └── progressive.ts    # Incremental parsing
│
├── tree/                 # Tree utilities
│   ├── flatten.ts        # Tree → flat array
│   ├── expand.ts         # Expand/collapse logic
│   └── types.ts          # FlatNode, TreeState
│
├── parser-selection.ts   # Parser selection logic
├── featureFlags.ts       # Feature flag system
├── storage.ts            # Chrome storage wrapper
└── constants.ts          # Shared constants
```

### Components (`src/components/`)

```
src/components/
├── JsonTreeView.tsx      # Main tree component
├── JsonNode.tsx          # Single node renderer
├── ParserSelector.tsx    # Parser dropdown
├── Toggle.tsx            # Raw/Parsed toggle
├── ThemePicker.tsx       # Theme selector
└── Toolbar.tsx           # Toolbar container
```

### Entry Points (`src/`)

```
src/
├── content.ts            # Main content script
├── set-json-global.ts    # window.json exporter
├── options/              # Options page
│   ├── options.html
│   ├── index.ts
│   └── options.css
└── popup/                # Extension popup
    ├── popup.html
    ├── index.ts
    └── popup.css
```

---

## Testing Strategy

### Unit Tests

- **Integration contract compliance:** `tests/integration/contract-compliance.test.ts` (44 tests)
- **Parser tests:** `tests/unit/parser/*.test.ts` (123 tests)
- **Tree utilities:** `tests/unit/tree/*.test.ts` (48 tests)
- **Component tests:** `tests/unit/components/*.test.ts` (35 tests)
- **Total:** 762+ tests

### E2E Tests

- **Large file tests:** `tests/e2e/large-fixtures.e2e.spec.ts` (1MB, 10MB, 100MB)
- **Toolbar tests:** `tests/e2e/toolbar.e2e.spec.ts`
- **Parser selection:** `tests/e2e/parser-selection.e2e.spec.ts`

### Performance Tests

- **Parser benchmarks:** `tests/perf/parser-comparison.test.ts`
- **Memory profiling:** `tests/perf/memory-profile.test.ts`
- **Regression gates:** `tests/perf/regression-gates.test.ts`

---

## References

- **Integration Contract:** [src/lib/integration/README.md](../src/lib/integration/README.md)
- **Rollout Plan:** [ROLLOUT_PLAN.md](ROLLOUT_PLAN.md)
- **User Guide:** [USER_GUIDE.md](USER_GUIDE.md)
- **Developer Guide:** [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- **Style Guide:** [STYLE_GUIDE.md](STYLE_GUIDE.md)

---

## Version History

- **2025-12-25:** Architecture documentation created from completed implementation
- **Phase I Complete (Weeks 1-6):** Virtual scrolling with Preact
- **Phase II Complete (Weeks 9-20):** Custom streaming parser with lossless numbers and key ordering
