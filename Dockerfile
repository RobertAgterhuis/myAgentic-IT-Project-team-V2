FROM node:20-alpine AS base

WORKDIR /app

# Install only the webapp runtime dependencies.
# --ignore-scripts: skip prepare hook (git hooks not needed in container)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy the repository content required by the webapp.
COPY . .

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
