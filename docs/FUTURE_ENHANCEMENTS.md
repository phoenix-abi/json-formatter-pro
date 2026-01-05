# Future Enhancements

**Status:** ✅ Migrated to GitHub Issues

This document has been replaced by GitHub Issues for better tracking and collaboration.

## Where to Find Enhancements

**All feature requests, enhancements, and roadmap items are now tracked as GitHub Issues:**

👉 **[View All Enhancements](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)**

### Quick Links

- **[High Priority Issues](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Apriority-high)** - Work planned for near-term implementation
- **[Roadmap Issues](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aroadmap)** - Official roadmap items
- **[Quick Wins](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Apriority-high+label%3Aeffort-small)** - High impact, small effort
- **[All Open Issues](https://github.com/phoenix-abi/json-formatter-pro/issues)** - Complete list

## Why We Migrated

**From:** Markdown document with manual tracking
**To:** GitHub Issues with labels and milestones

**Benefits:**
- ✅ Better collaboration with comments and mentions
- ✅ No merge conflicts from multiple editors
- ✅ Clear prioritization with multi-dimensional labels
- ✅ AI tools can query GitHub API directly
- ✅ Transparent roadmap visible to all contributors
- ✅ Integration with PRs (auto-close on merge)
- ✅ Better workflow tracking (status labels)

## How to Use GitHub Issues

**See the comprehensive guide:** [docs/ISSUE_GUIDE.md](ISSUE_GUIDE.md)

**Quick overview:**

### Labels System

- **Priority:** `priority-critical`, `priority-high`, `priority-medium`, `priority-low`
- **Category:** `category-ui`, `category-performance`, `category-feature`, `category-parser`, etc.
- **Effort:** `effort-small`, `effort-medium`, `effort-large`
- **Status:** `status-blocked`, `status-in-progress`, `status-needs-review`
- **Special:** `roadmap`, `post-rollout`, `enhancement`, `bug`

### Finding What to Work On

**For developers:**
1. Check `priority-high` + `roadmap` labels
2. Look for `effort-small` for quick wins
3. Filter by category that matches your expertise

**For AI tools:**
```bash
# High-priority roadmap items not in progress
gh issue list --label priority-high --label roadmap --label -status-in-progress
```

### Creating New Enhancements

Use the enhancement template from [ISSUE_GUIDE.md](ISSUE_GUIDE.md#enhancement-template):

```markdown
## Summary
[Description]

## Priority
[Level] - [Justification]

## Effort
[Estimate]

## Features
- [List features]

## Implementation Notes
- [Technical details]
```

## Historical Context

**Migration Date:** 2025-12-26

**Issues Created:**
- 36 enhancement issues migrated from this document
- Issues #8-43 cover all previously planned work
- All enhancements properly labeled and prioritized

**Previous Enhancement Codes:**
- Enhancement codes (UI-*, PERF-*, FEAT-*, etc.) were replaced with GitHub issue numbers
- References like `UI-EXPAND-ALL` → now referenced as `#8`
- This provides stable references without manual renumbering

## Contributing

To propose a new enhancement:

1. Search existing issues to avoid duplicates
2. Create a new issue using the enhancement template
3. Add appropriate labels (priority, category, effort)
4. Provide clear description and implementation notes
5. Reference related issues or PRs

**See:** [ISSUE_GUIDE.md](ISSUE_GUIDE.md) for complete guidelines

---

**Note:** This document is kept for historical reference. For current planning, always refer to GitHub Issues.
