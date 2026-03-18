import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import PolicyCompliancePanel from './policy-compliance-panel';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { server } from '@/test/msw-server';

const policiesResponse = {
  policies: [
    {
      id: 'POL-SEC-001',
      name: 'Secret scanning required before merge',
      description: 'All code changes must pass secret scanning.',
      scope: 'global',
      category: 'security',
      severity: 'blocking',
      condition_type: 'pr',
      condition_check: 'secret_scan_passed',
      action_message: 'Secret scanning must pass before merge.',
      exception_count: 0,
      pack_id: 'security-baseline',
    },
  ],
  count: 1,
};

const policyPacksResponse = {
  packs: [
    {
      pack_id: 'security-baseline',
      pack_name: 'Security Baseline',
      version: '1.0.0',
      policy_count: 1,
      categories: ['security'],
      severities: ['blocking'],
    },
  ],
  count: 1,
};

const policySignalsResponse = {
  checks: { secret_scan_passed: true, sast_scan_passed: true },
  signals: [
    {
      check: 'secret_scan_passed',
      passed: true,
      source: 'test-output.json',
      details: 'No secret pattern warnings detected in logs',
      measured_at: '2026-03-18T00:00:00.000Z',
    },
    {
      check: 'sast_scan_passed',
      passed: true,
      source: 'eslint-output.json',
      details: 'ESLint: 0 errors, 0 fatals, 0 warnings',
      measured_at: '2026-03-18T00:00:00.000Z',
    },
  ],
  missing: [],
  generated_at: '2026-03-18T00:00:00.000Z',
};

function renderPanel() {
  return render(
    <RouterTestWrapper initialEntries={['/governance']}>
      <PolicyCompliancePanel />
    </RouterTestWrapper>
  );
}

describe('PolicyCompliancePanel', () => {
  it('renders an edit action for policies', async () => {
    server.use(
      http.get('/api/v1/policies', () => HttpResponse.json(policiesResponse)),
      http.get('/api/v1/policies/packs', () => HttpResponse.json(policyPacksResponse)),
      http.get('/api/v1/policies/signals', () => HttpResponse.json(policySignalsResponse))
    );

    renderPanel();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit policy pol-sec-001/i })).toBeInTheDocument();
    });
  });
});
