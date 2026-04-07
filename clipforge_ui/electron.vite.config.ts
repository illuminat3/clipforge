import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [vue()],
    css: {
      preprocessorOptions: {
        scss: {
          // Silence legacy API deprecation warnings from dependencies
          silenceDeprecations: ['legacy-js-api'],
        },
      },
    },
  },
})
