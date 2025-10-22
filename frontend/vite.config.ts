import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        compact: true,
        manualChunks: {
          // Core React ecosystem
          'react-core': ['react', 'react-dom'],
          
          // Routing
          'react-router': ['react-router-dom'],
          
          // State management
          'state-management': ['zustand'],
          
          // Data fetching
          'data-fetching': ['@tanstack/react-query', 'axios'],
          
          // Mapping libraries (lazy loaded)
          'maps-core': ['leaflet'],
          'maps-react': ['react-leaflet'],
          
          // Charts (lazy loaded)
          'charts': ['recharts'],
          
          // UI components
          'ui-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          
          // Icons
          'ui-icons': ['@heroicons/react', 'lucide-react'],
          
          // Utilities
          'utils': ['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'],
          
          // Real-time communication
          'websocket': ['socket.io-client'],
          
          // Notifications
          'notifications': ['react-hot-toast'],
          
          // Animations
          'animations': ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})