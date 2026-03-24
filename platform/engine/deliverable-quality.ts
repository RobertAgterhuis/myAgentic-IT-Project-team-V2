export interface DeliverableQualityMetric {
  id: 'contract' | 'sections' | 'checklist' | 'evidence' | 'depth';
  label: string;
  score: number;
  detail: string;
}

export interface DeliverableQualityAssessment {
  score: number;
  approvalSignal: 'approve' | 'review' | 'block';
  summary: string;
  metrics: DeliverableQualityMetric[];
}

interface DeliverableQualityOptions {
  requiredSections?: string[];
  validationPassed?: boolean;
  findings?: Array<{ rule?: string; description?: string }>;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function getHeadings(content: string): string[] {
  return (content.match(/^#{1,6}\s+.+$/gm) || [])
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
    .filter(Boolean);
}

function getChecklistStats(content: string): { total: number; checked: number } {
  const items = content.match(/^\s*-\s*\[(?: |x|X)\]\s+.+$/gm) || [];
  const checked = content.match(/^\s*-\s*\[(?:x|X)\]\s+.+$/gm) || [];
  return { total: items.length, checked: checked.length };
}

function collectEvidenceRefs(content: string): string[] {
  const refs = new Set<string>();

  for (const match of content.match(/questionnaire:\[[^\]]+\]/gi) || []) {
    refs.add(match.toLowerCase());
  }

  for (const match of content.match(
    /(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.(?:md|ts|tsx|js|json|mjs|yml|yaml|ps1)/g
  ) || []) {
    refs.add(match.toLowerCase());
  }

  for (const line of content.split(/\r?\n/)) {
    if (/\bsource\b/i.test(line)) {
      refs.add(line.trim().toLowerCase());
    }
  }

  return [...refs];
}

function toPercent(score01: number): number {
  return Math.round(clamp01(score01) * 100);
}

export function assessDeliverableQuality(
  content: string,
  options: DeliverableQualityOptions = {}
): DeliverableQualityAssessment {
  const headings = getHeadings(content);
  const checklist = getChecklistStats(content);
  const evidenceRefs = collectEvidenceRefs(content);
  const wordCount = countWords(content);

  const requiredSections = options.requiredSections || [];
  const matchedSections = requiredSections.filter((section) =>
    headings.some((heading) => normalizeForMatch(heading) === normalizeForMatch(section))
  );

  const contractScore01 =
    options.validationPassed === undefined
      ? 0.5
      : options.validationPassed
        ? 1
        : Math.max(0, 1 - Math.min((options.findings || []).length, 4) / 4);

  const sectionScore01 =
    requiredSections.length > 0
      ? matchedSections.length / requiredSections.length
      : Math.min(headings.length / 4, 1);

  const checklistScore01 = checklist.total > 0 ? checklist.checked / checklist.total : 0;
  const evidenceScore01 = Math.min(evidenceRefs.length / 4, 1);
  const depthScore01 = Math.min(wordCount / 500, 1);

  const metrics: DeliverableQualityMetric[] = [
    {
      id: 'contract',
      label: 'Contract compliance',
      score: toPercent(contractScore01),
      detail:
        options.validationPassed === false
          ? `${(options.findings || []).length} validation finding(s) remain.`
          : options.validationPassed === true
            ? 'Contract validation passed.'
            : 'Contract validation was not available for this artifact.',
    },
    {
      id: 'sections',
      label: 'Section coverage',
      score: toPercent(sectionScore01),
      detail:
        requiredSections.length > 0
          ? `${matchedSections.length} of ${requiredSections.length} required section(s) matched.`
          : `${headings.length} heading(s) detected in the deliverable.`,
    },
    {
      id: 'checklist',
      label: 'Checklist completion',
      score: toPercent(checklistScore01),
      detail:
        checklist.total > 0
          ? `${checklist.checked} of ${checklist.total} checklist item(s) are checked.`
          : 'No machine-readable checklist items were detected.',
    },
    {
      id: 'evidence',
      label: 'Evidence references',
      score: toPercent(evidenceScore01),
      detail:
        evidenceRefs.length > 0
          ? `${evidenceRefs.length} distinct evidence reference(s) detected.`
          : 'No explicit source or artifact references were detected.',
    },
    {
      id: 'depth',
      label: 'Content depth',
      score: toPercent(depthScore01),
      detail: `${wordCount} word(s) detected in the artifact.`,
    },
  ];

  const weightedScore01 =
    contractScore01 * 0.35 +
    sectionScore01 * 0.2 +
    checklistScore01 * 0.15 +
    evidenceScore01 * 0.15 +
    depthScore01 * 0.15;
  const score = toPercent(weightedScore01);
  const approvalSignal = score >= 85 ? 'approve' : score >= 70 ? 'review' : 'block';

  const weakMetrics = metrics.filter((metric) => metric.score < 60).map((metric) => metric.label);
  const summary =
    weakMetrics.length === 0
      ? 'Strong contract alignment, evidence coverage, and deliverable depth.'
      : `Manual review should focus on ${weakMetrics.join(', ').toLowerCase()}.`;

  return {
    score,
    approvalSignal,
    summary,
    metrics,
  };
}
