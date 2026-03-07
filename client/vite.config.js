import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  const serverEnvDir = path.resolve(__dirname, '../server')
  loadEnv(mode, serverEnvDir, '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          timeout: 300000,       // 5 min — AI requests can be slow
          proxyTimeout: 300000,
        }
      }
    }
  }
})
