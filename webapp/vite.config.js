import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: path.join(os.tmpdir(), 'vite-cache-webapp'),
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Firebase — el más grande, cambia poco → cacheable
          if (id.includes('node_modules/firebase')) return 'vendor-firebase';
          // PDF generation & parsing — pesadas, cambian poco
          if (id.includes('node_modules/pdfjs-dist'))       return 'vendor-pdf';
          if (id.includes('node_modules/jspdf'))            return 'vendor-pdf';
          // Spreadsheet
          if (id.includes('node_modules/xlsx'))             return 'vendor-xlsx';
          // Charts
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-'))         return 'vendor-charts';
          // React core
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-grid-layout')) return 'vendor-react';
        }
      }
    }
  }
})