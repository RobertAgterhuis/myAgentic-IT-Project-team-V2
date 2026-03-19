// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { isM2MRouteAllowed, M2M_API_POLICY } = require('../../src/webapp/m2m-api-policy.ts');

describe('M2M API Policy', () => {
  describe('isM2MRouteAllowed', () => {
    it('returns false when hasApiKey is false', () => {
      expect(isM2MRouteAllowed('GET', '/api/questionnaires', false)).toBe(false);
    });

    it('blocks admin POST routes', () => {
      expect(isM2MRouteAllowed('POST', '/api/admin/users', true)).toBe(false);
      expect(isM2MRouteAllowed('POST', '/api/policies/config', true)).toBe(false);
      expect(isM2MRouteAllowed('POST', '/api/workspaces/default', true)).toBe(false);
    });

    it('allows READ GET routes', () => {
      expect(isM2MRouteAllowed('GET', '/api/questionnaires', true)).toBe(true);
      expect(isM2MRouteAllowed('GET', '/api/decisions', true)).toBe(true);
      expect(isM2MRouteAllowed('GET', '/api/audit', true)).toBe(true);
      expect(isM2MRouteAllowed('GET', '/api/dashboard', true)).toBe(true);
    });

    it('allows WRITE POST routes', () => {
      expect(isM2MRouteAllowed('POST', '/api/save', true)).toBe(true);
      expect(isM2MRouteAllowed('POST', '/api/reevaluate', true)).toBe(true);
      expect(isM2MRouteAllowed('POST', '/api/command', true)).toBe(true);
    });

    it('returns false for unknown/unlisted routes', () => {
      expect(isM2MRouteAllowed('GET', '/api/unknown-endpoint', true)).toBe(false);
      expect(isM2MRouteAllowed('DELETE', '/api/questionnaires', true)).toBe(false);
    });

    it('returns false for method with no listed routes (PATCH)', () => {
      expect(isM2MRouteAllowed('PATCH', '/api/save', true)).toBe(false);
    });
  });

  describe('M2M_API_POLICY structure', () => {
    it('has the expected top-level keys', () => {
      expect(M2M_API_POLICY).toHaveProperty('public');
      expect(M2M_API_POLICY).toHaveProperty('read');
      expect(M2M_API_POLICY).toHaveProperty('write');
      expect(M2M_API_POLICY).toHaveProperty('admin');
    });

    it('read.GET includes core endpoints', () => {
      expect(M2M_API_POLICY.read.GET).toContain('/api/questionnaires');
      expect(M2M_API_POLICY.read.GET).toContain('/api/decisions');
    });

    it('write.POST includes save and command endpoints', () => {
      expect(M2M_API_POLICY.write.POST).toContain('/api/save');
      expect(M2M_API_POLICY.write.POST).toContain('/api/command');
    });

    it('admin.POST contains wildcard patterns', () => {
      expect(M2M_API_POLICY.admin.POST.some((r) => r.includes('**'))).toBe(true);
    });
  });
});
