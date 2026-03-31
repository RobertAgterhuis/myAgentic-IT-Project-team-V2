import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

import * as __req_0 from '../../platform/sdlc/adapters/security-adapter';
const { SecurityAdapter } = __req_0;

describe('SecurityAdapter runtime smoke', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'security-adapter-'));
    await fs.writeFile(
      path.join(tempDir, 'secrets.env'),
      'password = "supersecretvalue"\n',
      'utf8'
    );
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('dependency-audit executes through the real command path', async () => {
    const adapter = new SecurityAdapter({ tools: ['npm-audit'] });

    const result = await adapter.execute('dependency-audit', { cwd: process.cwd() });

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data).toHaveProperty('vulnerabilities');
      expect(result.data).toHaveProperty('summary');
    } else {
      expect(typeof result.error).toBe('string');
    }
  }, 60000);

  it('secret-scan executes through the real command path', async () => {
    const adapter = new SecurityAdapter({ tools: ['grep'] });

    const result = await adapter.execute('secret-scan', { path: tempDir, cwd: tempDir });

    expect(result).toHaveProperty('success');
    expect(result.data).toHaveProperty('secrets_found');
    expect(Array.isArray(result.data.findings)).toBe(true);
  }, 30000);

  it('license-check executes through the real command path', async () => {
    const adapter = new SecurityAdapter({ tools: ['license-checker'] });

    const result = await adapter.execute('license-check', { cwd: process.cwd() });

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data).toHaveProperty('packages');
      expect(result.data).toHaveProperty('violations');
    } else {
      expect(typeof result.error).toBe('string');
    }
  }, 60000);
});
