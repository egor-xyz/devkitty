import type { ForgeConfig } from '@electron-forge/shared-types';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerZIP } from '@electron-forge/maker-zip';
import { PublisherGithub } from '@electron-forge/publisher-github';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import { version } from './package.json';

const config: ForgeConfig = {
  makers: [new MakerZIP({}, ['darwin'])],
  packagerConfig: {
    appBundleId: 'com.egor-xyz.devkitty',
    appCategoryType: 'public.app-category.developer-tools',
    appVersion: version,
    executableName: 'devkitty',
    icon: './icons/icon',
    name: 'Devkitty',
    // osxNotarize: {
    //   appleId: '',
    //   appleIdPassword: '',
    // },
    osxSign: {},
    osxUniversal: {
      mergeASARs: true
    },
    win32metadata: {
      CompanyName: 'Devkitty',
      OriginalFilename: 'Devkitty'
    }
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

  publishers: [
    new PublisherGithub({
      repository: {
        name: 'devkitty',
        owner: 'egor-xyz'
      }
    })
  ],
  rebuildConfig: {}
};

export default config;
