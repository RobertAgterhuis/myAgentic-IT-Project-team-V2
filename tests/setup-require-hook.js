/**
 * Vitest setup file that patches Module._resolveFilename so that
 * require('../../path/module') tries .ts when .js is not found.
 * This is needed after the backend .js → .ts rename.
 *
 * tsx/cjs registers a require hook that compiles TypeScript on the fly,
 * so once resolution redirects to .ts, Node can load it.
 */
'use strict';

// Register tsx so require() can load .ts files
require('tsx/cjs');

const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const origResolve = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;

    // Only try .ts for relative paths (starts with . or /)
    if (!request.startsWith('.') && !path.isAbsolute(request)) throw err;

    const parentDir = parent?.filename ? path.dirname(parent.filename) : process.cwd();
    const resolved = path.resolve(parentDir, request);

    // Case 1: no extension → try .ts
    const ext = path.extname(resolved);
    if (!ext) {
      const tsPath = resolved + '.ts';
      if (fs.existsSync(tsPath)) {
        return origResolve.call(this, tsPath, parent, isMain, options);
      }
    }

    // Case 2: .js extension → try .ts
    if (ext === '.js') {
      const tsPath = resolved.replace(/\.js$/, '.ts');
      if (fs.existsSync(tsPath)) {
        return origResolve.call(this, tsPath, parent, isMain, options);
      }
    }

    throw err;
  }
};
