import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    // Don't publish source maps: they expose original source and inflate
    // the deploy artifact. Debug production builds from a local build.
    sourcemap: false,
  },
});
