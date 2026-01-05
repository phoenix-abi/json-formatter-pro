import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import preact from '@preact/preset-vite'
import { resolve, basename, extname } from 'node:path'

const root = resolve(__dirname, 'src')

export default defineConfig(() => {
  const singleEntry = process.env.ENTRY // e.g., 'src/content.ts'
  const excludeContent = process.env.EXCLUDE_CONTENT === '1'

  // Compose multi-entry inputs, with optional exclusion of content
  const multiInputs: Record<string, string> = {
    content: resolve(root, 'content.ts'),
    'set-json-global': resolve(root, 'set-json-global.ts'),
    background: resolve(root, 'background.ts'),
    'options/options': resolve(root, 'options/options.html'),
    'popup/popup': resolve(root, 'popup/popup.html'),
  }
  if (excludeContent) {
    delete multiInputs.content
  }

  return {
    root,
    resolve: {
      alias: {
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
      },
    },
    build: {
      outDir: resolve(__dirname, 'dist'),
      // Empty only on the first run; when building the rest, preserve content.js
      emptyOutDir: !excludeContent,
      rollupOptions: {
        input: singleEntry
          ? {
              // Derive a stable name from the entry path so content.ts -> content.js
              [basename(singleEntry, extname(singleEntry))]: resolve(
                __dirname,
                singleEntry
              ),
            }
          : multiInputs,
        output: {
          // Ensure one JS file per entry by disabling vendor chunking
          manualChunks: undefined,
          // When building a single entry, inline dynamic imports to avoid shared chunks
          ...(singleEntry ? { inlineDynamicImports: true } : {}),
          entryFileNames: '[name].js',
          // Keep any accidental chunks predictable and unhashed
          chunkFileNames: '[name].js',
          assetFileNames: (assetInfo) => {
            // For content.css, use a stable name without hash so manifest can reference it
            if (assetInfo.name === 'content.css') {
              return 'content.css'
            }
            // For other assets, use hash for cache busting
            return 'assets/[name]-[hash][extname]'
          },
        },
      },
    },
    plugins: [
      preact(),
      viteStaticCopy({
        targets: [
          { src: 'manifest.json', dest: '.' },
          { src: 'icons', dest: '.' },
          // Only ship the unified token-based stylesheet
          { src: 'style.css', dest: '.' },
        ],
      }),
    ],
  }
})
