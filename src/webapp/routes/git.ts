// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import fs from 'fs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AuthenticatedRequest } from '../auth';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { GitCredentialStore } from '../services/git/credential-store';
import type { GitCredential } from '../services/git/credential-store';
import * as RS from '../route-schemas';

function getWorkspaceScope(request: FastifyRequest): string | null {
  const authReq = request.raw as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return null;
  }

  return `user:${userId}`;
}

function resolveDbPath(ctx: ServerContext): string {
  const dbPath =
    process.env.GIT_CREDENTIAL_DB_PATH ||
    path.join(ctx.PROJECT_ROOT, '.agentic', 'git', 'credentials.sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
}

function withCredentialStore<T>(ctx: ServerContext, fn: (store: GitCredentialStore) => T): T {
  const store = new GitCredentialStore(resolveDbPath(ctx));
  try {
    return fn(store);
  } finally {
    store.close();
  }
}

function ensureAuthenticatedWorkspace(request: FastifyRequest, reply: FastifyReply): string | null {
  const workspaceScope = getWorkspaceScope(request);
  if (!workspaceScope) {
    reply.code(401).send(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return null;
  }

  return workspaceScope;
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  app.post<{
    Body: {
      provider: string;
      username?: string;
      password?: string;
      token?: string;
      expiresAt?: string;
    };
  }>('/api/v1/git/credentials', { schema: RS.gitCredentialCreate }, async (request, reply) => {
    const workspaceScope = ensureAuthenticatedWorkspace(request, reply);
    if (!workspaceScope) return;

    const body = request.body;
    const provider = String(body.provider || '')
      .trim()
      .toLowerCase();
    if (!provider) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'provider is required'));
    }

    const credential: GitCredential = {
      username: body.username ?? null,
      password: body.password ?? null,
      token: body.token ?? null,
      expiresAt: body.expiresAt ?? null,
    };

    if (!credential.username && !credential.password && !credential.token) {
      return reply
        .code(400)
        .send(errorResponse('VALIDATION_ERROR', 'At least one credential field is required'));
    }

    withCredentialStore(ctx, (store) => {
      store.setCredential(workspaceScope, provider, credential);
    });

    return reply.send({
      ok: true,
      provider,
      hasCredential: true,
    });
  });

  app.delete<{ Params: { provider: string } }>(
    '/api/v1/git/credentials/:provider',
    { schema: RS.gitCredentialDelete },
    async (request, reply) => {
      const workspaceScope = ensureAuthenticatedWorkspace(request, reply);
      if (!workspaceScope) return;

      const provider = String(request.params.provider || '')
        .trim()
        .toLowerCase();
      const deleted = withCredentialStore(ctx, (store) =>
        store.deleteCredential(workspaceScope, provider)
      );

      return reply.send({ ok: true, provider, deleted });
    }
  );

  app.get(
    '/api/v1/git/credentials/status',
    { schema: RS.gitCredentialStatus },
    async (request, reply) => {
      const workspaceScope = ensureAuthenticatedWorkspace(request, reply);
      if (!workspaceScope) return;

      const providers = withCredentialStore(ctx, (store) => store.listProviders(workspaceScope));

      return reply.send({
        ok: true,
        providers: providers.map((provider) => ({ provider, hasCredential: true })),
      });
    }
  );
}
