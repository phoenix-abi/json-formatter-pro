# Optimization Playbook

This document provides a repeatable workflow for identifying, implementing, and validating performance optimizations in the JSON Formatter Pro extension.

## Table of Contents

- [Optimization Workflow](#optimization-workflow)
- [Profiling Recipes](#profiling-recipes)
- [Guardrails and Coding Guidelines](#guardrails-and-coding-guidelines)
- [Feature Flags for Experiments](#feature-flags-for-experiments)
- [Golden Perf Tests](#golden-perf-tests)
- [PR Requirements](#pr-requirements)
- [Static Checks and Lint Rules](#static-checks-and-lint-rules)

## Optimization Workflow

Follow this checklist-driven process for all performance optimizations:

### 1. Hypothesis
Formulate what is slow and why:
- Identify the specific code path or function (e.g., `buildDom` key iteration)
- State the suspected cause (e.g., repeated Object.keys allocations)
- Define expected impact (e.g., "should reduce render_object_shallow by 15-20%")

### 2. Profile
Capture evidence before making changes:
- Run the relevant perf test suite: `npm run perf:golden`
- Generate flamegraphs (see [Profiling Recipes](#profiling-recipes))
- Capture baseline metrics for the affected test cases
- Save artifacts for before/after comparison

### 3. Change
Make the smallest possible change to test hypothesis:
- Implement the optimization with minimal code changes
- Use feature flags to toggle behavior when feasible
- Add comments explaining the optimization and why it works
- Keep the change focused on one optimization at a time

### 4. Measure
Run perf suite locally and compare vs baseline:
```bash
# Run full perf suite
npm test

# Run golden tests for quick iteration
npm run perf:golden

# Compare against baseline
npm run perf:compare -- --baseline perf-baselines/main.json
```

Analyze results:
- Did p50/p95 improve for targeted metrics?
- Are there any regressions in other metrics?
- Is the improvement within noise or statistically significant?

### 5. Decide
Apply decision criteria:
- **Keep**: p50/p95 improve, no regressions elsewhere
- **Iterate**: Small improvement but still regressions; refine approach
- **Revert**: No improvement or unacceptable regressions

### 6. Baseline Update
Only after improvements are proven on CI:
- Create a dedicated PR to update `perf-baselines/main.json`
- Include rationale explaining what changed and expected impact
- Link to the optimization PR that caused the improvement

## Profiling Recipes

### Node/jsdom (Vitest Tests)

#### CPU Profiling with V8 Profiler

```bash
# Generate a CPU profile
node --prof tests/perf/profile-target.mjs

# Process the profile log
node --prof-process isolate-*.log > profile.txt

# Review profile.txt for hotspots
```

#### CPU Profiling with clinic.js (optional)

```bash
# Install clinic.js (if not already in devDependencies)
npm install --save-dev clinic

# Generate flamegraph
npx clinic flame -- node ./scripts/run-render-bench.mjs

# Opens interactive flamegraph in browser
```

#### Heap Profiling

```bash
# Start Node with inspector
node --inspect-brk tests/perf/profile-target.mjs

# In Chrome:
# 1. Open chrome://inspect
# 2. Click "inspect" under target
# 3. Go to Memory tab
# 4. Take heap snapshot or allocation profile
# 5. Resume execution
```

#### Using performance.mark/measure

```typescript
// Temporarily add to hot code path
performance.mark('buildDom-start')
const result = buildDom(data, expanded)
performance.mark('buildDom-end')
performance.measure('buildDom', 'buildDom-start', 'buildDom-end')

// Retrieve measurements
const entries = performance.getEntriesByName('buildDom')
console.log(`buildDom took ${entries[0].duration}ms`)
```

### Browser (Playwright E2E)

#### Chrome DevTools Performance Panel

```bash
# Run E2E test with headful mode
npx playwright test --headed --debug

# In Chrome DevTools:
# 1. Open Performance tab
# 2. Click Record
# 3. Interact with JSON page (expand/collapse)
# 4. Stop recording
# 5. Analyze flamegraph and main thread activity
```

#### Lighthouse Performance Audits

```bash
# Run Lighthouse on built extension
# (Requires manual loading of dist/ in Chrome)
lighthouse <test-url> --view
```

## Guardrails and Coding Guidelines

Follow these guidelines when working on hot paths (`src/lib/buildDom.ts`, `templates.ts`, `getResult.ts`, `getValueType.ts`):

### Allocation Discipline

❌ **Avoid**: Unnecessary allocations in tight loops
```typescript
// BAD: Allocates new array on every iteration
for (let i = 0; i < items.length; i++) {
  const keys = Object.keys(items[i])  // Allocation!
  // ...
}
```

✅ **Prefer**: Precompute or use indexed access
```typescript
// GOOD: Single allocation
const allKeys = items.map(item => Object.keys(item))
for (let i = 0; i < items.length; i++) {
  const keys = allKeys[i]
  // ...
}

// BETTER: Avoid allocation if possible
for (let i = 0; i < items.length; i++) {
  for (const key in items[i]) {
    // Direct iteration
  }
}
```

### Loop Optimization

❌ **Avoid**: Repeated invariant computations
```typescript
// BAD: length property accessed every iteration
for (let i = 0; i < items.length; i++) {
  const prefix = config.prefix  // Invariant!
  // ...
}
```

✅ **Prefer**: Hoist invariants outside loop
```typescript
// GOOD: Hoist invariants
const prefix = config.prefix
for (let i = 0; i < items.length; i++) {
  // ...
}
```

### String Handling

❌ **Avoid**: Array.join for small counts
```typescript
// BAD: Allocation overhead for small strings
const result = [prefix, value, suffix].join('')
```

✅ **Prefer**: Simple concatenation for small strings
```typescript
// GOOD: Simple concatenation
const result = prefix + value + suffix
```

### DOM Operations

❌ **Avoid**: Repeated DOM writes
```typescript
// BAD: Forces layout/paint on every append
for (const item of items) {
  container.appendChild(renderItem(item))
}
```

✅ **Prefer**: Batch with DocumentFragment
```typescript
// GOOD: Single append
const fragment = document.createDocumentFragment()
for (const item of items) {
  fragment.appendChild(renderItem(item))
}
container.appendChild(fragment)
```

### Type Stability

❌ **Avoid**: Polymorphic shapes in hot objects
```typescript
// BAD: Shape changes over time
function createNode(data) {
  const node = { value: data }
  if (typeof data === 'object') {
    node.expanded = false  // Shape change!
  }
  return node
}
```

✅ **Prefer**: Consistent shapes
```typescript
// GOOD: Same shape always
function createNode(data) {
  return {
    value: data,
    expanded: typeof data === 'object' ? false : undefined
  }
}
```

### Fast Paths

✅ **Prefer**: Early returns for primitives
```typescript
function processValue(value: JsonValue): HTMLElement {
  // Fast path for primitives
  if (typeof value !== 'object' || value === null) {
    return createPrimitiveElement(value)
  }

  // Slower complex object path
  return createComplexElement(value)
}
```

### Function Monomorphism

❌ **Avoid**: Mixed types in function parameters
```typescript
// BAD: Polymorphic parameter
function format(value: string | number | boolean) {
  return String(value)  // Forces type checks
}
```

✅ **Prefer**: Separate functions or stable types
```typescript
// GOOD: Monomorphic functions
function formatString(value: string): string {
  return value
}

function formatNumber(value: number): string {
  return String(value)
}
```

## Feature Flags for Experiments

Use feature flags to enable/disable experimental optimizations during development and testing.

### Pattern

```typescript
// In test setup (tests/perf/setup.ts or individual test files)
globalThis.__JSON_FMT_FLAGS__ = {
  lazyChildren: true,
  fastKeys: false,
  batchDomWrites: true
}

// In source code (temporary during optimization work)
function buildDom(data: JsonValue, expanded: boolean): HTMLElement {
  const useLazy = globalThis.__JSON_FMT_FLAGS__?.lazyChildren ?? false

  if (useLazy) {
    return buildDomLazy(data, expanded)
  } else {
    return buildDomEager(data, expanded)
  }
}
```

### Guidelines

- Feature flags are for **experimentation only**
- Remove flags once optimization is validated and becomes default behavior
- Never ship feature flags to production unless they serve a user-facing purpose
- Document flags in test files that use them

## Golden Perf Tests

The "golden" test suite is a minimal set of fast-running perf tests for quick iteration during optimization work.

### Running Golden Tests

```bash
# Run only golden perf tests (< 10 seconds)
npm run perf:golden

# Compare golden results against baseline
npm run perf:compare -- --baseline perf-baselines/main.json
```

### Golden Test Cases

See `tests/perf/golden.json` for the current golden test configuration. Current cases:

- `render_object_shallow` - 200-key flat object
- `render_object_deep` - Depth-8 nested object
- `render_array_large` - 5000-element numeric array
- `expand_medium_array` - Expand/collapse interaction

These cases cover the most common hotspots and provide fast feedback.

## PR Requirements

All PRs that modify hot paths (`src/lib/buildDom.ts`, `templates.ts`, `getResult.ts`, `getValueType.ts`) must:

1. **Run perf suite locally** before submitting PR
2. **Attach perf report** to PR description or link to CI artifacts
3. **Fill out performance section** in PR template (see `.github/pull_request_template.md`)
4. **Include before/after metrics** for affected test cases
5. **Provide evidence** (flamegraphs, heap snapshots) if claiming performance improvements
6. **Document rollback plan** if introducing experimental optimizations

### Performance Section Template

See `.github/pull_request_template.md` for the full template. Example:

```markdown
## Performance Impact

- **Targeted hotspots**: buildDom: object key iteration
- **Before (p50)**: render_object_shallow 4.8ms (n=50)
- **After (p50)**: render_object_shallow 3.9ms (n=50) ⇨ −18.7%
- **Impact on others**: No regressions detected (all within 2%)
- **Evidence**: See artifacts `perf-results-<sha>/compare.json`; attached flamegraph
- **Rollback**: Revert commit abcd123 or set flag `__JSON_FMT_FLAGS__.fastKeys=false`
```

## Static Checks and Lint Rules

Future work (separate PR) will add ESLint rules to catch common perf hazards:

### Planned Rules

- `no-new-object-in-loop` (custom): Warns on object/array allocations inside obvious loops in `src/lib/**`
- `prefer-for-of-off`: Prefer classic `for` loops in hot modules
- `no-console`: Disallow console.* in production code; use debug flags

### Hot Module Annotation

Annotate hot modules with `/* @hot */` comment to enable stricter linting:

```typescript
/* @hot - This module is performance-critical. Follow optimization playbook. */

export function buildDom(data: JsonValue, expanded: boolean): HTMLElement {
  // ...
}
```

## Resources

- **V8 Performance Tips**: https://v8.dev/blog/cost-of-javascript-2019
- **Chrome DevTools Performance**: https://developer.chrome.com/docs/devtools/performance/
- **Node.js Profiling Guide**: https://nodejs.org/en/docs/guides/simple-profiling/
- **clinic.js**: https://clinicjs.org/
- **Optimization Killers**: https://github.com/petkaantonov/bluebird/wiki/Optimization-killers

## Baseline Update Process

When an optimization improves performance:

1. **Merge optimization PR** with evidence and approval
2. **Wait for CI** to confirm improvement on standardized hardware
3. **Create baseline update PR** with:
   - Updated `perf-baselines/main.json`
   - Rationale explaining what changed
   - Link to optimization PR
   - Before/after comparison from CI
4. **Review and merge** baseline update separately

This ensures baselines reflect proven, stable improvements rather than local-only gains.
