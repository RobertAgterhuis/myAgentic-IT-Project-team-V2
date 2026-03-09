#!/usr/bin/env node
/**
 * github-state-snapshot.js — Captures current GitHub board state (milestones + issues)
 * and writes a structured JSON snapshot to .github/docs/session/github-state-snapshot.json.
 *
 * Used at Sprint Gate Step 0 to inject ## GITHUB STATE context into Reevaluate Agent.
 *
 * Guardrails: G-GLOB-65
 *
 * Prerequisites: `gh` CLI installed and authenticated.
 *
 * Usage:
 *   node scripts/github-state-snapshot.js                # full snapshot
 *   node scripts/github-state-snapshot.js --stdout       # print to stdout instead of file
 */
'use strict';

const { execSync: _execSync } = require('child_process');
const path = require('path');
const _fs  = require('fs');

const OWNER = 'RobertAgterhuis';
const REPO  = 'myAgentic-IT-Project-team-V2';
const OUTPUT_FILE = path.resolve(__dirname, '..', 'docs', 'session', 'github-state-snapshot.json');

const toStdout = process.argv.includes('--stdout');

// Overridable deps for testing
let _deps = { execSync: _execSync, fs: _fs };
function _setDeps(deps) { _deps = { ..._deps, ...deps }; }

// ---------- helpers ----------

function gh(endpoint) {
  const cmd = `gh api ${endpoint} --paginate`;
  try {
    const raw = _deps.execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(raw);
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : '';
    if (stderr.includes('404') || stderr.includes('Not Found')) return null;
    throw new Error(`gh api ${endpoint} failed: ${stderr}`);
  }
}

// ---------- milestones ----------

function fetchMilestones() {
  const open   = gh(`repos/${OWNER}/${REPO}/milestones?state=open&per_page=100`) || [];
  const closed = gh(`repos/${OWNER}/${REPO}/milestones?state=closed&per_page=100`) || [];
  return [...open, ...closed].map(m => ({
    number:       m.number,
    title:        m.title,
    state:        m.state,
    open_issues:  m.open_issues,
    closed_issues: m.closed_issues,
    due_on:       m.due_on || null,
    description:  (m.description || '').slice(0, 200)
  }));
}

// ---------- issues ----------

function fetchIssues() {
  const open   = gh(`repos/${OWNER}/${REPO}/issues?state=open&per_page=100`) || [];
  const closed = gh(`repos/${OWNER}/${REPO}/issues?state=closed&per_page=100`) || [];
  // Filter out pull requests (GitHub API returns PRs in /issues too)
  const isIssue = i => !i.pull_request;
  return [...open, ...closed].filter(isIssue).map(i => ({
    number:    i.number,
    title:     i.title,
    state:     i.state,
    labels:    (i.labels || []).map(l => l.name),
    milestone: i.milestone ? { number: i.milestone.number, title: i.milestone.title } : null,
    assignees: (i.assignees || []).map(a => a.login),
    created_at: i.created_at,
    closed_at:  i.closed_at
  }));
}

// ---------- main ----------

function createSnapshot() {
  console.log(`\nGitHub State Snapshot: ${OWNER}/${REPO}\n`);

  const milestones = fetchMilestones();
  const issues     = fetchIssues();

  const snapshot = {
    repo:       `${OWNER}/${REPO}`,
    captured_at: new Date().toISOString(),
    summary: {
      milestones_open:   milestones.filter(m => m.state === 'open').length,
      milestones_closed: milestones.filter(m => m.state === 'closed').length,
      issues_open:       issues.filter(i => i.state === 'open').length,
      issues_closed:     issues.filter(i => i.state === 'closed').length
    },
    milestones,
    issues
  };

  if (toStdout) {
    process.stdout.write(JSON.stringify(snapshot, null, 2));
  } else {
    const dir = path.dirname(OUTPUT_FILE);
    if (!_deps.fs.existsSync(dir)) _deps.fs.mkdirSync(dir, { recursive: true });
    _deps.fs.writeFileSync(OUTPUT_FILE, JSON.stringify(snapshot, null, 2));
    console.log(`  Milestones: ${milestones.length} (${snapshot.summary.milestones_open} open, ${snapshot.summary.milestones_closed} closed)`);
    console.log(`  Issues:     ${issues.length} (${snapshot.summary.issues_open} open, ${snapshot.summary.issues_closed} closed)`);
    console.log(`  Written to: ${OUTPUT_FILE}\n`);
  }

  return snapshot;
}

// Allow require() for testing and direct execution
if (require.main === module) {
  createSnapshot();
} else {
  module.exports = { createSnapshot, fetchMilestones, fetchIssues, OWNER, REPO, OUTPUT_FILE, _setDeps };
}
