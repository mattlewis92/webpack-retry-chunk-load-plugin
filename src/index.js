const prettier = require('prettier');

const pluginName = 'RetryChunkLoadPlugin';

class RetryChunkLoadPlugin {
  constructor(options = {}) {
    this.options = Object.assign({}, options);
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(pluginName, compilation => {
      const { mainTemplate } = compilation;
      if (mainTemplate.hooks.jsonpScript) {
        // Adapted from https://github.com/webpack/webpack/blob/c74bee9cef6cd733ccf64037c3d3e010d4413082/lib/web/JsonpMainTemplatePlugin.js#L141-L203
        mainTemplate.hooks.jsonpScript.tap(pluginName, () => {
          const {
            crossOriginLoading,
            chunkLoadTimeout,
            jsonpScriptType
          } = mainTemplate.outputOptions;

          const crossOriginScript = `
          if (script.src.indexOf(window.location.origin + '/') !== 0) {
            script.crossOrigin = ${JSON.stringify(crossOriginLoading)};
          }
        `;

          const cacheBust = this.options.cacheBust
            ? `
          (${this.options.cacheBust})();
        `
            : '"cache-bust=true"';

          const script = `
          function loadScript(src, retries) {
     
            var script = document.createElement('script');
            var onScriptComplete;
            ${
              jsonpScriptType
                ? `script.type = ${JSON.stringify(jsonpScriptType)};`
                : ''
            }
            script.charset = 'utf-8';
            script.timeout = ${chunkLoadTimeout / 1000};
            if (${mainTemplate.requireFn}.nc) {
              script.setAttribute("nonce", ${mainTemplate.requireFn}.nc);
            }
            script.src = src;
            ${crossOriginLoading ? crossOriginScript : ''}
            onScriptComplete = function (event) {
              // avoid mem leaks in IE.
              script.onerror = script.onload = null;
              clearTimeout(timeout);
              var chunk = installedChunks[chunkId];
              if (chunk !== 0) {
                if (chunk) {
                  if (retries === 0) {
                    var errorType = event && (event.type === 'load' ? 'missing' : event.type);
                    var realSrc = event && event.target && event.target.src;
                    var error = new Error('Loading chunk ' + chunkId + ' failed.\\n(' + errorType + ': ' + realSrc + ')');
                    error.type = errorType;
                    error.request = realSrc;
                    chunk[1](error);
                    installedChunks[chunkId] = undefined;
                  } else {
                    var cacheBust = ${cacheBust};
                    var retryScript = loadScript(src + '?' + cacheBust, 0);
                    document.head.appendChild(retryScript);
                  }
                } else {
                  installedChunks[chunkId] = undefined;
                }
              }
            };
            var timeout = setTimeout(function(){
              onScriptComplete({ type: 'timeout', target: script });
            }, ${chunkLoadTimeout});
            script.onerror = script.onload = onScriptComplete;
            return script;
          }
          
          var script = loadScript(jsonpScriptSrc(chunkId), 1);
        `;

          return prettier.format(script, {
            singleQuote: true,
            parser: 'babel'
          });
        });
      }
    });
  }
}

module.exports.RetryChunkLoadPlugin = RetryChunkLoadPlugin;
