const prettier = require('prettier');
const { RuntimeGlobals, JavascriptModulesPlugin } = require('webpack');
const compileBooleanMatcher = require('webpack/lib/util/compileBooleanMatcher');

const pluginName = 'RetryChunkLoadPlugin';

class RetryChunkLoadPlugin {
  constructor(options = {}) {
    this.options = Object.assign({}, options);
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
      const { mainTemplate } = compilation;

      if (mainTemplate.hooks.requireEnsure) {
        mainTemplate.hooks.requireEnsure.tap(
          { name: pluginName, stage: 1 },
          (source, chunk) => {
            const {
              globalObject,
              chunkLoadingGlobal
            } = compilation.outputOptions;
            const { chunkGraph } = compilation;
            const hasJsMatcher =
              chunkGraph &&
              compileBooleanMatcher(
                chunkGraph.getChunkConditionMap(
                  chunk,
                  JavascriptModulesPlugin.chunkHasJs
                )
              );
            const chunkLoadingGlobalExpr = `${globalObject}[${JSON.stringify(
              chunkLoadingGlobal
            )}]`;
            const getCacheBustString = () =>
              this.options.cacheBust
                ? `
            (${this.options.cacheBust})();
          `
                : '"cache-bust=true"';

            const maxRetryValueFromOptions = Number(this.options.maxRetries);
            const maxRetries =
              Number.isInteger(maxRetryValueFromOptions) &&
              maxRetryValueFromOptions > 0
                ? maxRetryValueFromOptions
                : 1;
            const fn = RuntimeGlobals.loadScript;
            const scriptWithRetry = `
        var installedChunks = {${chunk.ids
          .map(id => `${JSON.stringify(id)}: 0`)
          .join(',\n')}};

        ${RuntimeGlobals.ensureChunkHandlers}.j = function(chunkId, promises) {
          // JSONP chunk loading for javascript
          var installedChunkData = ${
            RuntimeGlobals.hasOwnProperty
          }(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
 				  if(installedChunkData !== 0) { // 0 means "already installed".
 		
 					// a Promise means "currently loading".
 					if(installedChunkData) {
 						promises.push(installedChunkData[2]);
 					} else {
 						if(${
              hasJsMatcher === true ? 'true' : hasJsMatcher('chunkId')
              }) { // all chunks have JS
                // setup Promise in chunk cache
                var promise = new Promise((resolve, reject) => {
                  installedChunkData = installedChunks[chunkId] = [resolve, reject];
                });
                promises.push(installedChunkData[2] = promise);
      
                // start chunk loading
                var url = ${RuntimeGlobals.publicPath} + ${
                  RuntimeGlobals.getChunkScriptFilename
                }(chunkId);
                // create error before stack unwound to get useful stacktrace later
                var error = new Error();
                function loadingEnded(retries) {
                  return function(evt) {
                    if(${RuntimeGlobals.hasOwnProperty}(installedChunks, chunkId)) {
                      installedChunkData = installedChunks[chunkId];
                      // if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
                      if(installedChunkData) {
                        if (retries === 0) {
                          var errorType = event && (event.type === 'load' ? 'missing' : event.type);
                          var realSrc = event && event.target && event.target.src;
                          error.message = 'Loading chunk ' + chunkId + ' failed after ${maxRetries} retries.\\n(' + errorType + ': ' + realSrc + ')';
                          error.name = 'ChunkLoadError';
                          error.type = errorType;
                          error.request = realSrc;${
                            this.options.lastResortScript
                              ? this.options.lastResortScript
                              : ''
                          }
                          installedChunkData[1](error);
                          installedChunks[chunkId] = undefined;
                        } else {
                          var retryAttempt = ${maxRetries} - retries + 1;
                          var retryAttemptString = '&retry-attempt=' + retryAttempt;
                          var cacheBust = ${getCacheBustString()} + retryAttemptString;
                          ${fn}(url + '?' + cacheBust, loadingEnded(retries-1), "chunk-" + chunkId);
                        }
                      } else {
                        installedChunks[chunkId] = undefined;
                      }
                    }
                  }
                }
                ${fn}(url, loadingEnded(${maxRetries}), "chunk-" + chunkId);
              }
            }
          }
        }
        var chunkLoadingGlobal = ${chunkLoadingGlobalExpr} = ${chunkLoadingGlobalExpr} || [];
        var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(
          chunkLoadingGlobal
        );
        Object.defineProperty(chunkLoadingGlobal, "push", {
          set: function (fn) {
            if (!this._push) {
              this._push = fn;
            }
          },
          get: function () {
            return this._push;
          },
        });
        chunkLoadingGlobal.push = (data) => {
          var [chunkIds, moreModules, runtime] = data;
          // add "moreModules" to the modules object,
          // then flag all "chunkIds" as loaded and fire callback
          var moduleId,
            chunkId,
            i = 0,
            resolves = [];
          for (; i < chunkIds.length; i++) {
            chunkId = chunkIds[i];
            if (
              __webpack_require__.o(installedChunks, chunkId) &&
              installedChunks[chunkId]
            ) {
              resolves.push(installedChunks[chunkId][0]);
            }
            installedChunks[chunkId] = 0;
          }
          for (moduleId in moreModules) {
            if (__webpack_require__.o(moreModules, moduleId)) {
              __webpack_require__.m[moduleId] = moreModules[moduleId];
            }
          }
          if (runtime) runtime(__webpack_require__);
          parentChunkLoadingFunction(data);
          while (resolves.length) {
            resolves.shift()();
          }
        };
      };
        `;

            const currentChunkName = chunk.name;
            const addRetryCode =
              !this.options.chunks ||
              this.options.chunks.includes(currentChunkName);
            const script = addRetryCode ? scriptWithRetry : source;
            return prettier.format(script, {
              singleQuote: true,
              parser: 'babel'
            });
          }
        );
      }
    });
  }
}

module.exports.RetryChunkLoadPlugin = RetryChunkLoadPlugin;
