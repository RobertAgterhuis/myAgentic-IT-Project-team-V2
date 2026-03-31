// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/rate-limiter';
const { createRateLimiter } = __req_0;

describe('createRateLimiter', () => {
  let limiter;

  afterEach(() => {
    if (limiter) limiter.destroy();
  });

  it('allows requests under the limit', () => {
    limiter = createRateLimiter({ windowMs: 60000, maxRequests: 3 });
    expect(limiter.check('1.2.3.4').allowed).toBe(true);
    expect(limiter.check('1.2.3.4').allowed).toBe(true);
    expect(limiter.check('1.2.3.4').allowed).toBe(true);
  });

  it('rejects requests over the limit', () => {
    limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });
    limiter.check('1.2.3.4');
    limiter.check('1.2.3.4');
    const result = limiter.check('1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('tracks IPs independently', () => {
    limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    expect(limiter.check('1.1.1.1').allowed).toBe(true);
    expect(limiter.check('2.2.2.2').allowed).toBe(true);
    expect(limiter.check('1.1.1.1').allowed).toBe(false);
  });

  it('resets after the window expires', () => {
    limiter = createRateLimiter({ windowMs: 100, maxRequests: 1 });
    limiter.check('1.2.3.4');
    expect(limiter.check('1.2.3.4').allowed).toBe(false);

    // Manually expire
    const entry = limiter._map.get('1.2.3.4');
    entry.reset = Date.now() - 1;
    expect(limiter.check('1.2.3.4').allowed).toBe(true);
  });

  it('uses defaults when no options provided', () => {
    limiter = createRateLimiter();
    // Should allow 30 requests by default
    for (let i = 0; i < 30; i++) {
      expect(limiter.check('10.0.0.1').allowed).toBe(true);
    }
    expect(limiter.check('10.0.0.1').allowed).toBe(false);
  });

  it('destroy clears all entries', () => {
    limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
    limiter.check('1.2.3.4');
    limiter.destroy();
    expect(limiter._map.size).toBe(0);
    limiter = null; // prevent double-destroy in afterEach
  });
});
