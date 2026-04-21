# Graph Report - .  (2026-04-21)

## Corpus Check
- Corpus is ~20,681 words - fits in a single context window. You may not need a graph.

## Summary
- 141 nodes · 153 edges · 31 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Utility Functions|Utility Functions]]
- [[_COMMUNITY_API Core & Middleware|API Core & Middleware]]
- [[_COMMUNITY_Plan Phase Roadmap|Plan: Phase Roadmap]]
- [[_COMMUNITY_Auth & Tenant Middleware|Auth & Tenant Middleware]]
- [[_COMMUNITY_Planned Services (ImportSKUReport)|Planned Services (Import/SKU/Report)]]
- [[_COMMUNITY_Infrastructure & DevOps Plan|Infrastructure & DevOps Plan]]
- [[_COMMUNITY_Frontend Tech Plan|Frontend Tech Plan]]
- [[_COMMUNITY_Header & Layout UI|Header & Layout UI]]
- [[_COMMUNITY_Axios Token Refresh|Axios Token Refresh]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_Express Type Extensions|Express Type Extensions]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_App Entry (main.tsx)|App Entry (main.tsx)]]
- [[_COMMUNITY_App Root (App.tsx)|App Root (App.tsx)]]
- [[_COMMUNITY_Layout Component|Layout Component]]
- [[_COMMUNITY_Navigation Component|Navigation Component]]
- [[_COMMUNITY_Auth Guard|Auth Guard]]
- [[_COMMUNITY_Redux Store|Redux Store]]
- [[_COMMUNITY_Search Slice|Search Slice]]
- [[_COMMUNITY_Product Slice|Product Slice]]
- [[_COMMUNITY_UI Slice|UI Slice]]
- [[_COMMUNITY_Onboarding Slice|Onboarding Slice]]
- [[_COMMUNITY_Auth Slice|Auth Slice]]
- [[_COMMUNITY_SKU Detail Page|SKU Detail Page]]
- [[_COMMUNITY_Onboarding Page|Onboarding Page]]
- [[_COMMUNITY_404 Not Found Page|404 Not Found Page]]
- [[_COMMUNITY_Search Page|Search Page]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_Shared Types Package|Shared Types Package]]

## God Nodes (most connected - your core abstractions)
1. `Phase 1: Foundation & Architecture (Weeks 1-8)` - 11 edges
2. `Backend Microservices (Auth, Tenant, SKU, Import, Search, Report, Integration)` - 10 edges
3. `Technical Architecture: Multi-Tenant PIM System` - 9 edges
4. `sendError()` - 7 edges
5. `Multi-Tenant PIM System` - 7 edges
6. `Phase 5: Multi-Tenancy, Scale & Performance (Weeks 41-50)` - 7 edges
7. `Phase 4: Product Management & Advanced Features (Weeks 29-40)` - 6 edges
8. `Phase 2: Onboarding & Data Import (Weeks 9-16)` - 5 edges
9. `Frontend Architecture (Monorepo, Redux Store, Component Hierarchy)` - 5 edges
10. `Phase 3: Search & Discovery (Weeks 17-28)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Row-Level Security (RLS) Policies for Tenant Isolation` --implements--> `Multi-Tenancy Strategy (Row-Level Security)`  [INFERRED]
  techPlan.md → plan.md
- `CLAUDE.md: Graphify Knowledge Graph Rules` --conceptually_related_to--> `Technical Architecture: Multi-Tenant PIM System`  [INFERRED]
  CLAUDE.md → techPlan.md
- `Technical Architecture: Multi-Tenant PIM System` --conceptually_related_to--> `Multi-Tenant PIM System`  [EXTRACTED]
  techPlan.md → plan.md
- `Frontend Architecture (Monorepo, Redux Store, Component Hierarchy)` --implements--> `Frontend Tech Stack (React 18+, TypeScript, Redux, Vite, pnpm)`  [INFERRED]
  techPlan.md → plan.md
- `Web App Entry Point (index.html - PIM System, Inter font, Vite)` --implements--> `Frontend Tech Stack (React 18+, TypeScript, Redux, Vite, pnpm)`  [INFERRED]
  apps/web/index.html → plan.md

## Communities

### Community 0 - "Utility Functions"
Cohesion: 0.09
Nodes (2): computePagination(), toPaginatedResult()

### Community 1 - "API Core & Middleware"
Cohesion: 0.12
Nodes (5): AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError

### Community 2 - "Plan: Phase Roadmap"
Cohesion: 0.17
Nodes (18): ADR Rationale: Multi-tenancy strategy (row-level security vs schema isolation), ADR Rationale: Search strategy (Elasticsearch vs PostgreSQL full-text), Analytics & Insights Dashboard, Backend Tech Stack (Node.js, Express/Fastify, TypeScript, Prisma, PostgreSQL), Database Stack (PostgreSQL, Redis, Elasticsearch, S3), Infrastructure Stack (Docker, Kubernetes, Terraform, GitHub Actions), Monorepo Structure (Turborepo/Nx), Multi-Tenancy Strategy (Row-Level Security) (+10 more)

### Community 3 - "Auth & Tenant Middleware"
Cohesion: 0.18
Nodes (11): requireAuth(), sendBadRequest(), sendConflict(), sendCreated(), sendError(), sendForbidden(), sendInternalError(), sendNotFound() (+3 more)

### Community 4 - "Planned Services (Import/SKU/Report)"
Cohesion: 0.17
Nodes (12): CSV Import Pipeline, Reporting & Export (PDF, Excel, CSV), SKU Management, API Gateway & Load Balancer (SSL/TLS, DDoS, Rate Limiting), Auth Service (JWT, OAuth 2.0, MFA), Backend Microservices (Auth, Tenant, SKU, Import, Search, Report, Integration), Import Service (CSV Parsing, Validation, Batch Processing), Integration Service (Webhooks, Third-party, API Keys) (+4 more)

### Community 5 - "Infrastructure & DevOps Plan"
Cohesion: 0.17
Nodes (12): CLAUDE.md: Graphify Knowledge Graph Rules, Performance Metrics (200ms p95 API, 100ms search, 99.9% uptime), AWS Cloud Infrastructure (EKS, RDS Multi-AZ, ElastiCache, S3, CloudFront), CI/CD Pipeline (GitHub Actions: test, build, deploy to EKS), Disaster Recovery & High Availability (RTO/RPO targets, backup strategy), Kubernetes Configuration (Deployments, HPA, Services), Monitoring & Alerting (Prometheus, Grafana, Datadog, ELK Stack), PostgreSQL Database Schema (tenants, users, skus, categories, attributes) (+4 more)

### Community 6 - "Frontend Tech Plan"
Cohesion: 0.4
Nodes (6): Frontend Tech Stack (React 18+, TypeScript, Redux, Vite, pnpm), React Component Hierarchy (App > Layout > OnboardingWizard/SearchPage/SKUDetailPage/AdminDashboard), Frontend Architecture (Monorepo, Redux Store, Component Hierarchy), Redux Store Structure (auth, search, product, onboarding, ui, analytics), Web App Entry Point (index.html - PIM System, Inter font, Vite), Web App Main Entry Script (main.tsx)

### Community 7 - "Header & Layout UI"
Cohesion: 0.67
Nodes (2): handleLogout(), handleMenuClose()

### Community 8 - "Axios Token Refresh"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Login Page"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Express Type Extensions"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "App Entry (main.tsx)"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "App Root (App.tsx)"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Layout Component"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Navigation Component"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Auth Guard"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Redux Store"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Search Slice"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Product Slice"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "UI Slice"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Onboarding Slice"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Auth Slice"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "SKU Detail Page"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Onboarding Page"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "404 Not Found Page"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Search Page"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Dashboard Page"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Shared Types Package"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **20 isolated node(s):** `Backend Tech Stack (Node.js, Express/Fastify, TypeScript, Prisma, PostgreSQL)`, `Database Stack (PostgreSQL, Redis, Elasticsearch, S3)`, `Infrastructure Stack (Docker, Kubernetes, Terraform, GitHub Actions)`, `Onboarding Wizard UI`, `Analytics & Insights Dashboard` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Axios Token Refresh`** (2 nodes): `onTokenRefreshed()`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Page`** (2 nodes): `LoginPage.tsx`, `onSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Express Type Extensions`** (1 nodes): `express.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Entry (main.tsx)`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Root (App.tsx)`** (1 nodes): `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout Component`** (1 nodes): `Layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Navigation Component`** (1 nodes): `Navigation.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Guard`** (1 nodes): `RequireAuth.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Redux Store`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Search Slice`** (1 nodes): `searchSlice.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Product Slice`** (1 nodes): `productSlice.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Slice`** (1 nodes): `uiSlice.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Onboarding Slice`** (1 nodes): `onboardingSlice.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Slice`** (1 nodes): `authSlice.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SKU Detail Page`** (1 nodes): `SkuDetailPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Onboarding Page`** (1 nodes): `OnboardingPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `404 Not Found Page`** (1 nodes): `NotFoundPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Search Page`** (1 nodes): `SearchPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Page`** (1 nodes): `DashboardPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Types Package`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Technical Architecture: Multi-Tenant PIM System` connect `Infrastructure & DevOps Plan` to `Plan: Phase Roadmap`, `Planned Services (Import/SKU/Report)`, `Frontend Tech Plan`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `Backend Microservices (Auth, Tenant, SKU, Import, Search, Report, Integration)` connect `Planned Services (Import/SKU/Report)` to `Plan: Phase Roadmap`, `Infrastructure & DevOps Plan`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Phase 1: Foundation & Architecture (Weeks 1-8)` connect `Plan: Phase Roadmap` to `Frontend Tech Plan`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `Backend Tech Stack (Node.js, Express/Fastify, TypeScript, Prisma, PostgreSQL)`, `Database Stack (PostgreSQL, Redis, Elasticsearch, S3)`, `Infrastructure Stack (Docker, Kubernetes, Terraform, GitHub Actions)` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Utility Functions` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `API Core & Middleware` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._