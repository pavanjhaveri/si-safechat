// SI SafeChat — central configuration. Every tunable lives here and is
// surfaced in the Transparency panel (Pavan's requirement).

export const APP_NAME = 'SI SafeChat';

// --- Embeddings (Web Worker, @huggingface/transformers, ONNX/WASM) ---
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIMS = 384;
export const EMBED_BATCH_SIZE = 32;

// --- Chunking (starting guesses; tuned by the eval harness) ---
export const CHUNK_SIZE = 500; // characters
export const CHUNK_OVERLAP = 100; // characters

// --- Retrieval ---
export const TOP_K = 5;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.65;
export const NO_MATCH_MESSAGE =
  'No matching information found in the loaded content.';

// --- Local LLM (WebGPU, @mlc-ai/web-llm; weights cached in Cache API) ---
export const DEFAULT_LLM_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
export const LITE_LLM_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
export const LLM_TEMPERATURE = 0.2; // low: grounded answers, less creativity

// --- Corpus guards (moderate-corpus MVP target) ---
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB per knowledge base
export const MAX_ZIP_ENTRIES = 200;

export const SUPPORTED_EXTENSIONS = ['txt', 'md', 'pdf', 'docx', 'zip'] as const;

export const KB_IDB_NAME = 'si-safechat';
export const KB_IDB_STORE = 'kb';
export const KB_CHUNKS_KEY = 'chunks-v1';
export const KB_META_KEY = 'meta-v1';
export const KB_EXPORT_VERSION = 1;

export const THRESHOLD_STORAGE_KEY = 'si-safechat:threshold';
