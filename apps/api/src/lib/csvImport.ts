import { parse } from 'csv-parse';
import { prisma } from './prisma.js';
import { readStream } from './storage.js';
import { logger } from '../utils/logger.js';
import type { AttributeDefinition } from '@prisma/client';

const CHUNK_SIZE = 1000;
const PREVIEW_ROWS = 10;
const MAX_ERRORS_STORED = 1000;

export interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
  estimatedRowCount: number;
}

export interface ColumnMapping {
  /** Mapping: csv column header -> target field (e.g. "skuCode", "name", "attr:color") */
  [csvHeader: string]: string;
}

export interface ValidationError {
  row: number;
  column?: string;
  type: string;
  message: string;
}

// ------------------------------------------------------------------
// Preview: read first PREVIEW_ROWS to return headers + sample to UI.
// ------------------------------------------------------------------

export async function previewCsv(fileKey: string): Promise<CsvPreview> {
  const parser = readStream(fileKey).pipe(
    parse({ columns: true, trim: true, skip_empty_lines: true, bom: true })
  );

  const rows: Record<string, string>[] = [];
  let count = 0;
  for await (const record of parser) {
    count++;
    if (rows.length < PREVIEW_ROWS) rows.push(record as Record<string, string>);
  }
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return { headers, rows, estimatedRowCount: count };
}

// ------------------------------------------------------------------
// Type coercion: value string -> typed value per attribute type.
// ------------------------------------------------------------------

export function coerce(
  raw: string,
  type: string
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const v = raw?.trim();
  if (v === '' || v == null) return { ok: true, value: null };

  switch (type) {
    case 'text':
    case 'longtext':
    case 'richtext':
      return { ok: true, value: v };
    case 'integer': {
      const n = Number(v);
      if (!Number.isInteger(n)) return { ok: false, reason: 'not an integer' };
      return { ok: true, value: n };
    }
    case 'decimal': {
      const n = Number(v.replace(/[$,]/g, ''));
      if (!Number.isFinite(n)) return { ok: false, reason: 'not a number' };
      return { ok: true, value: n };
    }
    case 'boolean': {
      const low = v.toLowerCase();
      if (['true', 'yes', '1', 'y'].includes(low)) return { ok: true, value: true };
      if (['false', 'no', '0', 'n'].includes(low)) return { ok: true, value: false };
      return { ok: false, reason: 'not a boolean' };
    }
    case 'date':
    case 'datetime': {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return { ok: false, reason: 'invalid date' };
      return { ok: true, value: d };
    }
    case 'select':
    case 'multiselect':
    case 'image':
    case 'file':
    case 'relationship':
    case 'json':
    default:
      return { ok: true, value: v };
  }
}

// ------------------------------------------------------------------
// Validate pass: streams CSV, records ImportError rows, does not insert.
// ------------------------------------------------------------------

interface ValidateCtx {
  tenantId: string;
  importId: string;
  categoryId: string;
  mapping: ColumnMapping;
}

async function loadAttributeDefs(tenantId: string, categoryId: string) {
  const defs = await prisma.attributeDefinition.findMany({
    where: { tenantId, categoryId, deletedAt: null },
  });
  const byName = new Map<string, AttributeDefinition>();
  defs.forEach((d) => byName.set(d.name, d));
  return byName;
}

export async function validateImport(ctx: ValidateCtx): Promise<void> {
  const prev = await prisma.dataImport.findUniqueOrThrow({ where: { id: ctx.importId } });
  const prevMeta = (prev.metadata as Record<string, unknown> | null) ?? {};
  const importRow = await prisma.dataImport.update({
    where: { id: ctx.importId },
    data: {
      status: 'validating',
      startedAt: new Date(),
      metadata: { ...prevMeta, mapping: ctx.mapping, categoryId: ctx.categoryId },
    },
  });

  const attrDefs = await loadAttributeDefs(ctx.tenantId, ctx.categoryId);
  const errors: ValidationError[] = [];
  const seenSkus = new Set<string>();
  let rowNumber = 0;
  let failedRows = 0;

  try {
    const parser = readStream(importRow.fileName).pipe(
      parse({ columns: true, trim: true, skip_empty_lines: true, bom: true })
    );

    for await (const rec of parser) {
      rowNumber++;
      const record = rec as Record<string, string>;
      const rowErrors: ValidationError[] = [];

      // Required: skuCode + name
      const skuCol = findCol(ctx.mapping, 'skuCode');
      const nameCol = findCol(ctx.mapping, 'name');
      const skuCode = skuCol ? record[skuCol]?.trim() : '';
      const name = nameCol ? record[nameCol]?.trim() : '';

      if (!skuCode) rowErrors.push({ row: rowNumber, column: skuCol, type: 'missing_required', message: 'skuCode is required' });
      if (!name) rowErrors.push({ row: rowNumber, column: nameCol, type: 'missing_required', message: 'name is required' });

      if (skuCode) {
        if (seenSkus.has(skuCode)) {
          rowErrors.push({ row: rowNumber, column: skuCol, type: 'duplicate_in_file', message: `duplicate skuCode "${skuCode}"` });
        }
        seenSkus.add(skuCode);
      }

      // Attribute validations
      for (const [csvCol, target] of Object.entries(ctx.mapping)) {
        if (!target.startsWith('attr:')) continue;
        const attrName = target.slice(5);
        const def = attrDefs.get(attrName);
        if (!def) {
          rowErrors.push({ row: rowNumber, column: csvCol, type: 'unknown_attribute', message: `attribute "${attrName}" not defined` });
          continue;
        }
        const raw = record[csvCol];
        if ((raw == null || raw === '') && def.isRequired) {
          rowErrors.push({ row: rowNumber, column: csvCol, type: 'missing_required', message: `${attrName} is required` });
          continue;
        }
        if (raw) {
          const res = coerce(raw, def.type);
          if (!res.ok) {
            rowErrors.push({ row: rowNumber, column: csvCol, type: 'type_mismatch', message: `${attrName}: ${res.reason}` });
          }
        }
      }

      if (rowErrors.length > 0) {
        failedRows++;
        for (const e of rowErrors) {
          if (errors.length < MAX_ERRORS_STORED) errors.push(e);
        }
      }
    }

    // Cross-file: check for skuCode clashes against DB
    if (seenSkus.size > 0) {
      const existing = await prisma.sku.findMany({
        where: { tenantId: ctx.tenantId, skuCode: { in: [...seenSkus] }, deletedAt: null },
        select: { skuCode: true },
      });
      for (const e of existing) {
        if (errors.length < MAX_ERRORS_STORED) {
          errors.push({ row: 0, type: 'duplicate_in_db', message: `skuCode "${e.skuCode}" already exists` });
        }
        failedRows++;
      }
    }

    // Persist errors in batches
    if (errors.length > 0) {
      await prisma.importError.createMany({
        data: errors.map((e) => ({
          importId: ctx.importId,
          rowNumber: e.row,
          columnName: e.column,
          errorType: e.type,
          errorMessage: e.message,
        })),
      });
    }

    await prisma.dataImport.update({
      where: { id: ctx.importId },
      data: {
        status: failedRows > 0 ? 'validation_failed' : 'validated',
        totalRows: rowNumber,
        failedRows,
        errorSummary: { totalErrors: errors.length, truncated: errors.length >= MAX_ERRORS_STORED },
      },
    });
  } catch (err) {
    logger.error('validation crashed', { err, importId: ctx.importId });
    await prisma.dataImport.update({
      where: { id: ctx.importId },
      data: { status: 'failed', completedAt: new Date() },
    });
  }
}

// ------------------------------------------------------------------
// Process pass: inserts SKUs + attributes in batched transactions.
// ------------------------------------------------------------------

interface ProcessCtx {
  tenantId: string;
  importId: string;
  categoryId: string;
  userId: string;
  skipInvalid?: boolean;
}

export async function processImport(ctx: ProcessCtx): Promise<void> {
  const importRow = await prisma.dataImport.findUnique({ where: { id: ctx.importId } });
  if (!importRow) return;

  const mapping = ((importRow.metadata as { mapping?: ColumnMapping } | null)?.mapping) ?? {};
  const attrDefs = await loadAttributeDefs(ctx.tenantId, ctx.categoryId);

  await prisma.dataImport.update({
    where: { id: ctx.importId },
    data: { status: 'processing', processedRows: 0 },
  });

  let processed = 0;
  let failed = 0;
  let buffer: Record<string, string>[] = [];
  let rowNumber = 0;

  const flush = async () => {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    try {
      await prisma.$transaction(async (tx) => {
        for (const record of batch) {
          const skuCode = record[findCol(mapping, 'skuCode') ?? '']?.trim();
          const name = record[findCol(mapping, 'name') ?? '']?.trim();
          if (!skuCode || !name) {
            failed++;
            continue;
          }

          const sku = await tx.sku.create({
            data: {
              tenantId: ctx.tenantId,
              categoryId: ctx.categoryId,
              skuCode,
              name,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            },
          });

          const attrRows: {
            skuId: string;
            attributeId: string;
            value: string | null;
            valueNumber: number | null;
            valueDate: Date | null;
            valueJson: unknown;
          }[] = [];
          for (const [csvCol, target] of Object.entries(mapping)) {
            if (!target.startsWith('attr:')) continue;
            const def = attrDefs.get(target.slice(5));
            if (!def) continue;
            const raw = record[csvCol];
            if (raw == null || raw === '') continue;
            const res = coerce(raw, def.type);
            if (!res.ok) continue;
            const v = res.value;
            attrRows.push({
              skuId: sku.id,
              attributeId: def.id,
              value: typeof v === 'string' ? v : v == null ? null : String(v),
              valueNumber: typeof v === 'number' ? v : null,
              valueDate: v instanceof Date ? v : null,
              valueJson: typeof v === 'object' && !(v instanceof Date) ? v : null,
            });
          }
          if (attrRows.length > 0) {
            await tx.skuAttribute.createMany({ data: attrRows as never });
          }
          processed++;
        }
      });
    } catch (err) {
      logger.error('batch insert failed', { err, importId: ctx.importId });
      failed += batch.length;
      if (!ctx.skipInvalid) throw err;
    }

    await prisma.dataImport.update({
      where: { id: ctx.importId },
      data: { processedRows: processed, failedRows: failed },
    });
  };

  try {
    const parser = readStream(importRow.fileName).pipe(
      parse({ columns: true, trim: true, skip_empty_lines: true, bom: true })
    );
    for await (const rec of parser) {
      rowNumber++;
      buffer.push(rec as Record<string, string>);
      if (buffer.length >= CHUNK_SIZE) await flush();
    }
    await flush();

    await prisma.dataImport.update({
      where: { id: ctx.importId },
      data: { status: 'completed', completedAt: new Date(), totalRows: rowNumber },
    });
  } catch (err) {
    logger.error('processing crashed', { err, importId: ctx.importId });
    await prisma.dataImport.update({
      where: { id: ctx.importId },
      data: { status: 'failed', completedAt: new Date() },
    });
  }
}

// Fire-and-forget wrappers (in-process worker; swap to BullMQ in Phase 5).
export function queueValidate(ctx: ValidateCtx): void {
  setImmediate(() => {
    validateImport(ctx).catch((err) => logger.error('validateImport rejected', { err }));
  });
}

export function queueProcess(ctx: ProcessCtx): void {
  setImmediate(() => {
    processImport(ctx).catch((err) => logger.error('processImport rejected', { err }));
  });
}

function findCol(mapping: ColumnMapping, target: string): string | undefined {
  for (const [k, v] of Object.entries(mapping)) if (v === target) return k;
  return undefined;
}

/** Rule-based fuzzy mapping of CSV headers to target fields. */
export function suggestMapping(headers: string[]): ColumnMapping {
  const aliases: Record<string, string[]> = {
    skuCode: ['sku', 'sku code', 'sku_code', 'sku#', 'product code', 'code', 'item id', 'item_id'],
    name: ['name', 'product', 'product name', 'title', 'item name'],
    description: ['description', 'desc', 'details'],
    'pricing.price': ['price', 'retail price', 'cost', 'amount'],
    stockLevel: ['stock', 'inventory', 'qty', 'quantity', 'stock level'],
  };
  const result: ColumnMapping = {};
  for (const h of headers) {
    const norm = h.toLowerCase().trim();
    let matched = false;
    for (const [field, aka] of Object.entries(aliases)) {
      if (aka.includes(norm) || norm === field.toLowerCase()) {
        result[h] = field;
        matched = true;
        break;
      }
    }
    if (!matched) result[h] = `attr:${h}`;
  }
  return result;
}
