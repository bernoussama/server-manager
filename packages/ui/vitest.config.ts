import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import react from '@vitejs/plugin-react';

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    reporters: ['verbose'],
    // coverage: {
    //   reporter: ['text', 'json', 'html'],
    // },
    // include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  }
});