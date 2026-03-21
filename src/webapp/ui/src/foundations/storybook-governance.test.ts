import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function uiSrcRoot(): string {
  const cwd = process.cwd();
  const monorepoPath = resolve(cwd, 'src/webapp/ui/src');
  if (existsSync(monorepoPath)) return monorepoPath;
  return resolve(cwd, 'src');
}

function readUtf8(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

describe('Storybook governance', () => {
  it('Core page stories export required state variants', () => {
    const requiredExports = ['Populated', 'Loading', 'Error'];
    const pageStories = [
      join(uiSrcRoot(), 'pages/overview/overview-page.stories.tsx'),
      join(uiSrcRoot(), 'pages/sessions/sessions-page.stories.tsx'),
      join(uiSrcRoot(), 'pages/sessions/session-detail-page.stories.tsx'),
      join(uiSrcRoot(), 'pages/pipeline/pipeline-page.stories.tsx'),
      join(uiSrcRoot(), 'pages/commands/commands-page.stories.tsx'),
    ];

    for (const storyPath of pageStories) {
      const content = readUtf8(storyPath);
      for (const exportName of requiredExports) {
        expect(content).toMatch(new RegExp(`export\\s+const\\s+${exportName}\\s*:`));
      }
    }
  });

  it('Layout stories declare autodocs tags and at least one named story export', () => {
    const layoutDir = join(uiSrcRoot(), 'components/layout');
    const storyFiles = readdirSync(layoutDir)
      .filter((name) => name.endsWith('.stories.tsx'))
      .sort();

    expect(storyFiles.length).toBeGreaterThan(0);

    for (const storyFile of storyFiles) {
      const storyPath = join(layoutDir, storyFile);
      const content = readUtf8(storyPath);
      expect(content).toMatch(/tags:\s*\[\s*['"]autodocs['"]\s*\]/);
      expect(content).toMatch(/export\s+const\s+[A-Z][A-Za-z0-9_]*\s*:/);
    }
  });
});
