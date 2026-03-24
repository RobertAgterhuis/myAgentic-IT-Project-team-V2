'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const templatesRoot = path.join(root, 'templates', 'sdlc', 'agents');

const criticalTemplates = [
  '00-orchestrator.md',
  '05-software-architect.md',
  '06-senior-developer.md',
  '17-synthesis-agent.md',
  '20-implementation-agent.md',
  '21-test-agent.md',
];

describe('prompt template snapshots', () => {
  for (const file of criticalTemplates) {
    it(`matches snapshot: ${file}`, () => {
      const filePath = path.join(templatesRoot, file);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toMatchSnapshot();
    });
  }
});
