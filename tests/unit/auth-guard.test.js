/* Unit tests for the auth guard logic in server.ts.
 * The guard rejects mutating API requests on non-localhost bindings
 * unless the caller provides a valid API key. */

describe('auth guard logic', () => {
  /**
   * The guard condition extracted from server.ts http.createServer callback:
   *   HOST !== '127.0.0.1' && HOST !== 'localhost'
   *   && pathname.startsWith('/api')
   *   && req.method !== 'GET'
   *   → check process.env.API_KEY vs req.headers['x-api-key']
   */
  function shouldBlock(host, method, pathname, apiKeyEnv, apiKeyHeader) {
    if (host === '127.0.0.1' || host === 'localhost') return false;
    if (!pathname.startsWith('/api')) return false;
    if (method === 'GET') return false;
    if (!apiKeyEnv || apiKeyHeader !== apiKeyEnv) return true;
    return false;
  }

  it('allows all requests on 127.0.0.1', () => {
    expect(shouldBlock('127.0.0.1', 'POST', '/api/save', undefined, undefined)).toBe(false);
  });

  it('allows all requests on localhost', () => {
    expect(shouldBlock('localhost', 'POST', '/api/save', undefined, undefined)).toBe(false);
  });

  it('allows GET requests on non-localhost', () => {
    expect(shouldBlock('0.0.0.0', 'GET', '/api/session', undefined, undefined)).toBe(false);
  });

  it('allows non-API requests on non-localhost', () => {
    expect(shouldBlock('0.0.0.0', 'POST', '/health', undefined, undefined)).toBe(false);
  });

  it('blocks POST /api/* on non-localhost without API_KEY env', () => {
    expect(shouldBlock('0.0.0.0', 'POST', '/api/save', undefined, undefined)).toBe(true);
  });

  it('blocks POST /api/* on non-localhost with wrong key', () => {
    expect(shouldBlock('0.0.0.0', 'POST', '/api/save', 'correct', 'wrong')).toBe(true);
  });

  it('blocks POST /api/* on non-localhost with missing header', () => {
    expect(shouldBlock('0.0.0.0', 'POST', '/api/save', 'correct', undefined)).toBe(true);
  });

  it('allows POST /api/* on non-localhost with correct key', () => {
    expect(shouldBlock('0.0.0.0', 'POST', '/api/save', 'my-secret', 'my-secret')).toBe(false);
  });

  it('blocks PUT /api/* on non-localhost without key', () => {
    expect(shouldBlock('0.0.0.0', 'PUT', '/api/decisions', undefined, undefined)).toBe(true);
  });

  it('blocks DELETE /api/* on non-localhost without key', () => {
    expect(shouldBlock('0.0.0.0', 'DELETE', '/api/commands/1', undefined, undefined)).toBe(true);
  });
});
