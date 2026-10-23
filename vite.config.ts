import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 720,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('FBXLoader') ||
            id.includes('OBJLoader') ||
            id.includes('STLLoader') ||
            id.includes('PLYLoader') ||
            id.includes('fflate')
          ) {
            return 'three-heavy-loaders';
          }
          if (id.includes('node_modules/three/examples')) {
            return 'three-addons';
          }
          if (id.includes('node_modules/three')) {
            return 'three-core';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'react-vendor';
          }
          if (id.includes('/src/i18n/')) {
            return 'i18n-dict';
          }
          if (
            id.includes('/src/engine/archAnalysis/') ||
            id.includes('/src/engine/blueprintExporter')
          ) {
            return 'arch-analysis';
          }
          return undefined;
        },
      },
    },
  },
});
