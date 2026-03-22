// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { AgentType, McpServerRegistry, AgentServerPolicy, EnvironmentPolicy } from './types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function defineAgents(agents: AgentType[]): AgentType[] {
  return clone(agents);
}

export function defineMcpServers(servers: McpServerRegistry[]): McpServerRegistry[] {
  return clone(servers);
}

export function definePolicies(policies: AgentServerPolicy[]): AgentServerPolicy[] {
  return clone(policies);
}

export function defineEnvironmentPolicies(policies: EnvironmentPolicy[]): EnvironmentPolicy[] {
  return clone(policies);
}
