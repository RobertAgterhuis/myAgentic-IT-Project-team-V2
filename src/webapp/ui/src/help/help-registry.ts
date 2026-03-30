import type {
  HelpTopicLink,
  OrchestratorPackMetadataResponse,
  PageHelpResponse,
} from '@/lib/api-types';

interface TopicRouteCandidate {
  topicId: string;
  title: string;
  routeSlugs: string[];
  routeAliases: string[];
}

const ROUTE_FIELDS = ['routeSlug', 'route', 'page', 'pageSlug'] as const;
const ROUTE_ARRAY_FIELDS = ['routes', 'routeSlugs', 'pages'] as const;
const ROUTE_ALIAS_FIELDS = ['aliases', 'paths', 'routeAliases'] as const;

export function resolvePackAwareHelpRouteSlug(
  pathname: string,
  packMetadata?: OrchestratorPackMetadataResponse | null
): string {
  const baseRouteSlug = normalizeRouteSlug(pathname);
  if (!baseRouteSlug || !packMetadata) {
    return baseRouteSlug;
  }

  const candidates = getPackTopicRouteCandidates(packMetadata.help_topics);
  const aliasMatch = candidates.find((candidate) => candidate.routeAliases.includes(baseRouteSlug));
  if (aliasMatch) {
    return aliasMatch.routeSlugs[0] || baseRouteSlug;
  }

  return baseRouteSlug;
}

export function mergePackHelpTopicsIntoPageHelp(
  pageHelp: PageHelpResponse | null,
  routeSlug: string,
  packMetadata?: OrchestratorPackMetadataResponse | null
): PageHelpResponse | null {
  if (!pageHelp || !packMetadata?.capabilities?.supportsHelpTopics) {
    return pageHelp;
  }

  const packTopicLinks = getPackTopicLinksForRoute(routeSlug, packMetadata.help_topics);
  if (packTopicLinks.length === 0) {
    return pageHelp;
  }

  const mergedTopicLinks = dedupeTopicLinks([...pageHelp.topicLinks, ...packTopicLinks]);
  return {
    ...pageHelp,
    topicLinks: mergedTopicLinks,
  };
}

function getPackTopicLinksForRoute(routeSlug: string, rawTopics: Array<Record<string, unknown>>) {
  const normalizedRoute = routeSlug.trim().toLowerCase();
  if (!normalizedRoute || rawTopics.length === 0) {
    return [];
  }

  const candidates = getPackTopicRouteCandidates(rawTopics);
  const explicitMatches = candidates.filter((candidate) =>
    candidate.routeSlugs.some((entry) => entry === normalizedRoute)
  );

  const inferredMatches = candidates.filter((candidate) => {
    if (explicitMatches.includes(candidate)) {
      return false;
    }
    return isTopicLikelyForRoute(candidate.topicId, normalizedRoute);
  });

  return [...explicitMatches, ...inferredMatches].map((candidate) => ({
    topicId: candidate.topicId,
    title: candidate.title,
  }));
}

function getPackTopicRouteCandidates(
  rawTopics: Array<Record<string, unknown>>
): TopicRouteCandidate[] {
  return rawTopics
    .map((entry) => {
      const topicId = normalizeTopicId(readString(entry.id));
      if (!topicId) {
        return null;
      }

      const title = readString(entry.title) || topicId;
      const explicitRoutes = ROUTE_FIELDS.map((field) => readString(entry[field]))
        .map(normalizeRouteSlug)
        .filter(Boolean);
      const routeArrays = ROUTE_ARRAY_FIELDS.flatMap((field) => normalizeStringArray(entry[field]))
        .map(normalizeRouteSlug)
        .filter(Boolean);
      const aliasArrays = ROUTE_ALIAS_FIELDS.flatMap((field) => normalizeStringArray(entry[field]))
        .map(normalizeRouteSlug)
        .filter(Boolean);

      return {
        topicId,
        title,
        routeSlugs: [...new Set([...explicitRoutes, ...routeArrays])],
        routeAliases: [...new Set(aliasArrays)],
      };
    })
    .filter((entry): entry is TopicRouteCandidate => Boolean(entry));
}

function dedupeTopicLinks(topicLinks: HelpTopicLink[]): HelpTopicLink[] {
  const seen = new Set<string>();
  const deduped: HelpTopicLink[] = [];

  for (const topic of topicLinks) {
    const topicId = normalizeTopicId(topic.topicId);
    if (!topicId || seen.has(topicId)) {
      continue;
    }

    seen.add(topicId);
    deduped.push({
      topicId,
      title: topic.title,
    });
  }

  return deduped;
}

function isTopicLikelyForRoute(topicId: string, routeSlug: string): boolean {
  const normalizedTopicId = normalizeTopicId(topicId);
  if (!normalizedTopicId) {
    return false;
  }

  if (normalizedTopicId === routeSlug) {
    return true;
  }

  return (
    normalizedTopicId.startsWith(`${routeSlug}-`) || normalizedTopicId.includes(`-${routeSlug}-`)
  );
}

function normalizeRouteSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');

  if (!normalized) {
    return 'dashboard';
  }

  return normalized;
}

export function buildHelpRouteCandidates(routeSlug: string): string[] {
  const normalized = normalizeRouteSlug(routeSlug);
  if (!normalized) {
    return [];
  }

  const segments = normalized.split('/').filter(Boolean);
  const candidates: string[] = [];

  for (let length = segments.length; length >= 1; length -= 1) {
    candidates.push(segments.slice(0, length).join('/'));
  }

  return [...new Set(candidates)];
}

function normalizeTopicId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
