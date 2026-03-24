#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPO = process.env.GH_REPO || 'RobertAgterhuis/myAgentic-IT-Project-team-V2';
const FILE =
  process.env.TRACEABILITY_FILE || 'final-verdict/MILESTONES-EPICS-ISSUES-TRACEABILITY.md';
const DRY_RUN = process.env.DRY_RUN === '1';

function runGh(args, options = {}) {
  const out = execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  });
  return out.trim();
}

function ghApi(path, { method = 'GET', fields = [] } = {}) {
  const args = ['api', path, '--method', method, '-H', 'Accept: application/vnd.github+json'];
  for (const [k, v] of fields) {
    if (v === undefined || v === null || v === '') continue;
    args.push('-f', `${k}=${v}`);
  }
  const raw = runGh(args);
  return raw ? JSON.parse(raw) : null;
}

function parseMarkdown(content) {
  const milestoneBlocks = [];
  const milestoneRe = /^## Milestone\s+(P\d)\s+-\s+(.+)$/gm;
  const matches = [...content.matchAll(milestoneRe)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const block = content.slice(start, end);

    const priority = m[1].trim();
    const milestoneTitle = `${priority} - ${m[2].trim()}`;

    const epicMatches = [...block.matchAll(/^### Epic\s+([A-Z0-9-]+)\s+-\s+(.+)$/gm)];
    const epics = [];

    for (let j = 0; j < epicMatches.length; j++) {
      const em = epicMatches[j];
      const eStart = em.index + em[0].length;
      const eEnd = j + 1 < epicMatches.length ? epicMatches[j + 1].index : block.length;
      const epicBlock = block.slice(eStart, eEnd);
      const epicKey = em[1].trim();
      const epicTitle = em[2].trim();

      const tableLines = epicBlock
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith('|'));

      if (tableLines.length < 3) {
        epics.push({ epicKey, epicTitle, issues: [] });
        continue;
      }

      const headers = tableLines[0]
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      const issues = [];
      for (let k = 2; k < tableLines.length; k++) {
        const cols = tableLines[k]
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        if (cols.length !== headers.length) continue;
        const row = Object.fromEntries(headers.map((h, idx) => [h, cols[idx]]));
        if (!row['GitHub Key']) continue;
        issues.push(row);
      }

      epics.push({ epicKey, epicTitle, issues });
    }

    milestoneBlocks.push({ priority, milestoneTitle, epics });
  }

  return milestoneBlocks;
}

function getTrackFromEpicKey(epicKey) {
  if (epicKey.includes('-CORE-')) return 'track-core';
  if (epicKey.includes('-UI-')) return 'track-ui';
  return 'track-core';
}

function getIssueKeyFromTitle(title) {
  const mEpic = title.match(/^\[EPIC\]\[([^\]]+)\]/);
  if (mEpic) return mEpic[1];
  const m = title.match(/^\[([^\]]+)\]/);
  if (m) return m[1];
  return null;
}

function ensureLabel(repo, label) {
  try {
    ghApi(`repos/${repo}/labels/${encodeURIComponent(label)}`);
    return;
  } catch {
    if (DRY_RUN) {
      console.log(`[DRY] create label ${label}`);
      return;
    }
    ghApi(`repos/${repo}/labels`, {
      method: 'POST',
      fields: [
        ['name', label],
        ['color', '0e8a16'],
        ['description', `Auto-created for traceability import: ${label}`],
      ],
    });
    console.log(`Created label ${label}`);
  }
}

function ensureMilestone(repo, title) {
  const milestones =
    ghApi(`repos/${repo}/milestones?state=all&per_page=100`, { method: 'GET' }) || [];
  const existing = milestones.find((m) => m.title === title);
  if (existing) return existing.number;

  if (DRY_RUN) {
    console.log(`[DRY] create milestone ${title}`);
    return null;
  }

  const created = ghApi(`repos/${repo}/milestones`, {
    method: 'POST',
    fields: [['title', title]],
  });
  console.log(`Created milestone ${title} (#${created.number})`);
  return created.number;
}

function createIssue(repo, payload) {
  const fields = [
    ['title', payload.title],
    ['body', payload.body],
  ];
  if (payload.milestoneNumber) {
    fields.push(['milestone', String(payload.milestoneNumber)]);
  }
  for (const label of payload.labels || []) {
    fields.push(['labels[]', label]);
  }

  if (DRY_RUN) {
    console.log(`[DRY] create issue ${payload.title}`);
    return { number: null, html_url: '' };
  }

  return ghApi(`repos/${repo}/issues`, { method: 'POST', fields });
}

function main() {
  const markdown = fs.readFileSync(FILE, 'utf8');
  const milestones = parseMarkdown(markdown);

  if (milestones.length === 0) {
    throw new Error('No milestone sections parsed. Check markdown format.');
  }

  console.log(`Parsed ${milestones.length} milestones from ${FILE}`);

  const requiredLabels = [
    'P1',
    'P2',
    'P3',
    'P4',
    'blocking',
    'epic',
    'story',
    'track-core',
    'track-ui',
  ];

  for (const label of requiredLabels) ensureLabel(REPO, label);

  const existingIssues =
    ghApi(`repos/${REPO}/issues?state=all&per_page=100`, { method: 'GET' }) || [];
  const keyToIssueNumber = new Map();
  for (const issue of existingIssues) {
    if (issue.pull_request) continue;
    const key = getIssueKeyFromTitle(issue.title || '');
    if (key) keyToIssueNumber.set(key, issue.number);
  }

  for (const milestone of milestones) {
    const milestoneNumber = ensureMilestone(REPO, milestone.milestoneTitle);

    for (const epic of milestone.epics) {
      const epicKey = epic.epicKey;
      const epicTitle = `[EPIC][${epicKey}] ${epic.epicTitle}`;
      let epicIssueNumber = keyToIssueNumber.get(epicKey);

      if (!epicIssueNumber) {
        const epicBody = [
          `Track: ${epicKey.includes('-UI-') ? 'UI' : 'CORE'}`,
          `Priority: ${milestone.priority}`,
          `Epic Key: ${epicKey}`,
          '',
          'Imported from final merged traceability backlog:',
          `- Source: ${FILE}`,
          '',
          'This epic groups child stories that preserve end-to-end traceability.',
        ].join('\n');

        const createdEpic = createIssue(REPO, {
          title: epicTitle,
          body: epicBody,
          milestoneNumber,
          labels: [milestone.priority, 'epic', getTrackFromEpicKey(epicKey)],
        });
        epicIssueNumber = createdEpic.number;
        if (epicIssueNumber) {
          keyToIssueNumber.set(epicKey, epicIssueNumber);
          console.log(`Created epic ${epicKey} -> #${epicIssueNumber}`);
        }
      } else {
        console.log(`Epic exists ${epicKey} -> #${epicIssueNumber}`);
      }

      for (const row of epic.issues) {
        const key = row['GitHub Key'].trim();
        const title = `[${key}] ${row['Title'].trim()}`;
        if (keyToIssueNumber.has(key)) {
          console.log(`Issue exists ${key} -> #${keyToIssueNumber.get(key)}`);
          continue;
        }

        const blocking = (row['Blocking'] || 'NO').trim().toUpperCase();
        const dependsOn = (row['Depends On'] || '-').trim();
        const originalId = (row['Original ID'] || '').trim();
        const userStory = (row['User Story'] || '').trim();

        let depText = '-';
        if (dependsOn && dependsOn !== '-') {
          const depNum = keyToIssueNumber.get(dependsOn);
          depText = depNum ? `${dependsOn} (#${depNum})` : dependsOn;
        }

        const body = [
          `Track: ${row['Track'] || (key.includes('-UI-') ? 'UI' : 'CORE')}`,
          `Priority: ${(row['GitHub Key'] || '').startsWith('P1') ? 'P1' : (row['GitHub Key'] || '').startsWith('P2') ? 'P2' : (row['GitHub Key'] || '').startsWith('P3') ? 'P3' : 'P4'}`,
          `Blocking: ${blocking}`,
          `Original ID: ${originalId || 'N/A'}`,
          `Depends On: ${depText}`,
          `Parent Epic: ${epicKey}${epicIssueNumber ? ` (#${epicIssueNumber})` : ''}`,
          '',
          '## User Story',
          userStory,
          '',
          '## Traceability',
          `- Source file: ${FILE}`,
          `- Milestone: ${milestone.milestoneTitle}`,
          `- Epic: ${epic.epicTitle}`,
          `- Key: ${key}`,
        ].join('\n');

        const labels = [
          milestone.priority,
          'story',
          getTrackFromEpicKey(epicKey),
          ...(blocking === 'YES' ? ['blocking'] : []),
        ];

        const created = createIssue(REPO, {
          title,
          body,
          milestoneNumber,
          labels,
        });

        if (created.number) {
          keyToIssueNumber.set(key, created.number);
          console.log(`Created issue ${key} -> #${created.number}`);
        }
      }
    }
  }

  console.log('Import completed.');
}

main();
