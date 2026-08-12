import { defineConfig } from 'vite'
import { resolve } from 'path'

const root = import.meta.dirname

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
    typescript: {
      removeClassFieldsWithoutInitializer: true,
    },
    assumptions: {
      setPublicClassFields: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: resolve(root, 'index.html'),
        'demo-rounded': resolve(root, 'demo-rounded.html'),
        'demo-cube': resolve(root, 'demo-cube.html'),
        'demo-console': resolve(root, 'demo-console.html'),
        'demo-connector': resolve(root, 'demo-connector.html'),
      },
    },
  },
})
