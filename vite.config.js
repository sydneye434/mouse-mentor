/**
 * Developed by Sydney Edwards
 * Vite config: React plugin, dev server proxy to backend (8000), Vitest + coverage.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/chat': { target: 'http://localhost:8000', changeOrigin: true },
      '/trip': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/wait-times': { target: 'http://localhost:8000', changeOrigin: true },
      '/export': { target: 'http://localhost:8000', changeOrigin: true },
      '/messages': { target: 'http://localhost:8000', changeOrigin: true },
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
