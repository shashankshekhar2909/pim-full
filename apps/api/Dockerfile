# ── Stage 1: install & build ──────────────────────────────────────────────────
FROM node:18-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --shamefully-hoist

# Copy full source
COPY . .

# Build shared packages, generate Prisma client, compile API
RUN pnpm --filter @pim/types build && \
    pnpm --filter @pim/utils build && \
    pnpm --filter @pim/api exec prisma generate && \
    pnpm --filter @pim/api build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

# Bring compiled node_modules (includes prisma CLI + generated client)
COPY --from=builder /app/node_modules ./node_modules

# Compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

# Package manifests (needed by Node module resolution)
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

WORKDIR /app/apps/api

ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

# Run migrations then start the server
CMD ["sh", "-c", "../../node_modules/.bin/prisma migrate deploy && node dist/server.js"]
