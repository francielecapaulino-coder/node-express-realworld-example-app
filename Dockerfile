# Multi-stage Dockerfile
#
# Build the image:   docker compose build api
# Or via Nx:         npx nx docker-build api
#
# Stage 1 — build (all deps, TypeScript compile)
FROM docker.io/node:lts-alpine AS builder

WORKDIR /build

# Prisma's query engine needs libssl to detect the right binary target;
# without it (Alpine ships without OpenSSL by default) it falls back to a
# guess that may not actually match what's installed.
RUN apk add --no-cache openssl

# Install dependencies first (layer-cached unless package files change)
COPY package*.json ./
COPY src/prisma/schema.prisma ./src/prisma/schema.prisma
RUN npm ci --ignore-scripts

# --ignore-scripts skips @prisma/client's own postinstall hook, so the
# generated client (and its query engine binary) never gets created —
# without this, the TypeScript build fails because "@prisma/client"
# has no exported member 'PrismaClient' yet. Generate it explicitly.
RUN npx prisma generate

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

RUN apk add --no-cache openssl && \
    addgroup --system api && \
    adduser --system -G api api

# Copy built output and production package manifest
COPY --from=builder /build/dist/api ./api
COPY --from=builder /build/package*.json ./
COPY --from=builder /build/src/prisma/schema.prisma ./api/prisma/schema.prisma
COPY --from=builder /build/src/prisma/migrations ./api/prisma/migrations
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Install production dependencies only. The `prisma` CLI (not just
# @prisma/client) is a production dependency specifically so
# docker-entrypoint.sh can run `prisma migrate deploy` at container start
# without reaching out to the network for it.
RUN npm ci --omit=dev --ignore-scripts

# Reuse the already-generated Prisma client + query engine from the builder
# stage instead of regenerating it here (same base image/arch, so the
# compiled engine binary is compatible).
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/node_modules/@prisma/client ./node_modules/@prisma/client

RUN chmod +x ./docker-entrypoint.sh && chown -R api:api .

USER api

# Applies any pending migrations, then starts the server — no manual
# `docker compose exec api npx prisma migrate deploy` step required.
ENTRYPOINT ["./docker-entrypoint.sh"]
