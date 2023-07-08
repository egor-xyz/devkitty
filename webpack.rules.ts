import type { ModuleOptions } from 'webpack';
import createStyledComponentsTransformer from 'typescript-plugin-styled-components';

const styledComponentsTransformer = createStyledComponentsTransformer({
  displayName: true,
  ssr: false
});

export const rules: Required<ModuleOptions>['rules'] = [
  // Add support for native node modules
  {
    // We're specifying native_modules in the test because the asset relocator loader generates a
    // "fake" .node file which is really a cjs file.
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader'
  },
  {
    parser: { amd: false },
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules'
      }
    }
  },
  {
    exclude: /(node_modules|\.webpack)/,
    test: /\.tsx?$/,
    use: {
      loader: 'ts-loader',
      options: {
        getCustomTransformers: () => ({ before: [styledComponentsTransformer] }),
        transpileOnly: true
      }
    }
  },
  {
    issuer: /\.[jt]sx?$/,
    test: /\.svg$/i,
    use: [
      {
        loader: '@svgr/webpack',
        options: {
          svgo: false
        }
      }
    ]
  },
  {
    test: /\.(png|jpe?g|gif|webp|mp3)$/i,
    type: 'asset/resource'
  }
];
