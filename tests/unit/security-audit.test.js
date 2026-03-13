// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M5 Security Audit — Regression tests for hardening changes.
'use strict';

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');

describe('M5 Security Hardening', () => {
  describe('Dockerfile', () => {
    const dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');

    it('runs as non-root user', () => {
      expect(dockerfile).toContain('USER node');
    });

    it('sets ownership to node user', () => {
      expect(dockerfile).toMatch(/chown.*node:node/);
    });

    it('includes a HEALTHCHECK', () => {
      expect(dockerfile).toContain('HEALTHCHECK');
    });

    it('uses alpine base image', () => {
      expect(dockerfile).toMatch(/FROM node:\d+-alpine/);
    });
  });

  describe('docker-compose.yml', () => {
    const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');

    it('binds port to localhost only', () => {
      expect(compose).toContain('127.0.0.1:3000:3000');
    });

    it('sets memory limit', () => {
      expect(compose).toMatch(/memory:\s*512M/);
    });

    it('sets CPU limit', () => {
      expect(compose).toMatch(/cpus:\s*['"]1\.0['"]/);
    });
  });

  describe('Security Headers (middleware.js)', () => {
    const middleware = fs.readFileSync(path.join(ROOT, 'src', 'webapp', 'middleware.js'), 'utf8');

    it('sets X-Content-Type-Options: nosniff', () => {
      expect(middleware).toContain("'X-Content-Type-Options', 'nosniff'");
    });

    it('sets X-Frame-Options: SAMEORIGIN', () => {
      expect(middleware).toContain("'X-Frame-Options', 'SAMEORIGIN'");
    });

    it('sets Content-Security-Policy with object-src none', () => {
      expect(middleware).toContain("object-src 'none'");
    });

    it('sets X-DNS-Prefetch-Control: off', () => {
      expect(middleware).toContain("'X-DNS-Prefetch-Control', 'off'");
    });

    it('sets X-Permitted-Cross-Domain-Policies: none', () => {
      expect(middleware).toContain("'X-Permitted-Cross-Domain-Policies', 'none'");
    });

    it('sets Cross-Origin-Opener-Policy', () => {
      expect(middleware).toContain("'Cross-Origin-Opener-Policy', 'same-origin'");
    });

    it('sets Permissions-Policy denying sensitive APIs', () => {
      expect(middleware).toContain('camera=()');
      expect(middleware).toContain('microphone=()');
      expect(middleware).toContain('geolocation=()');
    });

    it('CSP includes explicit connect-src and font-src', () => {
      expect(middleware).toContain("connect-src 'self'");
      expect(middleware).toContain("font-src 'self'");
    });
  });

  describe('Path Traversal Protection', () => {
    const middleware = fs.readFileSync(path.join(ROOT, 'src', 'webapp', 'middleware.js'), 'utf8');

    it('safePath function exists', () => {
      expect(middleware).toContain('function safePath(base, relative)');
    });

    it('blocks path traversal with error', () => {
      expect(middleware).toContain('PATH_TRAVERSAL');
    });
  });

  describe('Secret Detection', () => {
    const middleware = fs.readFileSync(path.join(ROOT, 'src', 'webapp', 'middleware.js'), 'utf8');

    it('detects AWS access keys', () => {
      expect(middleware).toContain('AWS Access Key');
    });

    it('detects GitHub tokens', () => {
      expect(middleware).toContain('GitHub Token');
    });

    it('detects private keys', () => {
      expect(middleware).toContain('Private Key');
    });
  });

  describe('TypeScript Foundation', () => {
    it('tsconfig.json exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'tsconfig.json'))).toBe(true);
    });

    it('tsconfig enables checkJs for incremental adoption', () => {
      const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8'));
      expect(tsconfig.compilerOptions.allowJs).toBe(true);
      expect(tsconfig.compilerOptions.checkJs).toBe(true);
      expect(tsconfig.compilerOptions.noEmit).toBe(true);
    });

    it('type definitions directory exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'src', 'webapp', 'types', 'index.d.ts'))).toBe(true);
    });
  });

  describe('.dockerignore', () => {
    const dockerignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');

    it('excludes .git directory', () => {
      expect(dockerignore).toContain('.git');
    });

    it('excludes node_modules', () => {
      expect(dockerignore).toContain('node_modules');
    });

    it('excludes test files', () => {
      expect(dockerignore).toContain('tests/');
    });

    it('excludes .env files', () => {
      expect(dockerignore).toContain('.env');
    });
  });

  describe('No dangerous patterns in source', () => {
    const srcDir = path.join(ROOT, 'src', 'webapp');

    function readAllJs(dir) {
      let content = '';
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          content += readAllJs(full);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
          content += fs.readFileSync(full, 'utf8') + '\n';
        }
      }
      return content;
    }

    const allSource = readAllJs(srcDir);

    it('no eval() calls', () => {
      // Match standalone eval( but not inside comments or strings like "no-eval"
      const evalCalls = allSource.match(/[^a-zA-Z_]eval\s*\(/g) || [];
      expect(evalCalls.length).toBe(0);
    });

    it('no new Function() calls', () => {
      const funcCalls = allSource.match(/new\s+Function\s*\(/g) || [];
      expect(funcCalls.length).toBe(0);
    });

    it('child_process usage is allowlist-gated', () => {
      // Only dashboard.js should use execSync, via ALLOWED_GIT_COMMANDS allowlist
      if (allSource.includes('execSync')) {
        expect(allSource).toContain('ALLOWED_GIT_COMMANDS');
      }
    });
  });
});
