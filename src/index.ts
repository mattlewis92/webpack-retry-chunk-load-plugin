import * as prettier from 'prettier';
import { Compiler, RuntimeGlobals } from 'webpack';

const pluginName = 'RetryChunkLoadPlugin';

export interface RetryChunkLoadPluginOptions {
  /**
   * optional stringified function to get the cache busting query string appended to the script src
   * if not set will default to appending the string `?cache-bust=true`
   */
  cacheBust?: string;
  /**
   * optional list of chunks to which retry script should be injected
   * if not set will add retry script to all chunks that have webpack script loading
   */
  chunks?: string[];
  /**
   * optional code to be executed in the browser context if after all retries chunk is not loaded.
   * if not set - nothing will happen and error will be returned to the chunk loader.
   */
  lastResortScript?: string;
  /**
   * optional value to set the maximum number of retries to load the chunk. Default is 1
   */
  maxRetries?: number;
  /**
   * optional number value to set the amount of time in milliseconds before trying to load the chunk again. Default is 0
   * if string, value must be code to generate a delay value. Receives retryCount as argument
   * e.g. `function(retryAttempt) { return retryAttempt * 1000 }`
   */
  retryDelay?: number | string;
}

export class RetryChunkLoadPlugin {
  options: RetryChunkLoadPluginOptions;

  constructor(options: RetryChunkLoadPluginOptions = {}) {
    this.options = Object.assign({}, options);
  }

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
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

          const getRetryDelay =
            typeof this.options.retryDelay === 'string'
              ? this.options.retryDelay
              : `function() { return ${this.options.retryDelay || 0} }`;

          if (!addRetryCode) return source;
          const script = runtimeTemplate.iife(
            '',
            `
          if(typeof ${RuntimeGlobals.require} !== "undefined") {
            var oldGetScript = ${RuntimeGlobals.getChunkScriptFilename};
            var oldLoadScript = ${RuntimeGlobals.ensureChunk};
            var queryMap = {};
            var countMap = {};
            var getRetryDelay = ${getRetryDelay}
            ${RuntimeGlobals.getChunkScriptFilename} = function(chunkId){
              var result = oldGetScript(chunkId);
              return result + (queryMap.hasOwnProperty(chunkId) ? '?' + queryMap[chunkId]  : '');
            };
            ${RuntimeGlobals.ensureChunk} = function(chunkId){
              var result = oldLoadScript(chunkId);
              return result.catch(function(error){
                var retries = countMap.hasOwnProperty(chunkId) ? countMap[chunkId] : ${maxRetries};
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
                  var retryAttempt = ${maxRetries} - retries + 1;
                  setTimeout(function () {
                    var retryAttemptString = '&retry-attempt=' + retryAttempt;
                    var cacheBust = ${getCacheBustString()} + retryAttemptString;
                    queryMap[chunkId] = cacheBust;
                    countMap[chunkId] = retries - 1;
                    resolve(${RuntimeGlobals.ensureChunk}(chunkId));
                  }, getRetryDelay(retryAttempt))
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
