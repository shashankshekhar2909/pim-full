import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendBadRequest,
} from '../utils/response.js';
import { slugify } from '@pim/utils';
import categoriesRouter from './categories.js';
import attributesRouter from './attributes.js';
import importsRouter from './imports.js';
import skusRouter from './skus.js';

const router = Router();

// Nested resources — mounted before tenant-specific routes so params resolve correctly.
router.use('/:tenantId/categories/:categoryId/attributes', attributesRouter);
router.use('/:tenantId/categories', categoriesRouter);
router.use('/:tenantId/imports', importsRouter);
router.use('/:tenantId/skus', skusRouter);

// ============================================================
// Validation schemas
// ============================================================

const createTenantSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  subscriptionTier: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  config: z
    .object({
      logoUrl: z.string().url().optional(),
      primaryColor: z.string().optional(),
      timezone: z.string().optional(),
      locale: z.string().optional(),
    })
    .optional(),
  // First admin user for the tenant
  adminUser: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  subscriptionTier: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  config: z
    .object({
      logoUrl: z.string().url().optional().nullable(),
      primaryColor: z.string().optional(),
      timezone: z.string().optional(),
      locale: z.string().optional(),
    })
    .optional(),
});

// ============================================================
// GET /tenants — list all tenants (super-admin use)
// ============================================================

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))));
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          subscriptionTier: true,
          config: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.tenant.count({ where: { deletedAt: null } }),
    ]);

    sendSuccess(res, items, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /tenants — create a new tenant
// ============================================================

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createTenantSchema.parse(req.body);
    const slug = body.slug ?? slugify(body.name);

    const existing = await prisma.tenant.findFirst({ where: { slug } });
    if (existing) {
      sendBadRequest(res, `A tenant with slug "${slug}" already exists`);
      return;
    }

    const passwordHash = await bcrypt.hash(body.adminUser.password, 12);

    const tenant = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: body.name,
          slug,
          status: 'active',
          subscriptionTier: body.subscriptionTier ?? 'free',
          config: body.config ?? {},
        },
      });

      // Create default system roles
      await tx.role.createMany({
        data: [
          { tenantId: newTenant.id, name: 'admin', description: 'Full access', isSystem: true },
          { tenantId: newTenant.id, name: 'editor', description: 'Catalog read/write', isSystem: true },
          { tenantId: newTenant.id, name: 'viewer', description: 'Read-only access', isSystem: true },
        ],
      });
      const adminRole = await tx.role.findFirstOrThrow({
        where: { tenantId: newTenant.id, name: 'admin' },
      });

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          tenantId: newTenant.id,
          email: body.adminUser.email,
          passwordHash,
          firstName: body.adminUser.firstName,
          lastName: body.adminUser.lastName,
          status: 'active',
        },
      });

      // Assign admin role
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });

      return newTenant;
    });

    sendCreated(res, {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      subscriptionTier: tenant.subscriptionTier,
      config: tenant.config,
      createdAt: tenant.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /tenants/:tenantId
// ============================================================

router.get('/:tenantId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.params.tenantId as string;
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        subscriptionTier: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true, skus: true, categories: true },
        },
      },
    });

    if (!tenant) {
      sendNotFound(res, 'Tenant');
      return;
    }

    sendSuccess(res, tenant);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /tenants/:tenantId
// ============================================================

router.patch('/:tenantId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.params.tenantId as string;
    const body = updateTenantSchema.parse(req.body);

    const existing = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });

    if (!existing) {
      sendNotFound(res, 'Tenant');
      return;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.subscriptionTier ? { subscriptionTier: body.subscriptionTier } : {}),
        ...(body.config
          ? {
              config: {
                ...(typeof existing.config === 'object' && existing.config !== null
                  ? existing.config
                  : {}),
                ...body.config,
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        subscriptionTier: true,
        config: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DELETE /tenants/:tenantId (soft delete)
// ============================================================

router.delete(
  '/:tenantId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      const existing = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
      });

      if (!existing) {
        sendNotFound(res, 'Tenant');
        return;
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { deletedAt: new Date(), status: 'inactive' },
      });

      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
