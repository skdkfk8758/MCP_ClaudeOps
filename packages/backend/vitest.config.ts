import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/models/task.ts',
        'src/models/epic.ts',
        'src/models/prd.ts',
        'src/models/pipeline.ts',
        'src/models/commit-tracker.ts',
        'src/services/pipeline-executor.ts',
        'src/services/verification-executor.ts',
        'src/services/commit-tracker-service.ts',
        'src/routes/pipelines.ts',
        'src/routes/tasks.ts',
        'src/routes/epics.ts',
        'src/routes/prds.ts',
        'src/routes/github.ts',
      ],
      reporter: ['text', 'text-summary'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
