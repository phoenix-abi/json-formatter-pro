# GitHub Issues Guide

**Last Updated:** 2025-12-26

This guide documents how we use GitHub Issues for planning, roadmaps, and feature development in the JSON Formatter Pro project.

## Overview

We use GitHub Issues for all planning, feature requests, bug reports, and roadmap tracking. This approach provides:

- **Centralized tracking** - All work in one place
- **Better collaboration** - Comments, labels, and mentions
- **Clear prioritization** - Multi-dimensional labeling system
- **Transparent roadmap** - Public visibility into what's planned
- **AI-friendly** - Structured format for AI tools to understand priorities

## Label System

We use a multi-dimensional labeling system to classify and prioritize issues.

### Priority Labels

Priority indicates urgency and importance:

| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| `priority-critical` | 🔴 Red (#b60205) | Critical blocker, must be fixed immediately | Security issues, data loss, complete breakage |
| `priority-high` | 🟠 Orange (#d93f0b) | High priority, should be addressed soon | Major UX issues, important features, significant bugs |
| `priority-medium` | 🟡 Yellow (#fbca04) | Medium priority, nice to have | Enhancement requests, minor bugs, quality improvements |
| `priority-low` | 🟢 Green (#0e8a16) | Low priority, future consideration | Nice-to-have features, polish, long-term improvements |

**Rules:**
- Every issue should have exactly ONE priority label
- Re-prioritize issues as circumstances change
- Critical issues should be rare (< 5% of total)

### Category Labels

Categories group related work:

| Label | Color | Description |
|-------|-------|-------------|
| `category-ui` | Blue (#1d76db) | User interface improvements |
| `category-performance` | Purple (#5319e7) | Performance optimizations |
| `category-feature` | Green (#0e8a16) | New feature additions |
| `category-parser` | Light Purple (#d4c5f9) | Parser-specific enhancements |
| `category-dev-experience` | Light Orange (#f9d0c4) | Developer experience improvements |
| `category-testing` | Light Blue (#c5def5) | Testing improvements |

**Rules:**
- Issues can have MULTIPLE category labels if they span concerns
- Use categories to filter work by domain (UI, performance, etc.)

### Effort Labels

Effort estimates help with resource planning:

| Label | Color | Description | Typical Duration |
|-------|-------|-------------|------------------|
| `effort-small` | Light Green (#c2e0c6) | Small effort | 1-3 days |
| `effort-medium` | Light Yellow (#fef2c0) | Medium effort | 1-3 weeks |
| `effort-large` | Light Orange (#f9d0c4) | Large effort | 1+ months |

**Rules:**
- Every issue should have exactly ONE effort label
- Re-estimate as you learn more about scope
- Consider breaking large efforts into smaller issues

### Status Labels

Status tracks workflow state:

| Label | Color | Description |
|-------|-------|-------------|
| `status-blocked` | Light Red (#e99695) | Blocked by dependencies or decisions |
| `status-in-progress` | Light Blue (#c5def5) | Currently being worked on |
| `status-needs-design` | Light Purple (#d4c5f9) | Needs design/architecture work |
| `status-needs-review` | Yellow (#fbca04) | Ready for review |

**Rules:**
- Status labels are OPTIONAL (only use when relevant)
- Add/remove as the issue progresses
- Use `status-blocked` with a comment explaining what's blocking

### Special Labels

Special labels mark important attributes:

| Label | Color | Description |
|-------|-------|-------------|
| `roadmap` | Dark Blue (#0052cc) | Part of the official roadmap |
| `post-rollout` | Light Red (#e99695) | To be done after custom parser 100% rollout |
| `enhancement` | Default | New feature or request |
| `bug` | Default | Something isn't working |
| `documentation` | Default | Improvements to documentation |

**Rules:**
- `roadmap` indicates this is planned for near-term implementation
- `post-rollout` marks work that depends on custom parser completion
- GitHub's default labels (`bug`, `enhancement`, etc.) are still used

## Issue Templates

### Enhancement Template

Use this template for feature requests and improvements:

```markdown
## Summary
[1-2 sentence description of what this enhancement does]

## Priority
[🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low] - [One-line justification]

## Effort
[Small / Medium / Large] ([time estimate])

## Current Status
[Not Started / Partially Implemented / Blocked]

## Problem
[What problem does this solve? Why is it needed?]

## Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

## Implementation Notes
- [Technical approach]
- [Files to modify]
- [Dependencies or prerequisites]
- [Potential challenges]

## Expected Benefits
- [Benefit 1]
- [Benefit 2]

## Related
[Links to related issues, PRs, or docs]
```

**Example labels:** `priority-high`, `category-ui`, `effort-small`, `enhancement`, `roadmap`

### Bug Template

Use this template for bug reports:

```markdown
## Summary
[1-2 sentence description of the bug]

## Priority
[🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low] - [Impact description]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Extension version: [version]
- Browser: [Chrome version]
- OS: [macOS / Windows / Linux version]
- JSON size: [if relevant]

## Screenshots
[If applicable]

## Error Messages
```
[Error logs or console output]
```

## Additional Context
[Any other relevant information]
```

**Example labels:** `priority-critical`, `category-parser`, `bug`

### Documentation Template

Use this template for documentation improvements:

```markdown
## Summary
[What documentation needs to be added or improved?]

## Priority
[🟠 High / 🟡 Medium / 🟢 Low]

## Current State
[What's currently documented or missing?]

## Proposed Changes
- [Change 1]
- [Change 2]

## Audience
[Who is this documentation for? Users, developers, contributors?]

## Files to Update
- [docs/file1.md]
- [docs/file2.md]
```

**Example labels:** `priority-medium`, `documentation`, `effort-small`

## Prioritization Process

### How We Prioritize

Issues are prioritized using this formula:

```
Priority Score = (Impact × User Demand) / (Effort × Maintenance Burden)
```

**Factors:**
- **Impact:** How much value does it provide? (1-10)
- **User Demand:** How many users want this? (1-10)
- **Effort:** How complex is the implementation? (1-10)
- **Maintenance:** What's the long-term cost? (1-10)

**Higher score = Higher priority**

### Priority Tiers

**🔴 Critical (Immediate)**
- Security vulnerabilities
- Data loss bugs
- Extension crashes or complete breakage
- **Action:** Fix immediately, release ASAP

**🟠 High (This Month)**
- Major UX problems affecting many users
- Important feature requests with clear value
- Significant bugs impacting core functionality
- **Action:** Plan for current sprint or next release

**🟡 Medium (This Quarter)**
- Nice-to-have features
- Quality improvements
- Minor bugs or edge cases
- **Action:** Add to backlog, prioritize based on capacity

**🟢 Low (Someday)**
- Polish and refinements
- Long-term improvements
- Platform expansion (cross-browser, mobile)
- **Action:** Keep in backlog, revisit periodically

### Re-prioritization

We re-prioritize issues when:
- **User feedback changes** - Many users request a low-priority item
- **Dependencies resolve** - A blocked issue becomes unblocked
- **Business needs shift** - Strategic direction changes
- **New information emerges** - We learn more about impact or effort

**Process:**
1. Comment on the issue explaining the priority change
2. Update the priority label
3. Update the issue description if needed

## What to Work On Next

### For Human Developers

**Quick Guide:**
1. Filter issues by `status-in-progress` to see what's currently being worked on
2. Filter by `priority-high` + `roadmap` to see planned work
3. Choose issues that match your skills and available time
4. Comment on the issue to claim it, then add `status-in-progress` label

**Recommended Workflow:**
1. Start with `priority-critical` issues (should be rare)
2. Then work on `priority-high` + `roadmap` issues
3. Balance quick wins (`effort-small`) with impactful work (`priority-high`)
4. Consider your expertise (filter by `category-*` labels)

### For AI Tools (Claude Code, GitHub Copilot, etc.)

AI tools should use this logic to determine what to work on:

```python
# Pseudocode for AI priority selection
def select_next_issue():
    # 1. Critical issues always take precedence
    critical_issues = filter(priority='critical', status!='in-progress')
    if critical_issues:
        return critical_issues[0]

    # 2. High-priority roadmap items
    roadmap_issues = filter(priority='high', label='roadmap', status!='in-progress')
    if roadmap_issues:
        return roadmap_issues[0]

    # 3. Quick wins (high impact, low effort)
    quick_wins = filter(priority='high', effort='small', status!='in-progress')
    if quick_wins:
        return quick_wins[0]

    # 4. Medium priority based on effort
    medium_issues = filter(priority='medium', status!='in-progress')
    return sort_by_effort(medium_issues)[0]  # Prefer smaller effort
```

**AI Selection Criteria:**
- Always check if issue is already `status-in-progress` (skip if yes)
- Prefer issues with clear implementation notes
- Consider dependencies (check "Related" section)
- Balance between quick wins and high-impact work

### GitHub Search Queries

**Find next high-priority work:**
```
is:issue is:open label:priority-high label:roadmap -label:status-in-progress sort:updated-desc
```

**Find quick wins:**
```
is:issue is:open label:priority-high label:effort-small -label:status-in-progress
```

**Find blocked issues:**
```
is:issue is:open label:status-blocked
```

**Find issues ready for review:**
```
is:issue is:open label:status-needs-review
```

**Find issues by category (example: UI work):**
```
is:issue is:open label:category-ui -label:status-in-progress sort:priority-desc
```

## Best Practices

### Creating Issues

✅ **DO:**
- Use descriptive titles (avoid "Fix bug" or "Add feature")
- Include clear reproduction steps for bugs
- Add relevant labels (priority, category, effort)
- Reference related issues and PRs
- Include code samples, screenshots, or examples
- Keep scope focused (split large issues into smaller ones)

❌ **DON'T:**
- Create duplicate issues (search first!)
- Mix multiple unrelated requests in one issue
- Use vague descriptions ("Make it better")
- Skip the template fields
- Forget to add labels

### Working on Issues

✅ **DO:**
- Comment before starting work (claim the issue)
- Add `status-in-progress` label when you start
- Update the issue with progress or blockers
- Link your PR to the issue (use "Fixes #123" in PR description)
- Update labels if scope or effort changes

❌ **DON'T:**
- Start work without commenting (avoid duplicated effort)
- Leave issues in `status-in-progress` indefinitely
- Silently abandon work (update issue if you stop)

### Closing Issues

✅ **DO:**
- Close via PR merge (use "Fixes #123")
- Add a comment explaining the resolution
- Verify the fix is deployed/released
- Update related issues if needed

❌ **DON'T:**
- Close without explanation
- Close because "it's too hard" (re-label or split instead)
- Leave related issues dangling

## Roadmap Management

### Official Roadmap

Issues labeled with `roadmap` are part of the official plan. This means:
- They're planned for implementation in the near term (1-3 months)
- They align with project goals and strategy
- They have clear requirements and scope

**Adding to Roadmap:**
1. Issue must have `priority-high` or `priority-medium`
2. Issue must have clear implementation plan
3. Issue must align with project direction
4. Add `roadmap` label and update project board

### Milestones

We use GitHub Milestones to group related work:

**Example Milestones:**
- `v1.5.0 - Search & Filter` (groups all search-related issues)
- `v2.0.0 - Cross-Browser Support` (groups Firefox/Edge work)
- `Post-Rollout Cleanup` (groups post-rollout issues)

**Benefits:**
- Track progress toward a release
- See all related work in one view
- Set target dates for releases

## Integration with Development Workflow

### Issue → Branch → PR → Merge

1. **Create or claim issue**
   - Add comment: "Working on this"
   - Add `status-in-progress` label

2. **Create feature branch**
   ```bash
   git checkout -b fix/issue-123-description
   # or
   git checkout -b feature/issue-456-description
   ```

3. **Develop and test**
   - Make changes
   - Write tests
   - Update docs

4. **Create Pull Request**
   - Title: "Fix: Description (#123)" or "Feature: Description (#456)"
   - Body: "Fixes #123" (auto-closes issue on merge)
   - Add relevant labels
   - Request review

5. **Merge and verify**
   - Issue auto-closes
   - Remove `status-in-progress`
   - Verify in production

## Migration from FUTURE_ENHANCEMENTS.md

**Previous Approach:**
- Maintained docs/FUTURE_ENHANCEMENTS.md with enhancement list
- Used custom codes (UI-*, PERF-*, etc.)
- Reorganized and re-numbered frequently

**New Approach:**
- All enhancements tracked as GitHub Issues
- Use GitHub issue numbers for references (e.g., #123)
- Labels replace priority sections
- Comments replace changelog entries

**Benefits:**
- No more merge conflicts in FUTURE_ENHANCEMENTS.md
- Better collaboration with comments and mentions
- Easier for external contributors
- AI tools can query GitHub API directly
- Clear audit trail of decisions

## Tools and Automation

### GitHub CLI (`gh`)

**List high-priority issues:**
```bash
gh issue list --label priority-high --label roadmap
```

**Create new issue:**
```bash
gh issue create --title "Fix parser bug" --body "Description..." --label bug,priority-high
```

**Add label to issue:**
```bash
gh issue edit 123 --add-label status-in-progress
```

### GitHub API

AI tools can use the GitHub API to query issues programmatically:

```bash
# Get high-priority roadmap issues
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/phoenix-abi/json-formatter/issues?labels=priority-high,roadmap&state=open"
```

### Project Boards

Consider using GitHub Projects for visual planning:
- **Kanban board:** Todo → In Progress → Review → Done
- **Roadmap view:** Group by milestone or priority
- **Sprint planning:** Filter by iteration

## Questions?

If you have questions about this issue management process:

1. Check existing issues for similar questions
2. Review [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for development workflow
3. Open a discussion in GitHub Discussions
4. Reach out to maintainers

## Version History

- **2025-12-26:** Initial version, migrated from FUTURE_ENHANCEMENTS.md
