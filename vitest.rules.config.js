import { defineConfig } from 'vitest/config'

// Les fichiers partagent le même émulateur et vident la base entre les tests : exécution séquentielle.
export default defineConfig({
  test: { environment: 'node', include: ['tests/rules/**/*.test.js'], testTimeout: 30000, fileParallelism: false },
})
