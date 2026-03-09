FROM node:20-alpine AS base

WORKDIR /app

# Install only the webapp runtime dependencies.
COPY .github/package.json ./.github/package.json
RUN npm --prefix .github install --omit=dev

# Copy the repository content required by the webapp.
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", ".github/webapp/server.js"]
