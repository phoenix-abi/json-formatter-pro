# Integration Contract v1.0

## Purpose

This contract defines the interface between JSON parsers and renderers, enabling independent evolution of both layers. The contract allows multiple parser implementations (native JSON.parse, custom streaming parser, etc.) to work seamlessly with any compliant renderer.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Layer                           │
│              (JsonTreeView, JsonNode, etc.)                  │
│                                                              │
│  Uses: createAdapter(data) → DataAdapter                    │
│  Never directly accesses: .length, .keys(), indices         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Integration Contract (DataAdapter)
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                     Parser Layer                             │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │  JsonValueAdapter    │    │  JsonNodeAdapter     │      │
│  │  (Phase I)           │    │  (Phase II)          │      │
│  │                      │    │                      │      │
│  │  Native JSON.parse() │    │  Custom Parser       │      │
│  │  → JsonValue         │    │  → JsonNode (AST)    │      │
│  └──────────────────────┘    └──────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Guarantees

### For Parser Implementers

If you implement a parser that produces data types and provides a `DataAdapter`, your parser will work with the Preact renderer with **ZERO changes to rendering code**.

**Requirements:**
1. Your data type must be distinguishable via type guard (e.g., `isJsonNode`)
2. Your adapter must implement the `DataAdapter` interface
3. Metadata must be semantically correct (type, childCount, etc.)
4. Children iteration must be deterministic and consistent

**What you get:**
- Automatic virtual scrolling for large trees
- Expand/collapse interaction
- Theme support
- URL linkification
- Accessibility features (ARIA)

### For Renderer Implementers

If you write rendering code using `DataAdapter` instead of directly accessing `JsonValue` or `JsonNode`, your code will work with **ANY compliant parser**.

**Requirements:**
1. Use `createAdapter(data)` to get the adapter
2. Use `adapter.getMetadata()` for type information
3. Use `adapter.getChildren()` for iteration
4. Use `adapter.getChild()` for random access
5. Never directly access `.length`, `.keys()`, or array indices

**What you get:**
- Parser-agnostic rendering code
- Support for future parser enhancements (streaming, lossless numbers, etc.)
- Easy testing with mock adapters

## Core Types

### ParsedData

```typescript
export type ParsedData = JsonValue | JsonNode
```

Union type representing data from any parser.

### ValueMetadata

```typescript
export interface ValueMetadata {
  /** Semantic type for rendering */
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

  /** Display value (for primitives) or null (for containers) */
  displayValue: string | null

  /** Does this value have children? */
  hasChildren: boolean

  /** Number of direct children (0 for primitives) */
  childCount: number

  /** Source text range (optional, for advanced features) */
  sourceRange?: { start: number; end: number }

  /** Raw lexeme for lossless display (optional, Phase II) */
  rawText?: string
}
```

Metadata provides all information needed to render a value without accessing its internal structure.

### ChildEntry

```typescript
export interface ChildEntry {
  /** Key name for objects, or null for array elements */
  key: string | null

  /** The child value */
  value: ParsedData

  /** Index within parent (for ordering) */
  index: number
}
```

Represents a single child in iteration, whether from an object or array.

### DataAdapter

```typescript
export interface DataAdapter {
  /**
   * Get metadata about a value
   */
  getMetadata(data: ParsedData): ValueMetadata

  /**
   * Iterate over children (empty for primitives)
   */
  getChildren(data: ParsedData): IterableIterator<ChildEntry>

  /**
   * Get specific child by key (objects) or index (arrays)
   */
  getChild(data: ParsedData, keyOrIndex: string | number): ParsedData | undefined
}
```

The core abstraction enabling parser polymorphism.

## Examples

### Example 1: Adding a New Parser

```typescript
// Step 1: Define your AST type
export type MyNode = {
  kind: 'my-object' | 'my-array' | 'my-string' | 'my-number'
  // ... your properties
}

// Step 2: Create type guard
export function isMyNode(data: ParsedData): data is MyNode {
  return typeof data === 'object' && data !== null && 'kind' in data
}

// Step 3: Implement adapter
export class MyNodeAdapter implements DataAdapter {
  getMetadata(data: ParsedData): ValueMetadata {
    if (!isMyNode(data)) {
      throw new Error('MyNodeAdapter expects MyNode')
    }

    // Map your AST to metadata
    return {
      type: this.mapKindToType(data.kind),
      displayValue: this.getDisplayValue(data),
      hasChildren: this.hasChildren(data),
      childCount: this.getChildCount(data),
    }
  }

  *getChildren(data: ParsedData): IterableIterator<ChildEntry> {
    if (!isMyNode(data)) return

    // Iterate your data structure
    if (data.kind === 'my-object') {
      let index = 0
      for (const [key, value] of Object.entries(data.properties)) {
        yield { key, value, index: index++ }
      }
    }
    // ... handle arrays, etc.
  }

  getChild(data: ParsedData, keyOrIndex: string | number): ParsedData | undefined {
    // Implement random access
    // ...
  }
}

// Step 4: Register in factory
export function createAdapter(data: ParsedData): DataAdapter {
  if (isMyNode(data)) return new MyNodeAdapter()
  if (isJsonNode(data)) return new JsonNodeAdapter()
  return new JsonValueAdapter()
}
```

The renderer will automatically work with your parser! No rendering code changes needed.

### Example 2: Using the Adapter in Rendering

```typescript
function renderValue(data: ParsedData) {
  const adapter = createAdapter(data)
  const meta = adapter.getMetadata(data)

  // Use metadata instead of typeof checks
  if (meta.type === 'string') {
    console.log(`String: ${meta.displayValue}`)
  }

  // Use adapter.getChildren() instead of Object.keys() or array indices
  if (meta.hasChildren) {
    for (const child of adapter.getChildren(data)) {
      const childMeta = adapter.getMetadata(child.value)
      console.log(`${child.key ?? child.index}: ${childMeta.type}`)
    }
  }
}
```

### Example 3: Tree Flattening (Real Usage)

```typescript
// From src/lib/tree/flatten.ts
export function flattenTree(
  value: ParsedData,
  state: TreeState,
  // ...
): FlatNode[] {
  // Create appropriate adapter based on data type
  const adapter = createAdapter(value)
  const meta = adapter.getMetadata(value)

  const node: FlatNode = {
    // ... use metadata
    type: meta.type,
    hasChildren: meta.hasChildren,
    childCount: meta.childCount,
    displayValue: meta.displayValue,
  }

  const result: FlatNode[] = [node]

  // Only recurse if expanded
  if (isExpanded && meta.hasChildren) {
    // Use adapter to iterate, works with any parser
    const children = Array.from(adapter.getChildren(value))

    for (const child of children) {
      const childPath =
        child.key !== null ? `${path}.${child.key}` : `${path}[${child.index}]`

      // Recursive call works because child.value is also ParsedData
      const childNodes = flattenTree(child.value, state, /* ... */)
      result.push(...childNodes)
    }
  }

  return result
}
```

This code works with **both** `JsonValue` (Phase I) and `JsonNode` (Phase II) without modification.

## Testing

### Contract Compliance Suite

All adapters must pass the contract compliance test suite to ensure behavioral equivalence:

```bash
npm test -- tests/integration/contract-compliance.test.ts
```

The suite tests:
- Primitive type handling (string, number, boolean, null)
- Object metadata and iteration
- Array metadata and iteration
- Child access (by key and index)
- Empty containers
- Nested structures

### Adding Your Adapter to Tests

```typescript
// In tests/integration/contract-compliance.test.ts

import { testAdapterCompliance } from './contract-compliance.test'
import { MyNodeAdapter } from '../../src/lib/integration/my-adapter'

testAdapterCompliance(
  'MyNodeAdapter',
  () => new MyNodeAdapter(),
  () => ({
    primitiveString: myParser.parse('"hello"'),
    primitiveNumber: myParser.parse('42'),
    primitiveBoolean: myParser.parse('true'),
    primitiveNull: myParser.parse('null'),
    simpleObject: myParser.parse('{"a": 1}'),
    simpleArray: myParser.parse('[1, 2]'),
    nestedStructure: myParser.parse('{"a": {"b": [1, 2]}}'),
  })
)
```

If all tests pass, your parser is guaranteed to work with the renderer.

## Version History

### v1.0 (Week 7 - Current)

**Initial contract with DataAdapter**

- Core types: `ParsedData`, `ValueMetadata`, `ChildEntry`, `DataAdapter`
- Adapters: `JsonValueAdapter` (complete), `JsonNodeAdapter` (stub)
- Test coverage: 22 compliance tests, 23 adapter-specific tests
- Status: Production-ready for Phase I

**Limitations:**
- No streaming support (synchronous only)
- No partial parsing (must parse entire document)
- No incremental updates

### v1.1 (Planned Week 12)

**Streaming/Pull Parser Support**

- Add `StreamingAdapter` interface for pull-based parsing
- Support partial tree construction
- Enable early rendering before full parse

### v2.0 (Future)

**TBD based on learnings from Phase II**

Potential additions:
- Incremental update protocol
- Patch/diff support
- Schema validation hooks

## Migration Guide for Phase II

When implementing the custom parser (Phase II, Weeks 8-20):

### Step 1: Implement JsonNode Types

```typescript
// src/lib/parser/types.ts
export type JsonNode =
  | ObjectNode
  | ArrayNode
  | StringNode
  | NumberNode
  | BooleanNode
  | NullNode

// Each node type with kind discriminator
// (See Phase II plan for details)
```

### Step 2: Implement JsonNodeAdapter

```typescript
// src/lib/integration/adapters.ts (update)

export class JsonNodeAdapter implements DataAdapter {
  getMetadata(data: ParsedData): ValueMetadata {
    if (!isJsonNode(data)) {
      throw new Error('JsonNodeAdapter expects JsonNode')
    }

    // Map AST nodes to metadata
    switch (data.kind) {
      case 'object':
        return {
          type: 'object',
          displayValue: null,
          hasChildren: data.entries.length > 0,
          childCount: data.entries.length,
          sourceRange: { start: data.start, end: data.end },
        }
      // ... handle other node types
    }
  }

  *getChildren(data: ParsedData): IterableIterator<ChildEntry> {
    if (!isJsonNode(data)) return

    if (data.kind === 'object') {
      for (let i = 0; i < data.entries.length; i++) {
        const entry = data.entries[i]
        yield {
          key: entry.key.value, // Extract string from StringNode
          value: entry.value,
          index: i,
        }
      }
    } else if (data.kind === 'array') {
      for (let i = 0; i < data.elements.length; i++) {
        yield {
          key: null,
          value: data.elements[i],
          index: i,
        }
      }
    }
  }

  getChild(/* ... */) {
    // Implement random access
  }
}
```

### Step 3: Update Adapter Factory

```typescript
export function createAdapter(data: ParsedData): DataAdapter {
  if (isJsonNode(data)) {
    return new JsonNodeAdapter() // Now production-ready
  } else {
    return new JsonValueAdapter()
  }
}
```

### Step 4: Run Compliance Tests

```bash
npm test -- tests/integration/contract-compliance.test.ts
```

All 22 compliance tests should pass. If they do, **the renderer will work with ZERO changes**.

### Step 5: Enable Feature Flag

```typescript
// In src/content.ts (or wherever parsing happens)

import { isFeatureEnabled, FeatureFlag } from './lib/featureFlags'
import { customParser } from './lib/parser' // Your new parser

const parsed = isFeatureEnabled(FeatureFlag.UseCustomParser)
  ? customParser.parse(jsonText) // Returns JsonNode
  : JSON.parse(jsonText) // Returns JsonValue

// Renderer works with both!
render(h(JsonTreeView, { data: parsed }), container)
```

## Best Practices

### For Parser Implementers

1. **Be precise with metadata**: If `childCount` is wrong, the renderer will behave incorrectly
2. **Maintain iteration order**: `getChildren()` should return children in the same order every time
3. **Handle edge cases**: Empty objects/arrays, very large numbers, null values
4. **Test thoroughly**: Run the compliance suite early and often

### For Renderer Implementers

1. **Never bypass the adapter**: Always use `createAdapter()`, even when you "know" the type
2. **Handle all types**: Check `meta.type` explicitly, don't assume structure
3. **Use type guards carefully**: Only for adapter selection, not in rendering logic
4. **Test with both parsers**: Your code should work with `JsonValue` AND `JsonNode`

## Troubleshooting

### "Adapter expects X but got Y"

**Cause:** The adapter factory returned the wrong adapter for the data type.

**Fix:** Check your type guards in `createAdapter()`. Ensure they're mutually exclusive.

### "childCount doesn't match iteration"

**Cause:** `getMetadata().childCount` doesn't match the actual number of yielded children.

**Fix:** Verify your adapter's `childCount` calculation matches the iteration logic.

### "Children appear out of order"

**Cause:** `getChildren()` is not deterministic or doesn't respect source order.

**Fix:** Ensure iteration order is stable and matches the source document order.

## Further Reading

- `src/lib/integration/types.ts` - Type definitions
- `src/lib/integration/adapters.ts` - Adapter implementations
- `tests/integration/contract-compliance.test.ts` - Compliance test suite
- `docs/UNIFIED_RENDERING_PLAN.md` - Full implementation plan
- `docs/CUSTOM_PARSER_PLAN.md` - Phase II custom parser details

## License

Same as parent project.
