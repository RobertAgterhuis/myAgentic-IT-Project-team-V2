/**
 * Tests: Questionnaires hooks
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useQuestionnaires,
  useQuestionnaire,
  useSaveQuestionnaire,
} from '@/hooks/use-questionnaires';
import { TestWrapper } from '@/test/test-wrapper';
import { mockQuestionnaires } from '@/test/msw-handlers';

describe('useQuestionnaires', () => {
  it('fetches all questionnaires', async () => {
    const { result } = renderHook(() => useQuestionnaires(), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.questionnaires).toHaveLength(1);
    expect(result.current.data?.questionnaires[0].agent).toBe('Business Analyst');
  });
});

describe('useQuestionnaire', () => {
  it('returns a single questionnaire by file', async () => {
    const file = mockQuestionnaires.questionnaires[0].file;
    const { result } = renderHook(() => useQuestionnaire(file), { wrapper: TestWrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.file).toBe(file);
  });

  it('returns null for non-existent file', async () => {
    const { result } = renderHook(() => useQuestionnaire('nonexistent.md'), {
      wrapper: TestWrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe('useSaveQuestionnaire', () => {
  it('saves answers and returns saved count', async () => {
    const { result } = renderHook(() => useSaveQuestionnaire(), { wrapper: TestWrapper });

    result.current.mutate({
      file: 'BusinessDocs/Phase1-Business/Questionnaires/q1.md',
      updates: [{ questionId: 'Q-01-001', answer: 'SMB SaaS', status: 'ANSWERED' }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.saved).toBe(1);
  });
});
