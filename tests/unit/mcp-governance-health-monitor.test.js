'use strict';

const { McpHealthMonitor } = require('../../src/webapp/plugins/mcp-governance/health-monitor');

describe('McpHealthMonitor', () => {
  const originalEnv = process.env.MCP_HEALTH_INTERVAL_MS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MCP_HEALTH_INTERVAL_MS;
    } else {
      process.env.MCP_HEALTH_INTERVAL_MS = originalEnv;
    }
  });

  it('uses MCP_HEALTH_INTERVAL_MS when intervalMs option is not provided', () => {
    process.env.MCP_HEALTH_INTERVAL_MS = '45000';
    const monitor = new McpHealthMonitor({});
    expect(monitor._intervalMs).toBe(45000);
  });

  it('prefers explicit intervalMs over MCP_HEALTH_INTERVAL_MS', () => {
    process.env.MCP_HEALTH_INTERVAL_MS = '45000';
    const monitor = new McpHealthMonitor({}, { intervalMs: 12000 });
    expect(monitor._intervalMs).toBe(12000);
  });

  it('falls back to default interval when MCP_HEALTH_INTERVAL_MS is invalid', () => {
    process.env.MCP_HEALTH_INTERVAL_MS = 'invalid';
    const monitor = new McpHealthMonitor({});
    expect(monitor._intervalMs).toBe(30000);
  });
});
