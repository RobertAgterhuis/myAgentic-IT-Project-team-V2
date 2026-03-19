/**
 * Unit Tests: Server configuration utilities
 * SP-11-612 Test Strategy Framework
 *
 * Tests pure exported functions from the webapp config module.
 * No server startup required — all paths through parseTrustedProxySetting
 * are pure and deterministic.
 */

const { parseTrustedProxySetting } = require('../../src/webapp/config');

describe('SP-11-612: config.ts — parseTrustedProxySetting', () => {
  describe('falsy / empty inputs', () => {
    it('returns false for undefined', () => {
      expect(parseTrustedProxySetting(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(parseTrustedProxySetting('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(parseTrustedProxySetting('   ')).toBe(false);
    });
  });

  describe('boolean-like string values', () => {
    it('returns false for "false"', () => {
      expect(parseTrustedProxySetting('false')).toBe(false);
    });

    it('returns false for "off"', () => {
      expect(parseTrustedProxySetting('off')).toBe(false);
    });

    it('returns false for "no"', () => {
      expect(parseTrustedProxySetting('no')).toBe(false);
    });

    it('returns false for case-insensitive "FALSE"', () => {
      expect(parseTrustedProxySetting('FALSE')).toBe(false);
    });

    it('returns true for "true"', () => {
      expect(parseTrustedProxySetting('true')).toBe(true);
    });

    it('returns true for "on"', () => {
      expect(parseTrustedProxySetting('on')).toBe(true);
    });

    it('returns true for "yes"', () => {
      expect(parseTrustedProxySetting('yes')).toBe(true);
    });

    it('returns true for case-insensitive "YES"', () => {
      expect(parseTrustedProxySetting('YES')).toBe(true);
    });
  });

  describe('numeric hop count', () => {
    it('returns a number for "1"', () => {
      expect(parseTrustedProxySetting('1')).toBe(1);
    });

    it('returns a number for "3"', () => {
      expect(parseTrustedProxySetting('3')).toBe(3);
    });

    it('returns a number for "0"', () => {
      expect(parseTrustedProxySetting('0')).toBe(0);
    });
  });

  describe('comma-separated proxy list', () => {
    it('returns an array for comma-separated IPs', () => {
      const result = parseTrustedProxySetting('192.168.1.1,10.0.0.1');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('192.168.1.1');
      expect(result).toContain('10.0.0.1');
    });

    it('trims whitespace from each entry', () => {
      const result = parseTrustedProxySetting(' 10.0.0.1 , 10.0.0.2 ');
      expect(result).toEqual(['10.0.0.1', '10.0.0.2']);
    });

    it('filters out empty entries from comma list', () => {
      const result = parseTrustedProxySetting('10.0.0.1,,10.0.0.2');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('returns false for all-empty comma list', () => {
      expect(parseTrustedProxySetting(',,')).toBe(false);
    });
  });

  describe('bare string (single non-numeric value)', () => {
    it('returns the string as-is for a single IP', () => {
      expect(parseTrustedProxySetting('10.0.0.1')).toBe('10.0.0.1');
    });

    it('returns the string as-is for a CIDR range', () => {
      expect(parseTrustedProxySetting('10.0.0.0/8')).toBe('10.0.0.0/8');
    });

    it('returns the trimmed string value', () => {
      expect(parseTrustedProxySetting('  loopback  ')).toBe('loopback');
    });
  });
});
