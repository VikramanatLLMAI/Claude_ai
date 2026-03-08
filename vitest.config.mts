import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'happy-dom',
    include: ['__tests__/unit/**/*.test.ts'],
    globals: true,
    setupFiles: ['__tests__/helpers/mock-db.ts'],
    passWithNoTests: true,
  },
});
