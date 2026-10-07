// SI SafeChat — embedding Web Worker. Runs the MiniLM model via
// @huggingface/transformers (ONNX/WASM, single-threaded so GitHub Pages
// needs no COOP/COEP headers). The model is cached by transformers.js
// (Cache API / IndexedDB) after the first download.

import { pipeline } from '@huggingface/transformers';
import { EMBEDDING_MODEL } from './config';

type InMsg =
  | { id: number; type: 'init' }
  | { id: number; type: 'embed'; texts: string[] };

type OutMsg =
  | { id: number; type: 'ready' }
  | { id: number; type: 'progress'; progress: number; text: string }
  | { id: number; type: 'result'; embeddings: number[][] }
  | { id: number; type: 'error'; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

async function ensureExtractor(onProgress: (p: number, t: string) => void) {
  if (extractor) return extractor;
  extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
    progress_callback: (info: Record<string, unknown>) => {
      if (info.status === 'progress' && typeof info.progress === 'number') {
        onProgress(
          Math.round((info.progress as number) * 100),
          `Setting up document understanding… ${Math.round((info.progress as number) * 100)}%`,
        );
      } else if (typeof info.status === 'string') {
        onProgress(-1, String(info.status));
      }
    },
  });
  return extractor;
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  const post = (m: OutMsg) => (self as unknown as Worker).postMessage(m);
  try {
    if (msg.type === 'init') {
      await ensureExtractor((progress, text) =>
        post({ id: msg.id, type: 'progress', progress, text }),
      );
      post({ id: msg.id, type: 'ready' });
      return;
    }
    if (msg.type === 'embed') {
      const ext = await ensureExtractor(() => undefined);
      const out = await ext(msg.texts, { pooling: 'mean', normalize: true });
      const embeddings: number[][] = out.tolist();
      post({ id: msg.id, type: 'result', embeddings });
      return;
    }
  } catch (err) {
    post({
      id: msg.id,
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
