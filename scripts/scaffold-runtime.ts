// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import { ensureRuntimeScaffold } from '../src/webapp/runtime-scaffold';

const rootArg = process.argv[2];
const projectRoot = rootArg ? path.resolve(rootArg) : process.cwd();
const outcome = ensureRuntimeScaffold(projectRoot);

process.stdout.write(`${JSON.stringify({ ok: true, projectRoot, ...outcome }, null, 2)}\n`);
