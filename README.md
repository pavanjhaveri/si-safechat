# SI SafeChat

A **100% serverless, privacy-first chatbot** that answers questions **only from
your documents** — running entirely in the browser. No backend, no vector
database service, no API keys, no telemetry. Static hosting on GitHub Pages: **$0**.

Live: `https://pavanjhaveri.github.io/si-safechat/`

## How it works

```
Drop .pdf / .docx / .txt / .md / .zip, a URL, or pasted text
  → parse in memory (pdf.js, mammoth, JSZip, Readability)
  → chunk (~500 chars, sentence-aware) + embed (MiniLM-L6-v2, Web Worker, WASM)
  → Orama vector index in IndexedDB
  → ask: embed question → cosine top-5 → keep score > 0.65
      → nothing passes: "No matching information found in the loaded content."
         (the LLM is never even called)
      → matches: strict grounded prompt → Llama-3.2-1B on WebGPU, streamed,
         with [1][2] citations
```

## Privacy model

- **LOCAL (green badge):** parse → embed → retrieve → generate, all on-device.
  Zero document content leaves the browser. Model downloads fetch public
  weights from a CDN — no user data.
- **NETWORK (amber badge):** shown while you fetch a web page (contacts that
  site directly). There is **no CORS proxy** — blocked pages fall back to
  paste. Parsing, embeddings, and chat stay on-device regardless.

## Stack

| Layer | Tech |
|---|---|
| App | React + Vite + TypeScript, hash routing |
| Parsing | pdf.js, mammoth, JSZip, Mozilla Readability |
| Embeddings | `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`), Web Worker |
| Vector DB | `@orama/orama` vector search, persisted in IndexedDB via `idb` |
| LLM | `@mlc-ai/web-llm` (`Llama-3.2-1B-Instruct-q4f16_1-MLC`), weights in Cache API |
| State | zustand |

## Develop

```bash
npm install
npm run dev      # local dev
npm run build    # typecheck + production build (must be clean before push)
```

Pushing to `main` deploys to GitHub Pages via Actions (repo Settings → Pages →
Source: **GitHub Actions**).

## Verification notes

- transformers.js auto-falls-back to single-threaded WASM when the page lacks
  COOP/COEP headers (GitHub Pages can't send them) — no special server config.
- WebGPU is required for on-device chat (desktop Chrome/Edge). Devices without
  it get a clear notice; a cloud BYO-key fallback is planned, not yet built.
- The `Eval` tab runs the 15-question Stripe FAQ set through retrieval to tune
  the 0.65 similarity threshold empirically.

## Docs

- [SPEC.md](SPEC.md) — Phase 1 spec
- [eval-questions.md](eval-questions.md) — eval question set
