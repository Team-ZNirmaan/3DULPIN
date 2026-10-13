import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// CesiumJS loads its workers, assets and widget styles at runtime from this folder.
// This follows Cesium's own Vite recipe: copy the files and tell Cesium where they are.
const cesiumBaseUrl = 'cesiumStatic'

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify(`./${cesiumBaseUrl}`),
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/cesium/Build/Cesium/{Workers,ThirdParty,Assets,Widgets}/**/*',
          dest: cesiumBaseUrl,
          rename: { stripBase: 4 },
        },
      ],
    }),
  ],
  // Relative base so the built site works from any folder or sub-path when you host it.
  base: './',
  build: {
    chunkSizeWarningLimit: 6000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
