### JSON Formatter Pro — CSS Style Guide

This document explains how `src/style.css` is organized, the design goals behind it, and how to safely extend or theme the UI. It also includes an accessibility checklist and a step‑by‑step guide for adding new themes.

#### Goals and Principles
- Visual parity with the original design in both light and dark modes.
- A single, token‑driven stylesheet (`style.css`) for all themes.
- Predictable cascade using CSS Cascade Layers.
- Accessibility-first: visible keyboard focus, respects user preferences (contrast, forced colors), and avoids color-only cues where practical.
- Minimal JS involvement in theming: the content script sets an attribute (`data-theme`) and the CSS handles the rest.

---

### File organization: `src/style.css`

The stylesheet is organized using CSS Cascade Layers in the following order (from lowest to highest):

1. tokens
2. themes
3. base
4. components
5. states

Layer order is declared once at the top:

```
@layer tokens, themes, base, components, states;
```

Each section is wrapped in `@layer <name> { ... }` to keep specificity and cascade predictable.

#### 1) tokens layer
- Declares semantic design tokens on `:root` for the light theme (defaults).
- Examples: `--bg`, `--fg`, `--btn-bg`, `--code-string`, `--border-subtle`, `--focus-ring`.
- Also sets `color-scheme: light dark;` on `:root` so form controls render appropriately in both modes.

Key rule of thumb: Components must consume tokens; do not hardcode raw colors in component rules.

#### 2) themes layer
- Provides overrides for tokens in different themes and user preference contexts.
  - Explicit dark: `:root[data-theme="dark"] { ... }`
  - System dark (when no explicit theme is chosen):
    ```
    @media (prefers-color-scheme: dark) { :root:not([data-theme]) { ... } }
    ```
  - Increased contrast: `@media (prefers-contrast: more) { :root { ... } }`
  - Windows High Contrast: `@media (forced-colors: active) { ... }`

Only token values change here. Components remain unchanged and pick up new values via `var(--token)`.

#### 3) base layer
- Document-wide defaults like `body { background: var(--bg); color: var(--fg); }` and foundational layout choices.

#### 4) components layer
- Structural and visual rules for JSON viewer elements (entries, caret/expander, collapsed annotations), the toolbar, and buttons.
- All colors/visuals should reference tokens.

#### 5) states layer
- Interactive states like `:hover`, `:active`, `.selected`, and `:focus-visible`.
- Organized separately to keep specificity and override order simple.

Global constructs like `@keyframes` that do not depend on layers can live outside any layer.

---

### Accessibility guidelines

- Focus indicators:
  - Use `:focus-visible` for meaningful keyboard focus rings.
  - The focus outline uses the `--focus-ring` token (defaults to `--accent`).
  - Suppress noisy `:focus` via `:focus:not(:focus-visible) { outline: 0; }` when appropriate.

- Contrast preferences:
  - Under `@media (prefers-contrast: more)`, strengthen subtle boundaries (e.g., `--border-subtle`) and focus color via `color-mix` while keeping semantics consistent.

- Forced colors (Windows High Contrast):
  - Respect system colors by using `Canvas`, `ButtonText`, etc., and opt out of UA substitution carefully with `forced-color-adjust: none` where needed.
  - Avoid decorative shadows that reduce readability in HC.

- Do not rely solely on color to convey meaning; use text, icons, or affordances (e.g., `.selected` styling includes background and shadow).

---

### Theming model

Themes are implemented by overriding tokens.

- Light theme: default token values in the `tokens` layer.
- Dark theme: token overrides in the `themes` layer under either:
  - `:root[data-theme="dark"]` (explicit), or
  - `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { ... } }` (system preference).

The content script (`src/content.ts`) sets `document.documentElement.dataset.theme` to control the explicit mode:

```
ForceLight -> data-theme="light"
ForceDark  -> data-theme="dark"
System     -> attribute removed (system preference applies)
```

No additional `<link>` elements are required; there is only one stylesheet.

---

### Adding a new theme

Example: Add a "solarized" theme.

1) CSS token overrides
   - In `src/style.css`, inside the `themes` layer, add a block:
     ```css
     @layer themes {
       :root[data-theme="solarized"] {
         /* Example values — adjust to your palette */
         --bg: #fdf6e3;
         --fg: #073642;
         --muted: #657b83;
         --border-subtle: #93a1a1;
         --accent: #268bd2; /* optional */

         --code-key: #586e75;
         --code-string: #2aa198;
         --code-number: #b58900;

         --btn-fg: #073642;
         --btn-bg: linear-gradient(#fbf2d6, #f3e8c2 40%, #eadfb5);
         --btn-border: #93a1a1;
         --btn-bg-hover: linear-gradient(#fff9ea, #f6edcf 40%, #eee3c2);
         --btn-bg-active: linear-gradient(#f5ebcf, #efe3c1 40%, #e6dab4);
         --btn-selected-bg: linear-gradient(#efe6c7, #e9ddba 40%, #e0d4ad);
         --btn-selected-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.2);

         /* any other token overrides as needed */
       }
     }
     ```
   - Do not modify component rules; they already consume tokens.

2) JavaScript integration (optional but typical)
   - If you want the popup to let users choose the new theme explicitly:
     - Update `ThemeOverride` enum and any UI/storage wiring to include `Solarized`.
     - Update `applyTheme()` in `src/content.ts` to set `root.dataset.theme = 'solarized'` when selected. The rest of the system requires no changes.
   - If the theme should also follow a system preference, you can define a matching media query in the `themes` layer similar to dark, e.g. a custom media or query. In practice, explicit attribute is recommended for non-standard themes.

3) Build and test
   - Run unit tests: `npm run test`.
   - Run e2e tests: `npm run test:e2e`.
   - Manually verify by setting `document.documentElement.dataset.theme = 'solarized'` on a page formatted by the extension.

4) Accessibility checks
   - Ensure sufficient contrast for text vs background, and for key UI affordances.
   - Verify focus-visible outline is clearly visible and meets contrast expectations.
   - Verify in `prefers-contrast: more` the theme remains legible.
   - Verify acceptable behavior under `forced-colors: active` (system colors).

---

### Do’s and Don’ts

Do
- Define or override colors through tokens only.
- Add new selectors in appropriate layers (`components` for structure, `states` for interactions).
- Keep dark/other themes in the `themes` layer; never in components.
- Keep comments up-to-date to help future maintainers (and AIs) understand intent.

Don’t
- Hardcode raw colors in component/state rules (except within `forced-colors` handling where system colors are used intentionally).
- Re-order layers or move rules between layers without understanding cascade impact.

---

### Maintaining idiomatic ordering

When editing `style.css`, maintain this sequencing:
1. Layer order declaration (`@layer tokens, themes, base, components, states;`).
2. tokens layer: `:root` tokens and `color-scheme`.
3. themes layer: explicit themes, system preferences, contrast/forced-colors.
4. base layer: document defaults.
5. components layer: structural and visual widget rules.
6. states layer: interactive states and focus-visible.
7. Global at-rules (`@keyframes`, etc.) that are layer-agnostic.

This mirrors how the file is currently organized and supports predictable styling.
