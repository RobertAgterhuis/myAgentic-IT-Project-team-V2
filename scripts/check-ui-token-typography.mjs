#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const uiRoot = path.join(root, 'src', 'webapp', 'ui', 'src');

const allowedLiteralFiles = new Set([
  normalize(path.join(uiRoot, 'tokens.css')),
  normalize(path.join(uiRoot, 'index.css')),
  normalize(path.join(uiRoot, 'components', 'cockpit', 'interactive-lineage-graph.tsx')),
]);

const includeExt = new Set(['.ts', '.tsx', '.css']);
const ignoredDirs = new Set(['node_modules', 'dist', 'storybook-static', '.storybook']);

const colorLiteralInCode = /(["'`])\s*(#(?:[0-9a-fA-F]{3,8})|rgba?\(|hsla?\()/g;
const colorLiteralInCss = /(?:#(?:[0-9a-fA-F]{3,8})|rgba?\(|hsla?\()/g;
const fontFamilyInCode = /fontFamily\s*:/g;
const fontFamilyInCss = /font-family\s*:/g;

const violations = [];

walk(uiRoot);

if (violations.length > 0) {
  console.error('UI token/typography consistency check failed.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('UI token/typography consistency check passed.');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
      continue;
    }

    const filePath = path.join(dir, entry.name);
    const ext = path.extname(filePath);
    if (!includeExt.has(ext)) continue;
    checkFile(filePath, ext);
  }
}

function checkFile(filePath, ext) {
  const normalized = normalize(filePath);
  if (allowedLiteralFiles.has(normalized)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (ext === '.css') {
      if (fontFamilyInCss.test(line)) {
        violations.push(`${rel(filePath)}:${lineNo} avoid raw font-family; use token variables.`);
      }
      fontFamilyInCss.lastIndex = 0;

      if (line.includes('var(')) {
        continue;
      }

      if (colorLiteralInCss.test(line)) {
        violations.push(`${rel(filePath)}:${lineNo} hardcoded color literal detected.`);
      }
      colorLiteralInCss.lastIndex = 0;
      continue;
    }

    if (fontFamilyInCode.test(line)) {
      violations.push(
        `${rel(filePath)}:${lineNo} avoid inline fontFamily; use tokenized class styles.`
      );
    }
    fontFamilyInCode.lastIndex = 0;

    if (line.includes('var(')) {
      continue;
    }

    if (colorLiteralInCode.test(line)) {
      violations.push(`${rel(filePath)}:${lineNo} hardcoded color literal detected.`);
    }
    colorLiteralInCode.lastIndex = 0;
  }
}

function rel(filePath) {
  return normalize(path.relative(root, filePath));
}

function normalize(filePath) {
  return filePath.replace(/\\/g, '/');
}
