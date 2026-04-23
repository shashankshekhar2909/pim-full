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
  sendBadRequest,
} from '../utils/response.js';
import { coerce } from '../lib/csvImport.js';

const router = Router({ mergeParams: true });

const createSkuSchema = z.object({
  categoryId: z.string().uuid(),
  skuCode: z.string().min(1).max(255),
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  baseAttributes: z.record(z.unknown()).optional(),
  pricing: z.record(z.unknown()).optional(),
  stockLevel: z.number().int().nonnegative().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  attributes: z
    .array(z.object({ attributeId: z.string().uuid(), value: z.string().optional() }))
    .optional(),
});

const updateSkuSchema = createSkuSchema.partial();

const bulkSelectionSchema = z.object({
  skuIds: z.array(z.string().uuid()).min(1).max(5000),
});
const bulkUpdateSchema = bulkSelectionSchema.extend({
  patch: z.object({
    status: z.enum(['active', 'inactive', 'draft']).optional(),
    categoryId: z.string().uuid().optional(),
  }).refine((p) => Object.keys(p).length > 0, { message: 'patch is empty' }),
});

// POST /tenants/:tenantId/skus/bulk-update
router.post(
  '/bulk-update',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      if (!req.user) { sendBadRequest(res, 'authentication required'); return; }
      const body = bulkUpdateSchema.parse(req.body);

      // Validate category belongs to tenant if provided
      if (body.patch.categoryId) {
        const cat = await prisma.category.findFirst({
          where: { id: body.patch.categoryId, tenantId, deletedAt: null },
        });
        if (!cat) { sendNotFound(res, 'Category'); return; }
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.sku.updateMany({
          where: { id: { in: body.skuIds }, tenantId, deletedAt: null },
          data: {
            ...(body.patch.status !== undefined ? { status: body.patch.status } : {}),
            ...(body.patch.categoryId !== undefined ? { categoryId: body.patch.categoryId } : {}),
            updatedBy: req.user!.sub,
          },
        });

        // Audit rows in bulk
        await tx.skuHistory.createMany({
          data: body.skuIds.map((skuId) => ({
            skuId, tenantId,
            changedBy: req.user!.sub,
            changeType: 'bulk_update',
            changes: body.patch as never,
          })),
        });

        return updated.count;
      });

      sendSuccess(res, { updated: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /tenants/:tenantId/skus/bulk-delete (soft)
router.post(
  '/bulk-delete',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      if (!req.user) { sendBadRequest(res, 'authentication required'); return; }
      const body = bulkSelectionSchema.parse(req.body);

      const result = await prisma.$transaction(async (tx) => {
        const deleted = await tx.sku.updateMany({
          where: { id: { in: body.skuIds }, tenantId, deletedAt: null },
          data: { deletedAt: new Date(), status: 'inactive', updatedBy: req.user!.sub },
        });
        await tx.skuHistory.createMany({
          data: body.skuIds.map((skuId) => ({
            skuId, tenantId,
            changedBy: req.user!.sub,
            changeType: 'bulk_delete',
            changes: {} as never,
          })),
        });
        return deleted.count;
      });

      sendSuccess(res, { deleted: result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /tenants/:tenantId/skus/bulk-export — returns CSV
router.post(
  '/bulk-export',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      const body = z.object({
        skuIds: z.array(z.string().uuid()).optional(),
        categoryId: z.string().uuid().optional(),
        status: z.enum(['active', 'inactive', 'draft']).optional(),
      }).parse(req.body ?? {});

      const where = {
        tenantId,
        deletedAt: null,
        ...(body.skuIds && body.skuIds.length ? { id: { in: body.skuIds } } : {}),
        ...(body.categoryId ? { categoryId: body.categoryId } : {}),
        ...(body.status ? { status: body.status } : {}),
      };

      const rows = await prisma.sku.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100000, // safety cap
        include: {
          category: { select: { name: true, slug: true } },
          attributes: { include: { attributeDefinition: { select: { name: true } } } },
        },
      });

      // Collect all attribute names that appear so we can add them as columns
      const attrNames = new Set<string>();
      for (const r of rows) {
        for (const a of r.attributes) {
          if (a.attributeDefinition?.name) attrNames.add(a.attributeDefinition.name);
        }
      }
      const attrCols = [...attrNames].sort();

      const esc = (v: unknown) => {
        if (v == null) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const header = ['skuCode', 'name', 'description', 'category', 'stockLevel', 'status', ...attrCols];
      const lines = [header.join(',')];
      for (const r of rows) {
        const attrMap = new Map<string, string>();
        for (const a of r.attributes) {
          const n = a.attributeDefinition?.name;
          if (!n) continue;
          const v = a.value ?? a.valueNumber ?? (a.valueDate ? String(a.valueDate).slice(0, 10) : '') ?? JSON.stringify(a.valueJson ?? '');
          attrMap.set(n, v == null ? '' : String(v));
        }
        const line = [
          r.skuCode, r.name, r.description ?? '', r.category?.name ?? '',
          r.stockLevel, r.status,
          ...attrCols.map((n) => attrMap.get(n) ?? ''),
        ].map(esc).join(',');
        lines.push(line);
      }

      const csv = lines.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="skus-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);

// GET /tenants/:tenantId/skus — list with pagination, filters, search
router.get(
  '/',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '25'))));
      const offset = (page - 1) * limit;
      const categoryId = req.query.categoryId as string | undefined;
      const status = req.query.status as string | undefined;
      const q = (req.query.q as string | undefined)?.trim();

      const where = {
        tenantId,
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { skuCode: { contains: q, mode: 'insensitive' as const } },
                { name: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        prisma.sku.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        }),
        prisma.sku.count({ where }),
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
  }
);

// GET /tenants/:tenantId/skus/:skuId
router.get(
  '/:skuId',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, skuId } = req.params as { tenantId: string; skuId: string };
      const sku = await prisma.sku.findFirst({
        where: { id: skuId, tenantId, deletedAt: null },
        include: {
          category: true,
          attributes: {
            include: { attributeDefinition: true },
          },
          media: { orderBy: { displayOrder: 'asc' } },
        },
      });
      if (!sku) {
        sendNotFound(res, 'SKU');
        return;
      }
      sendSuccess(res, sku);
    } catch (err) {
      next(err);
    }
  }
);

// POST /tenants/:tenantId/skus
router.post(
  '/',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      const body = createSkuSchema.parse(req.body);
      if (!req.user) {
        sendBadRequest(res, 'authentication required');
        return;
      }

      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        sendNotFound(res, 'Category');
        return;
      }

      const clash = await prisma.sku.findFirst({
        where: { tenantId, skuCode: body.skuCode, deletedAt: null },
      });
      if (clash) {
        sendConflict(res, `SKU code "${body.skuCode}" already exists`);
        return;
      }

      const created = await prisma.sku.create({
        data: {
          tenantId,
          categoryId: body.categoryId,
          skuCode: body.skuCode,
          name: body.name,
          description: body.description,
          baseAttributes: body.baseAttributes ?? {},
          pricing: body.pricing ?? {},
          stockLevel: body.stockLevel ?? 0,
          status: body.status ?? 'active',
          createdBy: req.user.sub,
          updatedBy: req.user.sub,
          ...(body.attributes && body.attributes.length > 0
            ? {
                attributes: {
                  create: body.attributes.map((a) => ({
                    attributeId: a.attributeId,
                    value: a.value ?? null,
                  })),
                },
              }
            : {}),
        },
        include: { category: true, attributes: { include: { attributeDefinition: true } } },
      });
      sendCreated(res, created);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /tenants/:tenantId/skus/:skuId
router.patch(
  '/:skuId',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, skuId } = req.params as { tenantId: string; skuId: string };
      const body = updateSkuSchema.parse(req.body);
      if (!req.user) {
        sendBadRequest(res, 'authentication required');
        return;
      }

      const existing = await prisma.sku.findFirst({
        where: { id: skuId, tenantId, deletedAt: null },
      });
      if (!existing) {
        sendNotFound(res, 'SKU');
        return;
      }

      if (body.skuCode && body.skuCode !== existing.skuCode) {
        const clash = await prisma.sku.findFirst({
          where: { tenantId, skuCode: body.skuCode, deletedAt: null, NOT: { id: skuId } },
        });
        if (clash) {
          sendConflict(res, `SKU code "${body.skuCode}" already exists`);
          return;
        }
      }

      if (body.categoryId && body.categoryId !== existing.categoryId) {
        const cat = await prisma.category.findFirst({
          where: { id: body.categoryId, tenantId, deletedAt: null },
        });
        if (!cat) {
          sendNotFound(res, 'Category');
          return;
        }
      }

      const updated = await prisma.sku.update({
        where: { id: skuId },
        data: {
          ...(body.skuCode !== undefined ? { skuCode: body.skuCode } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
          ...(body.baseAttributes !== undefined ? { baseAttributes: body.baseAttributes } : {}),
          ...(body.pricing !== undefined ? { pricing: body.pricing } : {}),
          ...(body.stockLevel !== undefined ? { stockLevel: body.stockLevel } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          updatedBy: req.user.sub,
        },
        include: { category: true, attributes: { include: { attributeDefinition: true } } },
      });

      // Audit trail
      await prisma.skuHistory.create({
        data: {
          skuId,
          tenantId,
          changedBy: req.user.sub,
          changeType: 'update',
          changes: body as never,
        },
      });

      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /tenants/:tenantId/skus/:skuId/attributes/:attributeId
// Upserts a single attribute value with type coercion per the attribute definition.
router.put(
  '/:skuId/attributes/:attributeId',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, skuId, attributeId } = req.params as {
        tenantId: string; skuId: string; attributeId: string;
      };
      if (!req.user) { sendBadRequest(res, 'authentication required'); return; }

      const raw = (req.body?.value ?? '') as string | null;

      const sku = await prisma.sku.findFirst({
        where: { id: skuId, tenantId, deletedAt: null },
        select: { id: true, categoryId: true },
      });
      if (!sku) { sendNotFound(res, 'SKU'); return; }

      const def = await prisma.attributeDefinition.findFirst({
        where: { id: attributeId, tenantId, categoryId: sku.categoryId, deletedAt: null },
      });
      if (!def) { sendNotFound(res, 'Attribute definition'); return; }

      // Null / empty clears the value
      if (raw == null || String(raw).trim() === '') {
        if (def.isRequired) {
          sendBadRequest(res, `Attribute "${def.name}" is required`);
          return;
        }
        await prisma.skuAttribute.deleteMany({ where: { skuId, attributeId } });
        await prisma.skuHistory.create({
          data: {
            skuId, tenantId, changedBy: req.user.sub,
            changeType: 'attribute_clear',
            changes: { attributeId, name: def.name } as never,
          },
        });
        sendNoContent(res);
        return;
      }

      const result = coerce(String(raw), def.type);
      if (!result.ok) {
        sendBadRequest(res, `Invalid value for ${def.name}: ${result.reason}`);
        return;
      }
      const v = result.value;

      const data = {
        skuId,
        attributeId,
        value: typeof v === 'string' ? v : v == null ? null : String(v),
        valueNumber: typeof v === 'number' ? v : null,
        valueDate: v instanceof Date ? v : null,
        valueJson: typeof v === 'object' && !(v instanceof Date) ? v : null,
      };

      const upserted = await prisma.skuAttribute.upsert({
        where: { skuId_attributeId: { skuId, attributeId } },
        create: data as never,
        update: data as never,
        include: { attributeDefinition: true },
      });

      await prisma.skuHistory.create({
        data: {
          skuId, tenantId, changedBy: req.user.sub,
          changeType: 'attribute_update',
          changes: { attributeId, name: def.name, value: raw } as never,
        },
      });

      // Bump SKU updatedBy / updatedAt so the list view reflects recency
      await prisma.sku.update({
        where: { id: skuId },
        data: { updatedBy: req.user.sub },
      });

      sendSuccess(res, upserted);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /tenants/:tenantId/skus/:skuId (soft)
router.delete(
  '/:skuId',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, skuId } = req.params as { tenantId: string; skuId: string };
      if (!req.user) {
        sendBadRequest(res, 'authentication required');
        return;
      }
      const existing = await prisma.sku.findFirst({
        where: { id: skuId, tenantId, deletedAt: null },
      });
      if (!existing) {
        sendNotFound(res, 'SKU');
        return;
      }
      await prisma.sku.update({
        where: { id: skuId },
        data: { deletedAt: new Date(), status: 'inactive', updatedBy: req.user.sub },
      });
      await prisma.skuHistory.create({
        data: {
          skuId,
          tenantId,
          changedBy: req.user.sub,
          changeType: 'delete',
          changes: {} as never,
        },
      });
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
