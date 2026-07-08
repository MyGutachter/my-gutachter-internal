import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      html2canvas: 'html2canvas-pro'
    }
  },
  server: {
    host: true,      // allows access via IP
    allowedHosts: [
      '.pinggy.link',
      '.ngrok-free.app',
      '.ngrok-free.dev'
    ],
    port: 5174       // optional, default port
  }
})
