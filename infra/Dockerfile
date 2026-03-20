## ── Stage 1: Build React UI ──────────────────────────────────
FROM node:22-bookworm-slim AS ui-builder

WORKDIR /build

# Install UI dependencies (cached layer)
COPY src/webapp/ui/package.json src/webapp/ui/package-lock.json src/webapp/ui/
RUN cd src/webapp/ui && npm ci

# Copy UI source + design tokens + build script
COPY src/webapp/ui/ src/webapp/ui/
COPY src/webapp/brand/design-tokens.json src/webapp/brand/design-tokens.json
COPY scripts/build-tokens.mjs scripts/build-tokens.mjs

# Generate design tokens → src/webapp/ui/src/tokens.css, then build
RUN node scripts/build-tokens.mjs
RUN cd src/webapp/ui && npm run build

## ── Stage 2: Install runtime deps ────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Install only the webapp runtime dependencies.
# --ignore-scripts: skip prepare hook (git hooks not needed in container)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy the repository content required by the webapp.
COPY . .

# Copy the built React UI from stage 1
COPY --from=ui-builder /build/src/webapp/ui/dist src/webapp/ui/dist

# Ensure BusinessDocs/ exists even on a clean slate (volume mount target)
RUN mkdir -p /app/BusinessDocs

## ── Stage 3: Runtime (Chainguard) ────────────────────────────
FROM cgr.dev/chainguard/node:22 AS runtime

WORKDIR /app

COPY --from=deps --chown=65532:65532 /app /app
USER 65532

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:3000/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1));"]

CMD ["node", "node_modules/tsx/dist/cli.js", "src/webapp/server.ts"]
