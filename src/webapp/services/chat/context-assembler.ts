// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';
import type { ChatCitation, ChatContextSnapshot } from '../chat-service';

interface HumanOverrideEvent {
  state?: string;
}

export interface AssembledChatContext {
  snapshot: ChatContextSnapshot;
  citations: ChatCitation[];
}

interface ContextAssemblerOptions {
  projectRoot: string;
  resolveSessionFile: () => string;
  getHumanOverrideEvents?: () => HumanOverrideEvent[];
}

function toRelativeSourcePath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function countPendingApprovals(getter?: () => HumanOverrideEvent[]): number | undefined {
  if (!getter) return undefined;
  return getter().filter((evt) => evt.state === 'OPEN').length;
}

export class ContextAssembler {
  private readonly projectRoot: string;
  private readonly resolveSessionFile: () => string;
  private readonly getHumanOverrideEvents?: () => HumanOverrideEvent[];

  constructor(options: ContextAssemblerOptions) {
    this.projectRoot = options.projectRoot;
    this.resolveSessionFile = options.resolveSessionFile;
    this.getHumanOverrideEvents = options.getHumanOverrideEvents;
  }

  assemble(): AssembledChatContext {
    const pendingApprovals = countPendingApprovals(this.getHumanOverrideEvents);
    const sessionFile = this.resolveSessionFile();

    if (!sessionFile || !fs.existsSync(sessionFile)) {
      return {
        citations: [],
        snapshot: { pendingApprovals },
      };
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(sessionFile, 'utf8')) as {
        status?: string;
        mode?: string;
        current_phase?: string;
        current_agent?: string;
      };

      const citation: ChatCitation = {
        source_path: toRelativeSourcePath(this.projectRoot, sessionFile),
        excerpt: `status=${parsed.status || 'UNKNOWN'}, mode=${parsed.mode || 'UNKNOWN'}, phase=${parsed.current_phase || 'n/a'}, agent=${parsed.current_agent || 'n/a'}`,
        start_line: 1,
      };

      return {
        citations: [citation],
        snapshot: {
          sessionStatus: parsed.status,
          mode: parsed.mode,
          currentPhase: parsed.current_phase,
          currentAgent: parsed.current_agent,
          pendingApprovals,
        },
      };
    } catch {
      return {
        citations: [],
        snapshot: { pendingApprovals },
      };
    }
  }
}
