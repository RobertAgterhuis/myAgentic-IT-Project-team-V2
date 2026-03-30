import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'vitest';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

type ThemeName = 'light' | 'dark';

function readUtf8(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function extractHslVar(css: string, varName: string): string {
  const pattern = new RegExp(`${varName}\\s*:\\s*(hsl\\([^;]+\\))\\s*;`);
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`Monaco contrast gate failed: missing variable ${varName}`);
  }
  return match[1];
}

function extractDarkBlock(css: string): string {
  const match = css.match(/html\.dark\s*\{([\s\S]*?)\n\}/);
  if (!match) {
    throw new Error('Monaco contrast gate failed: missing html.dark block in src/index.css');
  }
  return match[1];
}

function parseHsl(hsl: string): { h: number; s: number; l: number } {
  const match = hsl.match(/hsl\(\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%\s*\)/i);
  if (!match) {
    throw new Error(`Monaco contrast gate failed: unsupported color format "${hsl}"`);
  }

  return {
    h: Number(match[1]),
    s: Number(match[2]) / 100,
    l: Number(match[3]) / 100,
  };
}

function hslToRgb(input: { h: number; s: number; l: number }): RgbColor {
  const { h, s, l } = input;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r1 = c;
    g1 = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    r1 = x;
    g1 = c;
  } else if (hPrime >= 2 && hPrime < 3) {
    g1 = c;
    b1 = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    g1 = x;
    b1 = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const m = l - c / 2;
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}

function linearizeChannel(channel: number): number {
  const normalized = channel / 255;
  if (normalized <= 0.03928) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: RgbColor): number {
  const r = linearizeChannel(color.r);
  const g = linearizeChannel(color.g);
  const b = linearizeChannel(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: RgbColor, background: RgbColor): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function mixRgb(a: RgbColor, b: RgbColor, aWeight: number): RgbColor {
  const bWeight = 1 - aWeight;
  return {
    r: a.r * aWeight + b.r * bWeight,
    g: a.g * aWeight + b.g * bWeight,
    b: a.b * aWeight + b.b * bWeight,
  };
}

function formatRatio(value: number): string {
  return value.toFixed(2);
}

function assertContrast(
  theme: ThemeName,
  surface: string,
  foreground: RgbColor,
  background: RgbColor,
  minimumRatio: number
): void {
  const ratio = contrastRatio(foreground, background);
  if (ratio < minimumRatio) {
    throw new Error(
      `Monaco contrast regression: [theme=${theme}] [surface=${surface}] ratio=${formatRatio(ratio)} minimum=${minimumRatio}`
    );
  }
}

function readThemePalette(theme: ThemeName): Record<string, string> {
  const tokensCss = readUtf8('src/tokens.css');
  const indexCss = readUtf8('src/index.css');

  const lightVars = {
    '--color-background': extractHslVar(tokensCss, '--color-background'),
    '--color-foreground': extractHslVar(tokensCss, '--color-foreground'),
    '--color-card': extractHslVar(tokensCss, '--color-card'),
    '--color-card-foreground': extractHslVar(tokensCss, '--color-card-foreground'),
    '--color-muted-foreground': extractHslVar(tokensCss, '--color-muted-foreground'),
    '--color-info': extractHslVar(tokensCss, '--color-info'),
    '--color-warning': extractHslVar(tokensCss, '--color-warning'),
    '--color-destructive': extractHslVar(tokensCss, '--color-destructive'),
  };

  if (theme === 'light') {
    return lightVars;
  }

  const darkBlock = extractDarkBlock(indexCss);
  return {
    '--color-background': extractHslVar(darkBlock, '--color-background'),
    '--color-foreground': extractHslVar(darkBlock, '--color-foreground'),
    '--color-card': extractHslVar(darkBlock, '--color-card'),
    '--color-card-foreground': extractHslVar(darkBlock, '--color-card-foreground'),
    '--color-muted-foreground': extractHslVar(darkBlock, '--color-muted-foreground'),
    '--color-info': extractHslVar(darkBlock, '--color-info'),
    '--color-warning': extractHslVar(darkBlock, '--color-warning'),
    '--color-destructive': extractHslVar(darkBlock, '--color-destructive'),
  };
}

function colorFromVar(theme: ThemeName, varName: string): RgbColor {
  const palette = readThemePalette(theme);
  return hslToRgb(parseHsl(palette[varName]));
}

describe('Monaco contrast and readability regression', () => {
  const themes: ThemeName[] = ['light', 'dark'];

  it('passes viewer/editor/diff text contrast checks in both themes', () => {
    for (const theme of themes) {
      const cardForeground = colorFromVar(theme, '--color-card-foreground');
      const foreground = colorFromVar(theme, '--color-foreground');
      const cardBackground = colorFromVar(theme, '--color-card');
      const background = colorFromVar(theme, '--color-background');

      assertContrast(theme, 'viewer-pane', cardForeground, cardBackground, 4.5);
      assertContrast(theme, 'editor-pane', foreground, background, 4.5);
      assertContrast(theme, 'diff-pane', foreground, cardBackground, 4.5);
    }
  });

  it('keeps diff gutter annotations and evidence decoration readability above threshold', () => {
    for (const theme of themes) {
      const background = colorFromVar(theme, '--color-background');
      const cardBackground = colorFromVar(theme, '--color-card');
      const foreground = colorFromVar(theme, '--color-foreground');
      const mutedForeground = colorFromVar(theme, '--color-muted-foreground');
      const info = colorFromVar(theme, '--color-info');
      const warning = colorFromVar(theme, '--color-warning');
      const destructive = colorFromVar(theme, '--color-destructive');

      // Annotation summary text in diff pane metadata rows.
      assertContrast(theme, 'diff-gutter-annotation-text', mutedForeground, cardBackground, 4.5);

      // Evidence line decoration is color-mixed in CSS at ~16% accent over background.
      const evidenceBackground = mixRgb(warning, background, 0.16);
      assertContrast(theme, 'evidence-decoration-text', foreground, evidenceBackground, 4.5);

      // Gutter accent rails should remain distinguishable as non-text cues.
      assertContrast(theme, 'diff-gutter-accent-info', info, background, 3.0);
      assertContrast(theme, 'diff-gutter-accent-warning', warning, background, 3.0);
      assertContrast(theme, 'diff-gutter-accent-destructive', destructive, background, 3.0);
    }
  });
});
