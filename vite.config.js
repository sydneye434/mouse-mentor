/**
 * Developed by Sydney Edwards
 * Vite config: React plugin, dev server proxy to backend (8000), Vitest + coverage.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/chat': { target: 'http://localhost:8000', changeOrigin: true },
      // Proxy GET/DELETE /trip and POST /trip/share only — not /trip/:token (SPA shared view)
      '/trip': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          const path = req.url?.split('?')[0] ?? ''
          if (path === '/trip' || path === '/trip/share') {
            return undefined
          }
          if (path.startsWith('/trip/')) {
            return false
          }
          return undefined
        },
      },
      '/public': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/wait-times': { target: 'http://localhost:8000', changeOrigin: true },
      '/export': { target: 'http://localhost:8000', changeOrigin: true },
      '/messages': { target: 'http://localhost:8000', changeOrigin: true },
      '/billing': { target: 'http://localhost:8000', changeOrigin: true },
      // API only — do not proxy GET /itinerary (SPA route)
      '/itinerary/generate': { target: 'http://localhost:8000', changeOrigin: true },
      '/itinerary/export-pdf': { target: 'http://localhost:8000', changeOrigin: true },
      '/lightning-lane-guide/generate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/tips/generate': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', '**/*.test.{js,jsx}', '**/coverage/**'],
      thresholds: {
        lines: 32,
        functions: 15,
        branches: 37,
        statements: 32,
      },
    },
  },
})
