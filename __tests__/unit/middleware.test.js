/**
 * Unit Tests: Middleware & Utility Functions
 * SP-11-612 Test Strategy Framework
 *
 * Tests pure utility functions from the webapp middleware module.
 * No server startup required — tests exported functions directly.
 */

const path = require('path');

const {
  sanitizeMarkdown,
  sanitizeQID,
  detectSecrets,
  safePath,
  assertString,
} = require('../../.github/webapp/middleware');

describe('SP-11-612: Middleware Utility Tests', () => {
  describe('safePath — Path traversal prevention (RISK-801)', () => {
    const base = path.resolve(__dirname, '../../.github/webapp');

    it('should resolve valid relative paths', () => {
      const result = safePath(base, 'index.html');
      expect(result).toBe(path.resolve(base, 'index.html'));
    });

    it('should resolve nested paths', () => {
      const result = safePath(base, 'routes/decisions.js');
      expect(result).toBe(path.resolve(base, 'routes/decisions.js'));
    });

    it('should block path traversal with ../', () => {
      expect(() => safePath(base, '../../../etc/passwd')).toThrow('Path traversal blocked');
    });

    it('should throw with status 403 on traversal', () => {
      expect(() => safePath(base, '../../secret')).toThrow();
      try {
        safePath(base, '../../secret');
      } catch (err) {
        expect(err.status).toBe(403);
        expect(err.errorCode).toBe('PATH_TRAVERSAL');
      }
    });

    it('should allow current directory reference', () => {
      const result = safePath(base, './index.html');
      expect(result).toBe(path.resolve(base, 'index.html'));
    });
  });

  describe('sanitizeMarkdown — Injection prevention (RISK-801)', () => {
    it('should escape heading syntax', () => {
      const result = sanitizeMarkdown('# Injected Heading');
      expect(result).not.toMatch(/^# /m);
    });

    it('should escape table pipe characters', () => {
      const result = sanitizeMarkdown('| injected | table |');
      expect(result).toMatch(/^\\|/);
    });

    it('should preserve normal text', () => {
      const result = sanitizeMarkdown('This is normal text without special syntax');
      expect(result).toBe('This is normal text without special syntax');
    });

    it('should handle non-string input gracefully', () => {
      expect(sanitizeMarkdown(null)).toBeNull();
      expect(sanitizeMarkdown(undefined)).toBeUndefined();
      expect(sanitizeMarkdown(42)).toBe(42);
    });

    it('should escape horizontal rule syntax', () => {
      const result = sanitizeMarkdown('---');
      expect(result).toContain('\\---');
    });
  });

  describe('sanitizeQID — Question ID neutralization', () => {
    it('should break Q-ID patterns in user input', () => {
      const result = sanitizeQID('My answer references Q-01-0001');
      expect(result).not.toContain('Q-01-0001');
    });

    it('should preserve text without Q-ID patterns', () => {
      const result = sanitizeQID('Normal answer text here');
      expect(result).toBe('Normal answer text here');
    });

    it('should handle non-string input', () => {
      expect(sanitizeQID(null)).toBeNull();
      expect(sanitizeQID(42)).toBe(42);
    });
  });

  describe('detectSecrets — Secret pattern scanning (RISK-806)', () => {
    it('should detect AWS access keys', () => {
      const result = detectSecrets('key=AKIAIOSFODNN7EXAMPLE');
      expect(result).toContain('AWS Access Key');
    });

    it('should detect GitHub tokens', () => {
      const result = detectSecrets('token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl');
      expect(result).toContain('GitHub Token');
    });

    it('should detect private key headers', () => {
      const result = detectSecrets('-----BEGIN RSA PRIVATE KEY-----');
      expect(result).toContain('Private Key');
    });

    it('should detect generic API key patterns', () => {
      const result = detectSecrets('api_key=abcdefghijklmnopqrstuvwxyz12345678');
      expect(result).toContain('Generic API Key');
    });

    it('should return empty array for clean text', () => {
      const result = detectSecrets('This is just normal text with no secrets');
      expect(result).toEqual([]);
    });

    it('should handle non-string input', () => {
      expect(detectSecrets(null)).toEqual([]);
      expect(detectSecrets(42)).toEqual([]);
    });

    it('should detect multiple patterns in one string', () => {
      const input = 'key=AKIAIOSFODNN7EXAMPLE and -----BEGIN PRIVATE KEY-----';
      const result = detectSecrets(input);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('assertString — Input validation', () => {
    it('should accept valid strings', () => {
      expect(() => assertString('hello', 'field')).not.toThrow();
    });

    it('should reject non-string values', () => {
      expect(() => assertString(42, 'field')).toThrow('field must be a string');
      expect(() => assertString(null, 'field')).toThrow('field must be a string');
      expect(() => assertString(undefined, 'field')).toThrow('field must be a string');
    });

    it('should reject strings exceeding max length', () => {
      const longString = 'a'.repeat(1001);
      expect(() => assertString(longString, 'field')).toThrow('exceeds max length');
    });

    it('should accept strings within custom max length', () => {
      const str = 'a'.repeat(50);
      expect(() => assertString(str, 'field', 50)).not.toThrow();
    });

    it('should reject strings exceeding custom max length', () => {
      const str = 'a'.repeat(51);
      expect(() => assertString(str, 'field', 50)).toThrow('exceeds max length');
    });

    it('should throw with status 400', () => {
      expect(() => assertString(42, 'field')).toThrow();
      try {
        assertString(42, 'field');
      } catch (err) {
        expect(err.status).toBe(400);
        expect(err.errorCode).toBe('INVALID_INPUT');
      }
    });

    it('should accept empty strings', () => {
      expect(() => assertString('', 'field')).not.toThrow();
    });
  });
});
