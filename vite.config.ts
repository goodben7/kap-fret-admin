import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (
              id.includes('/react-dom/')
              || id.includes('/react/')
              || id.includes('/react-router')
              || id.includes('/scheduler/')
            ) {
              return 'react-vendor'
            }

            if (
              id.includes('/@tanstack/')
              || id.includes('/axios/')
            ) {
              return 'data-vendor'
            }
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'https://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
