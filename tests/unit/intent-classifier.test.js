// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/services/chat/intent-classifier';
const { IntentClassifier } = __req_0;

describe('IntentClassifier', () => {
  const classifier = new IntentClassifier();

  it('classifies decision lookup questions', () => {
    const intent = classifier.classify('What decisions affect the auth module?');
    expect(intent).toBe('decision_lookup');
  });

  it('classifies workspace query questions', () => {
    const intent = classifier.classify('What patterns exist for error handling?');
    expect(intent).toBe('workspace_query');
  });

  it('classifies artifact query questions', () => {
    const intent = classifier.classify('Summarize the architecture review output');
    expect(intent).toBe('artifact_query');
  });

  it('keeps session status classification for runtime status prompts', () => {
    const intent = classifier.classify('What is the current session status?');
    expect(intent).toBe('session_status');
  });

  it('classifies approval-related queries as approval_guidance', () => {
    const intent = classifier.classify('I need approval for this change');
    expect(intent).toBe('approval_guidance');
  });

  it('classifies policy override queries as approval_guidance', () => {
    const intent = classifier.classify('How do I request an override for this policy exception?');
    expect(intent).toBe('approval_guidance');
  });

  it('falls back to general_assist when no keywords match', () => {
    const intent = classifier.classify('Tell me something completely random');
    expect(intent).toBe('general_assist');
  });

  it('classifies general greetings as general_assist', () => {
    const intent = classifier.classify('Hello, how are you doing today?');
    expect(intent).toBe('general_assist');
  });

  it('uses contextHints to influence classification toward decision_lookup', () => {
    const intent = classifier.classify('Tell me more', ['decisions']);
    expect(intent).toBe('decision_lookup');
  });
});
