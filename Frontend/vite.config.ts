import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    // En desarrollo, los comprobantes (/uploads) y la API se sirven desde el backend,
    // igual que hace Nginx en producción
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // La librería de gráficos va en su propio archivo para no engordar la carga inicial
        manualChunks: {
          graficos: ['recharts'],
        },
      },
    },
  },
})
