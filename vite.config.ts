import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath, URL } from 'node:url'

const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = 'cesiumStatic'

export default defineConfig({
  base: './',
  define: {
    CESIUM_BASE_URL: JSON.stringify(`./${cesiumBaseUrl}/`),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: ['ThirdParty', 'Workers', 'Assets', 'Widgets'].map((dir) => ({
        src: `${cesiumSource}/${dir}`,
        dest: cesiumBaseUrl,
        rename: { stripBase: 4 },
      })),
    }),
  ],
  build: {
    chunkSizeWarningLimit: 6000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
