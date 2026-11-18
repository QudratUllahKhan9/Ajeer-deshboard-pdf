import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: /api, /qr, /v are proxied to Express so no CORS pain.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://ajeerbackend.vercel.app/',
      '/qr': 'https://ajeerbackend.vercel.app/',
      '/v': ''
    }
  }
})
