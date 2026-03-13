/**
 * Tests: Orchestrator hooks
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useOrchestratorStatus,
  useOrchestratorRunHistory,
  useAdvanceOrchestrator,
  useOrchestratorError,
  useOrchestratorRecover,
  useOrchestratorReset,
  useOrchestratorStop,
  useValidateGate,
  useSprintGate,
  useOrchestratorQueue,
  useQueueCommand,
} from '@/hooks/use-orchestrator';
import { TestWrapper } from '@/test/test-wrapper';

describe('useOrchestratorStatus', () => {
  it('returns current status', async () => {
    const { result } = renderHook(() => useOrchestratorStatus(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.state).toBe('IDLE');
    expect(result.current.data?.mode).toBe('CREATE');
  });
});

describe('useOrchestratorRunHistory', () => {
  it('returns run history', async () => {
    const { result } = renderHook(() => useOrchestratorRunHistory(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useAdvanceOrchestrator', () => {
  it('advances the orchestrator', async () => {
    const { result } = renderHook(() => useAdvanceOrchestrator(), { wrapper: TestWrapper });
    result.current.mutate({});
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useOrchestratorError', () => {
  it('forces error state', async () => {
    const { result } = renderHook(() => useOrchestratorError(), { wrapper: TestWrapper });
    result.current.mutate({ reason: 'test error' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useOrchestratorRecover', () => {
  it('recovers from error', async () => {
    const { result } = renderHook(() => useOrchestratorRecover(), { wrapper: TestWrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useOrchestratorReset', () => {
  it('resets the orchestrator', async () => {
    const { result } = renderHook(() => useOrchestratorReset(), { wrapper: TestWrapper });
    result.current.mutate({ mode: 'CREATE' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useOrchestratorStop', () => {
  it('stops the orchestrator', async () => {
    const { result } = renderHook(() => useOrchestratorStop(), { wrapper: TestWrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useValidateGate', () => {
  it('validates a gate', async () => {
    const { result } = renderHook(() => useValidateGate(), { wrapper: TestWrapper });
    result.current.mutate({ deliverables: ['doc1.md'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.verdict).toBe('APPROVED');
  });
});

describe('useSprintGate', () => {
  it('checks sprint gate', async () => {
    const { result } = renderHook(() => useSprintGate(), { wrapper: TestWrapper });
    result.current.mutate({ sprintId: 'SP-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.verdict).toBe('READY');
  });
});

describe('useOrchestratorQueue', () => {
  it('returns command queue', async () => {
    const { result } = renderHook(() => useOrchestratorQueue(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.command).toBeNull();
    expect(result.current.data?.queue).toEqual([]);
  });
});

describe('useQueueCommand', () => {
  it('queues a command', async () => {
    const { result } = renderHook(() => useQueueCommand(), { wrapper: TestWrapper });
    result.current.mutate({ command: 'CREATE', project: 'test' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
