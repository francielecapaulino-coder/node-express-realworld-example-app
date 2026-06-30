# Multi-stage Dockerfile
#
# Build the image:   docker compose build api
# Or via Nx:         npx nx docker-build api
#
# Stage 1 — build (all deps, TypeScript compile)
FROM docker.io/node:lts-alpine AS builder

WORKDIR /build

# Install dependencies first (layer-cached unless package files change)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and compile
COPY tsconfig*.json nx.json project.json ./
COPY src ./src
RUN npx nx build api --skip-nx-cache

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime (production deps only)
FROM docker.io/node:lts-alpine AS runtime

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system api && \
    adduser --system -G api api

# Copy built output and production package manifest
COPY --from=builder /build/dist/api ./api
COPY --from=builder /build/package*.json ./
COPY --from=builder /build/src/prisma/schema.prisma ./api/prisma/schema.prisma

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && \
    chown -R api:api .

USER api

# Start the server.
# Run Prisma migrations before the first start with:
#   docker compose exec api npx prisma migrate deploy
CMD ["node", "api"]
