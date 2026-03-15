// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Security Adapter
 *
 * Adapter for security scanning operations: SAST, DAST, dependency audit,
 * secret scanning, license compliance.
 *
 * @module sdlc/adapters/security-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';

export interface SecurityConfig {
  [key: string]: unknown;
  tools: string[];
  policy_path?: string;
}

export class SecurityAdapter extends BaseAdapter {
  readonly name = 'security';
  readonly category = ADAPTER_CATEGORIES.SECURITY;
  readonly version = '1.0.0';

  constructor(config: SecurityConfig = { tools: [] }) {
    super();
    this._config = config as Record<string, unknown>;

    this._operations.set('sast-scan', async (params) => {
      return { path: params.path, findings: [], note: 'Stub' };
    });
    this._operations.set('dependency-audit', async () => {
      return { vulnerabilities: [], note: 'Stub' };
    });
    this._operations.set('secret-scan', async (params) => {
      return { path: params.path, secrets_found: 0, note: 'Stub' };
    });
    this._operations.set('license-check', async () => {
      return { packages: [], violations: [], note: 'Stub' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    const tools = this._config.tools as string[] | undefined;
    return {
      status: tools && tools.length > 0 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNCONFIGURED,
      adapter: this.name,
      category: this.category,
      message: `Security tools: ${(tools || []).join(', ') || 'none configured'}`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!Array.isArray(config.tools)) {
      errors.push('tools must be an array of tool names');
    }
    return { valid: errors.length === 0, errors };
  }
}
