# JSON Formatter Pro User Guide

**Version:** 1.5.0
**Last Updated:** 2025-12-25

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [Parser Selection](#parser-selection)
5. [ExactJSON Options](#exactjson-options)
6. [Theme Settings](#theme-settings)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)
10. [Privacy and Security](#privacy-and-security)

---

## Introduction

JSON Formatter Pro is a Chrome extension that automatically formats JSON when displayed in browser tabs. It provides:

- **Syntax highlighting** with colors for keys, strings, numbers, booleans, and null
- **Collapsible trees** to explore deeply nested structures
- **Dark and light themes** that follow your system preference
- **Two parser options** - Native (fast) and Custom (lossless, preserves order)
- **Developer tools** - Access parsed JSON via `window.json` in the console

**What's New in Version 1.5.0:**
- 🚀 Custom parser with lossless number handling
- 🔑 Key order preservation (see keys exactly as in source)
- 🛠️ Tolerant parsing mode (recover from minor errors)
- 📊 Virtual scrolling for 100MB+ JSON files
- 🎨 Updated toolbar UI with parser selection

---

## Getting Started

### Installation

1. **Install from Chrome Web Store:**
   - Visit the [JSON Formatter Pro page](https://chrome.google.com/webstore) (link TBD)
   - Click "Add to Chrome"
   - Confirm permissions

2. **Load Unpacked (Developers):**
   - Download or clone the repository
   - Run `npm install && npm run build`
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

### First Use

1. **Open a JSON file or API response in Chrome**
   - The extension automatically detects JSON pages
   - Pages with a single `<pre>` tag containing valid JSON are formatted

2. **Toggle between Raw and Parsed views**
   - Click "Raw" to see the original JSON
   - Click "Parsed" to see the formatted tree view

3. **Collapse/Expand nodes**
   - Click the ▶ (expand) or ▼ (collapse) icons
   - Works for objects and arrays

4. **Access JSON in console**
   - Open DevTools (F12)
   - Type `json` in the console
   - The parsed JSON object is available as `window.json`

---

## Features

### Syntax Highlighting

**Color-coded JSON elements:**
- **Keys:** Blue text (e.g., `"name"`)
- **Strings:** Green text (e.g., `"John Doe"`)
- **Numbers:** Purple text (e.g., `42`, `3.14`)
- **Booleans:** Orange text (`true`, `false`)
- **Null:** Gray text (`null`)
- **URLs:** Blue underlined links (clickable)

**Example:**
```json
{
  "name": "John Doe",      ← Blue key, green string
  "age": 30,               ← Blue key, purple number
  "active": true,          ← Blue key, orange boolean
  "website": "https://example.com"  ← Blue key, clickable link
}
```

### Collapsible Trees

**Navigate large JSON structures:**
- Click ▶ to expand a collapsed node
- Click ▼ to collapse an expanded node
- Collapsed nodes show a preview (e.g., `{...}` or `[...]`)

**Example:**
```
▼ Object (3 keys)
  ├─ name: "John Doe"
  ├─ age: 30
  └▶ address: {...}      ← Click to expand
```

### Virtual Scrolling

**Handle large files efficiently:**
- Renders only visible elements (not all 100k+ nodes)
- Smooth scrolling even for 100MB JSON files
- Memory overhead stays constant regardless of JSON size

**When it helps:**
- Large API responses (> 1MB)
- Database exports (> 10MB)
- Log files in JSON format (> 100MB)

**Automatic:** Virtual scrolling is enabled by default. No configuration needed.

---

## Parser Selection

JSON Formatter Pro provides **two parser options:**

### 1. Native Parser (Default)

**What it is:**
- Uses JavaScript's built-in `JSON.parse()`
- Fast and battle-tested

**Pros:**
- ✅ **Fast:** 4-11x faster than custom parser
- ✅ **Reliable:** Industry standard, widely tested
- ✅ **Low memory:** Minimal overhead

**Cons:**
- ❌ **Lossy numbers:** Large integers lose precision (> 2^53)
- ❌ **Reordered keys:** Numeric keys appear first (V8 behavior)
- ❌ **Strict:** Throws errors for malformed JSON

**Best for:**
- Most JSON files (< 10MB)
- When speed matters
- When precision loss is acceptable

**Example precision loss:**
```json
Input:  {"id": 9007199254740993}
Native: {"id": 9007199254740992}  ← Lost precision!
```

### 2. ExactJSON (Beta)

**What it is:**
- Custom-built parser with advanced features
- Preserves exact source representation

**Pros:**
- ✅ **Lossless numbers:** No precision loss (see options below)
- ✅ **Key order preservation:** Keys in exact source order
- ✅ **Tolerant mode:** Recover from minor errors
- ✅ **Source positions:** Track where each value came from

**Cons:**
- ❌ **Slower:** 4-11x slower than native (absolute times still fast)
- ❌ **Higher memory:** 4-5x file size overhead
- ❌ **Beta:** Newer, less battle-tested

**Best for:**
- JSON with large integers (IDs, timestamps)
- When key order matters (diffs, comparisons)
- Debugging malformed JSON (tolerant mode)

**Example key order preservation:**
```json
Input:  {"100": 1, "2": 2, "30": 3}
Native: {"2": 2, "30": 3, "100": 1}  ← Reordered by V8
Custom: {"100": 1, "2": 2, "30": 3}  ← Exact source order!
```

### How to Choose a Parser

**Open the Options page:**
1. Right-click the extension icon
2. Click "Options"
3. Or navigate to `chrome://extensions` → JSON Formatter Pro → "Options"

**Select a parser:**
- **Native Parser:** Default, fast, lossy
- **ExactJSON:** Lossless, preserves order, slower

**Recommendation:**
- Use **Native** for most JSON files
- Use **Custom** when:
  - JSON has large integers (> 2^53)
  - Key order matters (e.g., API comparisons)
  - You need to debug malformed JSON

---

## ExactJSON Options

When using the **Custom Parser**, you can configure additional options:

### Number Mode

**Controls how numbers are parsed:**

**1. Native (Default)**
- Parse as JavaScript `Number` (standard behavior)
- **Precision:** Safe up to 2^53 (9,007,199,254,740,992)
- **Range:** ±1.7976931348623157e+308

**2. BigInt**
- Parse integers as `BigInt` (arbitrary precision)
- **Precision:** Unlimited for integers
- **Range:** Unlimited
- **Note:** Decimals still use `Number`

**Example:**
```json
Input: {"id": 9007199254740993}
Native: 9007199254740992  ← Lost precision
BigInt: 9007199254740993n ← Exact!
```

**3. Decimal (Future)**
- Parse all numbers as `Decimal` objects
- **Precision:** Arbitrary precision for decimals
- **Range:** Configurable
- **Status:** Planned for future release

**4. String**
- Parse numbers as strings (no conversion)
- **Precision:** Exact (no loss)
- **Range:** Unlimited
- **Use case:** Debugging, precision-critical applications

**Example:**
```json
Input: {"price": 19.99}
Native: 19.99             ← May have floating-point errors
String: "19.99"           ← Exact string representation
```

### Tolerant Mode

**Allow the parser to recover from minor errors:**

**When enabled:**
- Trailing commas are ignored (e.g., `{"a":1,}`)
- Missing commas may be recovered
- Malformed values may be replaced with `null`

**When disabled (Default):**
- Strict JSON parsing (RFC 8259 compliant)
- Throws errors for invalid JSON

**Example:**
```json
Input (with trailing comma):
{"name": "John", "age": 30,}

Strict mode:  Error: Unexpected token ','
Tolerant mode: {"name": "John", "age": 30}  ← Recovered!
```

**Note:** Tolerant mode has limitations:
- Tokenizer-level errors (unquoted keys, single quotes) still throw
- Parser-level errors (trailing commas, missing values) may be recovered

**Recommendation:**
- Use **Strict mode** for most JSON (default)
- Use **Tolerant mode** when debugging malformed JSON from logs or APIs

### Advanced Options

**Max Depth:**
- Limit nesting depth to prevent stack overflow
- **Default:** 1000 levels
- **Range:** 10 - 10000
- **Use case:** Protect against malicious deeply-nested JSON

**Max Key Length:**
- Limit object key length to prevent DoS attacks
- **Default:** 10,000 characters
- **Range:** 100 - 100,000
- **Use case:** Prevent memory exhaustion from very long keys

**Max String Length:**
- Limit string value length to prevent memory exhaustion
- **Default:** 10,000,000 characters (10MB)
- **Range:** 1,000 - 100,000,000
- **Use case:** Prevent browser crashes from huge strings

**Recommendation:** Keep defaults unless you have specific requirements.

---

## Theme Settings

JSON Formatter Pro supports **three theme modes:**

### 1. System (Default)

**Follows your operating system theme:**
- Light theme during the day
- Dark theme at night
- Automatically updates when system theme changes

**How it works:**
- Uses CSS `@media (prefers-color-scheme: dark)`
- No manual switching needed

### 2. Light Theme

**Force light theme regardless of system preference:**
- White background
- Dark text
- Blue/green/purple syntax highlighting

**Best for:**
- Bright environments
- Printing JSON
- Personal preference

### 3. Dark Theme

**Force dark theme regardless of system preference:**
- Dark gray background (#1e1e1e)
- Light text
- Bright syntax highlighting

**Best for:**
- Low-light environments
- Reducing eye strain
- Matching other developer tools

### How to Change Theme

**Open the Options page:**
1. Right-click the extension icon → "Options"
2. Find the "Theme" section
3. Select: System, Light, or Dark

**Changes apply immediately** to all open JSON tabs.

---

## Keyboard Shortcuts

**Currently, keyboard shortcuts are not configured** but may be added in a future release.

**Potential shortcuts (vote on GitHub!):**
- `Ctrl+E` - Collapse all
- `Ctrl+Shift+E` - Expand all
- `Ctrl+R` - Toggle Raw/Parsed
- `Ctrl+Shift+C` - Copy JSON to clipboard

---

## Troubleshooting

### Extension Not Formatting JSON

**Problem:** Page loads but JSON is not formatted.

**Possible causes:**
1. **Not a JSON page:**
   - Extension only formats pages with a single `<pre>` tag containing JSON
   - HTML pages with embedded JSON are not supported

2. **Invalid JSON:**
   - JSON must be valid (no trailing commas, unquoted keys, etc.)
   - Try enabling "Tolerant mode" in ExactJSON options

3. **JSON too large:**
   - Maximum size: 3,000,000 characters (configurable in code)
   - Split large JSON into smaller chunks

4. **Content-Type mismatch:**
   - Server must send `Content-Type: application/json` header
   - Or page must contain JSON in a `<pre>` tag

**Solution:**
- Check console for errors (F12 → Console tab)
- Try copy-pasting JSON into https://jsonformatter.org to validate
- File a bug report on GitHub with a minimal example

### Slow Performance

**Problem:** Extension is slow or freezes the browser.

**Possible causes:**
1. **Large JSON file:**
   - Custom parser is 4-11x slower than native
   - Files > 10MB may take several seconds

2. **Deep nesting:**
   - JSON with 500+ levels of nesting is slow to render
   - Virtual scrolling helps but parser is still slow

3. **Many keys/items:**
   - Objects with 100k+ keys are slow to parse
   - Arrays with 1M+ items are slow to render

**Solutions:**
- **Switch to Native parser** (Options → Parser Selection → Native)
- **Reduce JSON size** (filter API responses on server-side)
- **Use virtual scrolling** (enabled by default)
- **Increase maxDepth limit** (Options → Advanced → Max Depth)

### Numbers Show Wrong Values

**Problem:** Large integers display incorrectly.

**Example:**
```json
Expected: 9007199254740993
Actual:   9007199254740992
```

**Cause:** Native parser loses precision for numbers > 2^53.

**Solution:**
- **Switch to Custom parser** with **BigInt mode**
   1. Options → Parser Selection → ExactJSON
  2. Options → Number Mode → BigInt
  3. Reload JSON page

### Keys Are Reordered

**Problem:** Object keys appear in different order than source.

**Example:**
```json
Source: {"100": 1, "2": 2, "30": 3}
Shown:  {"2": 2, "30": 3, "100": 1}
```

**Cause:** V8 engine reorders numeric keys (JavaScript standard behavior).

**Solution:**
- **Switch to Custom parser**
   1. Options → Parser Selection → ExactJSON
  2. Reload JSON page
  3. Keys will appear in exact source order

### Extension Crashes Browser

**Problem:** Browser tab crashes when viewing JSON.

**Possible causes:**
1. **Very large JSON (> 100MB):**
   - May exceed browser memory limits
   - Virtual scrolling helps but can't prevent OOM

2. **Infinite recursion:**
   - JSON with circular references (should be impossible in valid JSON)

**Solutions:**
- **Use smaller JSON files** (< 100MB recommended)
- **Disable virtual scrolling** (not recommended, but possible via feature flags)
- **Report crash** on GitHub with JSON sample (if < 10MB)

### "Tolerant Mode" Not Working

**Problem:** Malformed JSON still throws errors even with tolerant mode enabled.

**Cause:** Tolerant mode only handles parser-level errors (trailing commas, missing values), not tokenizer-level errors (unquoted keys, single quotes).

**Examples:**
```json
✅ Tolerant mode handles:
{"a": 1,}        ← Trailing comma
{"a": 1 "b": 2}  ← Missing comma

❌ Tolerant mode does NOT handle:
{a: 1}           ← Unquoted key (tokenizer error)
{'a': 1}         ← Single quotes (tokenizer error)
```

**Solution:**
- **Fix JSON manually** if tolerant mode doesn't help
- **File a feature request** on GitHub for tokenizer-level tolerance

---

## FAQ

### Q: What is the difference between Native and Custom parser?

**A:** Native parser uses JavaScript's built-in `JSON.parse()` (fast, lossy). Custom parser is built from scratch with lossless numbers and key order preservation (slower, precise).

**Recommendation:** Use Native for most JSON, switch to Custom when precision or key order matters.

---

### Q: Why are my large integers showing wrong values?

**A:** JavaScript `Number` type loses precision for integers > 2^53 (9,007,199,254,740,992). Switch to Custom parser with BigInt mode to preserve exact values.

---

### Q: Can I format JSON on a website (not just standalone JSON files)?

**A:** Currently, the extension only formats pages with a single `<pre>` tag containing JSON. HTML pages with embedded JSON are not supported.

**Workaround:**
- Copy JSON from website
- Open a new tab and paste into address bar: `data:application/json,{"key":"value"}`
- Or use an online formatter like https://jsonformatter.org

---

### Q: Does the extension send my JSON data to a server?

**A:** **No.** All parsing and formatting happens locally in your browser. The extension does not send any data to external servers. See [Privacy and Security](#privacy-and-security) for details.

---

### Q: Can I copy JSON to clipboard?

**A:** Not currently, but planned for a future release. Vote for this feature on GitHub!

**Workaround:**
- Click "Raw" button
- Select all (Ctrl+A)
- Copy (Ctrl+C)

---

### Q: How do I report a bug or request a feature?

**A:**
1. **GitHub Issues:** https://github.com/phoenix-abi/json-formatter-pro/issues (recommended)
2. **Chrome Web Store Reviews:** Leave a detailed review
3. **Email:** support@example.com (if private/sensitive issue)

**When reporting bugs, please include:**
- Extension version (check `chrome://extensions`)
- Browser version (Chrome/Firefox/Edge)
- Sample JSON (if < 10KB and not sensitive)
- Steps to reproduce
- Screenshot or console errors

---

### Q: Can I contribute to the project?

**A:** Yes! The project is open source. See [DEVELOPER_WALKTHROUGH.md](../DEVELOPER_WALKTHROUGH.md) for contributor guidelines.

**Ways to contribute:**
- Fix bugs
- Add features
- Write tests
- Improve documentation
- Report issues

---

## Privacy and Security

### What Data Does the Extension Access?

**JSON content on web pages:**
- The extension reads JSON content from pages you visit
- **Purpose:** To parse and format the JSON
- **Storage:** JSON is **never stored** or sent to external servers
- **Processing:** All parsing happens locally in your browser

**Browser storage (chrome.storage.local):**
- The extension stores your settings (theme, parser selection, options)
- **Purpose:** To remember your preferences across sessions
- **Storage:** Stored locally in your browser (not synced to cloud)
- **Data:** Parser type, theme, number mode, tolerant mode, max depth/key/string length

**No other data is accessed or collected.**

### Security Features

**XSS Prevention:**
- All JSON values are rendered using `textContent` (not `innerHTML`)
- Malicious script tags are displayed as plain text, not executed
- URLs are linkified but use safe attributes

**Prototype Pollution Prevention:**
- Parser uses array storage for object entries (not property assignment)
- `__proto__`, `constructor`, `prototype` keys are treated as regular keys
- No pollution of `Object.prototype` or `Array.prototype`

**DoS Prevention:**
- Maximum JSON length: 3,000,000 characters (configurable)
- Maximum nesting depth: 1000 levels (configurable)
- Maximum key length: 10,000 characters (configurable)
- Maximum string length: 10,000,000 characters (configurable)

**Security Testing:**
- 23 security audit tests (XSS, prototype pollution, DoS)
- 19 fuzz tests (random/malformed JSON, edge cases)
- Regular security reviews and updates

### Permissions Explanation

The extension requires the following permissions:

**`storage`:**
- To save your settings (theme, parser options)
- Does not sync to cloud (uses `chrome.storage.local`)

**`host_permissions: ["*://*/*"]`:**
- To access JSON on any website
- **Why needed:** Extension must read page content to detect and format JSON
- **What it means:** Extension can access all websites you visit
- **What we do:** Only reads pages with JSON, does nothing on other pages

**No other permissions are required.**

### Open Source

- **Source code:** https://github.com/phoenix-abi/json-formatter
- **License:** MIT (permissive open-source license)
- **Transparency:** All code is public and auditable

---

## Support

**Need help?**
- **Documentation:** Read this guide and [DEVELOPER_WALKTHROUGH.md](../DEVELOPER_WALKTHROUGH.md)
- **GitHub Issues:** https://github.com/phoenix-abi/json-formatter-pro/issues
- **Chrome Web Store:** Leave a review with your question
- **Email:** support@example.com

**We appreciate your feedback!**

---

## Version History

### Version 1.5.0 (2025-12-25)

**New Features:**
- 🚀 Custom parser with lossless number handling (BigInt, Decimal, String modes)
- 🔑 Key order preservation (exact source order)
- 🛠️ Tolerant parsing mode (recover from minor errors)
- 🎨 Updated toolbar UI with parser selection
- ⚙️ Custom parser options page (number mode, tolerant mode, advanced settings)

**Improvements:**
- 📊 Virtual scrolling for 100MB+ JSON files (already in 1.4.0)
- 🧪 Comprehensive security audit (23 tests)
- 🎯 Fuzz testing (19 tests, 100 random JSON structures)
- 📈 Performance benchmarks and regression gates

**Bug Fixes:**
- Fixed precision loss for large integers (use BigInt mode)
- Fixed key ordering for numeric keys (use Custom parser)

**Known Issues:**
- Custom parser is 4-11x slower than native (acceptable for most JSON)
- Tolerant mode has limited support (tokenizer-level errors still throw)

### Version 1.4.0 (Previous)

- Virtual scrolling for large files
- Preact renderer
- Theme system improvements

### Version 1.0.0 (Initial)

- Basic JSON formatting
- Syntax highlighting
- Collapsible trees
- Dark/light themes

---

## Feedback

**Love the extension?** ⭐ Rate us on the Chrome Web Store!

**Have suggestions?** 💡 Open a GitHub issue or discussion!

**Found a bug?** 🐛 Report it on GitHub with details!

**Want to contribute?** 🚀 See [DEVELOPER_WALKTHROUGH.md](../DEVELOPER_WALKTHROUGH.md)!

---

**Thank you for using JSON Formatter Pro!** 🙏
