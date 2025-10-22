import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: path.resolve(__dirname, 'electron/main.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
            rollupOptions: {
              external: ['electron', 'electron-store', 'child_process', 'path', 'url', 'fs'],
            },
          },
        },
      },
      {
        // Preload script
        entry: path.resolve(__dirname, 'electron/preload.ts'),
        onstart(options) {
          // Notify the renderer process to reload the page when the preload scripts are rebuilt
          options.reload();
        },
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src'),
    },
  },
  root: path.resolve(__dirname, 'frontend'),
  publicDir: path.resolve(__dirname, 'frontend/public'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, './frontend/dist'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});