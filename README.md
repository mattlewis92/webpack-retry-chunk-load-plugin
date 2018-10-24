# webpack-retry-chunk-load-plugin

A webpack plugin to retry loading of async chunks that failed to load

<img width="827" alt="screenshot 2018-10-24 at 21 47 39" src="https://user-images.githubusercontent.com/6425649/47435175-9c4c0100-d7d6-11e8-8519-6f46088e649f.png">

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

### angular cli

To use this with the angular CLI you can use the fantastic [`angular-builders`](https://github.com/meltedspark/angular-builders) project to extend the built in webpack config

## License

MIT
