import { defineConfig } from 'vite'
import { localItemAssets } from './scripts/assets/vite.mjs'

export default defineConfig({
  plugins: [localItemAssets()],
  build: { outDir: 'dist' },
})
