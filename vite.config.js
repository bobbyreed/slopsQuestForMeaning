import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  test: {
    environment: 'node',
    globals: true,
    alias: { phaser: new URL('./src/__mocks__/phaser.js', import.meta.url).pathname },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/__mocks__/**', 'src/__tests__/**', 'src/main.js'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
      reporter: ['text', 'html'],
    },
  },
})
