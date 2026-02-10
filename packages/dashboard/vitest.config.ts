import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/pipeline/**/*.ts',
        'src/lib/hooks/use-pipelines.ts',
        'src/lib/hooks/use-pipeline-execution.ts',
        'src/components/pipelines/**/*.tsx',
        'src/components/tasks/design-flow-editor.tsx',
      ],
      reporter: ['text', 'text-summary'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
