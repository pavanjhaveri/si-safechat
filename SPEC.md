# SI SafeChat — Phase 1 Spec (MVP)

**Status:** approved 2026-10-07 · **Mode:** plan + build authorized
**Product:** 100% serverless, privacy-first in-browser RAG chatbot.
**Hosting:** $0 — static SPA on GitHub Pages (`pavanjhaveri/si-safechat`).
**Name:** SI SafeChat.

## 1. Locked decisions

| Decision | Value |
|---|---|
| Default local LLM | Llama-3.2-1B-Instruct via `@mlc-ai/web-llm` (WebGPU); Qwen2.5-0.5B-Instruct as "Lite mode" |
| Embeddings | `@huggingface/transformers`, `Xenova/all-MiniLM-L6-v2`, ONNX/WASM, in a Web Worker |
| Vector store | Orama (vector search) in IndexedDB, behind a `VectorStore` adapter interface |
| Chunking | ~500 chars, 50–100 char overlap, sentence-boundary-aware (starting guesses) |
| Similarity threshold | 0.65 cosine similarity (starting guess; tuned by calibration harness) |
| Retrieval | top-k = 5, threshold filter, short-circuit below threshold |
| Knowledge bases | Single KB for MVP |
| URL import | Direct `fetch` only (CORS-enabled sites); paste-raw-HTML/text fallback. **No CORS proxy** (privacy) |
| Cloud fallback | **PAUSED** — OpenAI BYO deferred until Pavan sets up a key; MVP is local-only; provider interface reserved |
| Platforms | Desktop + mobile responsive; capability detection routes no-WebGPU devices to a "local AI unavailable" notice (cloud fallback lands later) |
| Corpus target | ~50MB per KB, low thousands of chunks; per-file (~10MB) and total caps with graceful errors |
| Transparency | Expanded on-page section showing embedding model, chunk params, threshold, LLM model, privacy mode |

## 2. Privacy model (visible in UI)

- **LOCAL (green):** parse → chunk → embed → retrieve → generate. Zero user data leaves the device. Model-weight downloads fetch public weights from CDN (no user data).
- **NETWORK (amber):** user-initiated URL fetch (contacts the target site directly), model CDN download. Never: third-party proxies, analytics, telemetry, key exfiltration.
- The privacy badge in the header always shows the current mode and what it means.

## 3. Data flow

```
File/URL/paste
  → parse (main thread, in-memory; JSZip / pdf.js / mammoth / Readability)
  → normalize + chunk (500c, overlap 50–100, sentence-aware) + metadata {id, sourceId, sourceName, page?, ordinal}
  → embed (Web Worker, MiniLM-L6-v2, batched, progress events; model cached by transformers.js)
  → Orama vector index in IndexedDB (one collection = the single KB)
  → query: embed question → cosine top-5 → keep score > 0.65
      → none pass: "No matching information found in the loaded content." (no LLM call)
      → some pass: grounded prompt (system constraints + cited chunks + question)
          → WebLLM streaming (Llama-3.2-1B, weights in Cache API) → rendered answer with [chunk] citations
```

## 4. Module map (src/)

- `lib/config.ts` — model IDs, chunk params, threshold, caps, constants.
- `lib/ingest.ts` — `parseFile(file): ParsedDoc[]`, `parseUrl(url)`, `parsePastedText()`, zip recursion, per-file errors.
- `lib/embedding.worker.ts` — transformers.js pipeline; messages: `init` / `embed(texts)` / progress.
- `lib/embeddings.ts` — worker singleton client, batching, readiness state.
- `lib/store.ts` — `VectorStore` interface; `OramaVectorStore`; IndexedDB persistence via Orama save/load; `BruteForceVectorStore` fallback kept in code.
- `lib/retrieval.ts` — `retrieve(question)`: embed → top-k → threshold filter → `RetrievalResult`; `NO_MATCH_MESSAGE` constant.
- `lib/prompt.ts` — grounded system prompt builder with citation format.
- `lib/llm.ts` — WebLLM engine singleton: `ensureEngine(modelId, onProgress)`, `streamAnswer(messages, onToken)`, capability check `supportsWebGPU()`.
- `lib/sharing.ts` — `exportKB()` (JSON snapshot download), `importKB(file)` (rehydrate + embedding-version check), `encodeShareLink(config)` / `decodeShareLink()` (`/#config=...`, config only).
- `lib/eval.ts` — `runEval(questions)`: embed → retrieve per question, report top score, pass/fail vs threshold, no-match rate. Feeds threshold tuning.
- `state.ts` — zustand store: sources, chunks count, embedding progress, chat messages, llm status, privacy mode, threshold (editable in transparency panel).
- `components/` — `Dropzone`, `Chat`, `Sidebar` (sources, privacy badge, export/import), `Transparency` (expanded section), `EvalPanel`, `UrlImporter`, `PasteImporter`.
- `App.tsx` — hash routing (`#/chat`, `#/eval`), layout, capability detection on startup.
- `main.tsx`, `index.css` (responsive, mobile-first chat layout).

## 5. Key behaviors

- **Onboarding:** first run → capability check → if WebGPU: offer "Download AI model (~1GB, WiFi recommended)" with progress; if no WebGPU: notice that on-device chat needs WebGPU (desktop Chrome/Edge) and cloud fallback is coming.
- **Ingest UX:** drag-drop zone + file picker + URL box + paste box; per-file status (parsing → chunking → embedding → indexed); global progress bar; errors shown per file, never silent.
- **Chat UX:** streaming tokens, citation chips `[1] [2]` mapping to source/position, "no match" path renders without LLM; empty states for no-sources and model-not-loaded.
- **Threshold editable** in the Transparency panel (persisted to localStorage); eval panel re-runs show pass/fail movement.
- **Export/Import:** JSON snapshot `{version, embeddingModel, chunks[], embeddings[][], meta}`; import validates `embeddingModel` and warns (offers re-embed) on mismatch.
- **Share link:** `#config=` carries `{model, threshold, kbName}` only — documented as config-only, not documents.

## 6. Eval harness (Phase 1)

`EvalPanel` runs `eval-questions.md` set (13 grounded + 2 unanswerable probes):
- Per question: top-1 cosine score, pass/fail vs current threshold, retrieved chunk IDs.
- Summary: pass rate, no-match rate, score distribution hints for tuning 0.65.
- No LLM needed for retrieval-eval (fast, deterministic); generation faithfulness spot-checks are manual in Phase 1.

## 7. Build & deploy

- `vite.config.ts`: `base: '/si-safechat/'`; pdf.js worker via `?url` import; transformers single-threaded WASM (no COOP/COEP needed on Pages).
- `.github/workflows/deploy.yml`: build on push to `main` → upload Pages artifact → deploy. (Pavan enables Pages → Source: GitHub Actions in repo settings; token lacks Pages scope.)
- `npm run build` must pass `tsc` + `vite build` with zero errors before push.

## 8. Non-goals (Phase 1)

Multi-KB switching, OpenAI/Groq/Gemini BYO, CORS proxy, large-corpus mode (>50MB), grounded-vs-ungrounded demo (Phase 2), user accounts, any server component.

## 9. Definition of done (MVP)

1. Drop the Stripe FAQ (URL import) → ask a grounded question → cited streamed answer.
2. Ask an unanswerable question → exact no-match message, zero LLM call.
3. Reload → KB, model cache, and threshold persist.
4. Fresh browser → onboarding → model download → chat works, no backend.
5. Mobile layout usable; no-WebGPU device shows the notice path.
6. `npm run build` clean; deployed URL live on GitHub Pages.
