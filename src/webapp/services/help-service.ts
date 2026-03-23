import path from 'path';
import MarkdownIt from 'markdown-it';
import YAML from 'yaml';
import type { ServiceContext } from './types';

export interface HelpAction {
  label: string;
  description: string;
}

export interface RelatedPage {
  routeSlug: string;
  title: string;
}

export interface HelpTopicLink {
  topicId: string;
  title: string;
}

export interface HelpStateVariant {
  condition: string;
  additionalContent: string;
}

export interface PageHelp {
  routeSlug: string;
  routePath: string;
  pageTitle: string;
  purpose: string;
  coreActions: HelpAction[];
  inputsOutputs: string;
  permissions: string;
  relatedPages: RelatedPage[];
  keywords: string[];
  topicLinks: HelpTopicLink[];
  stateVariants?: HelpStateVariant[];
}

export interface HelpTopic {
  topicId: string;
  title: string;
  description: string;
  markdown: string;
  html: string;
  keywords: string[];
}

export interface HelpSearchResult {
  kind: 'page' | 'topic';
  id: string;
  title: string;
  snippet: string;
  routePath?: string;
  topicId?: string;
  score: number;
}

interface HelpConfig {
  pages?: unknown;
}

interface HelpServiceOptions {
  configFileName?: string;
}

const DEFAULT_CONFIG_FILE = 'page-help.yaml';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
});

export class HelpService {
  private readonly ctx: ServiceContext;
  private readonly configPath: string;
  private readonly pages: Map<string, PageHelp>;
  private readonly topics: Map<string, HelpTopic>;

  constructor(ctx: ServiceContext, options: HelpServiceOptions = {}) {
    this.ctx = ctx;
    this.configPath = path.join(this.ctx.helpDir, options.configFileName || DEFAULT_CONFIG_FILE);
    this.pages = this.loadPages();
    this.topics = this.loadTopics();
  }

  getPageHelp(routeSlug: string): PageHelp | null {
    const normalized = normalizeRouteSlug(routeSlug);
    return this.pages.get(normalized) || null;
  }

  getTopic(topicId: string): HelpTopic | null {
    const normalized = sanitizeTopicId(topicId);
    return this.topics.get(normalized) || null;
  }

  search(query: string): HelpSearchResult[] {
    const terms = tokenize(query);
    if (terms.length === 0) return [];

    const results: HelpSearchResult[] = [];

    for (const page of this.pages.values()) {
      const haystack = [
        page.routeSlug,
        page.routePath,
        page.pageTitle,
        page.purpose,
        page.inputsOutputs,
        page.permissions,
        page.keywords.join(' '),
        page.coreActions.map((action) => `${action.label} ${action.description}`).join(' '),
        page.relatedPages.map((related) => `${related.routeSlug} ${related.title}`).join(' '),
        page.topicLinks.map((topic) => `${topic.topicId} ${topic.title}`).join(' '),
      ].join(' ');
      const score = scoreText(haystack, terms);
      if (score === 0) continue;

      results.push({
        kind: 'page',
        id: page.routeSlug,
        title: page.pageTitle,
        snippet: excerpt(page.purpose, terms),
        routePath: page.routePath,
        score,
      });
    }

    for (const topic of this.topics.values()) {
      const haystack = [
        topic.topicId,
        topic.title,
        topic.description,
        topic.keywords.join(' '),
        topic.markdown,
      ].join(' ');
      const score = scoreText(haystack, terms);
      if (score === 0) continue;

      results.push({
        kind: 'topic',
        id: topic.topicId,
        topicId: topic.topicId,
        title: topic.title,
        snippet: excerpt(`${topic.description}\n${stripMarkdown(topic.markdown)}`, terms),
        score,
      });
    }

    return results.sort(
      (left, right) => right.score - left.score || left.title.localeCompare(right.title)
    );
  }

  private loadPages(): Map<string, PageHelp> {
    if (!this.ctx.store.exists(this.configPath)) {
      return new Map();
    }

    try {
      const parsed = YAML.parse(this.ctx.store.readFile(this.configPath)) as HelpConfig;
      const pageEntries = Array.isArray(parsed?.pages) ? parsed.pages : [];
      const pages = new Map<string, PageHelp>();

      for (const entry of pageEntries) {
        const page = toPageHelp(entry);
        if (!page) continue;
        pages.set(page.routeSlug, page);
      }

      return pages;
    } catch {
      return new Map();
    }
  }

  private loadTopics(): Map<string, HelpTopic> {
    try {
      const entries = this.ctx.store.readdir(this.ctx.helpDir);
      const topics = new Map<string, HelpTopic>();

      for (const entry of entries) {
        const name = typeof entry === 'string' ? entry : entry.name;
        if (!name.endsWith('.md')) continue;
        const topicId = sanitizeTopicId(name.replace(/\.md$/i, ''));
        const filePath = path.join(this.ctx.helpDir, name);
        if (!this.ctx.store.exists(filePath)) continue;
        const raw = this.ctx.store.readFile(filePath);
        const { frontMatter, content } = parseFrontMatter(raw);
        const title = readString(frontMatter.title) || extractFirstHeading(content) || topicId;
        const description =
          readString(frontMatter.description) ||
          excerpt(stripMarkdown(content), tokenize(title), 180);
        const keywords = normalizeStringArray(frontMatter.keywords);
        const html = sanitizeRenderedHtml(markdown.render(content));

        topics.set(topicId, {
          topicId,
          title,
          description,
          markdown: content,
          html,
          keywords,
        });
      }

      return topics;
    } catch {
      return new Map();
    }
  }
}

function toPageHelp(value: unknown): PageHelp | null {
  if (!value || typeof value !== 'object') return null;
  const page = value as Record<string, unknown>;
  const routeSlug = normalizeRouteSlug(readString(page.routeSlug) || readString(page.routePath));
  const routePath = normalizeRoutePath(readString(page.routePath) || `/${routeSlug}`);
  const pageTitle = readString(page.pageTitle);
  const purpose = readString(page.purpose);
  const inputsOutputs = readString(page.inputsOutputs);
  const permissions = readString(page.permissions);

  if (!routeSlug || !pageTitle || !purpose || !inputsOutputs || !permissions) {
    return null;
  }

  return {
    routeSlug,
    routePath,
    pageTitle,
    purpose,
    inputsOutputs,
    permissions,
    keywords: normalizeStringArray(page.keywords),
    coreActions: normalizeActions(page.coreActions),
    relatedPages: normalizeRelatedPages(page.relatedPages),
    topicLinks: normalizeTopicLinks(page.topicLinks),
    stateVariants: normalizeStateVariants(page.stateVariants),
  };
}

function normalizeActions(value: unknown): HelpAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const action = entry as Record<string, unknown>;
      const label = readString(action.label);
      const description = readString(action.description);
      if (!label || !description) return null;
      return { label, description };
    })
    .filter((entry): entry is HelpAction => Boolean(entry));
}

function normalizeRelatedPages(value: unknown): RelatedPage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const related = entry as Record<string, unknown>;
      const routeSlug = normalizeRouteSlug(
        readString(related.routeSlug) || readString(related.routePath)
      );
      const title = readString(related.title);
      if (!routeSlug || !title) return null;
      return { routeSlug, title };
    })
    .filter((entry): entry is RelatedPage => Boolean(entry));
}

function normalizeTopicLinks(value: unknown): HelpTopicLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const topic = entry as Record<string, unknown>;
      const topicId = sanitizeTopicId(readString(topic.topicId));
      const title = readString(topic.title);
      if (!topicId || !title) return null;
      return { topicId, title };
    })
    .filter((entry): entry is HelpTopicLink => Boolean(entry));
}

function normalizeStateVariants(value: unknown): HelpStateVariant[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const variants = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const variant = entry as Record<string, unknown>;
      const condition = readString(variant.condition);
      const additionalContent = readString(variant.additionalContent);
      if (!condition || !additionalContent) return null;
      return { condition, additionalContent };
    })
    .filter((entry): entry is HelpStateVariant => Boolean(entry));
  return variants.length > 0 ? variants : undefined;
}

function parseFrontMatter(raw: string): {
  frontMatter: Record<string, unknown>;
  content: string;
} {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) return { frontMatter: {}, content: raw };

  try {
    return {
      frontMatter: (YAML.parse(match[1]) as Record<string, unknown>) || {},
      content: raw.slice(match[0].length),
    };
  } catch {
    return { frontMatter: {}, content: raw };
  }
}

function extractFirstHeading(markdownText: string): string {
  const match = markdownText.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function sanitizeRenderedHtml(html: string): string {
  return html
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])(javascript:|vbscript:|data:).*?\2/gi, '');
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
}

function normalizeRoutePath(value: string): string {
  if (!value) return '/';
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function normalizeRouteSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9/_-]/g, '');
}

function sanitizeTopicId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '');
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function scoreText(haystack: string, terms: string[]): number {
  const text = haystack.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!text.includes(term)) continue;
    score += 1;
    const wholeWord = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g');
    score += (text.match(wholeWord) || []).length;
  }
  return score;
}

function excerpt(text: string, terms: string[], maxLength = 220): string {
  const plainText = collapseWhitespace(text);
  if (!plainText) return '';
  const lower = plainText.toLowerCase();
  const firstHit = terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (typeof firstHit !== 'number') {
    return plainText.length <= maxLength
      ? plainText
      : `${plainText.slice(0, maxLength - 3).trim()}...`;
  }

  const start = Math.max(0, firstHit - Math.floor(maxLength / 3));
  const slice = plainText.slice(start, start + maxLength).trim();
  return start > 0 ? `...${slice}` : slice;
}

function stripMarkdown(value: string): string {
  return collapseWhitespace(
    value
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_>~-]/g, ' ')
  );
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
