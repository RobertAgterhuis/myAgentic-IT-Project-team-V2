## ── Stage 1: Build React UI ──────────────────────────────────
FROM node:22-alpine AS ui-builder

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

## ── Stage 2: Production server ───────────────────────────────
FROM node:22-alpine AS base

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
RUN mkdir -p /app/BusinessDocs && chown node:node /app/BusinessDocs

# SEC-2: Run as non-root user (node user provided by base image)
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/webapp/server.js"]
