/**
 * Design Tokens Build Pipeline
 *
 * Reads docs/brand/design-tokens.json (the single source of truth)
 * and generates the Tailwind v4 CSS @theme block used by the React UI.
 *
 * Usage: node scripts/build-tokens.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TOKENS_PATH = resolve(ROOT, 'BusinessDocs', 'brand', 'design-tokens.json');
const CSS_OUT = resolve(ROOT, 'src', 'webapp', 'ui', 'src', 'tokens.css');

const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf-8'));

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const lines = [
  '/* AUTO-GENERATED — do not edit manually. */',
  `/* Source: docs/brand/design-tokens.json (v${tokens.version}) */`,
  `/* Generated: ${new Date().toISOString().split('T')[0]} */`,
  '',
  '@theme {',
];

// --- Colors (light mode from "colors" flat map) ---
const colorMap = {
  background: tokens.colors.background,
  foreground: tokens.colors.text,
  card: tokens.colors.surface,
  'card-foreground': tokens.colors.text,
  popover: tokens.colors.surface,
  'popover-foreground': tokens.colors.text,
  primary: tokens.colors.primary,
  'primary-foreground': tokens.colors.textInverse,
  secondary: tokens.colors.secondary,
  'secondary-foreground': tokens.colors.textInverse,
  muted: tokens.colors.border,
  'muted-foreground': tokens.colors.textSecondary,
  accent: tokens.colors.accent,
  'accent-foreground': tokens.colors.textInverse,
  destructive: tokens.colors.error,
  'destructive-foreground': tokens.colors.textInverse,
  border: tokens.colors.border,
  input: tokens.colors.border,
  ring: tokens.colors.focusRing,
  success: tokens.colors.success,
  'success-foreground': tokens.colors.textInverse,
  warning: tokens.colors.warning,
  'warning-foreground': tokens.colors.textInverse,
  info: tokens.colors.info,
  'info-foreground': tokens.colors.textInverse,
};

for (const [name, hex] of Object.entries(colorMap)) {
  lines.push(`  --color-${name}: hsl(${hexToHsl(hex)});`);
}

// --- Typography ---
lines.push('');
lines.push(`  --font-family-sans: ${tokens.typography.fontFamilies.body};`);
lines.push(`  --font-family-mono: ${tokens.typography.fontFamilies.mono};`);

// --- Radius ---
lines.push('');
for (const [name, value] of Object.entries(tokens.borders.radius)) {
  lines.push(`  --radius-${name}: ${value};`);
}

// --- Shadows ---
lines.push('');
for (const [name, value] of Object.entries(tokens.shadows)) {
  lines.push(`  --shadow-${name}: ${value};`);
}

lines.push('}');

writeFileSync(CSS_OUT, lines.join('\n') + '\n', 'utf-8');
console.log(`✓ Design tokens written to ${CSS_OUT}`);
