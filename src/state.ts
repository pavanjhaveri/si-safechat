// SI SafeChat — central zustand store: sources, indexing pipeline,
// chat orchestration, eval, sharing, and settings.

import { create } from 'zustand';
import {
  chunksFromParsed,
  parseFiles,
  parsePasted,
  parseUrl,
  type Chunk,
  type ParsedDoc,
  type SourceKind,
} from './lib/ingest';
import { embedTexts, ensureEmbeddingsReady } from './lib/embeddings';
import { retrieve, NO_MATCH_MESSAGE } from './lib/retrieval';
import { buildGroundedPrompt } from './lib/prompt';
import {
  ensureEngine,
  isEngineReady,
  streamChat,
  supportsWebGPU,
  type LlmStatus,
} from './lib/llm';
import { vectorStore } from './lib/store';
import {
  DEFAULT_LLM_MODEL,
  DEFAULT_SIMILARITY_THRESHOLD,
  THRESHOLD_STORAGE_KEY,
} from './lib/config';
import { downloadSnapshot, importSnapshot } from './lib/sharing';
import { runEval, EVAL_QUESTIONS_V1, type EvalSummary } from './lib/eval';
import { classifyQuestion, INJECTION_REFUSAL } from './lib/guard';
import { generateSuggestions } from './lib/suggest';
import { SAMPLES, fetchSample } from './lib/samples';
import { trackEvent } from './lib/analytics';

export interface SourceMeta {
  id: string;
  name: string;
  kind: SourceKind;
  chunks: number;
  status: 'parsing' | 'embedding' | 'ready' | 'error';
  error?: string;
  /** True for bundled demo samples (shown with a badge). */
  sample?: boolean;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  citations?: { n: number; sourceName: string; page: number; score: number }[];
  noMatch?: boolean;
  streaming?: boolean;
}

export type PrivacyMode = 'local' | 'network';

interface AppState {
  initialized: boolean;
  webgpu: boolean | null;
  llmStatus: LlmStatus;
  llmProgress: number;
  llmProgressText: string;
  llmModel: string;
  sources: SourceMeta[];
  totalChunks: number;
  indexing: boolean;
  indexLabel: string;
  messages: ChatMessage[];
  busy: boolean;
  threshold: number;
  privacyMode: PrivacyMode;
  evalRunning: boolean;
  evalResult: EvalSummary | null;
  notice: string | null;
  suggestions: string[];
  /** Bumped to tell the widget: expand and switch to the Chat tab. */
  expandChatSignal: number;

  init: () => Promise<void>;
  generateChatbot: () => Promise<void>;
  ingestFiles: (files: File[]) => Promise<void>;
  ingestUrl: (url: string) => Promise<void>;
  ingestPaste: (text: string) => Promise<void>;
  ingestDocs: (docs: ParsedDoc[]) => Promise<void>;
  removeSource: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  ask: (question: string) => Promise<void>;
  setThreshold: (t: number) => void;
  runEvalHarness: () => Promise<void>;
  exportKB: () => Promise<void>;
  importKB: (file: File) => Promise<void>;
  dismissNotice: () => void;
  dismissSuggestions: () => void;
  loadSample: (id: string) => Promise<void>;
}

let msgSeq = 0;
let suggestSeq = 0; // guards against out-of-order suggestion refreshes

function loadThreshold(): number {
  try {
    const raw = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    const v = raw ? parseFloat(raw) : NaN;
    if (Number.isFinite(v) && v > 0 && v < 1) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_SIMILARITY_THRESHOLD;
}

export const useApp = create<AppState>((set, get) => ({
  initialized: false,
  webgpu: null,
  llmStatus: 'idle',
  llmProgress: 0,
  llmProgressText: '',
  llmModel: DEFAULT_LLM_MODEL,
  sources: [],
  totalChunks: 0,
  indexing: false,
  indexLabel: '',
  messages: [],
  busy: false,
  threshold: loadThreshold(),
  privacyMode: 'local',
  evalRunning: false,
  evalResult: null,
  notice: null,
  suggestions: [],
  expandChatSignal: 0,

  init: async () => {
    if (get().initialized) return;
    const gpu = supportsWebGPU();
    set({ webgpu: gpu, llmStatus: gpu ? 'idle' : 'unsupported', initialized: true });
    // Restore persisted KB into the in-memory index.
    const count = await vectorStore.load();
    if (count > 0) {
      const chunks = await vectorStore.allChunks();
      const bySource = new Map<string, SourceMeta>();
      for (const c of chunks) {
        const s = bySource.get(c.sourceId) ?? {
          id: c.sourceId,
          name: c.sourceName,
          kind: 'txt' as SourceKind,
          chunks: 0,
          status: 'ready' as const,
        };
        s.chunks += 1;
        bySource.set(c.sourceId, s);
      }
      set({ sources: [...bySource.values()], totalChunks: count });
      refreshSuggestions();
    }
  },

  generateChatbot: async () => {
    const { llmModel } = get();
    trackEvent('generate-chatbot');
    set({ llmStatus: 'downloading', llmProgress: 0, llmProgressText: 'Preparing…' });
    try {
      await ensureEngine(llmModel, (p, text) =>
        set({ llmProgress: p, llmProgressText: text }),
      );
      set({ llmStatus: 'ready', llmProgress: 100 });
      // Greet the user once the chatbot is ready — suggestions render as
      // chips under the composer (see Chat.tsx).
      const totalChunks = get().totalChunks;
      if (totalChunks > 0) {
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: ++msgSeq,
              role: 'assistant' as const,
              text: '✅ Your chatbot is ready! Ask me anything about your documents — or tap one of the suggestions below.',
            },
          ],
        }));
      }
    } catch (e) {
      set({
        llmStatus: 'error',
        notice: `Chatbot setup didn't finish: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  },

  ingestFiles: async (files: File[]) => {
    set({ indexing: true, indexLabel: 'Parsing documents…' });
    try {
      const docs = await parseFiles(files, 0);
      await get().ingestDocs(docs);
    } catch (e) {
      set({
        notice: e instanceof Error ? e.message : 'Import failed.',
        indexing: false,
        indexLabel: '',
      });
    }
  },

  ingestUrl: async (url: string) => {
    set({ indexing: true, indexLabel: 'Fetching page…', privacyMode: 'network' });
    try {
      const doc = await parseUrl(url);
      await get().ingestDocs([doc]);
    } catch (e) {
      set({
        notice: e instanceof Error ? e.message : 'URL import failed.',
        indexing: false,
        indexLabel: '',
        privacyMode: 'local',
      });
    }
  },

  ingestPaste: async (text: string) => {
    set({ indexing: true, indexLabel: 'Parsing pasted text…' });
    try {
      const doc = await parsePasted(text);
      await get().ingestDocs([doc]);
    } catch (e) {
      set({
        notice: e instanceof Error ? e.message : 'Import failed.',
        indexing: false,
        indexLabel: '',
      });
    }
  },

  // Internal: chunk → embed → index a batch of parsed docs.
  ingestDocs: async (docs: ParsedDoc[]) => {
    const setState = set;
    try {
      const withStatus: SourceMeta[] = docs.map((d) => ({
        id: d.sourceId,
        name: d.sourceName,
        kind: d.kind,
        chunks: 0,
        status: 'parsing',
      }));
      setState((s) => ({ sources: [...s.sources, ...withStatus] }));

      const allChunks: Chunk[] = [];
      for (const d of docs) {
        allChunks.push(...chunksFromParsed(d));
      }
      if (allChunks.length === 0) throw new Error('No text chunks produced.');

      setState({ indexLabel: 'Preparing document understanding…' });
      await ensureEmbeddingsReady((_d, _t, label) =>
        setState({ indexLabel: label || 'Preparing document understanding…' }),
      );

      setState({ indexLabel: `Embedding ${allChunks.length} chunks…` });
      const embeddings = await embedTexts(
        allChunks.map((c) => c.text),
        (done, total) =>
          setState({ indexLabel: `Embedding chunks… ${done}/${total}` }),
      );
      allChunks.forEach((c, i) => {
        c.embedding = embeddings[i];
      });

      setState({ indexLabel: 'Indexing…' });
      await vectorStore.addChunks(allChunks);

      setState((s) => {
        const counts = new Map<string, number>();
        for (const c of allChunks) counts.set(c.sourceId, (counts.get(c.sourceId) ?? 0) + 1);
        return {
          sources: s.sources.map((src) =>
            counts.has(src.id)
              ? { ...src, chunks: counts.get(src.id)!, status: 'ready' as const }
              : src,
          ),
          totalChunks: s.totalChunks + allChunks.length,
          indexing: false,
          indexLabel: '',
          privacyMode: 'local', // network touch (if any) is over; back to on-device
        };
      });
      refreshSuggestions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState((s) => ({
        sources: s.sources.map((src) =>
          src.status === 'parsing' ? { ...src, status: 'error' as const, error: msg } : src,
        ),
        indexing: false,
        indexLabel: '',
        notice: msg,
      }));
    }
  },

  removeSource: async (id: string) => {
    // MVP: rebuild index without the removed source's chunks.
    const remaining = (await vectorStore.allChunks()).filter((c) => c.sourceId !== id);
    const { replacePersistedChunks } = await import('./lib/store');
    await vectorStore.clear();
    await replacePersistedChunks(remaining);
    await vectorStore.load();
    set((s) => ({
      sources: s.sources.filter((src) => src.id !== id),
      totalChunks: remaining.length,
    }));
    refreshSuggestions();
  },

  clearAll: async () => {
    await vectorStore.clear();
    suggestSeq++; // invalidate any in-flight suggestion refresh
    set({ sources: [], totalChunks: 0, messages: [], evalResult: null, suggestions: [] });
  },

  ask: async (question: string) => {
    const q = question.trim();
    if (!q || get().busy) return;
    const { threshold, totalChunks, llmStatus } = get();
    const userMsg: ChatMessage = { id: ++msgSeq, role: 'user', text: q };
    set((s) => ({ messages: [...s.messages, userMsg], busy: true }));

    const pushAssistant = (m: Omit<ChatMessage, 'id' | 'role'>) => {
      const full: ChatMessage = { id: ++msgSeq, role: 'assistant', ...m };
      set((s) => ({ messages: [...s.messages, full] }));
      return full.id;
    };

    try {
      // Hard rule: prompt-injection attempts never reach retrieval or the LLM.
      if (classifyQuestion(q) === 'injection') {
        pushAssistant({ text: INJECTION_REFUSAL, noMatch: true });
        return;
      }
      if (totalChunks === 0) {
        pushAssistant({
          text: 'Load some documents first — drop files, add a URL, or paste text using the panel on the left.',
        });
        return;
      }
      const { matches, noMatch } = await retrieve(q, threshold);
      if (noMatch) {
        pushAssistant({ text: NO_MATCH_MESSAGE, noMatch: true });
        return;
      }
      if (llmStatus !== 'ready' || !isEngineReady()) {
        pushAssistant({
          text: 'Found relevant content, but your chatbot isn’t generated yet. Hit “✨ Generate my chatbot” in the Sources tab to get answers.',
          citations: matches.map((m, i) => ({
            n: i + 1,
            sourceName: m.chunk.sourceName,
            page: m.chunk.page,
            score: m.score,
          })),
        });
        return;
      }
      const { system, user } = buildGroundedPrompt(q, matches);
      const aid = pushAssistant({ text: '', streaming: true });
      let full = '';
      await streamChat(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        (token) => {
          full += token;
          set((s) => ({
            messages: s.messages.map((m) => (m.id === aid ? { ...m, text: full } : m)),
          }));
        },
      );
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === aid
            ? {
                ...m,
                streaming: false,
                citations: matches.map((mm, i) => ({
                  n: i + 1,
                  sourceName: mm.chunk.sourceName,
                  page: mm.chunk.page,
                  score: mm.score,
                })),
              }
            : m,
        ),
      }));
    } catch (e) {
      pushAssistant({
        text: `Something went wrong: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      set({ busy: false });
    }
  },

  setThreshold: (t: number) => {
    set({ threshold: t });
    try {
      localStorage.setItem(THRESHOLD_STORAGE_KEY, String(t));
    } catch {
      /* ignore */
    }
  },

  runEvalHarness: async () => {
    const { threshold, totalChunks } = get();
    if (totalChunks === 0) {
      set({ notice: 'Load the Stripe FAQ (or any documents) before running eval.' });
      return;
    }
    set({ evalRunning: true, evalResult: null });
    try {
      await ensureEmbeddingsReady();
      const summary = await runEval(EVAL_QUESTIONS_V1, threshold);
      set({ evalResult: summary });
    } catch (e) {
      set({ notice: `Eval failed: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      set({ evalRunning: false });
    }
  },

  exportKB: async () => {
    const chunks = await vectorStore.allChunks();
    if (chunks.length === 0) {
      set({ notice: 'Nothing to export yet.' });
      return;
    }
    downloadSnapshot(chunks);
  },

  importKB: async (file: File) => {
    set({ indexing: true, indexLabel: 'Importing snapshot…' });
    try {
      const { chunks: n, modelMismatch, snapshotModel } = await importSnapshot(file);
      await vectorStore.clear();
      const count = await vectorStore.load();
      const chunks = await vectorStore.allChunks();
      const bySource = new Map<string, SourceMeta>();
      for (const c of chunks) {
        const s = bySource.get(c.sourceId) ?? {
          id: c.sourceId,
          name: c.sourceName,
          kind: 'txt' as SourceKind,
          chunks: 0,
          status: 'ready' as const,
        };
        s.chunks += 1;
        bySource.set(c.sourceId, s);
      }
      set({
        sources: [...bySource.values()],
        totalChunks: count,
        indexing: false,
        indexLabel: '',
        notice: modelMismatch
          ? `Imported ${n} chunks, but the snapshot used a different embedding model (${snapshotModel}). Scores may be off until re-imported with matching embeddings.`
          : `Imported ${n} chunks.`,
      });
      refreshSuggestions();
    } catch (e) {
      set({
        indexing: false,
        indexLabel: '',
        notice: e instanceof Error ? e.message : 'Import failed.',
      });
    }
  },

  dismissNotice: () => set({ notice: null }),

  dismissSuggestions: () => set({ suggestions: [] }),

  /** Load a bundled demo sample through the normal ingest pipeline. */
  loadSample: async (id: string) => {
    const def = SAMPLES.find((s) => s.id === id);
    if (!def) {
      set({ notice: 'Unknown sample.' });
      return;
    }
    // Skip if this sample is already loaded.
    if (get().sources.some((s) => s.sample && s.name === def.sourceName)) {
      set((s) => ({ expandChatSignal: s.expandChatSignal + 1 }));
      return;
    }
    set({ indexing: true, indexLabel: `Loading ${def.title}…` });
    try {
      const doc = await fetchSample(def);
      await get().ingestDocs([doc]);
      set((s) => ({
        sources: s.sources.map((src) =>
          src.id === doc.sourceId ? { ...src, sample: true } : src,
        ),
        indexing: false,
        indexLabel: '',
        expandChatSignal: s.expandChatSignal + 1,
      }));
    } catch (e) {
      set({
        indexing: false,
        indexLabel: '',
        notice: e instanceof Error ? e.message : 'Sample failed to load.',
      });
    }
  },
}));

/** Recompute suggested prompts from the current KB. Fire-and-forget. */
function refreshSuggestions() {
  const my = ++suggestSeq;
  void (async () => {
    try {
      const chunks = await vectorStore.allChunks();
      const s = await generateSuggestions(chunks);
      if (my === suggestSeq) useApp.setState({ suggestions: s });
    } catch {
      /* suggestions are best-effort */
    }
  })();
}
