# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --shamefully-hoist

# Copy full source
COPY . .

# Vite resolves @pim/types and @pim/utils from source via alias — no pre-build needed
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_NAME=PIM System
ARG VITE_APP_VERSION=0.0.1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN pnpm --filter @pim/web build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
