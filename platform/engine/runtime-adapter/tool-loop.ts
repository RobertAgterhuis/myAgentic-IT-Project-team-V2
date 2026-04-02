// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type {
  CompletionResult,
  LLMMessage,
  LLMProvider,
} from '../../sdlc/adapters/contracts/llm-provider.js';
import {
  ToolAuthorizationError,
  ToolValidationError,
  type ToolExecutionAuditEvent,
  type ToolExecutionMiddleware,
} from '../tool-execution-middleware.js';

export interface ToolExecutionPolicy {
  role?: 'viewer' | 'operator' | 'admin';
  profile?: string;
  agentId?: string;
  envScope?: 'dev' | 'test' | 'prod';
  traceId: string;
  approvedActions?: unknown;
  executionContext?: Record<string, unknown>;
}

export async function completeWithToolExecution(options: {
  provider: LLMProvider;
  messages: LLMMessage[];
  model?: string;
  maxTokens: number;
  temperature: number;
  policy: ToolExecutionPolicy;
  maxToolRounds?: number;
  maxToolCallsPerRound?: number;
  createMiddleware: (audit: {
    logToolExecution(event: ToolExecutionAuditEvent): void;
  }) => ToolExecutionMiddleware;
  sanitizeForPrompt: (value: string) => string;
  toolAuditSink?: { logToolExecution(event: ToolExecutionAuditEvent): void };
  signal?: AbortSignal;
}): Promise<{ completion: CompletionResult; toolAuditEvents: ToolExecutionAuditEvent[] }> {
  const {
    provider,
    messages,
    model,
    maxTokens,
    temperature,
    policy,
    maxToolRounds = 4,
    maxToolCallsPerRound = 6,
    createMiddleware,
    sanitizeForPrompt,
    toolAuditSink,
    signal,
  } = options;

  const throwIfAborted = (): void => {
    if (signal?.aborted) {
      throw new Error('ABORTED');
    }
  };

  const toolAuditEvents: ToolExecutionAuditEvent[] = [];
  const middleware = createMiddleware({
    logToolExecution: (event: ToolExecutionAuditEvent) => {
      toolAuditEvents.push(event);
      toolAuditSink?.logToolExecution(event);
    },
  });

  let round = 0;
  let completion = await provider.complete({
    model,
    maxTokens,
    temperature,
    messages,
    tools: middleware.listToolDefinitionsForPolicy(policy),
    signal,
  });

  while (completion.toolCalls?.length) {
    throwIfAborted();
    round += 1;
    if (round > maxToolRounds) {
      throw new Error(`TOOL_ROUND_LIMIT_EXCEEDED: maxToolRounds=${maxToolRounds}`);
    }
    if (completion.toolCalls.length > maxToolCallsPerRound) {
      throw new Error(
        `TOOL_FANOUT_LIMIT_EXCEEDED: calls=${completion.toolCalls.length}, max=${maxToolCallsPerRound}`
      );
    }

    const toolResults: Array<Record<string, unknown>> = [];
    for (const toolCall of completion.toolCalls) {
      throwIfAborted();
      try {
        const execution = await middleware.execute(
          {
            id: toolCall.id,
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
          {
            role: policy.role,
            profile: policy.profile,
            agentId: policy.agentId,
            envScope: policy.envScope,
            traceId: policy.traceId,
            approvedActions: policy.approvedActions,
            executionContext: policy.executionContext,
          }
        );

        toolResults.push({
          id: toolCall.id,
          name: toolCall.name,
          success: execution.success,
          adapter: execution.adapter,
          operation: execution.operation,
          data: execution.data,
          error: execution.error,
          fromCache: execution.fromCache,
        });
      } catch (err) {
        if (err instanceof ToolAuthorizationError || err instanceof ToolValidationError) {
          throw new Error(`${err.code}: ${err.message}`);
        }
        throw err;
      }
    }

    messages.push({
      role: 'assistant',
      content: `Tool calls executed for trace ${policy.traceId}.`,
    });
    messages.push({
      role: 'user',
      content: `Tool execution results (JSON):\n${sanitizeForPrompt(JSON.stringify(toolResults, null, 2))}`,
    });

    completion = await provider.complete({
      model,
      maxTokens,
      temperature,
      messages,
      tools: middleware.listToolDefinitionsForPolicy(policy),
      signal,
    });
  }

  return { completion, toolAuditEvents };
}
