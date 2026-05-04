import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    // No manual chunks — Vite's automatic splitting is safe.
    // Manual chunks caused circular vendor → react-vendor → vendor dependency
    // that broke use-sync-external-store at runtime.
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },

  preview: {
    port: 4173,
  },
});
