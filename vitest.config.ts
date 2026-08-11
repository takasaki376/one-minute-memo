import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // src 内の Vitest 対象のみ（*.bun.test.* は Bun、e2e/*.spec.ts は Playwright）
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
    ],
    exclude: [
      'node_modules',
      'e2e',
      'e2e/**',
      '**/e2e/**',
      '**/*.bun.test.ts',
      '**/*.bun.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
