// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Markdown corruption detection (GAP-009).
 */

/**
 * Detect structural corruption in a markdown file.
 * Checks for: broken YAML frontmatter, incomplete table rows,
 * unclosed fences, and malformed question blocks.
 */
// eslint-disable-next-line complexity
export function detectMarkdownCorruption(content: unknown): string[] {
  if (typeof content !== 'string') return ['Content is not a string'];
  const issues: string[] = [];

  // Check for broken YAML frontmatter (opened but not closed)
  if (/^---\s*\n/.test(content)) {
    const secondFence: number = content.indexOf('\n---', 4);
    if (secondFence === -1)
      issues.push('Unclosed YAML frontmatter (opening --- without closing ---)');
  }

  // Check for unclosed code fences
  const fenceMatches: RegExpMatchArray | null = content.match(/^```/gm);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    issues.push('Unclosed code fence (odd number of ``` delimiters)');
  }

  // Check for incomplete table rows (lines starting with | but not ending with |)
  const lines: string[] = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];
    if (/^\|/.test(line) && !/\|\s*$/.test(line) && !/^\|[-|:\s]+$/.test(line)) {
      issues.push(`Incomplete table row at line ${i + 1}`);
      break; // report only first occurrence
    }
  }

  // Check for malformed question blocks (### Q-nn-nnnn without [REQUIRED] or [OPTIONAL])
  const qHeaders: RegExpMatchArray | null = content.match(/^###\s+Q-\d+-\d+(?!\s+\[)/gm);
  if (qHeaders && qHeaders.length > 0) {
    issues.push(
      `Malformed question header (missing [REQUIRED]/[OPTIONAL] tag): ${qHeaders[0].trim()}`
    );
  }

  // Check for orphaned answer blocks (** Your answer:** outside a question context)
  const answerBlocks: number = (content.match(/\*\*Your answer:\*\*/g) || []).length;
  const questionBlocks: number = (content.match(/^###\s+Q-\d+-\d+/gm) || []).length;
  if (answerBlocks > 0 && answerBlocks > questionBlocks) {
    issues.push(`Orphaned answer blocks: ${answerBlocks} answers for ${questionBlocks} questions`);
  }

  return issues;
}
