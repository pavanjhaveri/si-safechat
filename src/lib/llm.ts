// SI SafeChat — WebGPU LLM engine via @mlc-ai/web-llm. Model weights are
// cached in the browser Cache API after first setup. Cloud fallback
// (BYO API key) is PAUSED for Phase 1 — the provider interface is reserved.

import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm';
import { DEFAULT_LLM_MODEL, LLM_TEMPERATURE } from './config';

export type LlmStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'unsupported';

let engine: MLCEngine | null = null;
let engineModel: string | null = null;
let initPromise: Promise<MLCEngine> | null = null;

export function supportsWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
}

/** First-time setup + initialize the model, with progress 0..100. */
export function ensureEngine(
  modelId: string = DEFAULT_LLM_MODEL,
  onProgress?: (progress: number, text: string) => void,
): Promise<MLCEngine> {
  if (engine && engineModel === modelId) return Promise.resolve(engine);
  if (initPromise && engineModel === modelId) return initPromise;

  engineModel = modelId;
  initPromise = (async () => {
    const e = await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        onProgress?.(Math.round(report.progress * 100), report.text);
      },
    });
    engine = e;
    return e;
  })();
  return initPromise;
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Stream the assistant reply token-by-token. */
export async function streamChat(
  messages: ChatMsg[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!engine) throw new Error('LLM engine not initialized.');
  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: LLM_TEMPERATURE,
  });
  let full = '';
  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      full += delta;
      onToken(delta);
    }
  }
  return full;
}

export function isEngineReady(): boolean {
  return engine !== null;
}
