// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Tool Provider Contract
 *
 * Formal interface for tool discovery and invocation: enumerate
 * available tools, invoke them with parameters, validate inputs.
 *
 * @module sdlc/adapters/contracts/tool-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface ToolCapabilities {
  supportsValidation: boolean;
  supportsSchemaDiscovery: boolean;
  supportsBatch: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface ToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface ToolInvocation {
  name: string;
  params: Record<string, unknown>;
  timeout?: number;
}

export interface ToolResult {
  name: string;
  success: boolean;
  output: unknown;
  error?: string;
  duration_ms: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Error Classification ────────────────────────────────────

export type ToolErrorKind =
  | 'TOOL_NOT_FOUND'
  | 'INVALID_PARAMS'
  | 'EXECUTION_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ToolError {
  kind: ToolErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface ToolProvider {
  readonly providerName: string;
  readonly capabilities: ToolCapabilities;

  discover(): Promise<ToolInfo[]>;
  invoke(invocation: ToolInvocation): Promise<ToolResult>;
  validate(name: string, params: Record<string, unknown>): Promise<ValidationResult>;
}
