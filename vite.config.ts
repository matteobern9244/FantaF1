import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    env: {
      MONGODB_DB_NAME_OVERRIDE: '',
      SAVE_SMOKE_EXPECTED_DATABASE_TARGET: '',
      FANTAF1_EXPECTED_DATABASE_TARGET: '',
      VITE_APP_LOCAL_NAME: ''
    },
    coverage: {
      provider: 'v8',
      include: ['app.js', 'server.js', 'backend/**/*.js', 'src/**/*.ts', 'src/**/*.tsx', 'scripts/atlas-provisioning.mjs'],
      exclude: ['backend/config.js', 'backend/models.js', 'backend/config-loader.js', 'src/types.ts', 'src/vite-env.d.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
})
