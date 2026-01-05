# JSON Formatter Pro

<div align="center">

**Intelligent JSON viewer for Chrome with syntax highlighting, collapsible trees, and dual-parser architecture**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chrome.google.com/webstore/detail/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Version](https://img.shields.io/badge/version-1.5.0-blue)](#)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Development](#-development) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

JSON Formatter Pro is a Chrome extension that automatically formats JSON when displayed in browser tabs, providing an interactive and readable view of your data. Whether you're debugging APIs, reviewing configuration files, or exploring large datasets, JSON Formatter Pro makes it effortless.

### Why JSON Formatter Pro?

- 🚀 **Blazing Fast** - Handles files up to 100MB+ with virtual scrolling
- 🎨 **Beautiful UI** - Syntax highlighting with dark/light/system themes
- 🔍 **Dual Parser System** - Choose between speed (native) or precision (custom)
- 🔒 **Privacy First** - All processing happens locally, no data sent anywhere
- ⚡ **Zero Impact** - < 1ms overhead on non-JSON pages
- 🎯 **Lossless Numbers** - Preserve precision for large integers and decimals
- 📐 **Key Order Preservation** - See keys exactly as they appear in the source

---

## ✨ Features

### Core Features

- **Automatic Detection** - Instantly recognizes and formats JSON pages
- **Collapsible Trees** - Navigate nested structures with expand/collapse controls
- **Syntax Highlighting** - Color-coded keys, strings, numbers, booleans, and null values
- **Clickable URLs** - Automatically linkifies URLs in string values
- **Raw/Parsed Toggle** - Switch between formatted view and original JSON
- **Console Access** - Inspect JSON via `window.json` in DevTools
- **Theme Support** - Dark, light, and system-adaptive themes

### Advanced Features

- **Virtual Scrolling** - Render 100k+ nodes with smooth 60fps scrolling
- **Dual Parser Options**:
  - **Native Parser** - Fast, uses `JSON.parse()` (default)
  - **ExactJSON** - Lossless numbers, preserves key order, tolerant mode
- **Number Modes** - BigInt, Decimal, String for precision-critical applications
- **Tolerant Parsing** - Recover from common JSON errors (trailing commas, etc.)
- **URL Pattern Overrides** - Configure parser selection per domain

**Test it out:**  
[Example JSON documents](https://betterwebforall.com/json_formatter_pro/examples)

---

## 🚀 Installation

### Option 1: Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store page](https://chrome.google.com/webstore/detail/)
2. Click "Add to Chrome"
3. Confirm the installation

### Option 2: Install from Source

See [Development](#-development) section below.

---

## 💡 Usage

### Quick Start

1. **Open any JSON URL** in Chrome (e.g., API endpoint, `.json` file)
2. If this is the first time visiting the domain, open the extension popup menu and click the "Grant access to <site>" button.
3. The extension automatically detects and formats the JSON
4. **Expand/Collapse** nodes by clicking the ▶/▼ icons
5. **Toggle Raw/Parsed** using the toolbar buttons
6. **Access in Console** - Type `json` in DevTools to inspect the parsed object

### Parser Selection

**Native Parser (Default)** - Fast, suitable for most JSON
- ✅ 4-11x faster than ExactJSON
- ❌ May lose precision for numbers > 2^53
- ❌ Reorders numeric keys (V8 behavior)

**ExactJSON (Beta)** - Precision-focused
- ✅ Lossless number handling (BigInt/Decimal modes)
- ✅ Preserves exact key order from source
- ✅ Tolerant mode for malformed JSON
- ❌ 4-11x slower than native

**When to use ExactJSON:**
- JSON with large integers (IDs, timestamps > 2^53)
- When key order matters (diffs, comparisons)
- Debugging malformed JSON

**Change Parser:**
1. Right-click extension icon → Options
2. Select parser under "Parser Selection"
3. Reload JSON page

### Keyboard Shortcuts

Currently not configured, but planned for future releases.

---

## 🛠 Development

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+ or compatible package manager
- **Chrome** 88+ (for testing)

### Setup

```bash
# Clone the repository
git clone https://github.com/phoenix-abi/json-formatter-pro.git
cd json-formatter

# Install dependencies
npm install

# Build the extension
npm run build
```

### Development Commands

```bash
# Development mode (watch and rebuild on changes)
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run end-to-end tests
npm run test:e2e

# Update test fixtures/snapshots
npm run test:update

# Performance benchmarks
npm run perf:golden        # Quick iteration tests
npm run perf:compare       # Compare against baseline
npm run bundle:measure     # Measure bundle size

# Clean build artifacts
npm run clean
```

### Load Extension in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `dist/` folder from the project directory

### Project Structure

```
json-formatter/
├── src/
│   ├── content.ts              # Main content script
│   ├── set-json-global.ts      # window.json exporter
│   ├── background.ts           # Service worker
│   ├── manifest.json           # Chrome extension manifest
│   ├── components/             # Preact components
│   │   ├── JsonTreeView.tsx    # Main tree renderer
│   │   ├── JsonNode.tsx        # Single node renderer
│   │   ├── Toolbar.tsx         # UI toolbar
│   │   └── options/            # Options page components
│   ├── lib/
│   │   ├── getResult.ts        # JSON detection logic
│   │   ├── buildDom.ts         # DOM tree builder (legacy)
│   │   ├── parser/             # Custom parser implementation
│   │   ├── integration/        # Parser-renderer contract
│   │   ├── tree/               # Tree utilities
│   │   ├── storage.ts          # Chrome storage wrapper
│   │   └── featureFlags.ts     # Feature flag system
│   └── style.css               # Token-based theme system
├── tests/
│   ├── unit/                   # Unit tests
│   ├── e2e/                    # End-to-end tests
│   ├── perf/                   # Performance benchmarks
│   └── fixtures/               # Test fixtures with snapshots
├── docs/                       # Comprehensive documentation
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Test configuration
└── package.json
```

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

### For Users
- **[User Guide](docs/USER_GUIDE.md)** - Features, troubleshooting, FAQ, privacy

### For Developers
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Architecture overview, getting started
- **[Architecture](docs/ARCHITECTURE.md)** - Technical design, virtual scrolling, parser system
- **[Style Guide](docs/STYLE_GUIDE.md)** - Token-based theme system
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Test strategy and writing tests
- **[Optimization Playbook](docs/OPTIMIZATION_PLAYBOOK.md)** - Performance workflow

### Planning & Contributing
- **[Issue Guide](docs/ISSUE_GUIDE.md)** - GitHub Issues workflow, labels, prioritization
- **[Future Enhancements](docs/FUTURE_ENHANCEMENTS.md)** - Roadmap (migrated to GitHub Issues)
- **[Rollout Plan](docs/ROLLOUT_PLAN.md)** - Feature flag gradual rollout strategy

### Quick Links
- 📖 [Documentation Index](docs/README.md) - Start here for all docs
- 🐛 [Report a Bug](https://github.com/phoenix-abi/json-formatter-pro/issues/new?labels=bug)
- 💡 [Request a Feature](https://github.com/phoenix-abi/json-formatter-pro/issues/new?labels=enhancement)
- 📋 [View Roadmap](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aroadmap)

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or reporting issues, your help is appreciated.

### How to Contribute

1. **Fork the repository** on GitHub
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following our coding standards
4. **Run tests** to ensure nothing breaks (`npm test`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to your fork** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request** with a clear description

### Contribution Guidelines

- **Code Style** - Follow existing patterns, use TypeScript strict mode
- **Tests** - Add tests for new features, maintain test coverage
- **Performance** - PRs affecting hot paths must include performance analysis
- **Documentation** - Update relevant docs alongside code changes
- **Commits** - Write clear, descriptive commit messages
- **Security** - Never use `innerHTML` with user data, use `textContent`

### Areas We Need Help With

- 🐛 **Bug Fixes** - Check [open issues](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
- ✨ **Features** - See [enhancement issues](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
- 📝 **Documentation** - Improve guides, fix typos, add examples
- 🧪 **Testing** - Increase coverage, add edge cases
- 🌍 **Internationalization** - Help translate the extension

### Finding Work

**Good First Issues:**  
[View issues labeled `effort-small`](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aeffort-small)

**High Priority Work:**  
[View issues labeled `priority-high`](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Apriority-high)

See [ISSUE_GUIDE.md](docs/ISSUE_GUIDE.md) for complete details on our workflow.

---

## 🧪 Testing

The project has comprehensive test coverage:

- **762+ Unit Tests** - Parser, tree utilities, components, integration
- **Security Audits** - 23 XSS, prototype pollution, DoS tests
- **Fuzz Testing** - 19 tests with 100 random JSON structures
- **E2E Tests** - Large fixtures (1MB, 10MB, 100MB), toolbar, parser selection
- **Performance Benchmarks** - Regression gates, memory profiling

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- getResult
npm test -- buildDom

# Watch mode for development
npm test -- --watch
```

Tests use fixture-based snapshots stored in `tests/fixtures/*.html` with `<!-- EXPECT ... -->` comments.

---

## 🔒 Security & Privacy

### Privacy Commitment

- ✅ **100% Local Processing** - No data sent to external servers
- ✅ **No Telemetry** - We don't track or collect usage data
- ✅ **Open Source** - Full transparency, audit the code yourself
- ✅ **Minimal Permissions** - Only `storage` and host access for JSON formatting

### Security Features

- **XSS Prevention** - All user content rendered via `textContent`, never `innerHTML`
- **Prototype Pollution Prevention** - Array-based storage, no property assignment
- **DoS Protection** - Configurable limits (max depth, key length, string length)
- **Regular Audits** - 23 security tests run on every commit

### Permissions Explained

- **`storage`** - Save your theme and parser preferences locally
- **`host_permissions: ["*://*/*"]`** - Access JSON on any website you visit
  - Required to detect and format JSON pages
  - Extension only activates on pages containing JSON
  - No data collection or transmission

For more details, see [Privacy and Security](docs/USER_GUIDE.md#privacy-and-security) in the User Guide.

---

## 📊 Performance

### Benchmarks

| File Size | Nodes | Parse Time (Native) | Parse Time (Custom) | Initial Render | Memory |
|-----------|-------|---------------------|---------------------|----------------|--------|
| 1MB       | 10k   | 5ms                | 30ms (6x)          | 50ms           | 20MB   |
| 10MB      | 100k  | 50ms               | 400ms (8x)         | 80ms           | 30MB   |
| 50MB      | 500k  | 250ms              | 2000ms (8x)        | 150ms          | 50MB   |
| 100MB     | 1M    | 500ms              | 4000ms (8x)        | 300ms          | 80MB   |

### Performance Features

- **Virtual Scrolling** - Only renders visible nodes (50-100 on screen)
- **Lazy Expansion** - Defers rendering until nodes are expanded
- **Incremental Parsing** - Spreads work over multiple frames for large files
- **Early Bailout** - < 1ms overhead on non-JSON pages

---

## 🗺️ Roadmap

View our full roadmap on [GitHub Issues](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aroadmap).

### Current Focus (v1.6)

- [ ] Search/filter within JSON trees
- [ ] Copy path and value actions
- [ ] Keyboard shortcuts
- [ ] Export to CSV/XML
- [ ] Firefox support

### Future Enhancements

- [ ] JSON Schema validation
- [ ] Diff view for comparing JSON
- [ ] JSONPath query support
- [ ] Time-travel debugging
- [ ] Cloud sync for settings

See all [enhancement issues](https://github.com/phoenix-abi/json-formatter-pro/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement) for details.

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by the original JSON Formatter extensions
- Built with [Preact](https://preactjs.com/) for efficient rendering
- Bundled with [Vite](https://vitejs.dev/) for fast builds
- Tested with [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/)

---

## 📞 Support

- **Documentation** - [docs/](docs/)
- **Issues** - [GitHub Issues](https://github.com/phoenix-abi/json-formatter-pro/issues)
- **Discussions** - [GitHub Discussions](https://github.com/phoenix-abi/json-formatter-pro/discussions)
- **Website** - [betterwebforall.com/json_formatter_pro](https://betterwebforall.com/json_formatter_pro)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star on GitHub!

---

<div align="center">

**Made with ❤️ by the JSON Formatter Pro team**

[Report Bug](https://github.com/phoenix-abi/json-formatter-pro/issues/new?labels=bug) · [Request Feature](https://github.com/phoenix-abi/json-formatter-pro/issues/new?labels=enhancement) · [View Docs](docs/)

</div>
