import { defineConfig } from 'vite'
import { resolve } from 'path'

/**
 * Vite config for building the preview bundle.
 * This creates a single JavaScript file containing buildDom and its dependencies.
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'scripts/preview-bundle-entry.ts'),
      name: 'PreviewBundle',
      formats: ['iife'],
      fileName: () => 'preview-bundle.js',
    },
    outDir: 'scripts/templates',
    emptyOutDir: false,
    minify: false, // Keep readable for debugging
    rollupOptions: {
      output: {
        // Don't add hashes to the filename
        entryFileNames: 'preview-bundle.js',
        // Inline everything into a single file
        inlineDynamicImports: true,
      },
    },
  },
})
