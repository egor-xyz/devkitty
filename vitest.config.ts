import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      types: resolve(__dirname, 'src/types'),
      renderer: resolve(__dirname, 'src/renderer')
    }
  },
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/renderer/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/main/ipcs/**/*.ts',
        'src/main/libs/**/*.ts',
        'src/main/settings.ts',
        'src/preload/**/*.ts',
        'src/renderer/hooks/**/*.{ts,tsx}',
        'src/renderer/utils/**/*.ts',
        'src/renderer/assets/gitHubStatusUtils.ts'
      ],
      exclude: ['**/*.test.{ts,tsx}', '**/index.ts']
    }
  }
});
