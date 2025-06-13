import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'https://jobassist-backend-46294121978.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      // Proxy resume endpoints to the backend server
      '/resumes': {
        target: 'https://jobassist-backend-46294121978.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
