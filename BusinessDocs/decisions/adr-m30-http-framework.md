# ADR-M30-001: HTTP Framework Selection — Fastify

> Status: **DECIDED** | Date: 2026-03-17
> Source: Architecture GAP-1 (Raw HTTP), GAP-2 (Untyped ctx)

## Context

The platform backend uses raw `http.createServer()` from Node with a custom route
resolver, custom middleware functions, and an untyped `Record<string, unknown>` context
object. As the API surface has grown to 21+ route modules and 60+ endpoints, this
architecture creates maintenance burden:

- No schema-based request validation at the framework level
- No built-in OpenAPI spec generation
- Route registration via string keys (`'GET /api/foo'`) without type safety
- Custom middleware reimplements standard HTTP concerns (logging, rate limiting)
- No plugin encapsulation model for grouping related routes/hooks

## Decision

**Fastify** is selected as the HTTP framework to replace raw `http.createServer()`.

### Why Fastify over Hono

| Criterion               | Fastify                               | Hono                              |
| ----------------------- | ------------------------------------- | --------------------------------- |
| Runtime model           | Node-native, long-lived process       | Multi-runtime via adapters        |
| Validation              | Built-in JSON Schema + Ajv            | Zod/validator middleware          |
| OpenAPI generation      | `@fastify/swagger` from route schemas | Separate `hono-openapi` toolchain |
| Plugin encapsulation    | First-class, scoped registration      | Middleware composition only       |
| Structured logging      | Built-in Pino integration             | Manual                            |
| Existing Ajv dependency | Native alignment                      | Requires bridging                 |
| Deployment model        | Node 18+ server (matches project)     | Edge/serverless (not our model)   |

### Why not stay on raw HTTP

- Route surface now exceeds 60 endpoints across 21 modules
- Validation is duplicated across routes
- No OpenAPI spec generation (violates DEC-315)
- Middleware is ad-hoc pure functions, not composable hooks
- Context object is `Record<string, unknown>` — no type safety

## Migration Strategy

Incremental, not big-bang:

1. Define typed `ServerContext` interface (replaces `Record<string, unknown>`)
2. Create Fastify app factory with existing middleware as hooks/plugins
3. Register route modules as Fastify plugins with JSON Schema validation
4. Existing route handler signatures preserved via thin adapter layer
5. Integration tests updated to use `fastify.inject()` instead of raw HTTP
6. Enable `@fastify/swagger` for OpenAPI 3.1 generation

## Consequences

- **Positive:** Type-safe context, built-in validation, OpenAPI generation, plugin
  encapsulation, structured logging, rate limiting via `@fastify/rate-limit`
- **Negative:** Migration effort across 21 route modules, test updates required
- **Neutral:** Fastify is a production dependency (~1.2 MB), replacing 0-dep raw HTTP

## Packages Added

- `fastify` — HTTP framework
- `@fastify/swagger` — OpenAPI 3.1 spec generation
- `@fastify/swagger-ui` — Swagger UI for API exploration
- `@fastify/rate-limit` — Rate limiting plugin
- `@fastify/cors` — CORS support
- `@fastify/static` — Static file serving
- `@fastify/cookie` — Cookie parsing (for session auth)
