import { useRef, useState } from 'react';
import { useApp } from '../state';
import { SAMPLES } from '../lib/samples';
import Dropzone from './Dropzone';
import Transparency from './Transparency';

/** Knowledge-base controls, chatbot setup, and backup — lives inside the chat widget. */
export default function SourcesPanel() {
  const sources = useApp((s) => s.sources);
  const totalChunks = useApp((s) => s.totalChunks);
  const indexing = useApp((s) => s.indexing);
  const indexLabel = useApp((s) => s.indexLabel);
  const ingestUrl = useApp((s) => s.ingestUrl);
  const ingestPaste = useApp((s) => s.ingestPaste);
  const removeSource = useApp((s) => s.removeSource);
  const clearAll = useApp((s) => s.clearAll);
  const exportKB = useApp((s) => s.exportKB);
  const importKB = useApp((s) => s.importKB);
  const llmStatus = useApp((s) => s.llmStatus);
  const llmProgress = useApp((s) => s.llmProgress);
  const llmProgressText = useApp((s) => s.llmProgressText);
  const generateChatbot = useApp((s) => s.generateChatbot);
  const webgpu = useApp((s) => s.webgpu);
  const notice = useApp((s) => s.notice);
  const dismissNotice = useApp((s) => s.dismissNotice);
  const loadSample = useApp((s) => s.loadSample);

  const [url, setUrl] = useState('');
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  return (
    <div className="widget-scroll">
      {notice && (
        <div className="notice">
          <span>{notice}</span>
          <button onClick={dismissNotice} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="side-section">
        <h3>Your chatbot</h3>
        {llmStatus === 'ready' ? (
          <div style={{ fontSize: 13 }}>✅ Your chatbot is ready — ask away.</div>
        ) : llmStatus === 'downloading' ? (
          <div className="stack">
            <div className="progress">
              <div style={{ width: `${llmProgress}%` }} />
            </div>
            <div className="progress-label">✨ Generating your chatbot… {llmProgress}%</div>
            {llmProgressText && llmProgressText !== 'Preparing…' && (
              <div style={{ fontSize: 11, opacity: 0.65 }}>{llmProgressText}</div>
            )}
          </div>
        ) : llmStatus === 'unsupported' ? (
          <div style={{ fontSize: 13 }}>
            ⚠️ This device/browser has no WebGPU, so on-device chat isn’t available
            here. Try desktop Chrome or Edge. A cloud fallback is coming in a later
            update.
          </div>
        ) : llmStatus === 'error' ? (
          <div className="stack">
            <div style={{ fontSize: 13 }}>Chatbot setup didn’t finish.</div>
            <button onClick={() => void generateChatbot()}>Retry setup</button>
          </div>
        ) : (
          <div className="stack">
            <div style={{ fontSize: 13 }}>
              Set up your on-device chatbot (one-time setup, ~1GB — WiFi
              recommended). Your documents stay on this device.
            </div>
            <button
              className="accent"
              disabled={webgpu !== true}
              onClick={() => void generateChatbot()}
            >
              ✨ Generate my chatbot
            </button>
          </div>
        )}
      </div>

      <div className="side-section">
        <h3>Try a sample</h3>
        <div className="stack">
          <div style={{ fontSize: 13 }}>
            No documents handy? Load a demo pack — same pipeline, still
            on-device.
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                disabled={indexing}
                onClick={() => void loadSample(s.id)}
                title={s.blurb}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="side-section">
        <h3>Knowledge base {totalChunks > 0 && `· ${totalChunks} chunks`}</h3>
        <div className="stack">
          <Dropzone />
          {indexing && (
            <>
              <div className="progress">
                <div style={{ width: '100%' }} />
              </div>
              <div className="progress-label">{indexLabel}</div>
            </>
          )}
          <div className="row">
            <input
              type="url"
              placeholder="https://… article URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim()) {
                  void ingestUrl(url);
                  setUrl('');
                }
              }}
            />
            <button
              disabled={!url.trim() || indexing}
              onClick={() => {
                void ingestUrl(url);
                setUrl('');
              }}
            >
              Add
            </button>
          </div>
          {!showPaste ? (
            <button onClick={() => setShowPaste(true)}>Paste text instead</button>
          ) : (
            <div className="stack">
              <textarea
                placeholder="Paste article text or HTML here…"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
              />
              <div className="row">
                <button
                  className="primary"
                  disabled={!paste.trim() || indexing}
                  onClick={() => {
                    void ingestPaste(paste);
                    setPaste('');
                    setShowPaste(false);
                  }}
                >
                  Import text
                </button>
                <button onClick={() => setShowPaste(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {sources.length > 0 && (
        <div className="side-section">
          <h3>Sources</h3>
          <ul className="source-list">
            {sources.map((s) => (
              <li key={s.id}>
                <span
                  className={`status-dot ${s.status === 'ready' ? 'ready' : s.status === 'error' ? 'error' : 'working'}`}
                />
                <span className="name" title={s.name}>
                  {s.name}
                </span>
                {s.sample && (
                  <span
                    className="sample-badge"
                    title="Bundled demo content"
                    style={{
                      fontSize: 10,
                      border: '1px solid var(--line)',
                      borderRadius: 999,
                      padding: '1px 8px',
                      color: 'var(--muted)',
                    }}
                  >
                    SAMPLE
                  </span>
                )}
                <span className="meta">
                  {s.status === 'ready' ? `${s.chunks} chunks` : s.status}
                </span>
                <button
                  className="rm"
                  aria-label={`Remove ${s.name}`}
                  onClick={() => void removeSource(s.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="danger-ghost" onClick={() => void clearAll()}>
              Clear all
            </button>
          </div>
        </div>
      )}

      <div className="side-section">
        <h3>Backup</h3>
        <div className="row">
          <button onClick={() => void exportKB()}>Export KB</button>
          <button onClick={() => importRef.current?.click()}>Import KB</button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importKB(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <Transparency />
    </div>
  );
}
