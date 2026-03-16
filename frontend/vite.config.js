import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/crm/',
  server: {
    allowedHosts: ['srv1309764.hstgr.cloud', 'localhost', '127.0.0.1']
  }
})
