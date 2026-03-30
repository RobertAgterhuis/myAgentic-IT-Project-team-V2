import fs from 'node:fs';
import path from 'node:path';

const AGENTS_DIR = path.resolve('templates/sdlc/agents');
const OUTPUT_PATH = path.resolve('docs/reference/m2-handoff-compliance-report.md');

const REQUIRED_SECTIONS = ['summary', 'deliverables', 'handoff to next agent', 'exit criteria met'];

function listAgentFiles() {
  const entries = fs.readdirSync(AGENTS_DIR);
  return entries
    .filter((name) => /^\d{2}-.*\.md$/i.test(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(AGENTS_DIR, name));
}

function hasHeading(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^##\\s+${escaped}\\s*$`, 'im');
  return regex.test(content);
}

function estimateEffort(missingCount) {
  if (missingCount === 0) return 'none';
  if (missingCount <= 1) return 'small';
  if (missingCount <= 3) return 'medium';
  return 'large';
}

function audit() {
  const rows = [];
  for (const filePath of listAgentFiles()) {
    const content = fs.readFileSync(filePath, 'utf8');

    const checks = REQUIRED_SECTIONS.map((section) => ({
      section,
      present: hasHeading(content, section),
    }));

    const missing = checks.filter((check) => !check.present).map((check) => check.section);
    const compliant = missing.length === 0;

    rows.push({
      agentFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      compliant,
      missing,
      effort: estimateEffort(missing.length),
    });
  }

  return rows;
}

function renderMarkdown(rows) {
  const total = rows.length;
  const compliant = rows.filter((row) => row.compliant).length;
  const nonCompliant = total - compliant;
  const pct = ((compliant / total) * 100).toFixed(1);

  const lines = [];
  lines.push('# M2 SDLC Handoff Compliance Audit');
  lines.push('');
  lines.push('Scope: Audit of 39 SDLC agent templates against M2 mandatory handoff sections.');
  lines.push('');
  lines.push('Mandatory sections audited:');
  lines.push('- Summary');
  lines.push('- Deliverables');
  lines.push('- Handoff to Next Agent');
  lines.push('- Exit Criteria Met');
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total agents audited: ${total}`);
  lines.push(`- Fully compliant: ${compliant} (${pct}%)`);
  lines.push(`- Requiring updates: ${nonCompliant}`);
  lines.push('');
  lines.push('## Compliance Table');
  lines.push('');
  lines.push(
    '| Agent Template | Compliant | Missing Mandatory Sections | Estimated Update Effort |'
  );
  lines.push('| --- | --- | --- | --- |');

  for (const row of rows) {
    lines.push(
      `| ${row.agentFile} | ${row.compliant ? 'yes' : 'no'} | ${row.missing.length ? row.missing.join(', ') : 'none'} | ${row.effort} |`
    );
  }

  const updates = rows.filter((row) => !row.compliant).map((row) => row.agentFile);

  lines.push('');
  lines.push('## Update Plan');
  lines.push('');
  lines.push('- Apply unified handoff section scaffold to all non-compliant agent templates.');
  lines.push(
    '- Preserve existing domain-specific guidance while inserting mandatory section headers.'
  );
  lines.push('- Re-run this audit script and the handoff validator in CI.');
  lines.push('');
  lines.push('## Agents Requiring Updates');
  lines.push('');

  if (!updates.length) {
    lines.push('- none');
  } else {
    for (const item of updates) {
      lines.push(`- ${item}`);
    }
  }

  lines.push('');
  lines.push('## Exceptions');
  lines.push('');
  lines.push('- none; all deviations are actionable and should be standardized.');

  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = audit();
  const markdown = renderMarkdown(rows);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf8');

  const compliant = rows.filter((row) => row.compliant).length;
  const pct = ((compliant / rows.length) * 100).toFixed(1);
  process.stdout.write(
    `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} (${rows.length} agents audited, ${pct}% compliant)\n`
  );
}

main();
