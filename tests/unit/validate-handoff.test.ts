import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  HANDOFF_STATUS_VALUES,
  validateHandoffDocument,
  validatePath,
} from '../../platform/standards/validate-handoff';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-validate-'));
  tempDirs.push(dir);
  return dir;
}

function writeFile(dir: string, fileName: string, content: string): string {
  const filePath = path.join(dir, fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function validHandoff(deliverableRef = 'artifact/output.md'): string {
  return `# Handoff: Agent A to Agent B

## Summary
- Objective: completed scoped work.

## Deliverables
- ${deliverableRef} - implementation summary

## Handoff to Next Agent
- From: Agent A
- To: Agent B
- Status: COMPLETED
- Next action: continue integration

## Exit Criteria Met
- [x] implementation complete
- [x] artifacts documented

## Quality Validation
- Command: npm run test
- Evidence: tests passed with no failures
`;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('validate-handoff', () => {
  it('accepts valid status values', () => {
    expect(HANDOFF_STATUS_VALUES).toEqual(['COMPLETED', 'BLOCKED', 'ESCALATED']);
  });

  it('passes a valid handoff document', () => {
    const dir = makeTempDir();
    writeFile(dir, 'artifact/output.md', '# output');
    const docPath = writeFile(dir, 'handoff.md', validHandoff('artifact/output.md'));

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when mandatory sections are missing', () => {
    const dir = makeTempDir();
    const docPath = writeFile(
      dir,
      'handoff.md',
      '# Handoff\n\n## Summary\n- done\n\n## Deliverables\n- README.md - ref\n'
    );

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_SECTION')).toBe(true);
  });

  it('fails when status is missing', () => {
    const dir = makeTempDir();
    writeFile(dir, 'artifact/output.md', '# output');
    const docPath = writeFile(
      dir,
      'handoff.md',
      validHandoff('artifact/output.md').replace('- Status: COMPLETED\n', '')
    );

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.errors.some((e) => e.code === 'MISSING_STATUS')).toBe(true);
  });

  it('fails when status is invalid', () => {
    const dir = makeTempDir();
    writeFile(dir, 'artifact/output.md', '# output');
    const docPath = writeFile(
      dir,
      'handoff.md',
      validHandoff('artifact/output.md').replace('Status: COMPLETED', 'Status: DONE')
    );

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.errors.some((e) => e.code === 'INVALID_STATUS')).toBe(true);
  });

  it('fails when deliverable references do not exist', () => {
    const dir = makeTempDir();
    const docPath = writeFile(dir, 'handoff.md', validHandoff('missing/file.md'));

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.errors.some((e) => e.code === 'MISSING_DELIVERABLE_REFERENCE')).toBe(true);
  });

  it('accepts URL evidence references', () => {
    const dir = makeTempDir();
    const docPath = writeFile(
      dir,
      'handoff.md',
      validHandoff('https://example.com/evidence/run-42')
    );

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.valid).toBe(true);
  });

  it('fails when quality validation is placeholder text', () => {
    const dir = makeTempDir();
    writeFile(dir, 'artifact/output.md', '# output');
    const docPath = writeFile(
      dir,
      'handoff.md',
      validHandoff('artifact/output.md')
        .replace('Command: npm run test', 'Command: [TODO]')
        .replace('Evidence: tests passed with no failures', 'Evidence: N/A')
    );

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.errors.some((e) => e.code === 'INVALID_QUALITY_COMMAND')).toBe(true);
    expect(result.errors.some((e) => e.code === 'INVALID_QUALITY_EVIDENCE')).toBe(true);
  });

  it('fails when optional section contains placeholders', () => {
    const dir = makeTempDir();
    writeFile(dir, 'artifact/output.md', '# output');
    const docPath = writeFile(
      dir,
      'handoff.md',
      `${validHandoff('artifact/output.md')}\n## Lessons Learned\n[TODO]\n`
    );

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.errors.some((e) => e.code === 'PLACEHOLDER_OPTIONAL_SECTION')).toBe(true);
  });

  it('validates all markdown files in a directory', () => {
    const dir = makeTempDir();
    writeFile(dir, 'artifact/output.md', '# output');
    writeFile(dir, 'valid.md', validHandoff('artifact/output.md'));
    writeFile(
      dir,
      'invalid.md',
      validHandoff('artifact/output.md').replace('Status: COMPLETED', 'Status: WRONG')
    );

    const results = validatePath(dir);
    expect(results).toHaveLength(3);
    const invalid = results.find((r) => r.filePath.endsWith('invalid.md'));
    expect(invalid?.valid).toBe(false);
  });

  it('returns target not found for missing paths', () => {
    const results = validatePath('docs/does-not-exist/handoff.md');
    expect(results[0].valid).toBe(false);
    expect(results[0].errors[0].code).toBe('TARGET_NOT_FOUND');
  });

  it('supports relative deliverable references from document directory', () => {
    const dir = makeTempDir();
    writeFile(dir, 'nested/evidence.md', '# evidence');
    const docPath = writeFile(dir, 'nested/handoff.md', validHandoff('evidence.md'));

    const result = validateHandoffDocument(fs.readFileSync(docPath, 'utf8'), docPath);
    expect(result.valid).toBe(true);
  });
});
