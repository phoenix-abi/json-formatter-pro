# Pull Request

## Description

Please include a summary of the changes and the related issue. Include relevant motivation and context.

Fixes # (issue)

## Type of Change

Please delete options that are not relevant.

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes, code structure improvements)
- [ ] Performance optimization (changes to improve performance)
- [ ] Documentation update
- [ ] Test improvements

## Testing

Please describe the tests you ran to verify your changes. Provide instructions so we can reproduce.

- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual testing completed

**Test Configuration**:
- Node version:
- OS:
- Browser (if applicable):

## Performance Impact

**Required for PRs that modify hot paths** (`src/lib/buildDom.ts`, `templates.ts`, `getResult.ts`, `getValueType.ts`). Mark N/A if not applicable.

### Targeted Hotspots
<!-- Which functions/code paths are affected? -->


### Metrics Before/After
<!-- Provide before/after metrics for affected test cases. Run: npm run perf:golden -->

| Test Case | Metric | Before | After | Change |
|-----------|--------|--------|-------|--------|
| example_test | p50_ms | 4.8ms | 3.9ms | -18.7% |

### Impact on Other Metrics
<!-- Did any other test cases regress? Run: npm run perf:compare -->


### Evidence
<!-- Attach or link to: -->
- [ ] Perf report JSON (link to CI artifacts `perf-results-<sha>/compare.json`)
- [ ] Flamegraph or profiling data (if claiming optimization)
- [ ] Before/after screenshots (if visual changes)

### Rollback Plan
<!-- How to revert if this causes issues in production? -->
- Revert commit:
- Feature flag (if applicable):

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

### Performance Checklist (if applicable)

- [ ] I have run the perf suite locally (`npm test`)
- [ ] I have run golden tests during iteration (`npm run perf:golden`)
- [ ] I have compared metrics against baseline (`npm run perf:compare`)
- [ ] No regressions detected, or regressions are justified and documented
- [ ] I have read the [Optimization Playbook](../docs/OPTIMIZATION_PLAYBOOK.md)
- [ ] Hot path code follows [coding guidelines](../docs/OPTIMIZATION_PLAYBOOK.md#guardrails-and-coding-guidelines)

## Additional Context

Add any other context, screenshots, or references about the pull request here.
