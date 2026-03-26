import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/supabase': {
        target: 'http://debian.orca-mirfak.ts.net:3100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
      '/upload-api': {
        target: 'http://debian.orca-mirfak.ts.net:3200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upload-api/, ''),
      },
    },
  },
})
