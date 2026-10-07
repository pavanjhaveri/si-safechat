// SI SafeChat — Export / Import knowledge-base snapshots + lightweight
// hash-based share links (config only, never document content).

import type { Chunk } from './ingest';
import {
  EMBEDDING_MODEL,
  KB_EXPORT_VERSION,
} from './config';
import { replacePersistedChunks } from './store';

export interface KBSnapshot {
  app: 'si-safechat';
  version: number;
  embeddingModel: string;
  exportedAt: string;
  chunks: Chunk[];
}

export function buildSnapshot(chunks: Chunk[]): KBSnapshot {
  return {
    app: 'si-safechat',
    version: KB_EXPORT_VERSION,
    embeddingModel: EMBEDDING_MODEL,
    exportedAt: new Date().toISOString(),
    chunks,
  };
}

export function downloadSnapshot(chunks: Chunk[]): void {
  const blob = new Blob([JSON.stringify(buildSnapshot(chunks))], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `si-safechat-kb-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export interface ImportResult {
  chunks: number;
  modelMismatch: boolean;
  snapshotModel: string;
}

/** Validate + persist an imported snapshot. Caller rebuilds the index after. */
export async function importSnapshot(file: File): Promise<ImportResult> {
  const raw = await file.text();
  let snap: KBSnapshot;
  try {
    snap = JSON.parse(raw) as KBSnapshot;
  } catch {
    throw new Error('Not a valid SI SafeChat snapshot file.');
  }
  if (snap.app !== 'si-safechat' || !Array.isArray(snap.chunks)) {
    throw new Error('Not a valid SI SafeChat snapshot file.');
  }
  const modelMismatch = snap.embeddingModel !== EMBEDDING_MODEL;
  await replacePersistedChunks(snap.chunks);
  return { chunks: snap.chunks.length, modelMismatch, snapshotModel: snap.embeddingModel };
}

// --- Share links: /#config=<base64url JSON> (config only) ---

export interface ShareConfig {
  model: string;
  threshold: number;
  kbName: string;
}

function b64urlEncode(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode<T>(s: string): T {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(b64)) as T;
}

export function encodeShareLink(cfg: ShareConfig): string {
  return `${location.origin}${location.pathname}#config=${b64urlEncode(cfg)}`;
}

export function decodeShareLink(): ShareConfig | null {
  const m = /^#config=(.+)$/.exec(location.hash);
  if (!m) return null;
  try {
    const cfg = b64urlDecode<ShareConfig>(m[1]);
    if (typeof cfg.threshold === 'number' && typeof cfg.model === 'string') return cfg;
    return null;
  } catch {
    return null;
  }
}
