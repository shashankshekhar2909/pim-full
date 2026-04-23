import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Readable } from 'node:stream';

const ROOT = resolve(process.env.UPLOAD_DIR ?? './uploads');

export async function ensureRoot(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
}

export function tenantKey(tenantId: string, filename: string): string {
  return join(tenantId, filename);
}

export async function writeFile(key: string, buffer: Buffer): Promise<string> {
  await ensureRoot();
  const full = join(ROOT, key);
  await fs.mkdir(join(ROOT, key, '..'), { recursive: true });
  await fs.writeFile(full, buffer);
  return full;
}

export function readStream(key: string): Readable {
  return createReadStream(join(ROOT, key));
}

export async function removeFile(key: string): Promise<void> {
  await fs.unlink(join(ROOT, key)).catch(() => undefined);
}

export { createWriteStream };
