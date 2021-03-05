const prettier = require('prettier');
const { RuntimeGlobals } = require('webpack');

const pluginName = 'RetryChunkLoadPlugin';

class RetryChunkLoadPlugin {
  constructor(options = {}) {
    this.options = Object.assign({}, options);
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      const { mainTemplate } = compilation;
      const maxRetryValueFromOptions = Number(this.options.maxRetries);
      const maxRetries =
        Number.isInteger(maxRetryValueFromOptions) &&
        maxRetryValueFromOptions > 0
          ? maxRetryValueFromOptions
          : 1;
      const getCacheBustString = () =>
        this.options.cacheBust
          ? `
                  (${this.options.cacheBust})();
                `
          : '"cache-bust=true"';
      mainTemplate.hooks.localVars.tap(
        { name: pluginName, stage: 1 },
        (source, chunk) => {
          const currentChunkName = chunk.name;
          const addRetryCode =
            !this.options.chunks ||
            this.options.chunks.includes(currentChunkName);
          if (!addRetryCode) return source;
          const script = `
          if(typeof ${RuntimeGlobals.require} !== "undefined") {
            var oldGetScript = ${RuntimeGlobals.getChunkScriptFilename};
            var oldLoadScript = ${RuntimeGlobals.ensureChunk};
            var queryMap = new Map();
            var countMap = new Map();
            var maxRetries = ${maxRetries};
            ${RuntimeGlobals.getChunkScriptFilename} = function(chunkId){
              var result = oldGetScript(chunkId);
              return result + (queryMap.has(chunkId) ? '?' + queryMap.get(chunkId)  : '');
            };
            ${RuntimeGlobals.ensureChunk} = function(chunkId){
              var result = oldLoadScript(chunkId);
              return result.catch(function(error){
                var retries = countMap.has(chunkId) ? countMap.get(chunkId) : ${maxRetries};
                if (retries < 1) {
                  var realSrc = oldGetScript(chunkId);
                  error.message = 'Loading chunk ' + chunkId + ' failed after ${maxRetries} retries.\\n(' + realSrc + ')';
                  error.request = realSrc;${
                    this.options.lastResortScript
                      ? this.options.lastResortScript
                      : ''
                  }
                  throw error;
                }
                var retryAttempt = ${maxRetries} - retries + 1;
                var retryAttemptString = '&retry-attempt=' + retryAttempt;
                var cacheBust = ${getCacheBustString()} + retryAttemptString;
                queryMap.set(chunkId, cacheBust);
                countMap.set(chunkId, retries - 1);
                return ${RuntimeGlobals.ensureChunk}(chunkId);
              });
            };
          }
          `;
          return (
            source +
            prettier.format(script, {
              singleQuote: true,
              parser: 'babel',
            })
          );
        }
      );
    });
  }
}

module.exports.RetryChunkLoadPlugin = RetryChunkLoadPlugin;
