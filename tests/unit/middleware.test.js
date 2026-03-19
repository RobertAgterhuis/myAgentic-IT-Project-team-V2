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
  structuredLog,
  log,
  checkSecretsInBody,
  handleRouteError,
  handleMethodNotAllowed,
  setSecurityHeaders,
} = require('../../src/webapp/middleware');

function makeMockRes(opts = {}) {
  const headers = {};
  const res = {
    headersSent: opts.headersSent ?? false,
    _status: null,
    _body: null,
    _headers: headers,
    setHeader(k, v) {
      headers[k] = v;
    },
    writeHead(status, hdrs) {
      this._status = status;
      Object.assign(headers, hdrs);
    },
    end(body) {
      this._body = body ?? null;
    },
  };
  return res;
}

describe('SP-11-612: Middleware Utility Tests', () => {
  describe('safePath — Path traversal prevention (RISK-801)', () => {
    const base = path.resolve(__dirname, '../../src/webapp');

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

  describe('structuredLog — structured output', () => {
    it('writes to stdout for info level', () => {
      const lines = [];
      const orig = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => {
        lines.push(s);
        return true;
      };
      structuredLog('info', 'test_event', { key: 'val' });
      process.stdout.write = orig;
      expect(lines.length).toBeGreaterThan(0);
      const parsed = JSON.parse(lines[0]);
      expect(parsed.message).toBe('test_event');
      expect(parsed.key).toBe('val');
    });

    it('writes to stderr for error level', () => {
      const lines = [];
      const orig = process.stderr.write.bind(process.stderr);
      process.stderr.write = (s) => {
        lines.push(s);
        return true;
      };
      structuredLog('error', 'err_event');
      process.stderr.write = orig;
      expect(lines.length).toBeGreaterThan(0);
      const parsed = JSON.parse(lines[0]);
      expect(parsed.level).toBe('error');
    });

    it('suppresses messages below configured log level', () => {
      const lines = [];
      const orig = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => {
        lines.push(s);
        return true;
      };
      structuredLog('debug', 'should_be_suppressed');
      process.stdout.write = orig;
      // debug is below default 'info' level — nothing written
      expect(lines.length).toBe(0);
    });
  });

  describe('log — HTTP request logging', () => {
    it('produces a structured log entry with request fields', () => {
      const lines = [];
      const orig = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => {
        lines.push(s);
        return true;
      };
      log('GET', '/api/ping', 200, 12);
      process.stdout.write = orig;
      expect(lines.length).toBeGreaterThan(0);
      const parsed = JSON.parse(lines[0]);
      expect(parsed.method).toBe('GET');
      expect(parsed.url).toBe('/api/ping');
      expect(parsed.status).toBe(200);
    });
  });

  describe('checkSecretsInBody — multi-field secret scan', () => {
    it('returns empty array for clean body', () => {
      const result = checkSecretsInBody({ answer: 'All good' }, ['answer']);
      expect(result).toEqual([]);
    });

    it('detects secrets in specified fields', () => {
      const result = checkSecretsInBody({ answer: '-----BEGIN RSA PRIVATE KEY-----' }, ['answer']);
      expect(result).toContain('Private Key');
    });

    it('ignores fields not listed in fieldsToCheck', () => {
      const result = checkSecretsInBody(
        { hidden: '-----BEGIN RSA PRIVATE KEY-----', answer: 'clean' },
        ['answer']
      );
      expect(result).toEqual([]);
    });

    it('deduplicates repeated pattern matches across fields', () => {
      const result = checkSecretsInBody(
        { a: 'key=AKIAIOSFODNN7EXAMPLE', b: 'key2=AKIAIOSFODNN7EXAMPLE' },
        ['a', 'b']
      );
      expect(result.filter((r) => r === 'AWS Access Key').length).toBe(1);
    });
  });

  describe('setSecurityHeaders — security header injection', () => {
    it('sets all required headers on the response', () => {
      const res = makeMockRes();
      setSecurityHeaders(res);
      expect(res._headers['X-Content-Type-Options']).toBe('nosniff');
      expect(res._headers['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(res._headers['Content-Security-Policy']).toBeDefined();
    });
  });

  describe('handleRouteError — error response writing', () => {
    it('writes JSON error when headers not yet sent', () => {
      const res = makeMockRes({ headersSent: false });
      handleRouteError(
        Object.assign(new Error('bad'), { status: 400, errorCode: 'INVALID_INPUT' }),
        res
      );
      expect(res._status).toBe(400);
      expect(JSON.parse(res._body).code).toBe('INVALID_INPUT');
    });

    it('calls res.end() without writing when headers already sent', () => {
      const res = makeMockRes({ headersSent: true });
      handleRouteError(new Error('late'), res);
      expect(res._status).toBeNull(); // writeHead not called
    });

    it('defaults to 500 when no status on error', () => {
      const res = makeMockRes();
      handleRouteError(new Error('unknown'), res);
      expect(res._status).toBe(500);
    });
  });

  describe('handleMethodNotAllowed — 405 detection', () => {
    const routes = {
      'GET /api/items': true,
      'POST /api/items': true,
      'GET /api/items/:id': true,
    };

    it('returns false when no route matches the path at all', () => {
      const res = makeMockRes();
      const matched = handleMethodNotAllowed(res, '/api/unknown', routes);
      expect(matched).toBe(false);
      expect(res._status).toBeNull();
    });

    it('returns true and writes 405 when path exists but method not allowed', () => {
      const res = makeMockRes();
      const matched = handleMethodNotAllowed(res, '/api/items', routes);
      expect(matched).toBe(true);
      expect(res._status).toBe(405);
    });

    it('includes allowed methods in the Allow header', () => {
      const res = makeMockRes();
      handleMethodNotAllowed(res, '/api/items', routes);
      expect(res._headers['Allow']).toContain('GET');
      expect(res._headers['Allow']).toContain('POST');
    });

    it('matches parameterised route templates', () => {
      const res = makeMockRes();
      const matched = handleMethodNotAllowed(res, '/api/items/123', routes);
      expect(matched).toBe(true);
    });
  });
});
