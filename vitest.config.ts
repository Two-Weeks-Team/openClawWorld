import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,js}', 'packages/**/*.{test,spec}.{ts,js}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'tests/integration/**',
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.{ts,js}', '**/dist/**'],
    },
  },
});
