import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';

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
    plugins: [viteTsconfigPaths(), svgr(), pluginExposeRenderer(name)],
    resolve: {
      preserveSymlinks: true
    },
    root
  } as UserConfig;
});
