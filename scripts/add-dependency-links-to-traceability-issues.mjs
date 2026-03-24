#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO = process.env.GH_REPO || "RobertAgterhuis/myAgentic-IT-Project-team-V2";
const FILE = process.env.TRACEABILITY_FILE || "final-verdict/MILESTONES-EPICS-ISSUES-TRACEABILITY.md";
const DRY_RUN = process.env.DRY_RUN === "1";

function runGh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function ghApi(pathValue, { method = "GET", fields = [] } = {}) {
  const args = ["api", pathValue, "--method", method, "-H", "Accept: application/vnd.github+json"];
  for (const [k, v] of fields) {
    if (v === undefined || v === null) continue;
    args.push("-f", `${k}=${v}`);
  }
  const out = runGh(args);
  return out ? JSON.parse(out) : null;
}

function fetchAllIssues(repo) {
  const all = [];
  let page = 1;
  while (true) {
    const batch = ghApi(`repos/${repo}/issues?state=all&per_page=100&page=${page}`) || [];
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
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

    const milestoneTitle = `${m[1].trim()} - ${m[2].trim()}`;
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
        .filter((l) => l.startsWith("|"));

      if (tableLines.length < 3) {
        epics.push({ epicKey, epicTitle, issues: [] });
        continue;
      }

      const headers = tableLines[0]
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

      const issues = [];
      for (let k = 2; k < tableLines.length; k++) {
        const cols = tableLines[k]
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        if (cols.length !== headers.length) continue;
        const row = Object.fromEntries(headers.map((h, idx) => [h, cols[idx]]));
        if (!row["GitHub Key"]) continue;
        issues.push(row);
      }

      epics.push({ epicKey, epicTitle, issues });
    }

    milestoneBlocks.push({ milestoneTitle, epics });
  }

  return milestoneBlocks;
}

function extractKeyFromTitle(title) {
  const epicMatch = title.match(/^\[EPIC\]\[([^\]]+)\]/);
  if (epicMatch) return epicMatch[1];
  const issueMatch = title.match(/^\[([^\]]+)\]/);
  if (issueMatch) return issueMatch[1];
  return null;
}

function normalizeDepends(dependsOnRaw) {
  const val = (dependsOnRaw || "-").trim();
  if (!val || val === "-") return [];
  return val
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function replaceLineOrAppend(body, prefix, newLine) {
  const lines = body.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.startsWith(prefix));
  if (idx >= 0) {
    lines[idx] = newLine;
    return lines.join("\n");
  }
  return `${body}\n${newLine}`;
}

function writeTemp(content) {
  const tmpFile = path.join(os.tmpdir(), `traceability-body-${Date.now()}-${Math.random().toString(16).slice(2)}.md`);
  fs.writeFileSync(tmpFile, content, "utf8");
  return tmpFile;
}

function main() {
  const markdown = fs.readFileSync(FILE, "utf8");
  const plan = parseMarkdown(markdown);

  const allIssues = fetchAllIssues(REPO).filter((i) => !i.pull_request);
  const keyToIssue = new Map();
  for (const issue of allIssues) {
    const key = extractKeyFromTitle(issue.title || "");
    if (key) keyToIssue.set(key, issue);
  }

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (const milestone of plan) {
    for (const epic of milestone.epics) {
      const epicIssue = keyToIssue.get(epic.epicKey);
      if (!epicIssue) continue;

      for (const row of epic.issues) {
        scanned += 1;
        const key = row["GitHub Key"].trim();
        const issue = keyToIssue.get(key);
        if (!issue) {
          skipped += 1;
          continue;
        }

        const depKeys = normalizeDepends(row["Depends On"]);
        const depLinks = depKeys
          .map((depKey) => {
            const depIssue = keyToIssue.get(depKey);
            if (!depIssue) return depKey;
            return `[${depKey}](${depIssue.html_url})`;
          })
          .join(", ");

        const dependsLine = depKeys.length > 0 ? `Depends On: ${depLinks}` : "Depends On: -";
        const parentLine = `Parent Epic: [${epic.epicKey}](${epicIssue.html_url})`;

        let newBody = issue.body || "";
        newBody = replaceLineOrAppend(newBody, "Depends On:", dependsLine);
        newBody = replaceLineOrAppend(newBody, "Parent Epic:", parentLine);

        if (newBody === (issue.body || "")) {
          skipped += 1;
          continue;
        }

        if (DRY_RUN) {
          console.log(`[DRY] update #${issue.number} ${key}`);
          updated += 1;
          continue;
        }

        const bodyFile = writeTemp(newBody);
        runGh(["issue", "edit", String(issue.number), "--repo", REPO, "--body-file", bodyFile]);
        fs.unlinkSync(bodyFile);
        console.log(`Updated #${issue.number} ${key}`);
        updated += 1;
      }
    }
  }

  console.log(`Done. scanned=${scanned} updated=${updated} skipped=${skipped}`);
}

main();
