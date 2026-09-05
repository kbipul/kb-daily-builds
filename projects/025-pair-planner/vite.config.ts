import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/pair-planner/',
  test: {
    environment: 'node',
  },
});
