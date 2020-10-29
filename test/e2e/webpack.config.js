const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { RetryChunkLoadPlugin } = require('../../src');

module.exports = {
  devtool: false,
  entry: path.join(__dirname, '..', 'integration', 'fixtures', 'index.js'),
  output: {
    path: path.join(__dirname, 'dist'),
  },
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin(),
    new RetryChunkLoadPlugin({
      maxRetries: 5,
    }),
  ],
};
