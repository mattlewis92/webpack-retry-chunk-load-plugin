const path = require('path');
const webpack = require('webpack');
const MemoryFileSystem = require('memory-fs');
const { RetryChunkLoadPlugin } = require('../../../src');

module.exports = function({ fixture = 'index.js', extend = {} } = {}) {
  const config = {
    mode: 'development',
    devtool: false,
    entry: path.join(__dirname, '..', 'fixtures', fixture),
    output: {
      path: path.join(__dirname, '..', 'fixtures', 'dist')
    },
    plugins: [new RetryChunkLoadPlugin()],
    ...extend
  };

  const fs = new MemoryFileSystem();

  const result = new Promise((resolve, reject) => {
    const compiler = webpack(config);
    compiler.outputFileSystem = fs;
    compiler.run((err, stats) => {
      if (err) {
        return reject(err);
      }

      return resolve(stats);
    });
  });

  return {
    fs,
    result
  };
};
