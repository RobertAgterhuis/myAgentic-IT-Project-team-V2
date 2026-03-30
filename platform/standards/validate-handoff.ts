import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import MarkdownIt from 'markdown-it';

export type HandoffStatus = 'COMPLETED' | 'BLOCKED' | 'ESCALATED';

export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidationResult {
  filePath: string;
  valid: boolean;
  errors: ValidationError[];
}

const REQUIRED_SECTIONS = ['summary', 'deliverables', 'handoff to next agent', 'exit criteria met'];

const OPTIONAL_SECTIONS = [
  'escalations',
  'quality validation',
  'lessons learned',
  'dependencies',
  'technical decisions',
];

export const HANDOFF_STATUS_VALUES: HandoffStatus[] = ['COMPLETED', 'BLOCKED', 'ESCALATED'];

const PLACEHOLDER_PATTERNS = [
  /\[todo\]/i,
  /\[tbd\]/i,
  /\[placeholder\]/i,
  /fill in/i,
  /^\s*none\s*$/i,
  /^\s*n\/a\s*$/i,
];

const SCHEMA_PATH = path.resolve('platform/standards/validation-schema.json');
const SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const AJV = new Ajv2020({ allErrors: true, strict: false });
const VALIDATE_SCHEMA = AJV.compile(SCHEMA);

function normalizeHeading(input: string): string {
  return input.trim().toLowerCase();
}

function extractSections(content: string): Map<string, string> {
  const lines = content.split(/\r?\n/);
  const sections = new Map<string, string>();

  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (currentTitle) {
        sections.set(normalizeHeading(currentTitle), currentContent.join('\n').trim());
      }
      currentTitle = heading[1].trim();
      currentContent = [];
      continue;
    }
    if (currentTitle) {
      currentContent.push(line);
    }
  }

  if (currentTitle) {
    sections.set(normalizeHeading(currentTitle), currentContent.join('\n').trim());
  }

  return sections;
}

function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function findDeliverableRefs(sectionContent: string): string[] {
  const refs: string[] = [];
  const lines = sectionContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;

    const pathMatch = trimmed.match(/([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)(?=\s|$)/);
    const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/i);

    if (urlMatch) {
      refs.push(urlMatch[0]);
      continue;
    }

    if (pathMatch) {
      refs.push(pathMatch[1]);
    }
  }
  return refs;
}

function refExists(ref: string, docFilePath: string): boolean {
  if (/^https?:\/\//i.test(ref)) {
    return true;
  }

  const docDir = path.dirname(docFilePath);
  const cwdPath = path.resolve(process.cwd(), ref);
  const relativeToDocPath = path.resolve(docDir, ref);

  return fs.existsSync(cwdPath) || fs.existsSync(relativeToDocPath);
}

function validateQualityEvidence(sectionContent: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const commandMatch = sectionContent.match(/(?:^|\n)\s*-?\s*Command:\s*(.+)$/im);
  const evidenceMatch = sectionContent.match(/(?:^|\n)\s*-?\s*Evidence:\s*(.+)$/im);

  if (!commandMatch || !commandMatch[1] || hasPlaceholder(commandMatch[1])) {
    errors.push({
      code: 'INVALID_QUALITY_COMMAND',
      message: 'Quality Validation section must include a concrete Command: value.',
    });
  }

  if (!evidenceMatch || !evidenceMatch[1] || hasPlaceholder(evidenceMatch[1])) {
    errors.push({
      code: 'INVALID_QUALITY_EVIDENCE',
      message: 'Quality Validation section must include concrete Evidence: (not placeholder text).',
    });
  }

  return errors;
}

function buildSchemaCandidate(sections: Map<string, string>) {
  const deliverableRefs = findDeliverableRefs(sections.get('deliverables') || '');
  const handoffSection = sections.get('handoff to next agent') || '';

  const fromMatch = handoffSection.match(/(?:^|\n)\s*-?\s*From:\s*(.+)$/im);
  const toMatch = handoffSection.match(/(?:^|\n)\s*-?\s*To:\s*(.+)$/im);
  const statusMatch = handoffSection.match(/(?:^|\n)\s*-?\s*Status:\s*([A-Z_]+)\s*$/im);
  const nextActionMatch = handoffSection.match(/(?:^|\n)\s*-?\s*Next action:\s*(.+)$/im);

  const exitItems = (sections.get('exit criteria met') || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ['))
    .map((line) => {
      const checked = /^-\s*\[(x|X)\]/.test(line);
      const text = line.replace(/^-\s*\[(x|X|\s)\]\s*/, '').trim();
      return { checked, text };
    });

  const qualitySection = sections.get('quality validation') || '';
  const commandMatch = qualitySection.match(/(?:^|\n)\s*-?\s*Command:\s*(.+)$/im);
  const evidenceMatch = qualitySection.match(/(?:^|\n)\s*-?\s*Evidence:\s*(.+)$/im);

  const candidate: Record<string, unknown> = {
    summary: sections.get('summary') || '',
    deliverables: deliverableRefs.map((reference) => ({
      reference,
      description: 'evidence reference',
    })),
    handoff: {
      from: fromMatch?.[1]?.trim() || '',
      to: toMatch?.[1]?.trim() || '',
      status: statusMatch?.[1]?.trim() || '',
      nextAction: nextActionMatch?.[1]?.trim() || '',
    },
    exitCriteriaMet: exitItems,
  };

  if (sections.get('quality validation')) {
    candidate.qualityValidation = {
      command: commandMatch?.[1]?.trim() || '',
      evidence: evidenceMatch?.[1]?.trim() || '',
    };
  }

  return candidate;
}

export function validateHandoffDocument(content: string, filePath: string): ValidationResult {
  const errors: ValidationError[] = [];

  try {
    const md = new MarkdownIt();
    md.parse(content, {});
  } catch (error) {
    errors.push({
      code: 'INVALID_MARKDOWN',
      message: `Markdown parse failed: ${(error as Error).message}`,
    });
    return { filePath, valid: false, errors };
  }

  const sections = extractSections(content);

  for (const required of REQUIRED_SECTIONS) {
    const section = sections.get(required);
    if (!section) {
      errors.push({
        code: 'MISSING_REQUIRED_SECTION',
        message: `Missing required section: ${required}`,
      });
      continue;
    }

    if (!section.trim() || hasPlaceholder(section)) {
      errors.push({
        code: 'EMPTY_REQUIRED_SECTION',
        message: `Required section is empty or placeholder: ${required}`,
      });
    }
  }

  const statusSection = sections.get('handoff to next agent') || '';
  const statusMatch = statusSection.match(/(?:^|\n)\s*-?\s*Status:\s*([A-Z_]+)\s*$/m);
  if (!statusMatch) {
    errors.push({
      code: 'MISSING_STATUS',
      message: 'Handoff to Next Agent must include Status: COMPLETED|BLOCKED|ESCALATED.',
    });
  } else {
    const status = statusMatch[1] as HandoffStatus;
    if (!HANDOFF_STATUS_VALUES.includes(status)) {
      errors.push({
        code: 'INVALID_STATUS',
        message: `Invalid status ${status}. Allowed: ${HANDOFF_STATUS_VALUES.join(', ')}.`,
      });
    }
  }

  const deliverablesSection = sections.get('deliverables') || '';
  const refs = findDeliverableRefs(deliverablesSection);
  if (refs.length === 0) {
    errors.push({
      code: 'MISSING_DELIVERABLE_EVIDENCE',
      message: 'Deliverables section must include at least one file reference or evidence URL.',
    });
  } else {
    for (const ref of refs) {
      if (!refExists(ref, filePath)) {
        errors.push({
          code: 'MISSING_DELIVERABLE_REFERENCE',
          message: `Deliverable reference does not exist: ${ref}`,
        });
      }
    }
  }

  const qualityValidationSection = sections.get('quality validation');
  if (qualityValidationSection) {
    errors.push(...validateQualityEvidence(qualityValidationSection));
  }

  for (const optionalSection of OPTIONAL_SECTIONS) {
    const value = sections.get(optionalSection);
    if (value && hasPlaceholder(value)) {
      errors.push({
        code: 'PLACEHOLDER_OPTIONAL_SECTION',
        message: `Optional section contains placeholder text: ${optionalSection}`,
      });
    }
  }

  const schemaCandidate = buildSchemaCandidate(sections);
  const schemaValid = VALIDATE_SCHEMA(schemaCandidate);
  if (!schemaValid) {
    for (const issue of VALIDATE_SCHEMA.errors || []) {
      const location = issue.instancePath || '/';
      errors.push({
        code: 'SCHEMA_VALIDATION_FAILED',
        message: `${location} ${issue.message || 'schema validation error'}`,
      });
    }
  }

  return {
    filePath,
    valid: errors.length === 0,
    errors,
  };
}

function walkMarkdownFiles(targetPath: string): string[] {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return targetPath.toLowerCase().endsWith('.md') ? [targetPath] : [];
  }

  const files: string[] = [];
  for (const item of fs.readdirSync(targetPath)) {
    const fullPath = path.join(targetPath, item);
    const subStat = fs.statSync(fullPath);
    if (subStat.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
    } else if (fullPath.toLowerCase().endsWith('.md')) {
      if (path.basename(fullPath).toLowerCase() === 'readme.md') {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

export function validatePath(targetPath: string): ValidationResult[] {
  const resolved = path.resolve(process.cwd(), targetPath);
  if (!fs.existsSync(resolved)) {
    return [
      {
        filePath: resolved,
        valid: false,
        errors: [
          {
            code: 'TARGET_NOT_FOUND',
            message: `Path does not exist: ${targetPath}`,
          },
        ],
      },
    ];
  }

  const files = walkMarkdownFiles(resolved);
  return files.map((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    return validateHandoffDocument(content, filePath);
  });
}

function formatError(result: ValidationResult): string[] {
  if (result.valid) {
    return [`PASS ${result.filePath}`];
  }

  const lines = [`FAIL ${result.filePath}`];
  for (const error of result.errors) {
    lines.push(`  - [${error.code}] ${error.message}`);
  }
  return lines;
}

function runCli() {
  const targetPath = process.argv[2];

  if (!targetPath) {
    console.error('Usage: validate-handoff <file-or-directory>');
    process.exit(1);
  }

  const results = validatePath(targetPath);
  const output = results.flatMap(formatError).join('\n');
  process.stdout.write(`${output}\n`);

  const hasFailure = results.some((result) => !result.valid);
  process.exit(hasFailure ? 1 : 0);
}

if (process.argv[1] && /validate-handoff\.(ts|js)$/i.test(process.argv[1])) {
  runCli();
}
