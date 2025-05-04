// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
});