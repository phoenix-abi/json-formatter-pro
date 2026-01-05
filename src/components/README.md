# Components

This directory contains Preact components for the JSON Formatter extension.

## Components

- **JsonTreeView.tsx** - Root component that manages tree state and virtual scrolling
- **JsonNode.tsx** - Individual tree node renderer (matches buildDom output)

## Architecture

Components use the Integration Contract (`src/lib/integration/types.ts`) to work with polymorphic data from either `JSON.parse()` or the custom parser.

## Development

Run Storybook for component development:
```bash
npm run storybook
```

## Testing

Unit tests use `@testing-library/preact`:
```bash
npm test -- src/components
```

Remember to add `@vitest-environment jsdom` comment to test files.
