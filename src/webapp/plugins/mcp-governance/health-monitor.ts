// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { structuredLog } from '../../middleware';
import { McpGovernanceService } from './service';

export interface McpHealthMonitorOptions {
  intervalMs?: number;
  failureThreshold?: number;
  timeoutMs?: number;
}

export class McpHealthMonitor {
  private readonly _service: McpGovernanceService;
  private readonly _intervalMs: number;
  private readonly _failureThreshold: number;
  private readonly _timeoutMs: number;
  private _timer: NodeJS.Timeout | null = null;

  constructor(service: McpGovernanceService, opts?: McpHealthMonitorOptions) {
    this._service = service;
    const envInterval = Number.parseInt(process.env.MCP_HEALTH_INTERVAL_MS || '', 10);
    this._intervalMs =
      opts?.intervalMs ?? (Number.isFinite(envInterval) && envInterval > 0 ? envInterval : 30000);
    this._failureThreshold = opts?.failureThreshold ?? 3;
    this._timeoutMs = opts?.timeoutMs ?? 5000;
  }

  start(): void {
    if (this._timer) return;

    this._timer = setInterval(() => {
      this.runOnce().catch((err: unknown) => {
        structuredLog('warn', 'mcp_health_monitor_run_failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, this._intervalMs);
    this._timer.unref();

    this.runOnce().catch((err: unknown) => {
      structuredLog('warn', 'mcp_health_monitor_bootstrap_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  stop(): void {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
  }

  async runOnce(): Promise<void> {
    const servers = await this._service.listServers();
    await Promise.all(
      servers.map(async (server) => {
        const healthy = await this._ping(server.endpoint);
        const updated = await this._service.recordServerHealth(
          server.id,
          healthy,
          this._failureThreshold
        );

        structuredLog('info', 'mcp_health_probe', {
          serverId: server.id,
          endpoint: server.endpoint,
          healthy,
          status: updated?.healthStatus || 'unknown',
        });
      })
    );
  }

  private async _ping(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(this._timeoutMs),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
