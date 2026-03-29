import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'vitest';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

type ThemeName = 'light' | 'dark';

interface ContrastCase {
  component: string;
  state: string;
  foreground: string;
  background: string;
  minimumRatio: number;
  backgroundMix?: { overlay: string; weight: number };
}

function readUtf8(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function extractHslVar(css: string, varName: string): string {
  const pattern = new RegExp(`${varName}\\s*:\\s*(hsl\\([^;]+\\))\\s*;`);
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`Dense-surface contrast gate failed: missing variable ${varName}`);
  }
  return match[1];
}

function extractDarkBlock(css: string): string {
  const match = css.match(/html\.dark\s*\{([\s\S]*?)\n\}/);
  if (!match) {
    throw new Error('Dense-surface contrast gate failed: missing html.dark block in src/index.css');
  }
  return match[1];
}

function parseHsl(hsl: string): { h: number; s: number; l: number } {
  const match = hsl.match(/hsl\(\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%\s*\)/i);
  if (!match) {
    throw new Error(`Dense-surface contrast gate failed: unsupported color format "${hsl}"`);
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

function readThemePalette(theme: ThemeName): Record<string, string> {
  const tokensCss = readUtf8('src/tokens.css');
  const indexCss = readUtf8('src/index.css');

  const lightVars = {
    '--color-background': extractHslVar(tokensCss, '--color-background'),
    '--color-foreground': extractHslVar(tokensCss, '--color-foreground'),
    '--color-card': extractHslVar(tokensCss, '--color-card'),
    '--color-card-foreground': extractHslVar(tokensCss, '--color-card-foreground'),
    '--color-primary': extractHslVar(tokensCss, '--color-primary'),
    '--color-primary-foreground': extractHslVar(tokensCss, '--color-primary-foreground'),
    '--color-secondary': extractHslVar(tokensCss, '--color-secondary'),
    '--color-secondary-foreground': extractHslVar(tokensCss, '--color-secondary-foreground'),
    '--color-muted': extractHslVar(tokensCss, '--color-muted'),
    '--color-muted-foreground': extractHslVar(tokensCss, '--color-muted-foreground'),
    '--color-destructive': extractHslVar(tokensCss, '--color-destructive'),
    '--color-info': extractHslVar(tokensCss, '--color-info'),
    '--color-info-foreground': extractHslVar(tokensCss, '--color-info-foreground'),
    '--color-warning': extractHslVar(tokensCss, '--color-warning'),
    '--color-warning-foreground': extractHslVar(tokensCss, '--color-warning-foreground'),
    '--color-success': extractHslVar(tokensCss, '--color-success'),
    '--color-success-foreground': extractHslVar(tokensCss, '--color-success-foreground'),
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
    '--color-primary': extractHslVar(darkBlock, '--color-primary'),
    '--color-primary-foreground': extractHslVar(darkBlock, '--color-primary-foreground'),
    '--color-secondary': extractHslVar(darkBlock, '--color-secondary'),
    '--color-secondary-foreground': extractHslVar(darkBlock, '--color-secondary-foreground'),
    '--color-muted': extractHslVar(darkBlock, '--color-muted'),
    '--color-muted-foreground': extractHslVar(darkBlock, '--color-muted-foreground'),
    '--color-destructive': extractHslVar(darkBlock, '--color-destructive'),
    '--color-info': extractHslVar(darkBlock, '--color-info'),
    '--color-info-foreground': extractHslVar(darkBlock, '--color-info-foreground'),
    '--color-warning': extractHslVar(darkBlock, '--color-warning'),
    '--color-warning-foreground': extractHslVar(darkBlock, '--color-warning-foreground'),
    '--color-success': extractHslVar(darkBlock, '--color-success'),
    '--color-success-foreground': extractHslVar(darkBlock, '--color-success-foreground'),
  };
}

function colorFromVar(theme: ThemeName, varName: string): RgbColor {
  const palette = readThemePalette(theme);
  return hslToRgb(parseHsl(palette[varName]));
}

function assertContrast(theme: ThemeName, testCase: ContrastCase): void {
  const foreground = colorFromVar(theme, testCase.foreground);
  const baseBackground = colorFromVar(theme, testCase.background);
  const background = testCase.backgroundMix
    ? mixRgb(
        colorFromVar(theme, testCase.backgroundMix.overlay),
        baseBackground,
        testCase.backgroundMix.weight
      )
    : baseBackground;

  const ratio = contrastRatio(foreground, background);
  if (ratio < testCase.minimumRatio) {
    throw new Error(
      `Dense-surface contrast regression: [theme=${theme}] [component=${testCase.component}] [state=${testCase.state}] ratio=${formatRatio(ratio)} minimum=${testCase.minimumRatio}`
    );
  }
}

describe('Dense-surface contrast and readability regression', () => {
  const themes: ThemeName[] = ['light', 'dark'];

  const badgeCases: ContrastCase[] = [
    {
      component: 'badge',
      state: 'variant=default',
      foreground: '--color-primary-foreground',
      background: '--color-primary',
      minimumRatio: 4.5,
    },
    {
      component: 'badge',
      state: 'variant=secondary',
      foreground: '--color-secondary-foreground',
      background: '--color-secondary',
      minimumRatio: 4.5,
    },
    {
      component: 'badge',
      state: 'variant=neutral',
      foreground: '--color-muted-foreground',
      background: '--color-muted',
      minimumRatio: 4.5,
    },
  ];

  const denseTableCases: ContrastCase[] = [
    {
      component: 'dense-table',
      state: 'header-label',
      foreground: '--color-muted-foreground',
      background: '--color-card',
      minimumRatio: 4.5,
      backgroundMix: { overlay: '--color-muted', weight: 0.26 },
    },
    {
      component: 'dense-table',
      state: 'body-cell',
      foreground: '--color-foreground',
      background: '--color-card',
      minimumRatio: 4.5,
    },
    {
      component: 'dense-table',
      state: 'metadata-label',
      foreground: '--color-muted-foreground',
      background: '--color-background',
      minimumRatio: 4.5,
    },
  ];

  const darkSemanticSurfaceCases: ContrastCase[] = [
    {
      component: 'semantic-surface',
      state: 'surface=card-body',
      foreground: '--color-foreground',
      background: '--color-card',
      minimumRatio: 4.5,
    },
    {
      component: 'semantic-surface',
      state: 'surface=muted-metadata',
      foreground: '--color-muted-foreground',
      background: '--color-muted',
      minimumRatio: 4.5,
    },
    {
      component: 'semantic-surface',
      state: 'surface=popover-foreground',
      foreground: '--color-card-foreground',
      background: '--color-card',
      minimumRatio: 4.5,
    },
  ];

  it('validates badge and dense metadata/table contrast thresholds', () => {
    const allCases = [...badgeCases, ...denseTableCases];
    for (const theme of themes) {
      for (const testCase of allCases) {
        assertContrast(theme, testCase);
      }
    }
  });

  it('keeps dark-mode semantic surface readability above threshold', () => {
    for (const testCase of darkSemanticSurfaceCases) {
      assertContrast('dark', testCase);
    }
  });
});
