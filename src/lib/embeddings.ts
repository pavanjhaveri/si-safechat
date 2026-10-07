// SI SafeChat — singleton client for the embedding worker. Batches texts,
// serializes requests, and surfaces init/embedding progress to the UI.

import { EMBED_BATCH_SIZE } from './config';

type ProgressCb = (done: number, total: number, label: string) => void;

interface Pending {
  resolve: (v: number[][]) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let msgId = 0;
const pending = new Map<number, Pending>();
let readyPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./embedding.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as { id: number; type: string } & Record<string, unknown>;
      if (msg.type === 'progress') {
        progressCb?.(-1, -1, String(msg.text ?? ''));
        return;
      }
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.type === 'error') p.reject(new Error(String(msg.error)));
      else p.resolve((msg.embeddings ?? msg) as number[][]);
    };
    worker.onerror = (e) => {
      console.error('Embedding worker error:', e);
    };
  }
  return worker;
}

let progressCb: ProgressCb | null = null;

function call<T>(type: 'init' | 'embed', payload: Record<string, unknown> = {}): Promise<T> {
  const w = getWorker();
  const id = ++msgId;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: number[][]) => void, reject });
    w.postMessage({ id, type, ...payload });
  });
}

/** Load the embedding model (downloads once, then cached). */
export function ensureEmbeddingsReady(onProgress?: ProgressCb): Promise<void> {
  if (!readyPromise) {
    progressCb = onProgress ?? null;
    readyPromise = call('init').then(() => undefined);
  } else if (onProgress) {
    progressCb = onProgress;
  }
  return readyPromise;
}

/** Embed texts in batches. Requires ensureEmbeddingsReady() first. */
export async function embedTexts(
  texts: string[],
  onProgress?: ProgressCb,
): Promise<number[][]> {
  await ensureEmbeddingsReady();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const embs = await call<number[][]>('embed', { texts: batch });
    out.push(...embs);
    onProgress?.(Math.min(i + batch.length, texts.length), texts.length, 'Embedding…');
  }
  return out;
}

export function isEmbeddingsReady(): boolean {
  return readyPromise !== null;
}
