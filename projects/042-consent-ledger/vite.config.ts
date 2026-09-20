import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/consent-ledger/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
  },
});
