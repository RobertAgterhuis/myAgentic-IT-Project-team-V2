/**
 * Unit Tests: Server configuration utilities
 * SP-11-612 Test Strategy Framework
 *
 * Tests pure exported functions from the webapp config module.
 * No server startup required — all paths through parseTrustedProxySetting
 * are pure and deterministic.
 */

import * as __req_0 from '../../src/webapp/config';
const { parseTrustedProxySetting, parsePredecessorContractContinuitySetting } = __req_0;

async function loadFreshConfig() {
  vi.resetModules();
  return import('../../src/webapp/config.ts');
}

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

describe('config.ts — parsePredecessorContractContinuitySetting', () => {
  it('returns undefined for empty values', () => {
    expect(parsePredecessorContractContinuitySetting(undefined)).toBeUndefined();
    expect(parsePredecessorContractContinuitySetting('')).toBeUndefined();
    expect(parsePredecessorContractContinuitySetting('   ')).toBeUndefined();
  });

  it('parses boolean shorthands', () => {
    expect(parsePredecessorContractContinuitySetting('true')).toBe(true);
    expect(parsePredecessorContractContinuitySetting('strict')).toBe(true);
    expect(parsePredecessorContractContinuitySetting('0')).toBe(false);
    expect(parsePredecessorContractContinuitySetting('off')).toBe(false);
  });

  it('parses JSON boolean values', () => {
    expect(parsePredecessorContractContinuitySetting('true')).toBe(true);
    expect(parsePredecessorContractContinuitySetting('false')).toBe(false);
  });

  it('parses scoped JSON object and normalizes lists', () => {
    const result = parsePredecessorContractContinuitySetting(
      JSON.stringify({
        states: ['PHASE_2', '  PHASE_2  ', '', 42],
        agents: ['05', '05', '  ', null],
      })
    );

    expect(result).toEqual({
      states: ['PHASE_2'],
      agents: ['05'],
    });
  });

  it('returns undefined for invalid JSON or empty scoped object', () => {
    expect(parsePredecessorContractContinuitySetting('{invalid-json')).toBeUndefined();
    expect(parsePredecessorContractContinuitySetting('{}')).toBeUndefined();
    expect(
      parsePredecessorContractContinuitySetting(JSON.stringify({ states: [], agents: [] }))
    ).toBeUndefined();
  });
});

describe('config.ts exported environment constants', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('defaults storage, queue, session, and path settings when env is absent', async () => {
    delete process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_PATH;
    delete process.env.QUEUE_PROVIDER;
    delete process.env.SESSION_STORE;
    delete process.env.OBSERVABILITY_SSE_MAX_CLIENTS;
    delete process.env.WEB_VITALS_SAMPLE_RETENTION_LIMIT;
    delete process.env.RAG_FRESHNESS_STALE_SEC;
    delete process.env.MCP_HEALTH_INTERVAL_MS;
    delete process.env.MCP_HEALTH_FAILURE_THRESHOLD;
    delete process.env.STATIC_LOCALE_CACHE_MAX_AGE_SECONDS;

    const config = await loadFreshConfig();

    expect(config.STORAGE_PROVIDER).toBe('file');
    expect(config.STORAGE_PATH).toBeUndefined();
    expect(config.QUEUE_PROVIDER).toBe('memory');
    expect(config.SESSION_STORE).toBe('sqlite');
    expect(config.OBSERVABILITY_SSE_MAX_CLIENTS).toBe(50);
    expect(config.WEB_VITALS_SAMPLE_RETENTION_LIMIT).toBe(250);
    expect(config.RAG_FRESHNESS_STALE_SEC).toBe(3600);
    expect(config.MCP_HEALTH_INTERVAL_MS).toBe(30000);
    expect(config.MCP_HEALTH_FAILURE_THRESHOLD).toBe(3);
    expect(config.STATIC_LOCALE_CACHE_MAX_AGE_SECONDS).toBe(3600);
  });

  it('reads operational runtime settings from env', async () => {
    process.env.OBSERVABILITY_SSE_MAX_CLIENTS = '75';
    process.env.WEB_VITALS_SAMPLE_RETENTION_LIMIT = '500';
    process.env.RAG_FRESHNESS_STALE_SEC = '7200';
    process.env.MCP_HEALTH_INTERVAL_MS = '45000';
    process.env.MCP_HEALTH_FAILURE_THRESHOLD = '5';
    process.env.STATIC_LOCALE_CACHE_MAX_AGE_SECONDS = '900';

    const config = await loadFreshConfig();

    expect(config.OBSERVABILITY_SSE_MAX_CLIENTS).toBe(75);
    expect(config.WEB_VITALS_SAMPLE_RETENTION_LIMIT).toBe(500);
    expect(config.RAG_FRESHNESS_STALE_SEC).toBe(7200);
    expect(config.MCP_HEALTH_INTERVAL_MS).toBe(45000);
    expect(config.MCP_HEALTH_FAILURE_THRESHOLD).toBe(5);
    expect(config.STATIC_LOCALE_CACHE_MAX_AGE_SECONDS).toBe(900);
  });

  it('reads explicit storage, queue, and session provider env values', async () => {
    process.env.STORAGE_PROVIDER = 'sqlite';
    process.env.STORAGE_PATH = '/tmp/app.db';
    process.env.QUEUE_PROVIDER = 'bullmq';
    process.env.SESSION_STORE = 'redis';

    const config = await loadFreshConfig();

    expect(config.STORAGE_PROVIDER).toBe('sqlite');
    expect(config.STORAGE_PATH).toBe('/tmp/app.db');
    expect(config.QUEUE_PROVIDER).toBe('bullmq');
    expect(config.SESSION_STORE).toBe('redis');
  });

  it('exports parsed continuity enforcement mode from env', async () => {
    process.env.ENFORCE_PREDECESSOR_CONTRACT_CONTINUITY = JSON.stringify({
      states: ['PHASE_2'],
      agents: ['05'],
    });

    const config = await loadFreshConfig();

    expect(config.ENFORCE_PREDECESSOR_CONTRACT_CONTINUITY).toEqual({
      states: ['PHASE_2'],
      agents: ['05'],
    });
  });

  it('accepts the persistent queue provider', async () => {
    process.env.QUEUE_PROVIDER = 'persistent';

    const config = await loadFreshConfig();

    expect(config.QUEUE_PROVIDER).toBe('persistent');
  });

  it('reads host, port, trust proxy, and redis settings from env', async () => {
    process.env.PORT = '8080';
    process.env.HOST = ' 0.0.0.0 ';
    process.env.TRUST_PROXY = '10.0.0.1, 10.0.0.2';
    process.env.REDIS_URL = 'redis://cache';

    const config = await loadFreshConfig();

    expect(config.PORT).toBe(8080);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.TRUST_PROXY).toEqual(['10.0.0.1', '10.0.0.2']);
    expect(config.REDIS_URL).toBe('redis://cache');
  });

  it('falls back for invalid port and empty host values', async () => {
    process.env.PORT = '99999';
    process.env.HOST = '   ';

    const config = await loadFreshConfig();

    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('127.0.0.1');
  });

  it('exports expected path constants', async () => {
    const config = await loadFreshConfig();

    expect(config.BUSINESS_DOCS).toContain('BusinessDocs');
    expect(config.SESSION_DIR).toContain('BusinessDocs');
    expect(config.SESSION_FILE).toContain('session-state.json');
    expect(config.SESSION_AUDIT_FILE).toContain('session-state-audit.json');
    expect(config.COMMAND_QUEUE).toContain('command-queue.json');
    expect(config.HELP_DIR).toContain('src');
    expect(config.HELP_DIR).toContain('help');
    expect(config.METRICS_FILE).toContain('runtime-metrics.json');
  });
});
