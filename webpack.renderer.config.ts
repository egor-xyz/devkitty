import path from 'path';

import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }]
});

export const rendererConfig: Configuration = {
  module: {
    rules
  },
  plugins: [...plugins],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    modules: [path.resolve('src'), 'node_modules']
  }
};
