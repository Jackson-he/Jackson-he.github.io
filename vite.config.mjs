import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: rootDir,
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
  build: {
    outDir: resolve(rootDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(rootDir, 'index.html'),
        gameRedirect: resolve(rootDir, 'projects/game/index.html'),
        englishRedirect: resolve(rootDir, 'projects/data-viz/index.html'),
        englishModeRedirect: resolve(rootDir, 'projects/data-viz/mode-list.html'),
        englishPatternRedirect: resolve(rootDir, 'projects/data-viz/pattern-detail.html'),
        sportRedirect: resolve(rootDir, 'projects/creative/index.html'),
        toolsRedirect: resolve(rootDir, 'projects/tools/index.html'),
        stockTransitionRedirect: resolve(rootDir, 'projects/stock-transition/index.html'),
        futuresMonitorRedirect: resolve(rootDir, 'projects/futures-monitor/index.html'),
        codexChatRedirect: resolve(rootDir, 'projects/codex-chat/index.html'),
      },
      external: ["markdown-it"],
    }
  },
})
