#!/usr/bin/env node
/**
 * check-bundle-budget.mjs
 * P1-UI-E3-I1 — Bundle size budget gate.
 *
 * Reads the Vite/Rollup build output (dist/) and fails if any single JS chunk
 * exceeds the configured budget. Designed to be run as a CI step after `npm run build`.
 *
 * Usage:
 *   node scripts/check-bundle-budget.mjs [--dir <dist-path>] [--budget <kb>]
 *
 * Defaults:
 *   --dir    src/webapp/ui/dist
 *   --budget 500   (KB uncompressed per chunk)
 */
import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const BUDGET_KB_DEFAULT = 500;
const DIST_DEFAULT = 'src/webapp/ui/dist';

function parseArgs(argv) {
  const args = { dir: DIST_DEFAULT, budget: BUDGET_KB_DEFAULT };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dir' && argv[i + 1]) args.dir = argv[++i];
    if (argv[i] === '--budget' && argv[i + 1]) args.budget = Number(argv[++i]);
  }
  return args;
}

async function collectJsFiles(dirPath) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    console.error(`[bundle-budget] Cannot read dist directory: ${dirPath}`);
    console.error('[bundle-budget] Run `npm run build` inside src/webapp/ui first.');
    process.exit(1);
  }
  for (const entry of entries) {
    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(full)));
    } else if (entry.isFile() && extname(entry.name) === '.js') {
      const { size } = await stat(full);
      files.push({ path: full, name: basename(full), sizeKb: size / 1024 });
    }
  }
  return files;
}

async function main() {
  const { dir, budget } = parseArgs(process.argv);

  const assetsDir = join(dir, 'assets');
  const jsFiles = await collectJsFiles(assetsDir);

  if (jsFiles.length === 0) {
    console.warn('[bundle-budget] No JS files found in dist/assets — skipping check.');
    process.exit(0);
  }

  let passed = true;
  const rows = jsFiles
    .sort((a, b) => b.sizeKb - a.sizeKb)
    .map((file) => {
      const over = file.sizeKb > budget;
      if (over) passed = false;
      const status = over ? '✗ OVER BUDGET' : '✓ ok';
      return `  ${status.padEnd(16)} ${file.sizeKb.toFixed(1).padStart(8)} KB  ${file.name}`;
    });

  console.log(`\n[bundle-budget] Budget: ${budget} KB per chunk\n`);
  console.log(rows.join('\n'));
  console.log('');

  if (!passed) {
    console.error(
      `[bundle-budget] ✗ One or more chunks exceed the ${budget} KB budget.\n` +
        '  → Use code-splitting (lazy imports) or move large dependencies to a separate vendor chunk.'
    );
    process.exit(1);
  }

  const largest = jsFiles[0];
  console.log(
    `[bundle-budget] ✓ All chunks within budget. Largest: ${largest.sizeKb.toFixed(1)} KB (${largest.name})`
  );
}

main();
