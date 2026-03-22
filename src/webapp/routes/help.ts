import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import { HelpService, toServiceContext } from '../services';
import { errorResponse } from '../utils/errors';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new HelpService(toServiceContext(ctx));

  app.get<{ Params: { routeSlug: string } }>(
    '/api/v1/help/page/:routeSlug',
    { schema: RS.helpPageGet },
    async (request, reply) => {
      const page = svc.getPageHelp(request.params.routeSlug);
      if (!page) {
        return reply.code(404).send(errorResponse('HELP_PAGE_NOT_FOUND', 'Help page not found'));
      }
      return reply.send(page);
    }
  );

  app.get<{ Params: { topicId: string } }>(
    '/api/v1/help/topic/:topicId',
    { schema: RS.helpTopicGet },
    async (request, reply) => {
      const topic = svc.getTopic(request.params.topicId);
      if (!topic) {
        return reply.code(404).send(errorResponse('HELP_TOPIC_NOT_FOUND', 'Help topic not found'));
      }
      return reply.send(topic);
    }
  );

  app.get<{ Querystring: { q: string } }>(
    '/api/v1/help/search',
    { schema: RS.helpSearchGet },
    async (request, reply) => {
      const query = (request.query.q || '').trim();
      if (!query) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Query is required'));
      }
      const results = svc.search(query);
      return reply.send({ query, count: results.length, results });
    }
  );
}