# pim-full

Multi-tenant Product Information Management (PIM) monorepo with a React web app, an Express API, shared TypeScript packages, and Docker-based local infrastructure.

## Overview

This repository is structured as a `pnpm` workspace managed with Turborepo. It currently includes:

- `apps/web`: React 18 + Vite frontend using MUI, Redux Toolkit, React Router, React Hook Form, and Zod
- `apps/api`: Express + TypeScript backend using Prisma, PostgreSQL, Redis, JWT auth, and tenant-aware middleware
- `packages/types`: shared TypeScript types
- `packages/utils`: shared utility package

The product surface already includes:

- login flow
- protected app shell and dashboard
- SKU search and SKU detail routes
- onboarding flow
- API health, auth, and tenant routes

The Prisma schema is broader than the currently exposed API and models a fuller PIM domain, including tenants, users, roles, permissions, categories, attribute definitions, SKUs, history, imports, reports, audit logs, and webhooks.

## Repository Layout

```text
.
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── types/
│   └── utils/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- Node.js 18+
- `pnpm` 9+
- Docker and Docker Compose for containerized local services

## Quick Start

### 1. Install dependencies

```bash
npm install -g pnpm
pnpm install
```

### 2. Create env files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

For local non-Docker development, the provided examples are close to correct, but if you use the included `docker-compose.yml` for Postgres and Redis, update `apps/api/.env` to use:

```env
DATABASE_URL="postgresql://pim_user:pim_password@localhost:5433/pim_db?schema=public"
REDIS_URL="redis://:pim_redis_password@localhost:6380"
```

### 3. Start infrastructure

If you want only the backing services:

```bash
docker compose up -d postgres redis
```

If you want the full containerized stack:

```bash
docker compose up --build
```

### 4. Generate Prisma client and run migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start the apps

For local development:

```bash
pnpm dev
```

This runs workspace `dev` scripts through Turborepo.

## Local Development Ports

Default local development values:

- web: `http://localhost:5173`
- api: `http://localhost:3001`
- api health: `http://localhost:3001/api/v1/health`

Docker Compose published ports:

- web: `http://localhost:4004`
- api: `http://localhost:4003`
- postgres: `localhost:5433`
- redis: `localhost:6380`
- adminer: `http://localhost:4005`

## Available Commands

At the repo root:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm format
pnpm clean
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

App-level examples:

```bash
pnpm --filter @pim/api dev
pnpm --filter @pim/web dev
```

## API Notes

The API is mounted under `/api/v1` and currently wires:

- `/health`
- `/auth`
- `/tenants`

The backend includes tenant-aware middleware and JWT-based authentication primitives intended for a multi-tenant PIM setup.

## Frontend Notes

The web app uses route-based code splitting and currently includes these main routes:

- `/login`
- `/dashboard`
- `/search`
- `/skus/:id`
- `/onboarding`

Protected routes are wrapped in an auth gate and shared layout.

## Tech Stack

- Monorepo: Turborepo + pnpm workspaces
- Frontend: React, Vite, TypeScript, MUI, Redux Toolkit, Tailwind
- Backend: Express, TypeScript, Prisma, PostgreSQL, Redis
- Validation and forms: Zod, React Hook Form
- Auth: JWT
- Tooling: Prettier, TypeScript, Jest, Vitest

## Status

This repo is a solid base for a full PIM platform, but it is still early-stage. The schema and UI surface cover more ground than the currently implemented backend endpoints, so expect some areas to be scaffolding rather than finished product behavior.
