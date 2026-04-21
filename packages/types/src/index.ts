// ============================================================
// Core Primitives
// ============================================================

export type UUID = string;
export type ISODateString = string;

// ============================================================
// API Response Types
// ============================================================

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ApiMeta;
  timestamp: ISODateString;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: ISODateString;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================
// Tenant Types
// ============================================================

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface TenantConfig {
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  locale?: string;
  maxUsers?: number;
  maxSkus?: number;
  featuresEnabled?: string[];
}

export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  status: TenantStatus;
  subscriptionTier: SubscriptionTier;
  config: TenantConfig | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  subscriptionTier?: SubscriptionTier;
  config?: TenantConfig;
}

export interface UpdateTenantInput {
  name?: string;
  status?: TenantStatus;
  subscriptionTier?: SubscriptionTier;
  config?: Partial<TenantConfig>;
}

// ============================================================
// User & Auth Types
// ============================================================

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

export interface User {
  id: UUID;
  tenantId: UUID;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  mfaEnabled: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastLogin: ISODateString | null;
}

export interface UserWithRoles extends User {
  roles: Role[];
}

export interface CreateUserInput {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  status?: UserStatus;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tenant: Tenant;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: UUID; // user id
  tenantId: UUID;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

// ============================================================
// Role & Permission Types
// ============================================================

export interface Role {
  id: UUID;
  tenantId: UUID;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: ISODateString;
  permissions?: Permission[];
}

export interface Permission {
  id: UUID;
  tenantId: UUID;
  name: string;
  resource: string;
  action: string;
  createdAt: ISODateString;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds?: UUID[];
}

// ============================================================
// Category Types
// ============================================================

export interface Category {
  id: UUID;
  tenantId: UUID;
  parentCategoryId: UUID | null;
  name: string;
  slug: string;
  description: string | null;
  level: number;
  displayOrder: number | null;
  attributes: Record<string, unknown> | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  children?: Category[];
  attributeDefinitions?: AttributeDefinition[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentCategoryId?: UUID;
  description?: string;
  displayOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  parentCategoryId?: UUID | null;
}

// ============================================================
// Attribute Definition Types
// ============================================================

export type AttributeType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'image'
  | 'file'
  | 'relationship'
  | 'json';

export interface AttributeOption {
  label: string;
  value: string;
}

export interface AttributeValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface AttributeDefinition {
  id: UUID;
  tenantId: UUID;
  categoryId: UUID;
  name: string;
  type: AttributeType;
  isRequired: boolean;
  isSearchable: boolean;
  isFacetable: boolean;
  isEditable: boolean;
  options: AttributeOption[] | null;
  validation: AttributeValidation | null;
  displayOrder: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateAttributeDefinitionInput {
  name: string;
  type: AttributeType;
  isRequired?: boolean;
  isSearchable?: boolean;
  isFacetable?: boolean;
  isEditable?: boolean;
  options?: AttributeOption[];
  validation?: AttributeValidation;
  displayOrder?: number;
}

// ============================================================
// SKU Types
// ============================================================

export type SkuStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface SkuPricing {
  basePrice?: number;
  salePrice?: number;
  currency?: string;
  priceList?: Record<string, number>;
}

export interface Sku {
  id: UUID;
  tenantId: UUID;
  categoryId: UUID;
  skuCode: string;
  name: string;
  description: string | null;
  baseAttributes: Record<string, unknown> | null;
  pricing: SkuPricing | null;
  stockLevel: number;
  status: SkuStatus;
  createdBy: UUID;
  updatedBy: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
  category?: Category;
  attributes?: SkuAttribute[];
  media?: SkuMedia[];
}

export interface SkuWithDetails extends Sku {
  category: Category;
  attributes: SkuAttribute[];
  media: SkuMedia[];
  issues?: SkuIssue[];
}

export interface CreateSkuInput {
  categoryId: UUID;
  skuCode: string;
  name: string;
  description?: string;
  baseAttributes?: Record<string, unknown>;
  pricing?: SkuPricing;
  stockLevel?: number;
  status?: SkuStatus;
}

export interface UpdateSkuInput {
  name?: string;
  description?: string;
  baseAttributes?: Record<string, unknown>;
  pricing?: SkuPricing;
  stockLevel?: number;
  status?: SkuStatus;
  categoryId?: UUID;
}

// ============================================================
// SKU Attribute Types
// ============================================================

export interface SkuAttribute {
  id: UUID;
  skuId: UUID;
  attributeId: UUID;
  value: string | null;
  valueNumber: number | null;
  valueDate: string | null;
  valueJson: unknown | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  attributeDefinition?: AttributeDefinition;
}

export interface SetSkuAttributeInput {
  attributeId: UUID;
  value?: string;
  valueNumber?: number;
  valueDate?: string;
  valueJson?: unknown;
}

// ============================================================
// SKU History Types
// ============================================================

export type SkuChangeType = 'created' | 'updated' | 'deleted' | 'restored';

export interface SkuHistory {
  id: UUID;
  skuId: UUID;
  tenantId: UUID;
  changedBy: UUID;
  changes: Record<string, { from: unknown; to: unknown }>;
  changeType: SkuChangeType;
  changedAt: ISODateString;
  user?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
}

// ============================================================
// SKU Media Types
// ============================================================

export type MediaType = 'image' | 'video' | 'document';

export interface SkuMedia {
  id: UUID;
  skuId: UUID;
  type: MediaType;
  url: string;
  altText: string | null;
  displayOrder: number | null;
  createdAt: ISODateString;
}

export interface CreateSkuMediaInput {
  type: MediaType;
  url: string;
  altText?: string;
  displayOrder?: number;
}

// ============================================================
// SKU Relationship Types
// ============================================================

export type RelationshipType = 'cross-sell' | 'upsell' | 'variant' | 'similar';

export interface SkuRelationship {
  id: UUID;
  skuIdFrom: UUID;
  skuIdTo: UUID;
  relationshipType: RelationshipType;
  relatedSku?: Pick<Sku, 'id' | 'skuCode' | 'name'>;
}

// ============================================================
// SKU Favorites
// ============================================================

export interface SkuFavorite {
  id: UUID;
  userId: UUID;
  skuId: UUID;
  createdAt: ISODateString;
  sku?: Sku;
}

// ============================================================
// SKU Issues
// ============================================================

export type IssueType =
  | 'missing_data'
  | 'incorrect_info'
  | 'quality'
  | 'duplicate'
  | 'pricing'
  | 'other';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SkuIssue {
  id: UUID;
  skuId: UUID;
  tenantId: UUID;
  reportedBy: UUID;
  issueType: IssueType;
  description: string;
  status: IssueStatus;
  resolution: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  reporter?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
}

export interface CreateSkuIssueInput {
  issueType: IssueType;
  description: string;
}

export interface UpdateSkuIssueInput {
  status?: IssueStatus;
  resolution?: string;
}

// ============================================================
// Data Import Types
// ============================================================

export type ImportStatus =
  | 'pending'
  | 'validating'
  | 'validated'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DataImport {
  id: UUID;
  tenantId: UUID;
  initiatedBy: UUID;
  fileName: string;
  fileUrl: string | null;
  status: ImportStatus;
  totalRows: number | null;
  processedRows: number;
  failedRows: number;
  metadata: Record<string, unknown> | null;
  errorSummary: Record<string, unknown> | null;
  startedAt: ISODateString | null;
  completedAt: ISODateString | null;
  createdAt: ISODateString;
}

export interface ImportError {
  id: UUID;
  importId: UUID;
  rowNumber: number;
  columnName: string | null;
  errorMessage: string;
  errorType: string;
  createdAt: ISODateString;
}

// ============================================================
// Report Types
// ============================================================

export type ReportType = 'sku-report' | 'category-summary' | 'inventory' | 'price-list';
export type ReportFormat = 'pdf' | 'excel' | 'csv';
export type ReportStatus = 'generating' | 'ready' | 'failed' | 'expired';

export interface Report {
  id: UUID;
  tenantId: UUID;
  createdBy: UUID;
  name: string;
  reportType: ReportType;
  filters: Record<string, unknown> | null;
  columns: string[] | null;
  format: ReportFormat;
  fileUrl: string | null;
  status: ReportStatus;
  createdAt: ISODateString;
  expiresAt: ISODateString | null;
}

export interface CreateReportInput {
  name: string;
  reportType: ReportType;
  filters?: Record<string, unknown>;
  columns?: string[];
  format: ReportFormat;
}

// ============================================================
// Audit Log Types
// ============================================================

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export';

export interface AuditLog {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  resourceType: string;
  resourceId: UUID | null;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: ISODateString;
  user?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
}

// ============================================================
// Webhook Types
// ============================================================

export type WebhookEvent =
  | 'sku.created'
  | 'sku.updated'
  | 'sku.deleted'
  | 'import.completed'
  | 'import.failed'
  | 'report.generated'
  | 'user.created'
  | 'user.deleted';

export interface Webhook {
  id: UUID;
  tenantId: UUID;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  headers: Record<string, string> | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateWebhookInput {
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
}

// ============================================================
// Search Types
// ============================================================

export interface SearchFilters {
  category?: string | string[];
  status?: SkuStatus | SkuStatus[];
  priceMin?: number;
  priceMax?: number;
  stockMin?: number;
  stockMax?: number;
  [key: string]: unknown;
}

export type SearchSortField = 'relevance' | 'name' | 'price' | 'createdAt' | 'updatedAt';
export type SearchSortOrder = 'asc' | 'desc';

export interface SearchQuery {
  q?: string;
  filters?: SearchFilters;
  sortBy?: SearchSortField;
  sortOrder?: SearchSortOrder;
  page?: number;
  limit?: number;
  facets?: string[];
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facet {
  field: string;
  label: string;
  values: FacetValue[];
}

export interface SearchResult {
  items: Sku[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: Facet[];
  query: string;
  took?: number;
}

// ============================================================
// Pagination
// ============================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
