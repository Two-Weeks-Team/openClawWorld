import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    // Use explicit IPv4 address to avoid DNS resolution of 'localhost' on
    // self-hosted runners where /etc/hosts may not contain a localhost entry.
    host: '127.0.0.1',
  },
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
