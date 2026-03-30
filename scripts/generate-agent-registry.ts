#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { compile } from 'json-schema-to-typescript';
import {
  KNOWN_AGENT_DOMAINS,
  REGISTRY_PATH,
  REGISTRY_SCHEMA_PATH,
  validateAgentRegistry,
  type AgentDomain,
  type AgentPhase,
  type AgentRegistryDocument,
  type AgentRegistryEntry,
  type AgentTimelineEstimate,
} from '../platform/engine/agent-registry';

type CanonicalAgent = {
  id: string;
  name: string;
  role: string;
  phase: AgentPhase;
  skillFiles: string[];
  tools: string[];
  guardrails: string[];
  contracts: string[];
  dependencies: string[];
};

type CanonicalAgentsDocument = {
  agents: CanonicalAgent[];
};

type FlowDocument = {
  gates?: Array<{ id: string; type?: string }>;
};

type Frontmatter = {
  name?: string;
  description?: string;
  color?: string;
  emoji?: string;
  vibe?: string;
  tools?: string | string[];
};

const ROOT = process.cwd();
const CANONICAL_AGENTS_PATH = path.join(ROOT, 'platform', 'schema', 'agents.json');
const FLOWS_PATH = path.join(ROOT, 'platform', 'schema', 'flows.json');
const AGENCY_AGENT_DIR = path.join(ROOT, 'templates', 'agency-agents-markdown');
const REGISTRY_TYPES_PATH = path.join(ROOT, 'platform', 'schema', 'agent-registry.generated.ts');
const VALID_AGENT_DOMAINS = new Set<string>(KNOWN_AGENT_DOMAINS);

const DEFAULT_SUCCESS_RATE = 85;
const DEFAULT_QUALITY_SCORE = 85;
const DEFAULT_MAX_RETRIES = 2;

const TIMELINE_BY_DOMAIN: Record<string, AgentTimelineEstimate> = {
  academic: '1-3 days',
  design: '4-8 hours',
  engineering: '4-8 hours',
  'game-development': '1-3 days',
  integrations: '1-3 days',
  marketing: '1-3 days',
  'paid-media': '1-3 days',
  product: '1-3 days',
  'project-management': '1-3 days',
  sales: '4-8 hours',
  'spatial-computing': '3-5 days',
  specialized: '1-3 days',
  strategy: '1-3 days',
  support: '4-8 hours',
  testing: '4-8 hours',
};

const TIMELINE_BY_PHASE: Record<string, AgentTimelineEstimate> = {
  ONBOARDING: '<4 hours',
  PHASE_1: '4-8 hours',
  PHASE_2: '4-8 hours',
  PHASE_3: '4-8 hours',
  PHASE_4: '4-8 hours',
  CRITIC_RISK: '<4 hours',
  SYNTHESIS: '4-8 hours',
  SPRINT_GATE: '<4 hours',
  PHASE_5_EXECUTING: '4-8 hours',
  REEVALUATE: '<4 hours',
  FEATURE: '1-3 days',
  QUESTIONNAIRE: '<4 hours',
  SCOPE_CHANGE: '<4 hours',
  ON_DEMAND: '1-3 days',
};

const DEFAULT_INPUTS_BY_DOMAIN: Record<string, string[]> = {
  academic: ['research question', 'source material', 'scope constraints'],
  design: ['design brief', 'brand constraints', 'target audience'],
  engineering: ['technical brief', 'acceptance criteria', 'implementation constraints'],
  'game-development': ['game concept', 'target platform', 'player goals'],
  integrations: ['integration target', 'API constraints', 'system context'],
  marketing: ['campaign brief', 'target audience', 'brand voice'],
  'paid-media': ['channel mix', 'budget constraints', 'conversion objective'],
  product: ['problem statement', 'priority context', 'user needs'],
  'project-management': ['delivery scope', 'timeline constraints', 'owner map'],
  sales: ['offer definition', 'buyer context', 'objection patterns'],
  'spatial-computing': ['experience brief', 'device constraints', 'interaction goals'],
  specialized: ['problem definition', 'operational constraints', 'relevant records'],
  strategy: ['business objective', 'decision context', 'known constraints'],
  support: ['customer issue', 'case history', 'service context'],
  testing: ['test target', 'acceptance criteria', 'risk areas'],
  sdlc: ['predecessor deliverables', 'workflow mode', 'relevant project artifacts'],
};

const DEFAULT_OUTPUTS_BY_DOMAIN: Record<string, string[]> = {
  academic: ['research analysis', 'evidence summary', 'recommendations'],
  design: ['design direction', 'annotated concepts', 'interaction guidance'],
  engineering: ['implementation plan', 'technical recommendations', 'quality notes'],
  'game-development': ['systems proposal', 'gameplay recommendations', 'production notes'],
  integrations: ['integration plan', 'mapping recommendations', 'risk notes'],
  marketing: ['campaign plan', 'messaging recommendations', 'performance analysis'],
  'paid-media': ['channel plan', 'creative guidance', 'optimization recommendations'],
  product: ['product recommendations', 'prioritization notes', 'success criteria'],
  'project-management': ['execution plan', 'risk log', 'status guidance'],
  sales: ['sales plan', 'objection handling guidance', 'pipeline recommendations'],
  'spatial-computing': [
    'experience proposal',
    'interaction recommendations',
    'implementation notes',
  ],
  specialized: ['operational recommendations', 'decision evidence', 'risk summary'],
  strategy: ['strategy brief', 'trade-off analysis', 'recommended next steps'],
  support: ['resolution guidance', 'customer response draft', 'follow-up actions'],
  testing: ['test strategy', 'risk findings', 'quality recommendations'],
  sdlc: ['analysis', 'recommendations', 'handoff artifacts'],
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function relative(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value && value.trim().length > 0))];
}

function normalizeText(value: string): string {
  return value
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/[_#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const closingMarker = content.indexOf('\n---', 3);
  if (closingMarker === -1) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = content.slice(4, closingMarker).trim();
  const body = content.slice(closingMarker + 4).trimStart();
  let parsed: Frontmatter = {};

  try {
    parsed = (parseYaml(yamlBlock) as Frontmatter) || {};
  } catch {
    // Some agent files contain non-strict YAML frontmatter; fallback preserves common key:value fields.
    parsed = parseFrontmatterFallback(yamlBlock);
  }

  return {
    frontmatter: parsed,
    body,
  };
}

function parseFrontmatterFallback(yamlBlock: string): Frontmatter {
  const frontmatter: Frontmatter = {};
  for (const line of yamlBlock.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    const rawValue = match[2].replace(/^['"]|['"]$/g, '').trim();
    if (
      key === 'name' ||
      key === 'description' ||
      key === 'color' ||
      key === 'emoji' ||
      key === 'vibe'
    ) {
      frontmatter[key] = rawValue;
    }
    if (key === 'tools') {
      frontmatter.tools = rawValue;
    }
  }
  return frontmatter;
}

function collectSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  let currentHeading = 'root';
  const lines: string[] = [];

  const flush = () => {
    sections.set(currentHeading, lines.join('\n').trim());
    lines.length = 0;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const headingMatch = line.match(/^##+#\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim().toLowerCase();
      continue;
    }
    lines.push(line);
  }

  flush();
  return sections;
}

function extractBulletItems(value: string): string[] {
  return unique(
    value
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1] || '')
      .map((line) => normalizeText(line.replace(/^[A-Za-z ]+:\s*/, '')))
      .filter(Boolean)
  );
}

function extractInitialParagraph(markdown: string): string | null {
  const paragraphs = markdown
    .split(/\r?\n\r?\n/)
    .map((part) => normalizeText(part))
    .filter((part) => part.length > 0 && !part.startsWith('---') && !part.startsWith('#'));
  return paragraphs[0] || null;
}

function extractSdlcDomainBullets(markdown: string): string[] {
  const match = markdown.match(/Your domain is:\s*([\s\S]*?)\n\n/);
  if (!match) {
    return [];
  }
  return extractBulletItems(match[1]);
}

function extractInputsFromSections(
  sections: Map<string, string>,
  fallbackDomain: AgentDomain
): string[] {
  const candidates = [
    sections.get('step 1: input inventory'),
    sections.get('inputs'),
    sections.get('required inputs'),
    sections.get('decision framework'),
    sections.get('use this agent when you need'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const bullets = extractBulletItems(candidate);
    if (bullets.length > 0) {
      return bullets.slice(0, 8);
    }
  }

  return DEFAULT_INPUTS_BY_DOMAIN[fallbackDomain];
}

function extractCapabilitiesFromSections(
  sections: Map<string, string>,
  fallback: string[]
): string[] {
  const orderedHeadings = [
    'core capabilities',
    'specialized skills',
    'core mission',
    'key capabilities',
    'role definition',
    'implementation excellence',
    'advanced capabilities',
  ];

  for (const heading of orderedHeadings) {
    const value = sections.get(heading);
    if (!value) {
      continue;
    }
    const bullets = extractBulletItems(value);
    if (bullets.length > 0) {
      return bullets.slice(0, 10);
    }
  }

  return fallback;
}

function inferOutputs(domain: AgentDomain, sections: Map<string, string>): string[] {
  const deliverables = sections.get('technical deliverables') || sections.get('deliverables');
  if (deliverables) {
    const bullets = extractBulletItems(deliverables);
    if (bullets.length > 0) {
      return bullets.slice(0, 6);
    }
  }

  return DEFAULT_OUTPUTS_BY_DOMAIN[domain];
}

function inferOptionalInputs(domain: AgentDomain, sections: Map<string, string>): string[] {
  const value = sections.get('decision framework') || sections.get('quality assurance');
  const bullets = value ? extractBulletItems(value) : [];
  if (bullets.length > 0) {
    return bullets.slice(0, 5);
  }

  if (domain === 'marketing') {
    return ['analytics baseline', 'existing brand assets'];
  }

  if (domain === 'engineering') {
    return ['reference implementation', 'design system guidance'];
  }

  return ['stakeholder preferences', 'historical context'];
}

function inferPrerequisites(domain: AgentDomain, phase: AgentPhase | null): string[] {
  if (domain === 'sdlc') {
    return phase
      ? [`previous ${phase.toLowerCase()} dependencies satisfied`]
      : ['workflow context available'];
  }

  return ['clear task objective', 'relevant constraints supplied'];
}

function inferCommonFailures(domain: AgentDomain): string[] {
  if (domain === 'sdlc') {
    return ['missing source references', 'insufficient predecessor context'];
  }

  return ['unclear success criteria', 'missing source context'];
}

function inferSuccessPatterns(domain: AgentDomain): string[] {
  if (domain === 'sdlc') {
    return ['input inventory completed', 'handoff checklist validated'];
  }

  return ['clear brief provided', 'constraints documented before execution'];
}

function parseAgencyTools(value: Frontmatter['tools']): string[] {
  if (Array.isArray(value)) {
    return unique(value.map((item) => normalizeText(String(item))));
  }
  if (typeof value === 'string') {
    return unique(value.split(',').map((item) => normalizeText(item)));
  }
  return [];
}

function toSdlcRegistryId(agent: { id: string; name: string }): string {
  return `sdlc-${agent.id}-${slugify(agent.name)}`;
}

function parseAgencyAgent(filePath: string): AgentRegistryEntry {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = extractFrontmatter(raw);
  const sections = collectSections(body);
  const relativePath = relative(filePath);
  const parts = relativePath.split('/');
  const domain = parts[2] as AgentDomain;
  if (!VALID_AGENT_DOMAINS.has(domain)) {
    throw new Error(`Unsupported agency domain '${domain}' in ${relativePath}`);
  }

  const baseName = path.basename(filePath, '.md');
  const derivedName =
    baseName.toLowerCase() === 'readme'
      ? normalizeText(path.basename(path.dirname(filePath)).replace(/-/g, ' '))
      : normalizeText(baseName.replace(/-/g, ' '));
  const name = frontmatter.name || derivedName;
  const domainRelativePath = parts.slice(3).join('/').replace(/\.md$/i, '');
  const idSuffix = slugify(domainRelativePath);
  const description =
    frontmatter.description ||
    extractInitialParagraph(body) ||
    `${name} specialist registered from ${relativePath}.`;
  const fallbackCapabilities = [
    `${name} execution`,
    `${domain} recommendations`,
    `${domain} specialist support`,
  ];
  const capabilities = extractCapabilitiesFromSections(sections, fallbackCapabilities);

  return {
    id: `agency-${domain}-${idSuffix}`,
    legacyId: null,
    agentType: 'agency',
    name,
    description,
    domain: [domain],
    color: frontmatter.color || null,
    emoji: frontmatter.emoji || null,
    vibe: frontmatter.vibe || null,
    capabilities,
    inputs: extractInputsFromSections(sections, domain),
    outputs: inferOutputs(domain, sections),
    minPrerequisites: inferPrerequisites(domain, null),
    optionalInputs: inferOptionalInputs(domain, sections),
    skillPath: relativePath,
    requiredTools: parseAgencyTools(frontmatter.tools),
    phase: null,
    gatekeeper: false,
    gateMembership: [],
    sequenceDependencies: [],
    maxRetries: DEFAULT_MAX_RETRIES,
    timelineEstimate: TIMELINE_BY_DOMAIN[domain],
    successRate: DEFAULT_SUCCESS_RATE,
    avgQualityScore: DEFAULT_QUALITY_SCORE,
    commonFailures: inferCommonFailures(domain),
    worksWith: [],
    conflictsWith: [],
    successPatterns: inferSuccessPatterns(domain),
    lastUpdated: fs.statSync(filePath).mtime.toISOString(),
    sourceFiles: [relativePath],
  };
}

function parseSdlcAgent(
  agent: CanonicalAgent,
  criticGateIds: string[],
  sprintGateIds: string[]
): AgentRegistryEntry {
  const relativePath = agent.skillFiles[0];
  const filePath = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const sections = collectSections(raw);
  const capabilities = extractSdlcDomainBullets(raw);
  const outputs = unique(
    agent.contracts
      .map((contract) => path.basename(contract))
      .map((contract) => contract.replace(/-output-contract\.md$/i, '').replace(/\.md$/i, ''))
      .map((contract) => contract.replace(/-/g, ' '))
  );
  const phase = agent.phase || null;
  const gatekeeper = phase === 'CRITIC_RISK' || phase === 'SPRINT_GATE';
  const gateMembership =
    phase === 'CRITIC_RISK' ? criticGateIds : phase === 'SPRINT_GATE' ? sprintGateIds : [];

  return {
    id: toSdlcRegistryId(agent),
    legacyId: agent.id,
    agentType: 'sdlc',
    name: agent.name,
    description: agent.role,
    domain: ['sdlc'],
    color: null,
    emoji: null,
    vibe: null,
    capabilities: capabilities.length > 0 ? capabilities : [agent.role],
    inputs: extractInputsFromSections(sections, 'sdlc'),
    outputs: outputs.length > 0 ? outputs : DEFAULT_OUTPUTS_BY_DOMAIN.sdlc,
    minPrerequisites: inferPrerequisites('sdlc', phase),
    optionalInputs: unique(
      extractBulletItems(sections.get('step 1: input inventory') || '').filter((value) =>
        /if provided/i.test(value)
      )
    ),
    skillPath: relativePath,
    requiredTools: unique(agent.tools),
    phase,
    gatekeeper,
    gateMembership,
    sequenceDependencies: agent.dependencies.map((dependency) => `sdlc-${dependency}`),
    maxRetries: DEFAULT_MAX_RETRIES,
    timelineEstimate: TIMELINE_BY_PHASE[phase || 'ON_DEMAND'],
    successRate: DEFAULT_SUCCESS_RATE,
    avgQualityScore: DEFAULT_QUALITY_SCORE,
    commonFailures: inferCommonFailures('sdlc'),
    worksWith: [],
    conflictsWith: [],
    successPatterns: inferSuccessPatterns('sdlc'),
    lastUpdated: fs.statSync(filePath).mtime.toISOString(),
    sourceFiles: unique([relativePath, ...agent.guardrails, ...agent.contracts]),
  };
}

function linkAgencyRelationships(entries: AgentRegistryEntry[]): void {
  const byDomain = new Map<string, AgentRegistryEntry[]>();
  for (const entry of entries) {
    const domain = entry.domain[0];
    const group = byDomain.get(domain) || [];
    group.push(entry);
    byDomain.set(domain, group);
  }

  for (const [domain, group] of byDomain.entries()) {
    const sortedIds = group.map((entry) => entry.id).sort();
    for (const entry of group) {
      entry.worksWith = sortedIds.filter((id) => id !== entry.id).slice(0, 5);
      if (domain === 'design') {
        entry.optionalInputs = unique([...entry.optionalInputs, 'reference moodboards']);
      }
    }
  }
}

function linkSdlcRelationships(entries: AgentRegistryEntry[]): void {
  const byLegacyId = new Map(entries.map((entry) => [entry.legacyId, entry]));

  for (const entry of entries) {
    const resolvedDependencies = unique(
      entry.sequenceDependencies
        .map((dependency) => {
          const normalized = dependency.replace(/^sdlc-/, '');
          const target = byLegacyId.get(normalized) || byLegacyId.get(normalized.slice(0, 2));
          return target?.id || '';
        })
        .filter(Boolean)
    );
    entry.sequenceDependencies = resolvedDependencies;
    entry.worksWith = unique([
      ...resolvedDependencies,
      ...entries
        .filter((candidate) => candidate.sequenceDependencies.includes(entry.id))
        .map((candidate) => candidate.id),
    ]).slice(0, 6);
  }
}

function listAgencyAgentFiles(): string[] {
  const files: string[] = [];

  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') {
        continue;
      }
      const relativePath = relative(fullPath);
      const baseName = path.basename(entry.name, '.md').toLowerCase();
      // Ignore non-agent docs at the root of the agency pack.
      if (relativePath === 'templates/agency-agents-markdown/README.md') {
        continue;
      }
      if (baseName === 'index') {
        continue;
      }
      files.push(fullPath);
    }
  };

  walk(AGENCY_AGENT_DIR);
  return files.sort();
}

async function generateTypes(): Promise<void> {
  const schema = readJson<Record<string, unknown>>(REGISTRY_SCHEMA_PATH);
  const output = await compile(schema, 'AgentRegistryDocument', {
    bannerComment:
      '// Auto-generated from platform/schema/agent-registry.schema.json.\n// Do not edit manually.\n',
    unreachableDefinitions: true,
  });
  fs.writeFileSync(REGISTRY_TYPES_PATH, output, 'utf8');
}

async function main(): Promise<void> {
  const canonical = readJson<CanonicalAgentsDocument>(CANONICAL_AGENTS_PATH);
  const flows = readJson<FlowDocument>(FLOWS_PATH);
  const criticGateIds = (flows.gates || [])
    .filter((gate) => gate.type === 'CRITIC_RISK')
    .map((gate) => gate.id);
  const sprintGateIds = (flows.gates || [])
    .filter((gate) => gate.type === 'SPRINT_GATE' || gate.type === 'SYNTHESIS_APPROVAL')
    .map((gate) => gate.id);

  const agencyAgents = listAgencyAgentFiles().map((filePath) => parseAgencyAgent(filePath));
  const sdlcAgents = canonical.agents.map((agent) =>
    parseSdlcAgent(agent, criticGateIds, sprintGateIds)
  );

  linkAgencyRelationships(agencyAgents);
  linkSdlcRelationships(sdlcAgents);

  const agents = [...sdlcAgents, ...agencyAgents].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
  const document: AgentRegistryDocument = {
    schemaVersion: '1.0.0',
    source:
      'platform/schema/agents.json + templates/sdlc/agents/*.md + templates/agency-agents-markdown/**/*.md',
    generatedAt: new Date().toISOString(),
    stats: {
      totalAgents: agents.length,
      agencyAgents: agencyAgents.length,
      sdlcAgents: sdlcAgents.length,
      domains: [...KNOWN_AGENT_DOMAINS],
    },
    agents,
  };

  writeJson(REGISTRY_PATH, document);
  await generateTypes();

  const validation = validateAgentRegistry();
  if (!validation.valid) {
    const problems = validation.errors
      .map((error) => `${error.instancePath || '/'} ${error.message || 'validation error'}`)
      .join('\n');
    throw new Error(`Generated registry failed validation:\n${problems}`);
  }

  console.warn(
    `Generated agent registry with ${document.stats.totalAgents} agents (${document.stats.sdlcAgents} SDLC, ${document.stats.agencyAgents} agency).`
  );
}

void main();
