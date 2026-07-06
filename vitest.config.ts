import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Browser globals (window, navigator, document) don't exist under
        // vitest's default node environment.
        environment: 'jsdom',
        include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    },
});
