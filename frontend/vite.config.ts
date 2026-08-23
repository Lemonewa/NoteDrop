import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/midi': 'http://127.0.0.1:8001',
      '/render': 'http://127.0.0.1:8001'
    }
  }
})