# ExactJSON Rollout Plan

**Status:** Ready for Gradual Rollout
**Date:** 2025-12-25
**Phase:** Week 20 - Production Rollout

---

## Executive Summary

This document outlines the gradual rollout strategy for ExactJSON (Phase II). The rollout will proceed in three phases (10% → 50% → 100%) with clear success criteria, monitoring, and rollback procedures at each stage.

**Key Features Being Rolled Out:**
- Lossless number handling (BigInt, Decimal, String modes)
- Key order preservation (exact source order)
- Tolerant parsing mode (error recovery)
- Streaming parser with incremental rendering
- ExactJSON options UI

**Rollout Timeline:** 3-6 weeks total (1-2 weeks per phase)

---

## Feature Flags

### Current Feature Flags

The extension uses two primary feature flags for gradual rollout:

**1. `UsePreactRenderer` (Phase I - Already in Production)**
- **Status:** ✅ Enabled by default
- **Purpose:** Virtual scrolling for large files (100MB+)
- **Control:** `src/lib/feature-flags.ts`
- **Rollout:** Complete (100% enabled)

**2. `UseCustomParser` (Phase II - This Rollout)**
- **Status:** 🚀 Ready for rollout
- **Purpose:** Custom parser with lossless numbers and key ordering
- **Control:** `src/lib/feature-flags.ts`
- **Rollout:** Gradual (10% → 50% → 100%)

### Feature Flag Configuration

```typescript
// src/lib/feature-flags.ts
export enum FeatureFlag {
  UsePreactRenderer = 'usePreactRenderer',
  UseCustomParser = 'useCustomParser',
}

export interface FeatureFlagConfig {
  enabled: boolean
  rolloutPercentage: number  // 0-100
  userOptIn?: boolean         // Allow users to force enable
}
```

**Rollout Percentage Control:**

```typescript
const FEATURE_FLAG_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.UsePreactRenderer]: {
    enabled: true,
    rolloutPercentage: 100,  // Already rolled out
  },
  [FeatureFlag.UseCustomParser]: {
    enabled: true,
    rolloutPercentage: 10,  // Start at 10% (Phase 1)
    userOptIn: true,        // Users can enable in options
  },
}
```

**User Hash-Based Rollout:**

```typescript
async function isFeatureEnabledForUser(flag: FeatureFlag): Promise<boolean> {
  const config = FEATURE_FLAG_CONFIG[flag]

  if (!config.enabled) return false

  // User opt-in check (from settings)
  const settings = await getParserSettings()
  if (config.userOptIn && settings.forceEnableCustomParser) {
    return true
  }

  // Hash-based rollout (deterministic per user)
  const userId = await getUserId()  // Stable across sessions
  const hash = hashString(userId + flag)
  const percentage = hash % 100

  return percentage < config.rolloutPercentage
}
```

---

## Rollout Phases

### Phase 1: 10% Rollout (Week 1-2)

**Objective:** Validate custom parser in production with limited user base.

**Rollout Configuration:**
```typescript
[FeatureFlag.UseCustomParser]: {
  enabled: true,
  rolloutPercentage: 10,
  userOptIn: true,
}
```

**Target Users:**
- 10% of active users (hash-based selection)
- All users who opt-in via options page
- Internal/beta testers (force-enabled)

**Success Criteria:**
- ✅ Error rate < 0.1% (vs 0.05% baseline)
- ✅ No crashes or memory leaks
- ✅ Parse time < 100ms for 99th percentile (1MB JSON)
- ✅ User complaints < 5 per 1000 users
- ✅ Prototype pollution tests pass (0 incidents)

**Monitoring Metrics:**
- Parse errors (by error type)
- Parse time (p50, p90, p99)
- Memory usage (heap size)
- Crash rate (extension restarts)
- User feedback (ratings, support tickets)

**Duration:** 1-2 weeks

**Rollback Trigger:**
- Error rate > 0.5%
- Crash rate > 0.1%
- Parse time p99 > 500ms (10MB JSON)
- Critical security issue discovered

---

### Phase 2: 50% Rollout (Week 3-4)

**Objective:** Scale to majority of users, validate performance at scale.

**Rollout Configuration:**
```typescript
[FeatureFlag.UseCustomParser]: {
  enabled: true,
  rolloutPercentage: 50,
  userOptIn: true,
}
```

**Target Users:**
- 50% of active users (hash-based selection)
- All opt-in users
- All Phase 1 users (maintain consistency)

**Success Criteria:**
- ✅ Error rate < 0.1% (same as Phase 1)
- ✅ No new crashes or memory leaks
- ✅ Parse time stable (no regression)
- ✅ User satisfaction score > 4.0/5.0
- ✅ No security incidents

**Monitoring Metrics:**
- Same as Phase 1, plus:
  - Comparison between 50% custom vs 50% native
  - Geographic distribution of errors
  - Browser version correlation

**Duration:** 1-2 weeks

**Rollback Trigger:**
- Same as Phase 1
- Significant user complaints (> 10 per 1000 users)
- Performance regression detected

---

### Phase 3: 100% Rollout (Week 5-6)

**Objective:** Complete rollout to all users, make custom parser the default.

**Rollout Configuration:**
```typescript
[FeatureFlag.UseCustomParser]: {
  enabled: true,
  rolloutPercentage: 100,
  userOptIn: false,  // No longer needed (100% enabled)
}
```

**Target Users:**
- 100% of active users
- Custom parser becomes the default

**Success Criteria:**
- ✅ Error rate < 0.1%
- ✅ Parse time meets targets (< 100ms for 1MB, < 500ms for 10MB)
- ✅ Memory overhead < 5x file size
- ✅ User satisfaction score > 4.0/5.0
- ✅ Zero security incidents

**Monitoring Metrics:**
- Full metrics across all users
- Long-term stability tracking
- Feature usage analytics (number mode, tolerant mode, etc.)

**Duration:** 1-2 weeks before finalizing

**Rollback Trigger:**
- Same as Phase 2
- Would require reverting to native parser (major regression)

---

## Monitoring and Metrics

### Error Tracking

**Error Categories:**
1. **Parse Errors** (expected for malformed JSON)
   - Track error types, frequency, input patterns
   - Compare with native parser error rate
2. **Tokenizer Errors** (unexpected character, invalid escape, etc.)
   - Should be rare for valid JSON
3. **Memory Errors** (out of memory, heap exhaustion)
   - Track heap size, memory overhead
4. **Crashes** (extension restart, tab crash)
   - Critical - immediate rollback if > 0.1%

**Logging Strategy:**

```typescript
interface ParserMetric {
  parser: 'native' | 'custom'
  parseTime: number        // milliseconds
  inputSize: number        // bytes
  errorType?: string       // If error occurred
  memoryUsage?: number     // bytes
  userAgent: string
  timestamp: number
}

function logParserMetric(metric: ParserMetric) {
  // Send to analytics backend (e.g., Google Analytics, Sentry)
  if (typeof chrome?.runtime?.sendMessage !== 'undefined') {
    chrome.runtime.sendMessage({
      type: 'parser_metric',
      data: metric,
    })
  }
}
```

**Example Instrumentation:**

```typescript
const startTime = performance.now()
const startMemory = performance.memory?.usedJSHeapSize || 0

try {
  const { ast, errors } = parse(json, options)

  const parseTime = performance.now() - startTime
  const memoryUsage = (performance.memory?.usedJSHeapSize || 0) - startMemory

  logParserMetric({
    parser: 'custom',
    parseTime,
    inputSize: json.length,
    memoryUsage,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  })

  if (errors && errors.length > 0) {
    // Log recovered errors (tolerant mode)
    logParserMetric({
      parser: 'custom',
      parseTime,
      inputSize: json.length,
      errorType: 'recovered_errors',
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    })
  }
} catch (error) {
  const parseTime = performance.now() - startTime

  logParserMetric({
    parser: 'custom',
    parseTime,
    inputSize: json.length,
    errorType: error.name,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  })

  // Fallback to native parser
  const native = JSON.parse(json)
  // ... continue with native
}
```

### Performance Metrics

**Key Metrics:**
- **TTFD (Time to First Display):** How long until JSON is visible
- **Parse Time:** Time spent in parser (JSON → AST)
- **Render Time:** Time spent rendering (AST → DOM)
- **Memory Usage:** Heap size increase during parsing

**Targets (from Week 18):**
| Metric | 1MB JSON | 10MB JSON | 100MB JSON |
|--------|----------|-----------|------------|
| Parse Time (p99) | < 100ms | < 500ms | < 3000ms |
| TTFD (p99) | < 500ms | < 1500ms | < 5000ms |
| Memory Overhead | < 5x | < 5x | < 5x |
| Error Rate | < 0.1% | < 0.1% | < 0.5% |

### User Feedback

**Feedback Channels:**
1. Chrome Web Store reviews
2. GitHub issues
3. Support email
4. In-extension feedback form (future)

**Feedback Categorization:**
- **Bug reports** → Investigate and fix in next release
- **Performance complaints** → Check metrics, consider rollback
- **Feature requests** → Add to backlog
- **Positive feedback** → Track for success validation

---

## Rollback Procedures

### Rollback Triggers

**Automatic Rollback:**
- Error rate > 1% (critical)
- Crash rate > 0.5% (critical)
- Memory leak detected (heap size keeps growing)

**Manual Rollback:**
- User complaints > 20 per 1000 users
- Security vulnerability discovered
- Performance regression > 50% slower
- Data corruption reported

### Rollback Process

**Step 1: Immediate Mitigation (< 5 minutes)**
```typescript
// Update feature flag config
const FEATURE_FLAG_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.UseCustomParser]: {
    enabled: false,  // Disable immediately
    rolloutPercentage: 0,
  },
}
```

**Step 2: Notify Users (< 1 hour)**
- Post notice in extension changelog
- Update Chrome Web Store description
- Respond to GitHub issues

**Step 3: Investigation (< 24 hours)**
- Analyze error logs and metrics
- Reproduce issue locally
- Identify root cause

**Step 4: Fix and Re-Deploy (< 1 week)**
- Implement fix
- Add regression tests
- Re-run security and fuzz tests
- Restart rollout from Phase 1 (10%)

### Partial Rollback

**Option:** Rollback to previous phase instead of full rollback.

Example: If Phase 2 (50%) has issues, rollback to Phase 1 (10%) instead of 0%.

```typescript
const FEATURE_FLAG_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.UseCustomParser]: {
    enabled: true,
    rolloutPercentage: 10,  // Rollback from 50% to 10%
  },
}
```

---

## User Opt-In and Opt-Out

### Opt-In (During Gradual Rollout)

Users can force-enable the custom parser before 100% rollout:

**Options Page UI:**
```html
<div class="feature-preview">
   <h3>🚀 Try the New ExactJSON (Beta)</h3>
  <p>
    The custom parser provides lossless number handling and preserves
    key order. Enable this to try it before it rolls out to everyone.
  </p>
  <label>
    <input type="checkbox" id="force-enable-custom-parser">
    Enable ExactJSON (Beta)
  </label>
</div>
```

**Settings Storage:**
```typescript
interface ParserSettings {
  parserType: ParserType
  customParserOptions: CustomParserOptions
  forceEnableCustomParser: boolean  // New field for opt-in
}
```

### Opt-Out (After 100% Rollout)

Users can fallback to native parser if they experience issues:

**Options Page UI:**
```html
<div class="parser-selection">
  <label>
    <input type="radio" name="parser" value="native">
    Native Parser (Fast, lossy numbers)
  </label>
  <label>
    <input type="radio" name="parser" value="custom" checked>
    ExactJSON (Lossless, preserves order)
  </label>
</div>
```

**This option is already implemented** in the existing parser selection UI.

---

## Testing Strategy for Each Phase

### Pre-Rollout Validation (Phase 0)

**Before starting Phase 1:**
- ✅ All unit tests pass (657 tests)
- ✅ All integration tests pass (44 tests)
- ✅ All E2E tests pass (large fixtures, toolbar, etc.)
- ✅ Security audit tests pass (23 tests)
- ✅ Fuzz tests pass (19 tests)
- ✅ Manual testing on major browsers (Chrome, Firefox, Edge)
- ✅ Performance benchmarks meet targets

### Phase 1 Testing

**During 10% rollout:**
- Monitor error logs daily
- Run regression tests weekly
- Manual testing on reported issues
- Security monitoring (no prototype pollution incidents)

### Phase 2 Testing

**During 50% rollout:**
- A/B testing: compare 50% custom vs 50% native
- Performance comparison (parse time, memory usage)
- User satisfaction survey
- Load testing with large fixtures

### Phase 3 Testing

**During 100% rollout:**
- Full regression suite
- Long-term stability monitoring
- Feature usage analytics
- User feedback analysis

---

## Communication Plan

### Internal Communication

**Stakeholders:**
- Development team
- QA team
- Support team
- Product manager

**Updates:**
- Weekly status updates during rollout
- Immediate alerts for critical issues
- Post-mortem after each phase

### External Communication

**Users:**
- Changelog in extension (visible on update)
- Chrome Web Store description update
- GitHub release notes
- Documentation updates

**Example Changelog Entry:**

```markdown
## Version 1.5.0 - ExactJSON Beta Rollout

### What's New
- 🚀 **ExactJSON (Beta):** We're gradually rolling out a new parser with:
  - Lossless number handling (no precision loss for large integers)
  - Key order preservation (see keys in exact source order)
  - Tolerant parsing (recover from minor JSON errors)

### Who Gets It?
- Rolling out to 10% of users initially
- You can enable it early in Options → Parser Settings

### Known Issues
- Custom parser is 4-11x slower than native (acceptable for most JSON)
- Tolerant mode has limited support (tokenizer-level errors still throw)

### Feedback
- Report issues: https://github.com/phoenix-abi/json-formatter-pro/issues
- Rate the extension: [Chrome Web Store link]
```

---

## Success Metrics

### Phase 1 (10%) Success Criteria

- [ ] Error rate < 0.1%
- [ ] Crash rate < 0.1%
- [ ] Parse time p99 < 100ms (1MB JSON)
- [ ] User complaints < 5 per 1000 users
- [ ] No security incidents
- [ ] At least 100 users opted in

**Decision:** Proceed to Phase 2 if all criteria met after 1-2 weeks.

### Phase 2 (50%) Success Criteria

- [ ] Error rate < 0.1% (same as Phase 1)
- [ ] No regression in performance
- [ ] User satisfaction score > 4.0/5.0
- [ ] No security incidents
- [ ] Positive feedback > negative feedback (2:1 ratio)

**Decision:** Proceed to Phase 3 if all criteria met after 1-2 weeks.

### Phase 3 (100%) Success Criteria

- [ ] Error rate < 0.1%
- [ ] Parse time meets targets (see table above)
- [ ] Memory overhead < 5x
- [ ] User satisfaction score > 4.0/5.0
- [ ] Zero security incidents
- [ ] Extension rating on Chrome Web Store > 4.0/5.0

**Decision:** Finalize rollout if all criteria met after 1-2 weeks.

---

## Timeline

| Week | Phase | Rollout % | Milestone |
|------|-------|-----------|-----------|
| 0 | Pre-rollout | 0% | All tests pass, security audit complete |
| 1-2 | Phase 1 | 10% | Monitor metrics, validate error rate |
| 3-4 | Phase 2 | 50% | Scale validation, A/B testing |
| 5-6 | Phase 3 | 100% | Full rollout, finalize |
| 7+ | Post-rollout | 100% | Long-term monitoring, optimization |

**Total Duration:** 6-7 weeks (conservative estimate)

**Fast-Track Option:** If Phase 1 shows zero issues after 1 week, accelerate to Phase 2 immediately.

---

## Risk Assessment

### High-Risk Scenarios

**1. Memory Leak**
- **Likelihood:** Low (tested in Week 18)
- **Impact:** High (browser crash)
- **Mitigation:** Memory profiling tests, rollback trigger on heap growth
- **Rollback:** Immediate (< 5 minutes)

**2. Prototype Pollution**
- **Likelihood:** Very Low (tested in Week 20)
- **Impact:** Critical (security vulnerability)
- **Mitigation:** Security audit tests, __proto__ tests
- **Rollback:** Immediate (< 5 minutes)

**3. Performance Regression**
- **Likelihood:** Medium (parser is 4-11x slower)
- **Impact:** Medium (user complaints)
- **Mitigation:** Performance benchmarks, TTFD thresholds
- **Rollback:** Manual (after investigation)

**4. Data Corruption**
- **Likelihood:** Very Low (tested extensively)
- **Impact:** Critical (user trust)
- **Mitigation:** Integration contract tests, parser correctness tests
- **Rollback:** Immediate (< 5 minutes)

### Medium-Risk Scenarios

**5. Browser Compatibility**
- **Likelihood:** Medium (Chrome, Firefox, Edge differences)
- **Impact:** Medium (some users can't use extension)
- **Mitigation:** Cross-browser E2E tests
- **Rollback:** Partial (disable for specific browsers)

**6. User Confusion**
- **Likelihood:** High (new features, UI changes)
- **Impact:** Low (support tickets)
- **Mitigation:** Clear documentation, changelog, options UI
- **Rollback:** Not needed (education issue)

---

## Post-Rollout Plan

### Week 7+ (After 100% Rollout)

**Objectives:**
1. Monitor long-term stability
2. Gather feature usage analytics
3. Identify optimization opportunities
4. Plan Phase III features (streaming, progressive rendering)
5. Remove/hide beta settings section on the Options page

**Metrics to Track:**
- Parser selection (native vs custom usage)
- Number mode usage (native, bigint, decimal, string)
- Tolerant mode usage
- Large file handling (> 10MB JSON)
- User ratings and reviews

**Optimization Priorities:**
1. Reduce parse time gap (currently 4-11x, target < 5x)
2. Implement tokenizer-level tolerant mode
3. Add streaming/progressive parsing for very large files
4. Optimize memory usage (reduce 5x overhead to 3x)

---

## Appendix

### A. Feature Flag Implementation

**src/lib/feature-flags.ts:**
```typescript
export enum FeatureFlag {
  UsePreactRenderer = 'usePreactRenderer',
  UseCustomParser = 'useCustomParser',
}

export interface FeatureFlagConfig {
  enabled: boolean
  rolloutPercentage: number
  userOptIn?: boolean
}

const FEATURE_FLAG_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.UsePreactRenderer]: {
    enabled: true,
    rolloutPercentage: 100,
  },
  [FeatureFlag.UseCustomParser]: {
    enabled: true,
    rolloutPercentage: 10,  // Start at 10%
    userOptIn: true,
  },
}

export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  const config = FEATURE_FLAG_CONFIG[flag]

  if (!config.enabled) return false

  // User opt-in check
  if (config.userOptIn) {
    const settings = await getParserSettings()
    if (settings.forceEnableCustomParser) {
      return true
    }
  }

  // Hash-based rollout
  const userId = await getUserId()
  const hash = hashString(userId + flag)
  const percentage = hash % 100

  return percentage < config.rolloutPercentage
}

async function getUserId(): Promise<string> {
  // Use stable user ID (e.g., from storage)
  const stored = await chrome.storage.local.get('userId')
  if (stored.userId) return stored.userId

  // Generate new ID and store
  const newId = crypto.randomUUID()
  await chrome.storage.local.set({ userId: newId })
  return newId
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}
```

### B. Monitoring Dashboard (Conceptual)

**Metrics Dashboard (e.g., Google Analytics, Sentry):**

```
ExactJSON Rollout Dashboard
================================

Phase: 2 (50% Rollout)
Duration: 8 days

Metrics:
--------
Error Rate:        0.08%  ✅ (< 0.1% threshold)
Crash Rate:        0.02%  ✅ (< 0.1% threshold)
Parse Time (p99):  87ms   ✅ (< 100ms threshold)
Memory Overhead:   4.2x   ✅ (< 5x threshold)

User Feedback:
--------------
Ratings:           4.3/5.0  ✅
Support Tickets:   3/1000   ✅ (< 5/1000 threshold)
Positive/Negative: 12:3 (4:1 ratio)  ✅

Browser Breakdown:
------------------
Chrome:  89% (error rate: 0.07%)
Firefox:  8% (error rate: 0.12%)
Edge:     3% (error rate: 0.09%)

Top Errors:
-----------
1. Invalid escape sequence: 45 instances
2. Unexpected token: 23 instances
3. Maximum depth exceeded: 12 instances

Recommendation: Proceed to Phase 3 (100% rollout)
```

---

## Conclusion

This rollout plan provides a structured, low-risk approach to deploying the custom parser to production. By using feature flags, gradual rollout, comprehensive monitoring, and clear rollback procedures, we can ensure a smooth transition while maintaining user trust and extension stability.

**Next Steps:**
1. Implement feature flag infrastructure
2. Add monitoring and error logging
3. Update options page UI for opt-in
4. Begin Phase 1 (10% rollout)
5. Monitor metrics and iterate

**Week 20 Status:** ✅ Rollout Plan Complete
