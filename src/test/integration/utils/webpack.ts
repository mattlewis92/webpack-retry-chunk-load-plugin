import * as path from 'path';
import * as webpack from 'webpack';
import { RetryChunkLoadPlugin } from '../../../';
import MemoryFileSystem = require('memory-fs');

export default function (
  pluginOptions = {},
  { fixture = 'index.js', extend = {} } = {}
) {
  const fs = new MemoryFileSystem();

  const fixturesDir = path.join(__dirname, '../fixtures');

  const result = new Promise<webpack.Stats | undefined>((resolve, reject) => {
    const compiler = webpack({
      mode: 'development',
      devtool: false,
      entry: path.join(fixturesDir, fixture),
      output: {
        path: path.join(fixturesDir, 'dist'),
      },
      plugins: [new RetryChunkLoadPlugin(pluginOptions)],
      ...extend,
    });

    compiler.outputFileSystem = fs;

    compiler.run((error, stats) => {
      if (error) {
        return reject(error);
      }

      return resolve(stats);
    });
  });

  return { fs, result };
}
