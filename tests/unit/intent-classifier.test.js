// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { IntentClassifier } = require('../../src/webapp/services/chat/intent-classifier');

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
});
