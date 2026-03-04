import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
        lines: 39,
        functions: 19,
        branches: 43,
        statements: 39,
      },
    },
  },
})
