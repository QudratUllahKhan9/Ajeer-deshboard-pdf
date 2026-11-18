import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ajeerbackend.vercel.app',
        changeOrigin: true,
        secure: false,
      },
      '/qr': {
        target: 'https://ajeerbackend.vercel.app',
        changeOrigin: true,
        secure: false,
      },
      '/v': {
        target: 'https://ajeerbackend.vercel.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

