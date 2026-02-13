import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: '[name].mjs'
        }
      },
      // Bundle CJS deps that don't support ESM named exports
      externalizeDeps: {
        exclude: ['lodash']
      }
    },
    resolve: {
      alias: {
        types: resolve('src/types')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: '[name].mjs'
        }
      }
    },
    resolve: {
      alias: {
        types: resolve('src/types')
      }
    }
  },
  renderer: {
    plugins: [tailwindcss(), react(), viteTsconfigPaths(), svgr()],
    resolve: {
      alias: {
        types: resolve('src/types'),
        renderer: resolve('src/renderer')
      }
    }
  }
});
