/**
 * typescript-eslint は TypeScript 7.0 の Compiler API 非対応のため、
 * ESLint 実行時だけ `require('typescript')` を TS 6 API に差し替える。
 * @see https://github.com/typescript-eslint/typescript-eslint/issues/10940
 */
const Module = require("node:module");

const originalLoad = Module._load;
let resolvingTypescript = false;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "typescript") {
    // @typescript/typescript6 のロード中に再度 require('typescript') が
    // 走ると無限再帰になるため、再入時は差し替えず素通しする。
    if (resolvingTypescript) {
      return originalLoad.apply(this, arguments);
    }
    resolvingTypescript = true;
    try {
      return originalLoad.call(this, "@typescript/typescript6", parent, isMain);
    } finally {
      resolvingTypescript = false;
    }
  }
  return originalLoad.apply(this, arguments);
};
