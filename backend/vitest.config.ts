import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    include: ['src/**/*.{test,spec}.{js,ts}', '__tests__/**/*.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'src/scripts/',
        'src/tests/', // Exclude the existing test files which are integration tests
      ],
    },
  },
})