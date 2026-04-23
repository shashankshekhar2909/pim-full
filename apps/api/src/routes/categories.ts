import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTenantMatch } from '../middleware/tenant.js';
import { requireEditor } from '../middleware/rbac.js';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendConflict,
} from '../utils/response.js';
import { slugify } from '@pim/utils';

const router = Router({ mergeParams: true });

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().optional(),
  attributes: z.record(z.unknown()).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

async function computeLevel(tx: typeof prisma, parentId?: string | null): Promise<number> {
  if (!parentId) return 0;
  const parent = await tx.category.findUnique({
    where: { id: parentId },
    select: { level: true, deletedAt: true },
  });
  if (!parent || parent.deletedAt) throw new Error('PARENT_NOT_FOUND');
  return parent.level + 1;
}

// GET /tenants/:tenantId/categories — list (flat) with optional tree shape
router.get(
  '/',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      const asTree = req.query.tree === 'true';
      const parentId = req.query.parentId as string | undefined;

      const items = await prisma.category.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(parentId !== undefined && !asTree
            ? { parentCategoryId: parentId === 'null' ? null : parentId }
            : {}),
        },
        orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      });

      if (!asTree) {
        sendSuccess(res, items);
        return;
      }

      // Build tree
      type Node = (typeof items)[number] & { children: Node[] };
      const byId = new Map<string, Node>();
      items.forEach((c) => byId.set(c.id, { ...c, children: [] }));
      const roots: Node[] = [];
      byId.forEach((node) => {
        if (node.parentCategoryId && byId.has(node.parentCategoryId)) {
          byId.get(node.parentCategoryId)!.children.push(node);
        } else {
          roots.push(node);
        }
      });

      sendSuccess(res, roots);
    } catch (err) {
      next(err);
    }
  }
);

// POST /tenants/:tenantId/categories — create
router.post(
  '/',
  requireAuth,
  requireTenantMatch,
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      const body = createCategorySchema.parse(req.body);
      const slug = body.slug ?? slugify(body.name);

      const existing = await prisma.category.findFirst({
        where: { tenantId, slug, deletedAt: null },
      });
      if (existing) {
        sendConflict(res, `Category with slug "${slug}" already exists`);
        return;
      }

      let level = 0;
      try {
        level = await computeLevel(prisma, body.parentCategoryId ?? null);
      } catch {
        sendNotFound(res, 'Parent category');
        return;
      }

      const created = await prisma.category.create({
        data: {
          tenantId,
          name: body.name,
          slug,
          parentCategoryId: body.parentCategoryId ?? null,
          description: body.description,
          displayOrder: body.displayOrder,
          attributes: body.attributes ?? {},
          level,
        },
      });

      sendCreated(res, created);
    } catch (err) {
      next(err);
    }
  }
);

// GET /tenants/:tenantId/categories/:categoryId
router.get(
  '/:categoryId',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId } = req.params as { tenantId: string; categoryId: string };
      const category = await prisma.category.findFirst({
        where: { id: categoryId, tenantId, deletedAt: null },
        include: {
          children: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
          _count: { select: { skus: true, attributeDefinitions: true } },
        },
      });

      if (!category) {
        sendNotFound(res, 'Category');
        return;
      }
      sendSuccess(res, category);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /tenants/:tenantId/categories/:categoryId
router.patch(
  '/:categoryId',
  requireAuth,
  requireTenantMatch,
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId } = req.params as { tenantId: string; categoryId: string };
      const body = updateCategorySchema.parse(req.body);

      const existing = await prisma.category.findFirst({
        where: { id: categoryId, tenantId, deletedAt: null },
      });
      if (!existing) {
        sendNotFound(res, 'Category');
        return;
      }

      // Slug uniqueness (if changed)
      if (body.slug && body.slug !== existing.slug) {
        const clash = await prisma.category.findFirst({
          where: { tenantId, slug: body.slug, deletedAt: null, NOT: { id: categoryId } },
        });
        if (clash) {
          sendConflict(res, `Category with slug "${body.slug}" already exists`);
          return;
        }
      }

      // Parent change => recompute level and prevent cycles
      let level = existing.level;
      if (body.parentCategoryId !== undefined && body.parentCategoryId !== existing.parentCategoryId) {
        if (body.parentCategoryId === categoryId) {
          sendConflict(res, 'Category cannot be its own parent');
          return;
        }
        try {
          level = await computeLevel(prisma, body.parentCategoryId);
        } catch {
          sendNotFound(res, 'Parent category');
          return;
        }
      }

      const updated = await prisma.category.update({
        where: { id: categoryId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.displayOrder !== undefined ? { displayOrder: body.displayOrder } : {}),
          ...(body.attributes !== undefined ? { attributes: body.attributes } : {}),
          ...(body.parentCategoryId !== undefined
            ? { parentCategoryId: body.parentCategoryId, level }
            : {}),
        },
      });

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /tenants/:tenantId/categories/:categoryId (soft delete)
router.delete(
  '/:categoryId',
  requireAuth,
  requireTenantMatch,
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId } = req.params as { tenantId: string; categoryId: string };

      const existing = await prisma.category.findFirst({
        where: { id: categoryId, tenantId, deletedAt: null },
        include: { _count: { select: { children: true, skus: true } } },
      });
      if (!existing) {
        sendNotFound(res, 'Category');
        return;
      }

      const childrenActive = await prisma.category.count({
        where: { parentCategoryId: categoryId, deletedAt: null },
      });
      if (childrenActive > 0) {
        sendConflict(res, 'Cannot delete a category with active subcategories');
        return;
      }
      if (existing._count.skus > 0) {
        sendConflict(res, 'Cannot delete a category that still has SKUs');
        return;
      }

      await prisma.category.update({
        where: { id: categoryId },
        data: { deletedAt: new Date() },
      });
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
