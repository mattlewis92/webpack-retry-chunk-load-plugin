# webpack-retry-chunk-load-plugin

A webpack plugin to retry loading of chunks that failed to load

## Usage

```javascript
// webpack.config.js
const { RetryChunkLoadPlugin } = require('webpack-retry-chunk-load-plugin');

plugins: [
  new RetryChunkLoadPlugin({
    // optional stringified function to get the cache busting query string appended to the script src
    // if not set will default to appending the string `?cache-bust=true`
    cacheBust: `function() {
      return Date.now();
    }`
  })
];
```

## License

MIT
