/**
 * typescript-eslint は TypeScript 7.0 の Compiler API 非対応のため、
 * ESLint 実行時だけ `require('typescript')` を TS 6 API に差し替える。
 * @see https://github.com/typescript-eslint/typescript-eslint/issues/10940
 */
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "typescript") {
    return originalLoad.call(this, "@typescript/typescript6", parent, isMain);
  }
  return originalLoad.apply(this, arguments);
};
