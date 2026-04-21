# Multi-Tenant PIM System - Technical Architecture & Infrastructure Design

---

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Architecture](#database-architecture)
5. [Infrastructure & DevOps](#infrastructure--devops)
6. [Security Architecture](#security-architecture)
7. [Scalability & Performance](#scalability--performance)
8. [Disaster Recovery & High Availability](#disaster-recovery--high-availability)

---

## System Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Web Browser  │  │ Mobile App   │  │ Admin Portal │          │
│  │  (React)     │  │ (React Native│  │   (React)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTPS/REST/GraphQL
┌────────────▼────────────────────────────────────────────────────┐
│              API Gateway & Load Balancer                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Cloud Load Balancer (AWS ELB / GCP LB / Azure LB)      │  │
│  │  • SSL/TLS Termination                                   │  │
│  │  • DDoS Protection (WAF)                                 │  │
│  │  • Request Rate Limiting                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│           Microservices / API Layer (Kubernetes)               │
│  ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Auth Service   │ │ Tenant Service │ Search Service│        │
│  │  (JWT/OAuth)    │ │ (Setup, Config)│ (Elasticsearch)        │
│  └─────────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ SKU Service  │ │ Import Service │ Report Service│          │
│  │ (CRUD, Query)│ │ (CSV, Validation) │ (PDF/Excel)│          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ Analytics Svc│ │ Integration Svc  Webhook Service│          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
└─────┬──────────────┬──────────────┬──────────────────────────┘
      │              │              │
      │ (DB)         │ (Cache)      │ (Search)
      │              │              │
┌─────▼──────┐  ┌────▼─────┐  ┌───▼──────────┐
│ PostgreSQL  │  │   Redis  │  │Elasticsearch│
│ (Multi-AZ)  │  │ (Cluster)│  │  (Cluster)  │
└─────┬──────┘  └────┬─────┘  └───┬──────────┘
      │              │            │
      │              │            │
┌─────▼──────┐  ┌────▼─────┐  ┌──▼───────────┐
│  Replicas  │  │Sentinels │  │   Indices    │
│  Backups   │  │  (HA)    │  │  Replication │
└────────────┘  └──────────┘  └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 Background Jobs / Workers                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Message Queue: RabbitMQ / Kafka                   │  │
│  │  • CSV Import Jobs                                       │  │
│  │  • Index Updates                                         │  │
│  │  • Report Generation                                     │  │
│  │  • Email Notifications                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Worker Processes (Kubernetes DaemonSet)           │  │
│  │  • Import Worker (10-20 instances)                       │  │
│  │  • Report Worker (5-10 instances)                        │  │
│  │  • Index Worker (5-10 instances)                         │  │
│  │  • Notification Worker (5 instances)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Storage & External Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  S3/Blob     │  │   CDN        │  │  Email SVC   │          │
│  │  (Uploads)   │  │  (Static)    │  │  (SendGrid)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Directory Structure

```
pim-frontend/
├── apps/
│   ├── web/                          # Main web application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/           # Reusable UI components
│   │   │   │   ├── layouts/          # Page layouts
│   │   │   │   ├── onboarding/       # Wizard components
│   │   │   │   ├── search/           # Search interface
│   │   │   │   ├── skuDetail/        # Product detail
│   │   │   │   └── admin/            # Admin dashboard
│   │   │   ├── pages/                # Route pages
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── services/             # API clients
│   │   │   ├── store/                # Redux store
│   │   │   ├── types/                # TypeScript types
│   │   │   ├── utils/                # Utility functions
│   │   │   ├── constants/            # App constants
│   │   │   └── App.tsx
│   │   └── vite.config.ts
│   ├── admin/                        # Admin dashboard app
│   └── mobile/                       # React Native mobile app
├── packages/
│   ├── ui/                           # Shared UI components
│   ├── types/                        # Shared TypeScript types
│   ├── hooks/                        # Shared custom hooks
│   ├── services/                     # Shared API clients
│   └── utils/                        # Shared utilities
├── turbo.json                        # Monorepo config
├── pnpm-workspace.yaml
└── package.json
```

### State Management Architecture

```
Redux Store Structure:
├── auth/
│   ├── user
│   ├── tenant
│   ├── permissions
│   └── isAuthenticated
├── search/
│   ├── query
│   ├── filters
│   ├── results
│   ├── facets
│   ├── loading
│   └── error
├── product/
│   ├── currentSKU
│   ├── compareList
│   ├── favorites
│   └── history
├── onboarding/
│   ├── step
│   ├── companyDetails
│   ├── categories
│   ├── attributes
│   └── importProgress
├── ui/
│   ├── theme
│   ├── sidebar
│   ├── notifications
│   └── modals
└── analytics/
    └── metrics
```

### Component Hierarchy

```
<App>
  ├── <Layout>
  │   ├── <Header>
  │   ├── <Navigation>
  │   └── <MainContent>
  │       ├── <OnboardingWizard>
  │       │   ├── <CompanyDetailsStep>
  │       │   ├── <CategorySetupStep>
  │       │   ├── <AttributeStep>
  │       │   ├── <CSVUploadStep>
  │       │   └── <ReviewStep>
  │       │
  │       ├── <SearchPage>
  │       │   ├── <SearchBar>
  │       │   ├── <FacetPanel>
  │       │   │   ├── <FacetCheckbox>
  │       │   │   ├── <RangeSlider>
  │       │   │   └── <CategoryTree>
  │       │   ├── <SearchResults>
  │       │   │   ├── <ResultCard> (x20)
  │       │   │   ├── <Pagination>
  │       │   │   └── <SortOptions>
  │       │   └── <AppliedFilters>
  │       │
  │       ├── <SKUDetailPage>
  │       │   ├── <ImageGallery>
  │       │   ├── <ProductInfo>
  │       │   ├── <SpecificationTable>
  │       │   ├── <RelatedProducts>
  │       │   └── <ActionButtons>
  │       │
  │       ├── <ComparisonPage>
  │       │   ├── <SelectionToolbar>
  │       │   └── <ComparisonMatrix>
  │       │
  │       └── <AdminDashboard>
  │           ├── <AnalyticsCards>
  │           ├── <Charts>
  │           └── <ReportBuilder>
  │
  ├── <Modal>
  │   ├── <ConfirmDialog>
  │   ├── <IssueReportModal>
  │   └── <InlineEditModal>
  │
  └── <Notification>
      └── <Toast> (multiple)
```

### Key Frontend Technologies

```
React Ecosystem:
├── React 18+
├── React Router v6 (routing)
├── Redux Toolkit (state management)
├── RTK Query (API caching)
├── React Hook Form (form handling)
├── Zod (validation)
├── TanStack Query (server state)
└── SWR (data fetching)

UI & Styling:
├── Tailwind CSS (utility styles)
├── Material-UI v5 (components)
├── Radix UI (primitives)
├── Framer Motion (animations)
└── Storybook (component docs)

Developer Tools:
├── Vite (build tool)
├── TypeScript (type safety)
├── ESLint (linting)
├── Prettier (formatting)
├── Vitest (unit testing)
├── React Testing Library (component testing)
└── Cypress (E2E testing)
```

---

## Backend Architecture

### Microservices Overview

#### 1. Auth Service
```typescript
Responsibilities:
├── User authentication (JWT)
├── OAuth 2.0 / SSO integration
├── Permission management
├── Token refresh & validation
└── Multi-factor authentication

API Endpoints:
├── POST /auth/login
├── POST /auth/logout
├── POST /auth/refresh
├── POST /auth/mfa/setup
├── GET /auth/permissions/:userId
└── POST /auth/oauth/callback
```

#### 2. Tenant Service
```typescript
Responsibilities:
├── Multi-tenant management
├── Tenant provisioning
├── Tenant configuration
├── Subscription management
├── Team & role management

API Endpoints:
├── POST /tenants
├── GET /tenants/:tenantId
├── PATCH /tenants/:tenantId
├── POST /tenants/:tenantId/users
├── POST /tenants/:tenantId/roles
└── POST /tenants/:tenantId/permissions
```

#### 3. SKU Service
```typescript
Responsibilities:
├── SKU CRUD operations
├── Attribute management
├── Category management
├── SKU versioning & history
├── Bulk operations

API Endpoints:
├── GET /skus
├── POST /skus
├── GET /skus/:skuId
├── PATCH /skus/:skuId
├── DELETE /skus/:skuId
├── POST /skus/bulk-update
├── POST /categories
└── GET /categories/:categoryId/attributes
```

#### 4. Import Service
```typescript
Responsibilities:
├── CSV parsing & validation
├── Data transformation
├── Duplicate detection
├── Batch processing
├── Error handling & reporting

API Endpoints:
├── POST /imports (initiate upload)
├── GET /imports/:importId (track progress)
├── POST /imports/:importId/validate
├── POST /imports/:importId/process
└── GET /imports/:importId/errors
```

#### 5. Search Service
```typescript
Responsibilities:
├── Full-text search
├── Faceted filtering
├── Index management
├── Query optimization
├── Analytics logging

API Endpoints:
├── GET /search?q=...&filters=...&sort=...
├── GET /search/facets
├── POST /search/index/rebuild
├── GET /search/analytics
└── POST /search/suggest
```

#### 6. Report Service
```typescript
Responsibilities:
├── Report generation (PDF, Excel, CSV)
├── Report scheduling
├── Template management
├── Export functionality

API Endpoints:
├── POST /reports/generate
├── POST /reports/schedule
├── GET /reports/:reportId/download
├── GET /reports/templates
└── DELETE /reports/scheduled/:reportId
```

#### 7. Integration Service
```typescript
Responsibilities:
├── Webhook management
├── Third-party integrations
├── API key management
├── Event publishing

API Endpoints:
├── POST /webhooks (register)
├── GET /webhooks
├── DELETE /webhooks/:webhookId
├── POST /integrations/:integrationId/auth
└── GET /integrations/available
```

### Backend Technology Stack

```
Runtime & Framework:
├── Node.js 18+ LTS
├── TypeScript
├── Express.js / Fastify
├── NestJS (optional, for structured approach)
└── Nodemon (development)

Database & ORM:
├── PostgreSQL 14+ (primary)
├── Prisma (ORM)
├── Redis (caching & sessions)
├── Elasticsearch (search)
└── PostgreSQL Replication (HA)

Data Validation & Security:
├── Zod / Joi (validation)
├── jsonwebtoken (JWT)
├── bcrypt (password hashing)
├── helmet (security headers)
├── express-rate-limit (rate limiting)
└── cors (cross-origin handling)

Background Jobs:
├── Bull (job queue)
├── RabbitMQ / Kafka (message broker)
├── node-cron (scheduled jobs)
└── Agenda (advanced scheduling)

API Documentation:
├── OpenAPI/Swagger
├── Swagger UI
├── API documentation generation
└── Postman collections

Testing:
├── Jest (unit testing)
├── Supertest (API testing)
├── Docker Compose (integration testing)
├── Artillery (load testing)
└── Playwright (E2E testing)

Monitoring & Logging:
├── Winston (logging)
├── Morgan (HTTP logging)
├── Datadog (APM)
├── Prometheus (metrics)
├── ELK Stack (log aggregation)
└── Sentry (error tracking)
```

### API Design Patterns

#### RESTful API Structure
```
# Multi-tenancy in URL path
/api/v1/tenants/:tenantId/skus
/api/v1/tenants/:tenantId/categories
/api/v1/tenants/:tenantId/search

# Standard CRUD
GET    /skus           # List
POST   /skus           # Create
GET    /skus/:id       # Read
PUT    /skus/:id       # Full update
PATCH  /skus/:id       # Partial update
DELETE /skus/:id       # Delete

# Bulk operations
POST   /skus/bulk-update
POST   /skus/bulk-delete
POST   /skus/bulk-export

# Nested resources
GET    /skus/:skuId/issues
POST   /skus/:skuId/issues
PATCH  /issues/:issueId

# Query parameters
GET    /search?q=term&filters[category]=electronics&sort=price&page=1&limit=20
```

#### Response Format
```json
// Success Response
{
  "success": true,
  "data": { /* resource */ },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1000,
    "totalPages": 50
  },
  "timestamp": "2026-04-20T10:30:00Z"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-04-20T10:30:00Z"
}
```

---

## Database Architecture

### PostgreSQL Schema Design

#### Core Tables

```sql
-- Multi-tenancy
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  subscription_tier VARCHAR(50),
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Authentication & Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  UNIQUE(tenant_id, email)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  action VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, resource, action)
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Product Catalog
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  parent_category_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  level INT DEFAULT 0,
  display_order INT,
  attributes JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE attribute_definitions (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  category_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- text, number, date, select, multiselect, etc.
  is_required BOOLEAN DEFAULT FALSE,
  is_searchable BOOLEAN DEFAULT TRUE,
  is_facetable BOOLEAN DEFAULT TRUE,
  is_editable BOOLEAN DEFAULT TRUE,
  options JSONB, -- for select/multiselect types
  validation JSONB,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, category_id, name)
);

CREATE TABLE skus (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  category_id UUID REFERENCES categories(id),
  sku_code VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  base_attributes JSONB, -- Fixed attributes (JSON)
  pricing JSONB,
  stock_level INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, sku_code),
  INDEX idx_sku_category (tenant_id, category_id),
  INDEX idx_sku_status (tenant_id, status)
);

CREATE TABLE sku_attributes (
  id UUID PRIMARY KEY,
  sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
  attribute_id UUID REFERENCES attribute_definitions(id),
  value TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sku_id, attribute_id)
);

CREATE TABLE sku_history (
  id UUID PRIMARY KEY,
  sku_id UUID REFERENCES skus(id),
  tenant_id UUID REFERENCES tenants(id),
  changed_by UUID REFERENCES users(id),
  changes JSONB,
  change_type VARCHAR(50), -- 'created', 'updated', 'deleted'
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Media & Relationships
CREATE TABLE sku_media (
  id UUID PRIMARY KEY,
  sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
  type VARCHAR(50), -- image, video, document
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sku_relationships (
  id UUID PRIMARY KEY,
  sku_id_from UUID REFERENCES skus(id),
  sku_id_to UUID REFERENCES skus(id),
  relationship_type VARCHAR(50), -- 'cross-sell', 'upsell', 'variant', 'similar'
  PRIMARY KEY (sku_id_from, sku_id_to, relationship_type)
);

-- User Interactions
CREATE TABLE sku_favorites (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  sku_id UUID REFERENCES skus(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, sku_id)
);

CREATE TABLE sku_issues (
  id UUID PRIMARY KEY,
  sku_id UUID REFERENCES skus(id),
  tenant_id UUID REFERENCES tenants(id),
  reported_by UUID REFERENCES users(id),
  issue_type VARCHAR(100), -- 'missing_data', 'incorrect_info', 'quality', etc.
  description TEXT,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data Imports
CREATE TABLE data_imports (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  initiated_by UUID REFERENCES users(id),
  file_name VARCHAR(255),
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  total_rows INT,
  processed_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,
  metadata JSONB,
  error_summary JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE import_errors (
  id UUID PRIMARY KEY,
  import_id UUID REFERENCES data_imports(id),
  row_number INT,
  column_name VARCHAR(255),
  error_message TEXT,
  error_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  created_by UUID REFERENCES users(id),
  name VARCHAR(255),
  report_type VARCHAR(100),
  filters JSONB,
  columns JSONB,
  format VARCHAR(50), -- 'pdf', 'excel', 'csv'
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'generating',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Audit & Logging
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  resource_type VARCHAR(100),
  resource_id UUID,
  action VARCHAR(50),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_audit_tenant_timestamp (tenant_id, timestamp)
);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  headers JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexing Strategy

```sql
-- Search Performance
CREATE INDEX idx_skus_full_text 
ON skus USING GIN(to_tsvector('english', name || ' ' || description));

CREATE INDEX idx_sku_attributes_value 
ON sku_attributes(attribute_id, value);

-- Filtering Performance
CREATE INDEX idx_categories_tenant 
ON categories(tenant_id, parent_category_id);

CREATE INDEX idx_attributes_category 
ON attribute_definitions(tenant_id, category_id);

-- User Queries
CREATE INDEX idx_users_tenant_email 
ON users(tenant_id, email);

CREATE INDEX idx_favorites_user 
ON sku_favorites(user_id);

-- Audit & Logging
CREATE INDEX idx_audit_logs_resource 
ON audit_logs(tenant_id, resource_type, resource_id);

-- Soft Deletes
CREATE INDEX idx_skus_not_deleted 
ON skus(tenant_id) WHERE deleted_at IS NULL;
```

### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_attributes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see SKUs from their tenant
CREATE POLICY tenant_isolation ON skus
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON categories
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policy: Users can only see audit logs from their tenant
CREATE POLICY audit_tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Partitioning Strategy

```sql
-- Partition large tables by tenant & time
CREATE TABLE skus_partitioned (
  id UUID,
  tenant_id UUID,
  category_id UUID,
  sku_code VARCHAR(255),
  -- ... other columns
  created_at TIMESTAMP,
  PRIMARY KEY (id, tenant_id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE skus_2026_01 PARTITION OF skus_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

## Infrastructure & DevOps

### Cloud Architecture (AWS Example)

```
AWS Region (Multi-AZ)
├── VPC (10.0.0.0/16)
│   ├── Public Subnet (AZ-a)
│   │   └── NAT Gateway
│   ├── Public Subnet (AZ-b)
│   │   └── NAT Gateway
│   ├── Public Subnet (AZ-c)
│   │   └── NAT Gateway
│   │
│   ├── Private Subnet (AZ-a)
│   │   ├── EKS Worker Nodes
│   │   └── RDS (Primary)
│   ├── Private Subnet (AZ-b)
│   │   ├── EKS Worker Nodes
│   │   └── RDS (Replica)
│   └── Private Subnet (AZ-c)
│       ├── EKS Worker Nodes
│       └── RDS (Replica)
│
├── ELB / ALB (Multi-AZ)
│   ├── Target Group 1 (Healthy)
│   └── Target Group 2 (Warm standby)
│
├── EKS Cluster
│   ├── 3+ Master Nodes (managed)
│   ├── 10-50+ Worker Nodes (autoscaling)
│   │   └── Kubernetes Pods:
│   │       ├── API Services (10+)
│   │       ├── Workers (20+)
│   │       ├── Monitoring (5)
│   │       └── Ingress Controller
│   │
│   └── Persistent Volumes (EBS)
│
├── RDS PostgreSQL
│   ├── Primary Instance
│   ├── Replica Instance (AZ-b)
│   ├── Replica Instance (AZ-c)
│   └── Automated Backups
│
├── ElastiCache
│   ├── Redis Cluster (Primary)
│   ├── Replica 1 (AZ-b)
│   ├── Replica 2 (AZ-c)
│   └── Sentinel nodes (HA)
│
├── Elasticsearch Service
│   ├── Data Nodes (3+)
│   ├── Master Nodes (3+)
│   └── Ingest Nodes (2+)
│
├── S3
│   ├── Assets bucket (CloudFront)
│   ├── Uploads bucket
│   └── Backups bucket (lifecycle policy)
│
├── CloudFront CDN
│   └── S3 origin + API origin
│
├── Route 53
│   ├── DNS routing
│   └── Health checks
│
└── IAM
    ├── EKS Service Role
    ├── EC2 Instance Role
    ├── S3 Access Role
    └── Cross-account roles (if needed)
```

### Kubernetes Configuration

```yaml
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: pim-prod

---
# API Service Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: pim-prod
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 3
      maxUnavailable: 1
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        version: v1
    spec:
      serviceAccountName: api-service
      containers:
      - name: api-service
        image: registry.example.com/pim/api:v1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: connection-url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: redis-config
              key: url
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1024Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 2

---
# Service
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: pim-prod
spec:
  type: ClusterIP
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP

---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
  namespace: pim-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 10
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
# Worker Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: import-worker
  namespace: pim-prod
spec:
  replicas: 20
  selector:
    matchLabels:
      app: import-worker
  template:
    metadata:
      labels:
        app: import-worker
    spec:
      containers:
      - name: worker
        image: registry.example.com/pim/worker:v1.0.0
        env:
        - name: WORKER_TYPE
          value: "import"
        - name: QUEUE_URL
          value: "amqp://rabbitmq:5672"
        resources:
          requests:
            cpu: 1000m
            memory: 2048Mi
          limits:
            cpu: 2000m
            memory: 4096Mi
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy PIM System

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7
      elasticsearch:
        image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Lint
      run: pnpm lint
    
    - name: Unit Tests
      run: pnpm test:unit
    
    - name: Integration Tests
      run: pnpm test:integration
    
    - name: Coverage Report
      run: pnpm coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
    - uses: actions/checkout@v3
    - uses: docker/setup-buildx-action@v2
    
    - name: Login to Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
    
    - name: Build and push Docker images
      uses: docker/build-push-action@v4
      with:
        context: .
        push: ${{ github.event_name != 'pull_request' }}
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.27.0'
    
    - name: Configure kubectl
      run: |
        aws eks update-kubeconfig --name pim-prod-cluster --region us-east-1
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    
    - name: Deploy to EKS
      run: |
        kubectl rollout restart deployment/api-service -n pim-prod
        kubectl rollout status deployment/api-service -n pim-prod
    
    - name: Smoke Tests
      run: |
        curl -f https://api.pim.example.com/health || exit 1
```

---

## Security Architecture

### Authentication & Authorization Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Login
       ▼
┌──────────────────┐         ┌──────────────┐
│   OAuth Provider │◄────────┤  Auth Service │
│  (Google/Azure)  │         └──────────────┘
└──────┬───────────┘
       │ 2. Auth Code
       ▼
┌──────────────────────────────────────┐
│   API Gateway / Auth Service         │
│  • Validate auth code               │
│  • Create JWT tokens (access + refresh) │
│  • Store in secure HTTP-only cookie │
└─────────────┬──────────────────────┘
              │ 3. JWT Token
              ▼
         ┌────────────┐
         │   Redux    │
         │   Store    │
         └────────┬───┘
                  │ 4. Include in requests
                  ▼
            ┌──────────────┐
            │  API Server  │
            │  Middleware: │
            │  • Verify JWT│
            │  • Set tenant│
            │  • Check ACL │
            └──────────────┘
```

### Data Protection

```
Data at Rest:
├── Database
│   ├── PostgreSQL Encryption (AES-256)
│   ├── Encrypted backups
│   └── Encrypted replicas
├── Redis (optional encryption)
├── Elasticsearch (optional encryption)
└── S3 (SSE-S3 / SSE-KMS)

Data in Transit:
├── TLS 1.3 for all connections
├── Certificate pinning (mobile)
├── VPN for admin access
└── Encrypted backups in S3

Data at Rest (Sensitive):
├── Passwords: bcrypt (salt + hash)
├── API Keys: encrypted in DB
├── JWT Tokens: signed + expiring
└── Encryption Keys: AWS KMS
```

### Network Security

```
Layers:
├── WAF (AWS WAF)
│   ├── IP reputation lists
│   ├── SQL injection prevention
│   ├── XSS prevention
│   └── Rate limiting
├── DDoS Protection (AWS Shield)
├── VPC Isolation
│   ├── Security groups
│   ├── Network ACLs
│   └── Private subnets for sensitive services
├── VPN for admin access
└── Encrypted communications (TLS 1.3)
```

### Compliance & Audit

```
├── GDPR Compliance
│   ├── Data export APIs
│   ├── Right to deletion
│   ├── Consent management
│   └── Privacy policy
├── SOC 2 Type II
│   ├── Audit logs (immutable)
│   ├── Access controls
│   ├── Incident response plan
│   └── Change management
└── Data Retention
    ├── Logs: 90 days
    ├── Audit trails: 7 years
    ├── Deleted data: 30 days (soft delete)
    └── Backups: 30 days retention
```

---

## Scalability & Performance

### Load Testing Results (Target)

```
Metric                          Target          Method
─────────────────────────────────────────────────────────
Concurrent Users               10,000+         K6 / Artillery
RPS (Requests/sec)            100,000+        Load test
Response Time (p95)           <200ms          API response time
Search Response Time (p95)    <100ms          Elasticsearch
Database Query Time (p95)     <50ms           Query profiling
Connection Pool              100-200          PostgreSQL
Cache Hit Rate               >80%             Redis
Index Size (per tenant)      <1GB             Elasticsearch
Data Import Rate             1M rows/hour     Batch processing
Report Generation            <1min/1M rows   PDF/Excel
Uptime                       >99.9%           Monitoring
```

### Performance Optimization Strategies

```
Backend:
├── Database
│   ├── Query optimization
│   ├── Indexing strategy
│   ├── Connection pooling
│   ├── Read replicas
│   └── Caching layer
├── API
│   ├── Response compression (gzip)
│   ├── Request deduplication
│   ├── Query result caching
│   ├── Rate limiting
│   └── CDN for static assets
└── Workers
    ├── Batch processing
    ├── Async operations
    ├── Job prioritization
    └── Graceful degradation

Frontend:
├── Bundle Optimization
│   ├── Code splitting
│   ├── Tree shaking
│   ├── Lazy loading
│   └── Minification
├── Image Optimization
│   ├── WebP format
│   ├── Responsive images
│   ├── Lazy loading
│   └── Progressive JPEG
├── Rendering
│   ├── Virtual scrolling
│   ├── Memoization
│   ├── Component lazy loading
│   └── Server-side rendering (optional)
└── Caching
    ├── HTTP caching headers
    ├── Service Worker
    ├── Browser cache
    └── API response caching
```

---

## Disaster Recovery & High Availability

### RTO/RPO Targets

```
Scenario                    RTO         RPO         Strategy
──────────────────────────────────────────────────────────────
Database Failure          15 min      5 min       • Multi-AZ RDS
                                                   • Automated failover
                                                   • Continuous replication

Primary Region Down       30 min      <1 hr       • Multi-region setup
                                                   • Route53 failover
                                                   • Data sync pipeline

Data Corruption           1 hour      <1 hr       • Point-in-time recovery
                                                   • Transaction logs

Security Breach           <1 min      N/A         • Incident response
                                                   • Access revocation
                                                   • Monitoring alerts

Kubernetes Cluster Fail   5 min       <5 min      • Multi-AZ deployment
                                                   • Automatic rescheduling
                                                   • Persistent volumes
```

### Backup Strategy

```
PostgreSQL:
├── Automated daily backups (7-day retention)
├── Continuous WAL archiving (point-in-time recovery)
├── Weekly snapshots (30-day retention)
└── Monthly long-term backups (1-year retention)

Elasticsearch:
├── Snapshot repository (S3)
├── Daily snapshots (30-day retention)
├── Hourly index snapshots (7-day retention)
└── Automated backup verification

Redis:
├── RDB snapshots (daily)
├── AOF persistence (optional)
├── Replication to standby

S3:
├── Versioning enabled
├── Replication to backup region
├── Lifecycle policies for old versions
└── MFA delete protection

Configuration:
├── IaC (Terraform/CloudFormation)
├── Version controlled
├── Backup to secure S3
└── Automated testing of IaC
```

### Monitoring & Alerting

```
Monitoring Stack:
├── Prometheus
│   ├── Application metrics (custom)
│   ├── Infrastructure metrics
│   ├── Database metrics
│   └── Kubernetes metrics
├── Grafana
│   ├── Executive dashboard
│   ├── Operational dashboard
│   ├── Performance dashboard
│   └── Business metrics dashboard
├── Datadog/New Relic (APM)
│   ├── Distributed tracing
│   ├── Performance profiling
│   ├── Error analysis
│   └── Dependency mapping
└── ELK Stack
    ├── Elasticsearch (logs)
    ├── Logstash (processing)
    └── Kibana (visualization)

Alerting Thresholds:
├── CPU utilization >80%
├── Memory utilization >85%
├── Disk usage >90%
├── Database connections >80% of pool
├── API response time (p95) >500ms
├── Error rate >1%
├── Zero successful health checks
├── Database replication lag >30 seconds
├── Elasticsearch cluster health yellow/red
└── Backup failure
```

---

## Cost Optimization

### Reserved Instances Strategy

```
Compute:
├── 70% of baseline on Reserved Instances (1-year)
├── 20% on Spot Instances (variable load)
└── 10% on On-Demand (overflow)

Database:
├── Primary: Reserved Instance (1-year)
├── Replicas: Reserved Instances (1-year)
└── Backups: S3 with lifecycle policies

Networking:
├── Data transfer: Reserved capacity
└── NAT Gateway: Optimize usage

Estimated Monthly Spend:
├── Compute: $15,000
├── Database: $5,000
├── Networking: $2,000
├── Storage: $3,000
└── Monitoring/Tools: $2,000
───────────────────────────────
Total: ~$27,000/month (baseline)
```

---

**End of Technical Architecture Document**

Document Version: 1.0
Last Updated: April 2026
