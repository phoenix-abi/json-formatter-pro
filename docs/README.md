# Documentation Index

Welcome to the JSON Formatter Pro extension documentation. This directory contains comprehensive guides for users, developers, and contributors.

---

## 📚 For New Contributors

Start here if you're new to the codebase:

1. **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Comprehensive contributor guide
   - Architecture overview
   - Key files and reading order
   - Security and privacy considerations
   - Build, test, and run instructions
   - Next steps and improvement ideas

2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture documentation
   - System architecture and pipeline
   - Integration contract (parser/renderer separation)
   - Virtual scrolling renderer (Phase I)
   - Custom streaming parser (Phase II)
   - Parser selection system
   - Performance characteristics
   - File organization and testing strategy

3. **[STYLE_GUIDE.md](STYLE_GUIDE.md)** - Token-based theme system documentation
   - Theme structure and CSS layers
   - Color tokens and design system
   - How to modify themes

---

## 👥 For End Users

4. **[USER_GUIDE.md](USER_GUIDE.md)** - User-facing documentation
   - Getting started guide
   - Feature overview (parsers, themes, options)
   - Troubleshooting and FAQ
   - Privacy and security information

---

## 🛠️ Development Guides

5. **[OPTIMIZATION_PLAYBOOK.md](OPTIMIZATION_PLAYBOOK.md)** - Performance workflow
   - Step-by-step optimization process
   - Profiling and benchmarking
   - Hot path guidelines
   - Performance testing commands

6. **[PARSER_INTEGRATION_TESTING.md](PARSER_INTEGRATION_TESTING.md)** - Manual testing guide
   - Test scenarios for parser selection
   - UI integration testing
   - Performance validation
   - Edge case testing

7. **[VISUAL_PARITY_TESTING.md](VISUAL_PARITY_TESTING.md)** - Renderer parity testing
   - Visual comparison procedures
   - Test fixtures and scenarios
   - Regression testing checklist

---

## 🚀 Rollout and Future Plans

8. **[ROLLOUT_PLAN.md](ROLLOUT_PLAN.md)** - Gradual rollout strategy
   - Feature flag system
   - 3-phase rollout (10% → 50% → 100%)
   - Success criteria and monitoring
   - Rollback procedures

9. **[ISSUE_GUIDE.md](ISSUE_GUIDE.md)** - GitHub Issues management guide
   - Label system documentation (priority, category, effort, status)
   - Issue templates (enhancements, bugs, documentation)
   - Prioritization process and criteria
   - What to work on next (for developers and AI tools)
   - Best practices for creating and managing issues

10. **[FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md)** - Historical roadmap (migrated to GitHub Issues)
   - Points to GitHub Issues for current planning
   - Historical context and migration notes
   - Quick links to issue queries

---

## 🗂️ Documentation Categories

### Essential Reading (Start Here)
- DEVELOPER_GUIDE.md
- ARCHITECTURE.md
- USER_GUIDE.md

### Development Guides
- OPTIMIZATION_PLAYBOOK.md
- STYLE_GUIDE.md
- PARSER_INTEGRATION_TESTING.md
- VISUAL_PARITY_TESTING.md

### Planning and Future
- ROLLOUT_PLAN.md
- ISSUE_GUIDE.md
- FUTURE_ENHANCEMENTS.md (historical)

---

## 🔍 Quick Reference

### I want to...

**...understand the codebase**
→ Start with [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

**...understand the architecture**
→ Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design, integration contract, and performance characteristics

**...add a new feature**
→ Read [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md), check [GitHub Issues](https://github.com/phoenix-abi/json-formatter-pro/issues), see [ISSUE_GUIDE.md](ISSUE_GUIDE.md) for workflow, follow [OPTIMIZATION_PLAYBOOK.md](OPTIMIZATION_PLAYBOOK.md) for performance

**...modify themes or styles**
→ Read [STYLE_GUIDE.md](STYLE_GUIDE.md)

**...optimize performance**
→ Follow [OPTIMIZATION_PLAYBOOK.md](OPTIMIZATION_PLAYBOOK.md)

**...understand the rollout strategy**
→ Read [ROLLOUT_PLAN.md](ROLLOUT_PLAN.md)

**...help users with issues**
→ Read [USER_GUIDE.md](USER_GUIDE.md) (Troubleshooting section)

**...know what's next**
→ Check [GitHub Issues](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aroadmap) (see [ISSUE_GUIDE.md](ISSUE_GUIDE.md) for prioritization)

---

## 📝 Contributing to Documentation

When contributing to this project:

1. **Update documentation** alongside code changes
2. **Keep docs in sync** with implementation
3. **Add new guides** for significant features
4. **Follow the existing structure** for consistency
5. **Use clear headings** and **examples**

### Documentation Standards

- Use Markdown for all documentation
- Include a last-updated date at the top
- Use clear, concise language
- Provide code examples where helpful
- Link to related documents
- Keep file names descriptive and consistent

---

## 🏷️ Status Indicators

Throughout these documents, you'll see status indicators:

- ✅ **Complete** - Fully implemented and tested
- 🚀 **Ready** - Implementation complete, awaiting rollout
- 🟡 **In Progress** - Currently being implemented
- 🔴 **Blocked** - Waiting on dependencies or decisions
- 📋 **Planned** - Defined but not started
- 🔮 **Future** - Possible future enhancement

---

## 📄 Document History

- **2025-12-26:** Migrated to GitHub Issues for planning
  - Created ISSUE_GUIDE.md with comprehensive GitHub Issues workflow
  - Migrated 36 enhancements from FUTURE_ENHANCEMENTS.md to GitHub Issues (#8-43)
  - Created multi-dimensional label system (priority, category, effort, status)
  - Updated FUTURE_ENHANCEMENTS.md to redirect to GitHub Issues
  - Added ISSUE_GUIDE.md to documentation index

- **2025-12-25:** Major documentation reorganization
  - Renamed DEVELOPER_WALKTHROUGH.md → DEVELOPER_GUIDE.md
  - Created consolidated ARCHITECTURE.md (replaces UNIFIED_RENDERING_PLAN.md, PREACT_VIRTUAL_SCROLLING_PLAN.md, CUSTOM_PARSER_PLAN.md)
  - Created FUTURE_ENHANCEMENTS.md with prioritized roadmap
  - Removed planning/progress docs (CUSTOM_PARSER_*, WEEK*, *ROUND*, MEMORY_*, PARSER_SELECTION_*)
  - Created this README.md as documentation index
  - Streamlined to 10 core documents focused on current implementation

---

## 🤝 Getting Help

If you have questions about any of these documents:

1. Check the relevant doc's table of contents
2. Search for keywords in the doc
3. Review related documents (check "See also" sections)
4. Open an issue on GitHub with your question
5. Tag the issue with `documentation` label

---

## 📦 Assets

- **GitHubSettings.png** - Screenshot of GitHub UI design system (reference for component styling)
