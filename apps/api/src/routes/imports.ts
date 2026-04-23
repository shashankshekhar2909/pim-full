import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTenantMatch } from '../middleware/tenant.js';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendConflict,
} from '../utils/response.js';
import { writeFile, tenantKey } from '../lib/storage.js';
import {
  previewCsv,
  queueValidate,
  queueProcess,
  suggestMapping,
  type ColumnMapping,
} from '../lib/csvImport.js';

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    if (!/\.(csv|xlsx|xls)$/i.test(file.originalname)) {
      cb(new Error('Only CSV, XLS, or XLSX files are accepted'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Normalize any supported upload to a CSV buffer + filename so the rest of the
 * import pipeline only has to deal with one format.
 */
function normalizeToCsv(file: Express.Multer.File): { buffer: Buffer; filename: string } {
  if (/\.csv$/i.test(file.originalname)) {
    return { buffer: file.buffer, filename: file.originalname };
  }
  const wb = XLSX.read(file.buffer, { type: 'buffer' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error('Spreadsheet has no sheets');
  const sheet = wb.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
  return {
    buffer: Buffer.from(csv, 'utf8'),
    filename: file.originalname.replace(/\.(xlsx|xls)$/i, '.csv'),
  };
}

const validateSchema = z.object({
  categoryId: z.string().uuid(),
  mapping: z.record(z.string()),
});

const processSchema = z.object({
  skipInvalid: z.boolean().optional(),
});

// POST /tenants/:tenantId/imports — upload CSV, create DataImport, return preview.
router.post(
  '/',
  requireAuth,
  requireTenantMatch,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      if (!req.file) {
        sendBadRequest(res, 'file is required (multipart field "file")');
        return;
      }
      if (!req.user) {
        sendBadRequest(res, 'authentication required');
        return;
      }

      const id = randomUUID();
      let normalized: { buffer: Buffer; filename: string };
      try {
        normalized = normalizeToCsv(req.file);
      } catch (e) {
        sendBadRequest(res, e instanceof Error ? e.message : 'Failed to parse spreadsheet');
        return;
      }
      const key = tenantKey(tenantId, `${id}-${normalized.filename}`);
      await writeFile(key, normalized.buffer);

      const record = await prisma.dataImport.create({
        data: {
          id,
          tenantId,
          initiatedBy: req.user.sub,
          fileName: key,
          importType: 'skus',
          status: 'uploaded',
          metadata: {
            originalName: req.file.originalname,
            size: req.file.size,
            sourceFormat: /\.csv$/i.test(req.file.originalname) ? 'csv' : 'xlsx',
          },
        },
      });

      const preview = await previewCsv(key);

      sendCreated(res, {
        id: record.id,
        status: record.status,
        fileName: req.file.originalname,
        preview,
        suggestedMapping: suggestMapping(preview.headers),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /tenants/:tenantId/imports — list
router.get(
  '/',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId as string;
      const items = await prisma.dataImport.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  }
);

// GET /tenants/:tenantId/imports/:importId — progress + errors (paginated)
router.get(
  '/:importId',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, importId } = req.params as { tenantId: string; importId: string };
      const errorPage = Math.max(1, parseInt(String(req.query.errorPage ?? '1')));
      const errorLimit = Math.min(500, Math.max(1, parseInt(String(req.query.errorLimit ?? '100'))));

      const record = await prisma.dataImport.findFirst({
        where: { id: importId, tenantId },
      });
      if (!record) {
        sendNotFound(res, 'Import');
        return;
      }

      const [errors, errorCount] = await Promise.all([
        prisma.importError.findMany({
          where: { importId },
          orderBy: { rowNumber: 'asc' },
          skip: (errorPage - 1) * errorLimit,
          take: errorLimit,
        }),
        prisma.importError.count({ where: { importId } }),
      ]);

      sendSuccess(res, {
        ...record,
        errors,
        errorCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /tenants/:tenantId/imports/:importId/validate — kick off validation worker
router.post(
  '/:importId/validate',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, importId } = req.params as { tenantId: string; importId: string };
      const body = validateSchema.parse(req.body);

      const record = await prisma.dataImport.findFirst({ where: { id: importId, tenantId } });
      if (!record) {
        sendNotFound(res, 'Import');
        return;
      }
      if (!['uploaded', 'validation_failed', 'validated'].includes(record.status)) {
        sendConflict(res, `Cannot validate import in status "${record.status}"`);
        return;
      }

      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        sendNotFound(res, 'Category');
        return;
      }

      // Clear previous errors before re-running
      await prisma.importError.deleteMany({ where: { importId } });

      queueValidate({
        tenantId,
        importId,
        categoryId: body.categoryId,
        mapping: body.mapping as ColumnMapping,
      });

      sendSuccess(res, { id: importId, status: 'validating' }, 202);
    } catch (err) {
      next(err);
    }
  }
);

// POST /tenants/:tenantId/imports/:importId/process — kick off insert worker
router.post(
  '/:importId/process',
  requireAuth,
  requireTenantMatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, importId } = req.params as { tenantId: string; importId: string };
      const body = processSchema.parse(req.body);

      if (!req.user) {
        sendBadRequest(res, 'authentication required');
        return;
      }

      const record = await prisma.dataImport.findFirst({ where: { id: importId, tenantId } });
      if (!record) {
        sendNotFound(res, 'Import');
        return;
      }
      if (!['validated', 'validation_failed'].includes(record.status)) {
        sendConflict(res, `Import must be validated before processing (current: ${record.status})`);
        return;
      }
      if (record.status === 'validation_failed' && !body.skipInvalid) {
        sendConflict(res, 'Validation failed; pass skipInvalid=true to process anyway');
        return;
      }

      const meta = (record.metadata as { mapping?: ColumnMapping; categoryId?: string } | null) ?? {};
      const categoryId = meta.categoryId ?? (req.body.categoryId as string | undefined);
      if (!categoryId) {
        sendBadRequest(res, 'categoryId missing from import metadata; re-run validate');
        return;
      }

      queueProcess({
        tenantId,
        importId,
        categoryId,
        userId: req.user.sub,
        skipInvalid: body.skipInvalid,
      });

      sendSuccess(res, { id: importId, status: 'processing' }, 202);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
