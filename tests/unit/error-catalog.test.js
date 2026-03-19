// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { describe, it, expect } from 'vitest';
import { ERROR_CATALOG } from '../../src/webapp/utils/errors';

describe('ERROR_CATALOG', () => {
  it('exports ERROR_CATALOG as an object', () => {
    expect(ERROR_CATALOG).toBeDefined();
    expect(typeof ERROR_CATALOG).toBe('object');
  });

  it('contains VALIDATION_ERROR entry', () => {
    expect(ERROR_CATALOG.VALIDATION_ERROR).toBeDefined();
    expect(ERROR_CATALOG.VALIDATION_ERROR.message).toContain('invalid data');
    expect(ERROR_CATALOG.VALIDATION_ERROR.recovery).toBeDefined();
  });

  it('contains FILE_NOT_FOUND entry', () => {
    expect(ERROR_CATALOG.FILE_NOT_FOUND).toBeDefined();
    expect(ERROR_CATALOG.FILE_NOT_FOUND.message).toContain('file was not found');
  });

  it('contains DECISIONS_NOT_FOUND entry', () => {
    expect(ERROR_CATALOG.DECISIONS_NOT_FOUND).toBeDefined();
    expect(ERROR_CATALOG.DECISIONS_NOT_FOUND.message).toContain('decisions file');
  });

  it('contains INVALID_ACTION entry', () => {
    expect(ERROR_CATALOG.INVALID_ACTION).toBeDefined();
    expect(ERROR_CATALOG.INVALID_ACTION.message).toContain('action');
  });

  it('contains UNKNOWN_COMMAND entry', () => {
    expect(ERROR_CATALOG.UNKNOWN_COMMAND).toBeDefined();
    expect(ERROR_CATALOG.UNKNOWN_COMMAND.message).toContain('command');
  });

  it('contains INVALID_TOPIC entry', () => {
    expect(ERROR_CATALOG.INVALID_TOPIC).toBeDefined();
    expect(ERROR_CATALOG.INVALID_TOPIC.message).toContain('topic');
  });

  it('contains TOPIC_NOT_FOUND entry', () => {
    expect(ERROR_CATALOG.TOPIC_NOT_FOUND).toBeDefined();
    expect(ERROR_CATALOG.TOPIC_NOT_FOUND.message).toContain('topic');
  });

  it('contains NOT_FOUND entry', () => {
    expect(ERROR_CATALOG.NOT_FOUND).toBeDefined();
    expect(ERROR_CATALOG.NOT_FOUND.message).toContain('resource');
  });

  it('contains PATH_TRAVERSAL entry', () => {
    expect(ERROR_CATALOG.PATH_TRAVERSAL).toBeDefined();
    expect(ERROR_CATALOG.PATH_TRAVERSAL.message).toContain('path');
  });

  it('contains PAYLOAD_TOO_LARGE entry', () => {
    expect(ERROR_CATALOG.PAYLOAD_TOO_LARGE).toBeDefined();
    expect(ERROR_CATALOG.PAYLOAD_TOO_LARGE.message).toBeDefined();
  });

  it('all entries have message and recovery fields', () => {
    Object.entries(ERROR_CATALOG).forEach(([_key, entry]) => {
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('recovery');
      expect(typeof entry.message).toBe('string');
      expect(typeof entry.recovery).toBe('string');
    });
  });
});
