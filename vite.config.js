import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ajeer-qiwa-se.vercel.app',
        changeOrigin: true,
        secure: false,
      },
      '/qr': {
        target: 'https://ajeer-qiwa-se.vercel.app',
        changeOrigin: true,
        secure: false,
      },
      '/v': {
        target: 'https://ajeer-qiwa-se.vercel.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

