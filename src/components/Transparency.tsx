import { useState } from 'react';
import { useApp } from '../state';
import {
  APP_NAME,
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  DEFAULT_SIMILARITY_THRESHOLD,
  EMBEDDING_MODEL,
  TOP_K,
} from '../lib/config';
import { encodeShareLink } from '../lib/sharing';

export default function Transparency() {
  const threshold = useApp((s) => s.threshold);
  const setThreshold = useApp((s) => s.setThreshold);
  const llmModel = useApp((s) => s.llmModel);
  const privacyMode = useApp((s) => s.privacyMode);
  const [copied, setCopied] = useState(false);

  const share = () => {
    const link = encodeShareLink({ model: llmModel, threshold, kbName: 'default' });
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <details className="transparency">
      <summary>🔍 How {APP_NAME} works</summary>
      <div className="body">
        <div>
          Everything runs in your browser. Documents are parsed in memory, turned
          into vector embeddings by a local AI model, stored in an on-device
          vector index, and answered by an on-device language model. In{' '}
          <b>LOCAL</b> mode no document content ever leaves this device.
        </div>
        <dl className="kv">
          <dt>Embedding model</dt>
          <dd>{EMBEDDING_MODEL}</dd>
          <dt>Chunk size</dt>
          <dd>
            {CHUNK_SIZE} chars, {CHUNK_OVERLAP} overlap, sentence-aware
          </dd>
          <dt>Retrieval</dt>
          <dd>
            top-{TOP_K} cosine similarity via Orama (IndexedDB)
          </dd>
          <dt>Chat model</dt>
          <dd>{llmModel} (WebGPU)</dd>
          <dt>Privacy mode</dt>
          <dd>{privacyMode.toUpperCase()}</dd>
          <dt>Analytics</dt>
          <dd>
            GoatCounter: anonymous pageviews + a payload-free
            “generate-chatbot” event. No cookies, no personal data, no document
            content — ever.
          </dd>
        </dl>
        <div>
          <label htmlFor="threshold">
            <b>Similarity threshold</b> — answers require a chunk scoring above
            this; below it you get “No matching information found.”
          </label>
          <div className="threshold-row">
            <input
              id="threshold"
              type="range"
              min={0.3}
              max={0.95}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
            />
            <output>{threshold.toFixed(2)}</output>
          </div>
          <div style={{ fontSize: 12 }}>
            Default {DEFAULT_SIMILARITY_THRESHOLD.toFixed(2)}. Tune it with the
            Eval tab, then re-run to see pass/fail move.
          </div>
        </div>
        <div>
          <button onClick={share}>{copied ? 'Link copied ✓' : 'Copy share link (config only)'}</button>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            Share links carry settings only — never your documents.
          </div>
        </div>
      </div>
    </details>
  );
}
