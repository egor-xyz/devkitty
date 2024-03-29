import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import { checker } from 'vite-plugin-checker';
import react from '@vitejs/plugin-react';

import { pluginExposeRenderer } from './vite.base.config';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    base: './',
    build: {
      outDir: `.vite/renderer/${name}`
    },
    clearScreen: false,
    mode,
    plugins: [
      react({
        babel: {
          plugins: [
            [
              'babel-plugin-styled-components',
              {
                displayName: true,
                fileName: true,
                pure: true,
                ssr: false
              }
            ]
          ]
        }
      }),
      viteTsconfigPaths(),
      svgr(),
      pluginExposeRenderer(name),
      checker({
        eslint: {
          lintCommand: 'eslint "./src/**/*.{ts,tsx}"'
        },
        typescript: true
      })
    ],
    resolve: {
      preserveSymlinks: true
    },
    root
  } as UserConfig;
});
