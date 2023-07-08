import type { ForgeConfig } from '@electron-forge/shared-types';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  makers: [
    {
      config: {
        name: 'Devkitty'
      },
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      config: {},
      name: '@electron-forge/maker-dmg'
    }
  ],
  packagerConfig: {
    icon: './icons/icon'
  },
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/rendered/index.html',
            js: './src/rendered/index.tsx',
            name: 'main_window',
            preload: {
              js: './src/main/ipcs/preload.ts'
            }
          }
        ]
      }
    })
  ],
  rebuildConfig: {}
};

export default config;
