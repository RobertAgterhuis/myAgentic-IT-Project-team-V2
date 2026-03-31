import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

const fs = require('fs');
const path = require('path');

const contractPath = path.join(process.cwd(), 'src', 'webapp', 'services', 'git', 'git-backend.ts');

describe('GitBackend contract file (#947)', () => {
  it('defines the GitBackend interface and typed ResultTuple', () => {
    const src = fs.readFileSync(contractPath, 'utf8');

    expect(src).toContain('export type ResultTuple');
    expect(src).toContain('export interface GitBackend');
  });

  it('declares all 8 required operations with typed signatures', () => {
    const src = fs.readFileSync(contractPath, 'utf8');

    const requiredSignatures = [
      'status(): Promise<ResultTuple<GitStatusResult>>;',
      'add(files: readonly string[]): Promise<ResultTuple<GitMutationResult>>;',
      'remove(files: readonly string[]): Promise<ResultTuple<GitMutationResult>>;',
      'commit(message: string): Promise<ResultTuple<GitCommitResult>>;',
      'diff(file?: string): Promise<ResultTuple<GitDiffResult>>;',
      'log(opts?: GitLogOptions): Promise<ResultTuple<GitLogResult>>;',
      'branch(opts: GitBranchOptions): Promise<ResultTuple<GitBranchResult>>;',
      'fetchPullPush(',
    ];

    for (const signature of requiredSignatures) {
      expect(src).toContain(signature);
    }

    expect(src).toContain('op: GitRemoteOp');
    expect(src).toContain('remote: string');
    expect(src).toContain('branch?: string');
    expect(src).toContain('): Promise<ResultTuple<GitRemoteResult>>;');
  });
});
