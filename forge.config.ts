import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { config } from 'dotenv';

import { version } from './package.json';

config();

const notSign = process.env.NOT_SIGN === 'true';

const forgeConfig: ForgeConfig = {
  makers: [new MakerZIP({}, ['darwin'])],
  packagerConfig: {
    appBundleId: 'app.devkitty',
    appCategoryType: 'public.app-category.developer-tools',
    appCopyright: 'Copyright © 2024 Devkitty',
    appVersion: version,
    asar: true,
    executableName: 'Devkitty',
    icon: './icons/icon',
    name: 'Devkitty',
    osxNotarize: !notSign
      ? {
          appleId: process.env.APPLE_ID || '',
          appleIdPassword: process.env.APPLE_ID_PASSWORD || '',
          teamId: process.env.APPLE_TEAM_ID || ''
        }
      : undefined,
    osxSign: !notSign
      ? {
          optionsForFile: () => ({
            entitlements: './entitlements.mas.plist'
          })
        }
      : undefined,
    overwrite: true
  },
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          config: 'vite.main.config.mts',
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/app.ts'
        },
        {
          config: 'vite.preload.config.mts',
          entry: 'src/main/ipcs/preload.ts'
        }
      ],
      renderer: [
        {
          config: 'vite.renderer.config.mts',
          name: 'main_window'
        }
      ]
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
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
