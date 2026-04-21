import { v4 as uuidv4 } from 'uuid';
import type { PaginatedResult, PaginationParams } from '@pim/types';

// ============================================================
// ID Generation
// ============================================================

/**
 * Generates a new UUID v4
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Checks whether a string is a valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ============================================================
// Date Utilities
// ============================================================

/**
 * Returns the current date/time as an ISO 8601 string
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Formats a Date or ISO string to a human-readable locale string.
 * Falls back to a safe empty string on invalid input.
 */
export function formatDate(
  value: Date | string | null | undefined,
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(locale, options).format(new Date(value));
  } catch {
    return '';
  }
}

/**
 * Formats a date as a relative time string ("2 days ago", "in 3 hours", etc.)
 */
export function formatRelativeTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  try {
    const date = new Date(value);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
    if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
    if (Math.abs(diffDay) < 365) return rtf.format(Math.round(diffDay / 30), 'month');
    return rtf.format(Math.round(diffDay / 365), 'year');
  } catch {
    return '';
  }
}

// ============================================================
// String Utilities
// ============================================================

/**
 * Converts a string to a URL-friendly slug.
 * e.g. "Hello World!" -> "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Truncates a string to a given length, appending an ellipsis if needed.
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Converts a camelCase or PascalCase string to Title Case with spaces.
 * e.g. "skuCode" -> "Sku Code"
 */
export function camelToTitleCase(text: string): string {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// ============================================================
// Number & Currency Utilities
// ============================================================

/**
 * Formats a number as a currency string.
 * e.g. formatCurrency(1234.5, 'USD') -> "$1,234.50"
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats a number with locale-aware thousands separator.
 */
export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

// ============================================================
// Pagination Utilities
// ============================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  offset: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Computes pagination metadata from raw params.
 */
export function computePagination(params: PaginationParams, total: number): PaginationMeta {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Wraps an array of items into a standard paginated result shape.
 */
export function toPaginatedResult<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const meta = computePagination(params, total);
  return {
    items,
    total,
    page: meta.page,
    limit: meta.limit,
    totalPages: meta.totalPages,
  };
}

// ============================================================
// Object Utilities
// ============================================================

/**
 * Removes all keys with undefined or null values from an object (shallow).
 */
export function omitNullish<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<T>;
}

/**
 * Deep-clones a plain JSON-serialisable object.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Picks specific keys from an object.
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omits specific keys from an object.
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

// ============================================================
// Array Utilities
// ============================================================

/**
 * Chunks an array into batches of a given size.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Returns unique values from an array using a key selector.
 */
export function uniqueBy<T>(arr: T[], keyFn: (item: T) => unknown): T[] {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================
// Validation Utilities
// ============================================================

/**
 * Checks if a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a value is a valid email address.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if a value is a valid URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Error Utilities
// ============================================================

/**
 * Extracts a readable error message from unknown thrown values.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}
