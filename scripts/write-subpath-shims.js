// scripts/write-subpath-shims.js
//
// Vite/webpack/Node all fully respect package.json's root "exports" map, so
// `import '@calstins/icvng-core/store'` resolves correctly for the web
// client out of the box. Metro (React Native's bundler) does NOT respect
// "exports" by default — it falls back to legacy Node resolution, which
// means: for `require('pkg/subpath')`, look for a physical `subpath/`
// directory sitting directly at the package root (NOT nested under dist/)
// and read ITS OWN package.json for a "main" field.
//
// This script writes exactly that: root-level api/, store/, pricing/
// folders, each containing a tiny package.json that points into the real
// build output under dist/. Re-run after every `tsup` build — wired into
// the "build" script in package.json so it always happens automatically.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '../..');

const subpaths = ['api', 'store', 'pricing', 'catalog', 'auth', 'cart', 'wishlist', 'compare', 'checkout', 'shipping', 'address'];

for (const subpath of subpaths) {
  // Root-level folder (e.g. <pkg>/store/), NOT nested under dist/ — Metro's
  // plain require('pkg/store') resolution looks for a physical `store`
  // directory sitting directly next to package.json, the same place Node's
  // pre-"exports" resolution algorithm would look.
  const dir = path.join(rootDir, subpath);
  mkdirSync(dir, { recursive: true });
  const shim = {
    main: `../dist/${subpath}/index.cjs`,
    module: `../dist/${subpath}/index.js`,
  };
  const outPath = path.join(dir, 'package.json');
  writeFileSync(outPath, JSON.stringify(shim, null, 2) + '\n');
  console.log(`[icvng-core] wrote ${path.relative(rootDir, outPath)}`);
}
