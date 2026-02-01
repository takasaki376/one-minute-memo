import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // src 内のテストのみ実行（e2e/*.spec.ts は Playwright 用なので含めない）
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
    ],
    exclude: ['node_modules', 'e2e', 'e2e/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
