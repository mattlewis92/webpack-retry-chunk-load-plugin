const prettier = require('prettier');
const { RuntimeGlobals } = require('webpack');

const pluginName = 'RetryChunkLoadPlugin';

class RetryChunkLoadPlugin {
  constructor(options = {}) {
    this.options = Object.assign({}, options);
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      const { mainTemplate, runtimeTemplate } = compilation;
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
          const script = runtimeTemplate.iife(
            '',
            `
          if(typeof ${RuntimeGlobals.require} !== "undefined") {
            var oldGetScript = ${RuntimeGlobals.getChunkScriptFilename};
            var oldLoadScript = ${RuntimeGlobals.ensureChunk};
            var queryMap = new Map();
            var countMap = new Map();
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
                return new Promise(function (resolve) {
                  setTimeout(function () {
                    var retryAttempt = ${maxRetries} - retries + 1;
                    var retryAttemptString = '&retry-attempt=' + retryAttempt;
                    var cacheBust = ${getCacheBustString()} + retryAttemptString;
                    queryMap.set(chunkId, cacheBust);
                    countMap.set(chunkId, retries - 1);
                    resolve(${RuntimeGlobals.ensureChunk}(chunkId));
                  }, ${this.options.retryDelay || this.options.timeout || 0})
                })
              });
            };
          }`
          );
          return (
            source +
            prettier.format(script, {
              trailingComma: 'es5',
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
