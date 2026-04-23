/**
 * OpenAPI 3.1 spec for Phase 1-2 endpoints.
 * Served at GET /api/v1/docs (JSON) and /api/v1/docs.yaml.
 * Kept in code (not a static file) so it can reference generated enums/types later.
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'PIM API',
    version: '0.2.0',
    description: 'Product Information Management — tenants, categories, attributes, CSV imports.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        required: ['success', 'data', 'timestamp'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {},
          meta: { type: 'object', additionalProperties: true },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', const: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
          subscriptionTier: { type: 'string' },
          config: { type: 'object', additionalProperties: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          parentCategoryId: { type: 'string', format: 'uuid', nullable: true },
          level: { type: 'integer' },
          displayOrder: { type: 'integer', nullable: true },
          description: { type: 'string', nullable: true },
        },
      },
      AttributeDefinition: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: [
              'text', 'longtext', 'richtext', 'integer', 'decimal', 'boolean',
              'date', 'datetime', 'select', 'multiselect', 'image', 'file',
              'relationship', 'json',
            ],
          },
          isRequired: { type: 'boolean' },
          isSearchable: { type: 'boolean' },
          isFacetable: { type: 'boolean' },
          isEditable: { type: 'boolean' },
          displayOrder: { type: 'integer', nullable: true },
        },
      },
      DataImport: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          fileName: { type: 'string' },
          importType: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'pending', 'uploaded', 'validating', 'validated',
              'validation_failed', 'processing', 'completed', 'failed',
            ],
          },
          totalRows: { type: 'integer', nullable: true },
          processedRows: { type: 'integer' },
          failedRows: { type: 'integer' },
          metadata: { type: 'object', additionalProperties: true, nullable: true },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        security: [],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'tenantSlug'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  tenantSlug: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Authenticated, returns user + tokens' } },
      },
    },
    '/tenants': {
      get: { summary: 'List tenants', responses: { 200: { description: 'OK' } } },
      post: {
        summary: 'Create tenant + first admin',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/tenants/{tenantId}': {
      get: { summary: 'Get tenant', parameters: [tenantParam()], responses: { 200: { description: 'OK' } } },
      patch: { summary: 'Update tenant', parameters: [tenantParam()], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Soft-delete tenant', parameters: [tenantParam()], responses: { 204: { description: 'Deleted' } } },
    },
    '/tenants/{tenantId}/categories': {
      get: {
        summary: 'List categories (flat or ?tree=true)',
        parameters: [tenantParam(), { name: 'tree', in: 'query', schema: { type: 'boolean' } }],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        summary: 'Create category',
        parameters: [tenantParam()],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/tenants/{tenantId}/categories/{categoryId}': {
      get: { summary: 'Get category', parameters: [tenantParam(), categoryParam()], responses: { 200: { description: 'OK' } } },
      patch: { summary: 'Update category', parameters: [tenantParam(), categoryParam()], responses: { 200: { description: 'OK' } } },
      delete: {
        summary: 'Soft-delete category (blocks if children or SKUs exist)',
        parameters: [tenantParam(), categoryParam()],
        responses: { 204: { description: 'Deleted' }, 409: { description: 'In use' } },
      },
    },
    '/tenants/{tenantId}/categories/{categoryId}/attributes': {
      get: { summary: 'List attributes', parameters: [tenantParam(), categoryParam()], responses: { 200: { description: 'OK' } } },
      post: {
        summary: 'Create attribute definition',
        parameters: [tenantParam(), categoryParam()],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AttributeDefinition' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/tenants/{tenantId}/categories/{categoryId}/attributes/{attributeId}': {
      get: { summary: 'Get attribute', parameters: [tenantParam(), categoryParam(), attributeParam()], responses: { 200: { description: 'OK' } } },
      patch: {
        summary: 'Update attribute (type change blocked once SKUs reference it)',
        parameters: [tenantParam(), categoryParam(), attributeParam()],
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        summary: 'Soft-delete attribute',
        parameters: [tenantParam(), categoryParam(), attributeParam()],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/tenants/{tenantId}/skus': {
      get: {
        summary: 'List SKUs',
        parameters: [
          tenantParam(),
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search by SKU code or name' },
          { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        summary: 'Create SKU',
        parameters: [tenantParam()],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/tenants/{tenantId}/skus/bulk-update': {
      post: {
        summary: 'Bulk update SKUs (status and/or category)',
        parameters: [tenantParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['skuIds', 'patch'],
                properties: {
                  skuIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1, maxItems: 5000 },
                  patch: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
                      categoryId: { type: 'string', format: 'uuid' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK — { updated }' } },
      },
    },
    '/tenants/{tenantId}/skus/bulk-delete': {
      post: {
        summary: 'Bulk soft-delete SKUs',
        parameters: [tenantParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['skuIds'],
                properties: {
                  skuIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1, maxItems: 5000 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK — { deleted }' } },
      },
    },
    '/tenants/{tenantId}/skus/bulk-export': {
      post: {
        summary: 'Export SKUs as CSV (by skuIds or filters). Attribute columns auto-detected.',
        parameters: [tenantParam()],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  skuIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  categoryId: { type: 'string', format: 'uuid' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'CSV body', content: { 'text/csv': {} } } },
      },
    },
    '/tenants/{tenantId}/skus/{skuId}/attributes/{attributeId}': {
      put: {
        summary: 'Set or clear a single SKU attribute value (type-coerced, audit-logged)',
        parameters: [
          tenantParam(),
          { name: 'skuId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          attributeParam(),
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { value: { type: 'string', nullable: true, description: 'Empty or null clears the value' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' }, 204: { description: 'Cleared' }, 400: { description: 'Invalid value or required attr cannot be cleared' } },
      },
    },
    '/tenants/{tenantId}/skus/{skuId}': {
      get: {
        summary: 'Get SKU (with category, attributes, media)',
        parameters: [tenantParam(), { name: 'skuId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
      patch: {
        summary: 'Update SKU (writes audit history row)',
        parameters: [tenantParam(), { name: 'skuId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        summary: 'Soft-delete SKU (writes audit history row)',
        parameters: [tenantParam(), { name: 'skuId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/tenants/{tenantId}/imports': {
      get: { summary: 'List imports', parameters: [tenantParam()], responses: { 200: { description: 'OK' } } },
      post: {
        summary: 'Upload CSV/XLS/XLSX and return preview + suggested mapping',
        description: 'Spreadsheet formats (.xls, .xlsx) are auto-converted to CSV server-side; the first sheet is used.',
        parameters: [tenantParam()],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
                required: ['file'],
              },
            },
          },
        },
        responses: { 201: { description: 'Uploaded, preview returned' } },
      },
    },
    '/tenants/{tenantId}/imports/{importId}': {
      get: {
        summary: 'Get import status + paginated errors',
        parameters: [
          tenantParam(), importParam(),
          { name: 'errorPage', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'errorLimit', in: 'query', schema: { type: 'integer', default: 100 } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/tenants/{tenantId}/imports/{importId}/validate': {
      post: {
        summary: 'Validate import (async worker)',
        parameters: [tenantParam(), importParam()],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoryId', 'mapping'],
                properties: {
                  categoryId: { type: 'string', format: 'uuid' },
                  mapping: { type: 'object', additionalProperties: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 202: { description: 'Validation queued' } },
      },
    },
    '/tenants/{tenantId}/imports/{importId}/process': {
      post: {
        summary: 'Process import (inserts SKUs; requires prior validation)',
        parameters: [tenantParam(), importParam()],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { skipInvalid: { type: 'boolean' } },
              },
            },
          },
        },
        responses: { 202: { description: 'Processing queued' }, 409: { description: 'Not validated yet' } },
      },
    },
  },
};

function tenantParam() {
  return { name: 'tenantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
}
function categoryParam() {
  return { name: 'categoryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
}
function attributeParam() {
  return { name: 'attributeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
}
function importParam() {
  return { name: 'importId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
}
