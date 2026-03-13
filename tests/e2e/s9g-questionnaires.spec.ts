/**
 * E2E tests — Questionnaires page (S9G-35, Issue #242)
 *
 * Tests the questionnaire API and flow against the live server.
 */
import { test, expect } from '@playwright/test';

test.describe('Questionnaires API', () => {
  test('GET /api/questionnaires returns structured questionnaire data', async ({ request }) => {
    const res = await request.get('/api/questionnaires');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('questionnaires');
    expect(Array.isArray(body.questionnaires)).toBeTruthy();

    if (body.questionnaires.length > 0) {
      const q = body.questionnaires[0];
      expect(q).toHaveProperty('file');
      expect(q).toHaveProperty('phase');
      expect(q).toHaveProperty('questions');
      expect(Array.isArray(q.questions)).toBeTruthy();
    }
  });

  test('questionnaire questions have required fields', async ({ request }) => {
    const res = await request.get('/api/questionnaires');
    const body = await res.json();

    const withQuestions = body.questionnaires.find(
      (q: { questions: unknown[] }) => q.questions.length > 0
    );
    if (!withQuestions) {
      test.skip();
      return;
    }

    const question = withQuestions.questions[0];
    expect(question).toHaveProperty('id');
    expect(question).toHaveProperty('question');
    expect(question).toHaveProperty('status');
    expect(question).toHaveProperty('section');
  });

  test('questionnaires are grouped by phase', async ({ request }) => {
    const res = await request.get('/api/questionnaires');
    const body = await res.json();

    const phases = [...new Set(body.questionnaires.map((q: { phase: string }) => q.phase))];
    // Should have at least one phase if questionnaires exist
    if (body.questionnaires.length > 0) {
      expect(phases.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('POST /api/save validates required fields', async ({ request }) => {
    const res = await request.post('/api/save', {
      data: {},
    });
    // Should reject missing file/updates
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/save with valid payload returns success', async ({ request }) => {
    // First, get a questionnaire to know a valid file + question ID
    const listRes = await request.get('/api/questionnaires');
    const body = await listRes.json();

    const target = body.questionnaires.find((q: { questions: { id: string; status: string }[] }) =>
      q.questions.some((qu) => qu.status === 'OPEN')
    );
    if (!target) {
      test.skip();
      return;
    }

    const openQuestion = target.questions.find((q: { status: string }) => q.status === 'OPEN');

    const saveRes = await request.post('/api/save', {
      data: {
        file: target.file,
        updates: [
          {
            questionId: openQuestion.id,
            answer: 'E2E test answer',
            status: 'ANSWERED',
          },
        ],
      },
    });
    expect(saveRes.ok()).toBeTruthy();
    const saveBody = await saveRes.json();
    expect(saveBody.ok).toBe(true);
    expect(saveBody.saved).toBeGreaterThanOrEqual(1);
  });
});
