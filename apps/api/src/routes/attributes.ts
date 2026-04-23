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

const router = Router({ mergeParams: true });

const ATTRIBUTE_TYPES = [
  'text',
  'longtext',
  'richtext',
  'integer',
  'decimal',
  'date',
  'datetime',
  'boolean',
  'select',
  'multiselect',
  'image',
  'file',
  'relationship',
  'json',
] as const;

const createAttributeSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(ATTRIBUTE_TYPES),
  isRequired: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  isFacetable: z.boolean().optional(),
  isEditable: z.boolean().optional(),
  options: z.record(z.unknown()).optional(),
  validation: z.record(z.unknown()).optional(),
  displayOrder: z.number().int().optional(),
});

const updateAttributeSchema = createAttributeSchema.partial();

async function assertCategory(tenantId: string, categoryId: string): Promise<boolean> {
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, tenantId, deletedAt: null },
    select: { id: true },
  });
  return !!cat;
}

// GET /tenants/:tenantId/categories/:categoryId/attributes
router.get(
  '/',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId } = req.params as { tenantId: string; categoryId: string };
      if (!(await assertCategory(tenantId, categoryId))) {
        sendNotFound(res, 'Category');
        return;
      }

      const items = await prisma.attributeDefinition.findMany({
        where: { tenantId, categoryId, deletedAt: null },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  }
);

// POST /tenants/:tenantId/categories/:categoryId/attributes
router.post(
  '/',
  requireAuth,
  requireTenantMatch,
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId } = req.params as { tenantId: string; categoryId: string };
      const body = createAttributeSchema.parse(req.body);

      if (!(await assertCategory(tenantId, categoryId))) {
        sendNotFound(res, 'Category');
        return;
      }

      const clash = await prisma.attributeDefinition.findFirst({
        where: { tenantId, categoryId, name: body.name, deletedAt: null },
      });
      if (clash) {
        sendConflict(res, `Attribute "${body.name}" already exists for this category`);
        return;
      }

      const created = await prisma.attributeDefinition.create({
        data: {
          tenantId,
          categoryId,
          name: body.name,
          type: body.type,
          isRequired: body.isRequired ?? false,
          isSearchable: body.isSearchable ?? true,
          isFacetable: body.isFacetable ?? true,
          isEditable: body.isEditable ?? true,
          options: body.options ?? {},
          validation: body.validation ?? {},
          displayOrder: body.displayOrder,
        },
      });
      sendCreated(res, created);
    } catch (err) {
      next(err);
    }
  }
);

// GET /tenants/:tenantId/categories/:categoryId/attributes/:attributeId
router.get(
  '/:attributeId',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId, attributeId } = req.params as {
        tenantId: string;
        categoryId: string;
        attributeId: string;
      };
      const attr = await prisma.attributeDefinition.findFirst({
        where: { id: attributeId, tenantId, categoryId, deletedAt: null },
      });
      if (!attr) {
        sendNotFound(res, 'Attribute');
        return;
      }
      sendSuccess(res, attr);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /tenants/:tenantId/categories/:categoryId/attributes/:attributeId
router.patch(
  '/:attributeId',
  requireAuth,
  requireTenantMatch,
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId, attributeId } = req.params as {
        tenantId: string;
        categoryId: string;
        attributeId: string;
      };
      const body = updateAttributeSchema.parse(req.body);

      const existing = await prisma.attributeDefinition.findFirst({
        where: { id: attributeId, tenantId, categoryId, deletedAt: null },
      });
      if (!existing) {
        sendNotFound(res, 'Attribute');
        return;
      }

      if (body.name && body.name !== existing.name) {
        const clash = await prisma.attributeDefinition.findFirst({
          where: {
            tenantId,
            categoryId,
            name: body.name,
            deletedAt: null,
            NOT: { id: attributeId },
          },
        });
        if (clash) {
          sendConflict(res, `Attribute "${body.name}" already exists`);
          return;
        }
      }

      // Prevent type change if attribute already has data — protects existing SKUs.
      if (body.type && body.type !== existing.type) {
        const inUse = await prisma.skuAttribute.count({ where: { attributeId } });
        if (inUse > 0) {
          sendConflict(
            res,
            'Cannot change attribute type once SKUs reference it; create a new attribute instead'
          );
          return;
        }
      }

      const updated = await prisma.attributeDefinition.update({
        where: { id: attributeId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.isRequired !== undefined ? { isRequired: body.isRequired } : {}),
          ...(body.isSearchable !== undefined ? { isSearchable: body.isSearchable } : {}),
          ...(body.isFacetable !== undefined ? { isFacetable: body.isFacetable } : {}),
          ...(body.isEditable !== undefined ? { isEditable: body.isEditable } : {}),
          ...(body.options !== undefined ? { options: body.options } : {}),
          ...(body.validation !== undefined ? { validation: body.validation } : {}),
          ...(body.displayOrder !== undefined ? { displayOrder: body.displayOrder } : {}),
        },
      });
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /tenants/:tenantId/categories/:categoryId/attributes/:attributeId (soft)
router.delete(
  '/:attributeId',
  requireAuth,
  requireTenantMatch,
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, categoryId, attributeId } = req.params as {
        tenantId: string;
        categoryId: string;
        attributeId: string;
      };
      const existing = await prisma.attributeDefinition.findFirst({
        where: { id: attributeId, tenantId, categoryId, deletedAt: null },
      });
      if (!existing) {
        sendNotFound(res, 'Attribute');
        return;
      }
      await prisma.attributeDefinition.update({
        where: { id: attributeId },
        data: { deletedAt: new Date() },
      });
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
