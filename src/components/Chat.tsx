import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state';

export default function Chat() {
  const messages = useApp((s) => s.messages);
  const busy = useApp((s) => s.busy);
  const ask = useApp((s) => s.ask);
  const totalChunks = useApp((s) => s.totalChunks);
  const llmStatus = useApp((s) => s.llmStatus);
  const suggestions = useApp((s) => s.suggestions);
  const dismissSuggestions = useApp((s) => s.dismissSuggestions);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = () => {
    if (!input.trim() || busy) return;
    void ask(input);
    setInput('');
  };

  return (
    <div className="chat-wrap">
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-hero">
            <h2>Chat with your documents</h2>
            {totalChunks === 0 ? (
              <p>
                Add sources from the Sources tab — drop files, paste a URL, or paste
                text. Then ask anything answerable from them.
              </p>
            ) : llmStatus !== 'ready' ? (
              <p>
                {totalChunks} chunks indexed. Generate your chatbot from the
                Sources tab to start getting answers.
              </p>
            ) : (
              <p>
                {totalChunks} chunks indexed and the model is ready. Ask away —
                answers come only from your content, with citations.
              </p>
            )}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`msg ${m.role}${m.noMatch ? ' no-match' : ''}${m.streaming ? ' caret' : ''}`}
          >
            {m.text || (m.streaming ? ' ' : '')}
            {m.citations && m.citations.length > 0 && (
              <div className="citations">
                {m.citations.map((c) => (
                  <span
                    key={c.n}
                    className="cite"
                    title={`${c.sourceName}${c.page > 1 ? ` · page ${c.page}` : ''} · score ${c.score.toFixed(2)}`}
                  >
                    [{c.n}] {c.sourceName.length > 28 ? c.sourceName.slice(0, 28) + '…' : c.sourceName}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="composer">
        {suggestions.length > 0 && !busy && (
          <div className="suggest-row">
            <div className="suggest-chips">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="suggest-chip"
                  title={s}
                  onClick={() => {
                    void ask(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              className="suggest-x"
              onClick={dismissSuggestions}
              aria-label="Dismiss suggestions"
            >
              ✕
            </button>
          </div>
        )}
        <div className="row">
          <input
            type="text"
            placeholder={
              totalChunks === 0
                ? 'Add documents first…'
                : 'Ask about your documents…'
            }
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button className="primary" disabled={busy || !input.trim()} onClick={submit}>
            {busy ? '…' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
}
