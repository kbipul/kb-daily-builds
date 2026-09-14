import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/harness-tell/',
  test: {
    environment: 'node',
    // jsdom render tests stall under CPU contention on small runners; the tests
    // themselves complete in well under a second.
    testTimeout: 20000,
  },
});
