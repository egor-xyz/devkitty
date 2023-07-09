import type { ForgeConfig } from '@electron-forge/shared-types';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerZIP } from '@electron-forge/maker-zip';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { config } from 'dotenv';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import { version } from './package.json';

config();

const isDev = process.env.IS_DEV === 'true';

const forgeConfig: ForgeConfig = {
  makers: [new MakerZIP({}, ['darwin'])],
  packagerConfig: {
    appBundleId: 'app.devkitty',
    appCategoryType: 'public.app-category.developer-tools',
    appCopyright: 'Copyright © 2023 Devkitty',
    appVersion: version,
    asar: false,
    darwinDarkModeSupport: true,
    executableName: 'devkitty',
    extendInfo: './extend.plist',
    icon: './icons/icon',
    ignore: [
      new RegExp('/node_modules/electron($|/)'),
      new RegExp('/node_modules/electron-packager($|/)'),
      new RegExp('/\\.git($|/)'),
      new RegExp('/node_modules/\\.bin($|/)')
    ],
    name: 'Devkitty',
    osxNotarize: isDev
      ? undefined
      : {
          appleId: process.env.APPLE_ID || '',
          appleIdPassword: process.env.APPLE_ID_PASSWORD || '',
          teamId: process.env.APPLE_TEAM_ID || '',
          tool: 'notarytool'
        },
    osxSign: isDev
      ? undefined
      : {
          identityValidation: !isDev,
          optionsForFile: (path: string) => ({
            entitlements: './entitlements.mac.plist',
            hardenedRuntime: true
          }),
          type: 'distribution'
        },
    overwrite: true
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

export default forgeConfig;
