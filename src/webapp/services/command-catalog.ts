// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { loadManifest } from '../../../platform/engine/template-loader';

export interface CommandCatalogEntry {
  name: string;
  label: string;
  category: 'create' | 'audit' | 'on-demand' | 'session';
  description: string;
}

type CommandCatalogCategory = CommandCatalogEntry['category'];

type ManifestCommandEntry = {
  id?: unknown;
  label?: unknown;
  category?: unknown;
  description?: unknown;
};

const DEFAULT_COMMAND_CATALOG: readonly CommandCatalogEntry[] = Object.freeze([
  {
    name: 'CREATE',
    label: 'CREATE',
    category: 'create',
    description: 'Full CREATE cycle',
  },
  {
    name: 'CREATE BUSINESS',
    label: 'CREATE BUSINESS',
    category: 'create',
    description: 'Business-only CREATE cycle',
  },
  {
    name: 'CREATE TECH',
    label: 'CREATE TECH',
    category: 'create',
    description: 'Tech-only CREATE cycle',
  },
  {
    name: 'CREATE UX',
    label: 'CREATE UX',
    category: 'create',
    description: 'UX-only CREATE cycle',
  },
  {
    name: 'CREATE MARKETING',
    label: 'CREATE MARKETING',
    category: 'create',
    description: 'Marketing-only CREATE cycle',
  },
  {
    name: 'CREATE SYNTHESIS',
    label: 'CREATE SYNTHESIS',
    category: 'create',
    description: 'CREATE synthesis mode',
  },
  {
    name: 'AUDIT',
    label: 'AUDIT',
    category: 'audit',
    description: 'Full AUDIT cycle',
  },
  {
    name: 'AUDIT BUSINESS',
    label: 'AUDIT BUSINESS',
    category: 'audit',
    description: 'Business-only AUDIT cycle',
  },
  {
    name: 'AUDIT TECH',
    label: 'AUDIT TECH',
    category: 'audit',
    description: 'Tech-only AUDIT cycle',
  },
  {
    name: 'AUDIT UX',
    label: 'AUDIT UX',
    category: 'audit',
    description: 'UX-only AUDIT cycle',
  },
  {
    name: 'AUDIT MARKETING',
    label: 'AUDIT MARKETING',
    category: 'audit',
    description: 'Marketing-only AUDIT cycle',
  },
  {
    name: 'AUDIT SYNTHESIS',
    label: 'AUDIT SYNTHESIS',
    category: 'audit',
    description: 'AUDIT synthesis mode',
  },
  {
    name: 'REEVALUATE',
    label: 'REEVALUATE',
    category: 'on-demand',
    description: 'Reevaluate a scoped change',
  },
  {
    name: 'FEATURE',
    label: 'FEATURE',
    category: 'on-demand',
    description: 'Deliver a feature increment',
  },
  {
    name: 'SCOPE CHANGE',
    label: 'SCOPE CHANGE',
    category: 'on-demand',
    description: 'Trigger scope-change analysis',
  },
  {
    name: 'HOTFIX',
    label: 'HOTFIX',
    category: 'on-demand',
    description: 'Emergency hotfix path',
  },
  {
    name: 'REFRESH ONBOARDING',
    label: 'REFRESH ONBOARDING',
    category: 'session',
    description: 'Refresh onboarding context',
  },
  {
    name: 'CONTINUE',
    label: 'CONTINUE',
    category: 'session',
    description: 'Continue current session flow',
  },
]);

const commandCatalogCache = new Map<string, CommandCatalogEntry[]>();

function isCategory(value: unknown): value is CommandCatalogCategory {
  return value === 'create' || value === 'audit' || value === 'on-demand' || value === 'session';
}

function normalizeManifestCommand(raw: ManifestCommandEntry): CommandCatalogEntry | null {
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id) {
    return null;
  }

  const category = isCategory(raw.category) ? raw.category : 'on-demand';
  return {
    name: id.toUpperCase(),
    label: typeof raw.label === 'string' && raw.label.trim() !== '' ? raw.label.trim() : id,
    category,
    description:
      typeof raw.description === 'string' && raw.description.trim() !== ''
        ? raw.description.trim()
        : id,
  };
}

function loadCommandCatalogFromManifest(templateName = 'sdlc'): CommandCatalogEntry[] {
  try {
    const manifest = loadManifest(templateName) as { commands?: unknown };
    if (!Array.isArray(manifest.commands)) {
      return DEFAULT_COMMAND_CATALOG.map((entry) => ({ ...entry }));
    }

    const normalized = manifest.commands
      .map((entry) => normalizeManifestCommand(entry as ManifestCommandEntry))
      .filter((entry): entry is CommandCatalogEntry => entry !== null);

    if (normalized.length === 0) {
      return DEFAULT_COMMAND_CATALOG.map((entry) => ({ ...entry }));
    }

    return normalized;
  } catch {
    return DEFAULT_COMMAND_CATALOG.map((entry) => ({ ...entry }));
  }
}

function resolveCatalog(templateName = 'sdlc'): CommandCatalogEntry[] {
  const normalizedTemplateName =
    typeof templateName === 'string' && templateName.trim() !== '' ? templateName.trim() : 'sdlc';

  const cached = commandCatalogCache.get(normalizedTemplateName);
  if (cached) {
    return cached;
  }

  const loaded = loadCommandCatalogFromManifest(normalizedTemplateName);
  commandCatalogCache.set(normalizedTemplateName, loaded);
  return loaded;
}

export function getCommandCatalog(templateName = 'sdlc'): CommandCatalogEntry[] {
  return resolveCatalog(templateName).map((entry) => ({ ...entry }));
}

export function isKnownCommand(command: string, templateName = 'sdlc'): boolean {
  const normalized = command.trim().toUpperCase();
  if (normalized.length === 0) return false;

  const commandSet = new Set(resolveCatalog(templateName).map((entry) => entry.name));

  if (commandSet.has(normalized)) return true;

  const tokens = normalized.split(/\s+/);
  if (tokens.length === 0) return false;

  if (commandSet.has(tokens[0])) return true;
  if (tokens.length >= 2 && commandSet.has(`${tokens[0]} ${tokens[1]}`)) return true;

  return false;
}
