import * as path from 'path';
import type { Configuration } from 'webpack';
import { RetryChunkLoadPlugin } from '../../src';
import HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: false,
  entry: path.join(__dirname, '..', 'integration', 'fixtures', 'index.ts'),
  output: { path: path.join(__dirname, 'dist') },
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin(),
    new RetryChunkLoadPlugin({ maxRetries: 5 }),
  ],
  resolve: { extensions: ['.ts'] },
} as Configuration;
