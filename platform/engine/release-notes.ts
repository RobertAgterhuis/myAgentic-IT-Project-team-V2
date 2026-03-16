// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Release Notes Generator
 *
 * Auto-generates Markdown release notes from completed stories, change
 * entries (conventional commits), and artifact metadata. Produces
 * categorized, human-readable output suitable for changelogs.
 *
 * Zero external dependencies. Pure functions.
 *
 * @module engine/release-notes
 */

import type { ChangeEntry } from './version-resolver.js';

// ─── Types ──────────────────────────────────────────────────

export interface StoryEntry {
  id: string;
  title: string;
  type: 'feature' | 'fix' | 'chore' | 'improvement';
  assignee?: string;
}

export interface ReleaseNotesInput {
  version: string;
  date?: string;
  sprint_id?: string;
  stories: StoryEntry[];
  changes: ChangeEntry[];
  breaking_notes?: string[];
  contributors?: string[];
}

export interface ReleaseNotesOutput {
  markdown: string;
  version: string;
  stats: {
    features: number;
    fixes: number;
    breaking: number;
    other: number;
    contributors: number;
  };
}

// ─── Category Labels ────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { emoji: string; heading: string }> = {
  breaking: { emoji: '💥', heading: 'Breaking Changes' },
  feature: { emoji: '✨', heading: 'New Features' },
  fix: { emoji: '🐛', heading: 'Bug Fixes' },
  perf: { emoji: '⚡', heading: 'Performance Improvements' },
  docs: { emoji: '📝', heading: 'Documentation' },
  refactor: { emoji: '♻️', heading: 'Refactoring' },
  test: { emoji: '✅', heading: 'Tests' },
  chore: { emoji: '🔧', heading: 'Maintenance' },
};

// ─── Grouping ───────────────────────────────────────────────

function groupChanges(changes: ChangeEntry[]): Map<string, ChangeEntry[]> {
  const groups = new Map<string, ChangeEntry[]>();
  for (const change of changes) {
    const key = change.type;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(change);
  }
  return groups;
}

function groupStories(stories: StoryEntry[]): Map<string, StoryEntry[]> {
  const groups = new Map<string, StoryEntry[]>();
  for (const story of stories) {
    const key = story.type === 'improvement' ? 'feature' : story.type;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(story);
  }
  return groups;
}

// ─── Generator ──────────────────────────────────────────────

/**
 * Generate Markdown release notes from stories and commit changes.
 */
export function generateReleaseNotes(input: ReleaseNotesInput): ReleaseNotesOutput {
  const { version, date, sprint_id, stories, changes, breaking_notes, contributors } = input;

  const lines: string[] = [];
  const releaseDate = date || new Date().toISOString().split('T')[0];

  // Header
  lines.push(`# Release ${version}`);
  lines.push('');
  lines.push(`**Date:** ${releaseDate}`);
  if (sprint_id) lines.push(`**Sprint:** ${sprint_id}`);
  lines.push('');

  // Stats
  const changeGroups = groupChanges(changes);
  const storyGroups = groupStories(stories);
  const featureCount =
    (changeGroups.get('feature')?.length || 0) + (storyGroups.get('feature')?.length || 0);
  const fixCount = (changeGroups.get('fix')?.length || 0) + (storyGroups.get('fix')?.length || 0);
  const breakingCount = (changeGroups.get('breaking')?.length || 0) + (breaking_notes?.length || 0);
  const otherCount =
    changes.length -
    (changeGroups.get('feature')?.length || 0) -
    (changeGroups.get('fix')?.length || 0) -
    (changeGroups.get('breaking')?.length || 0);

  // Breaking changes (always first if present)
  if (breakingCount > 0) {
    const cat = CATEGORY_LABELS.breaking;
    lines.push(`## ${cat.emoji} ${cat.heading}`);
    lines.push('');
    if (breaking_notes) {
      for (const note of breaking_notes) {
        lines.push(`- ${note}`);
      }
    }
    for (const change of changeGroups.get('breaking') || []) {
      const scope = change.scope ? `**${change.scope}:** ` : '';
      const ref = change.ref ? ` (${change.ref})` : '';
      lines.push(`- ${scope}${change.description}${ref}`);
    }
    lines.push('');
  }

  // Stories section
  if (stories.length > 0) {
    lines.push('## 📋 Completed Stories');
    lines.push('');

    const categoryOrder = ['feature', 'fix', 'chore'];
    for (const cat of categoryOrder) {
      const group = storyGroups.get(cat);
      if (!group || group.length === 0) continue;

      const label = CATEGORY_LABELS[cat] || CATEGORY_LABELS.chore;
      lines.push(`### ${label.emoji} ${label.heading}`);
      lines.push('');
      for (const story of group) {
        const assignee = story.assignee ? ` (@${story.assignee})` : '';
        lines.push(`- **${story.id}**: ${story.title}${assignee}`);
      }
      lines.push('');
    }
  }

  // Commit changes section (excluding breaking, already shown)
  const commitCategoryOrder = ['feature', 'fix', 'perf', 'refactor', 'docs', 'test', 'chore'];
  const hasCommitChanges = commitCategoryOrder.some(
    (cat) => (changeGroups.get(cat)?.length || 0) > 0
  );

  if (hasCommitChanges) {
    lines.push('## 🔨 Changes');
    lines.push('');

    for (const cat of commitCategoryOrder) {
      const group = changeGroups.get(cat);
      if (!group || group.length === 0) continue;

      const label = CATEGORY_LABELS[cat] || CATEGORY_LABELS.chore;
      lines.push(`### ${label.emoji} ${label.heading}`);
      lines.push('');
      for (const change of group) {
        const scope = change.scope ? `**${change.scope}:** ` : '';
        const ref = change.ref ? ` (${change.ref})` : '';
        lines.push(`- ${scope}${change.description}${ref}`);
      }
      lines.push('');
    }
  }

  // Contributors
  const uniqueContributors = contributors || [];
  if (uniqueContributors.length > 0) {
    lines.push('## 👥 Contributors');
    lines.push('');
    for (const contributor of uniqueContributors) {
      lines.push(`- @${contributor}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated automatically by SDLC Platform v${version}*`);
  lines.push('');

  return {
    markdown: lines.join('\n'),
    version,
    stats: {
      features: featureCount,
      fixes: fixCount,
      breaking: breakingCount,
      other: Math.max(0, otherCount),
      contributors: uniqueContributors.length,
    },
  };
}
