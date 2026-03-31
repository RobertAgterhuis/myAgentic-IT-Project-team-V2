import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const templatesRoot = path.join(root, 'templates', 'sdlc', 'agents');

// All 39 agent skill templates must be snapshot-tested so accidental
// prompt regressions are caught before merge (#1059).
const allTemplates = fs
  .readdirSync(templatesRoot)
  .filter((f) => f.endsWith('.md'))
  .sort();

describe('prompt template snapshots', () => {
  for (const file of allTemplates) {
    it(`matches snapshot: ${file}`, () => {
      const filePath = path.join(templatesRoot, file);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toMatchSnapshot();
    });
  }
});
