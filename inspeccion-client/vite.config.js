import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/inspeccion/',
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false   // no registrar SW en dev para evitar conflictos de puertos
      },
      manifest: {
        name: 'D+ARQ Inspección',
        short_name: 'D+ARQ',
        description: 'Módulo de inspección en campo para D+ARQ',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 5176
  }
})
