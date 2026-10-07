import { useEffect, useState } from 'react';
import { useApp, type PrivacyMode } from './state';
import { APP_NAME } from './lib/config';
import { decodeShareLink } from './lib/sharing';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import EvalPanel from './components/EvalPanel';

function useHashRoute(): string {
  const [hash, setHash] = useState(() => location.hash || '#/chat');
  useEffect(() => {
    const onChange = () => setHash(location.hash || '#/chat');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  // Ignore #config= share links for routing purposes.
  if (hash.startsWith('#config=')) return '#/chat';
  return hash.startsWith('#/eval') ? '#/eval' : '#/chat';
}

function PrivacyBadge({ mode }: { mode: PrivacyMode }) {
  const title =
    mode === 'local'
      ? 'LOCAL mode: everything runs on this device. No document content leaves your browser.'
      : 'NETWORK mode: you fetched a web page just now, which contacted that site directly. Parsing, embeddings and chat remain on-device.';
  return (
    <span className={`privacy-badge ${mode}`} title={title}>
      <span className="dot" />
      {mode === 'local' ? 'LOCAL · 100% on-device' : 'NETWORK · page fetched'}
    </span>
  );
}

function ThresholdFooter() {
  const threshold = useApp((s) => s.threshold);
  return <code>threshold {threshold.toFixed(2)}</code>;
}

export default function App() {
  const route = useHashRoute();
  const init = useApp((s) => s.init);
  const privacyMode = useApp((s) => s.privacyMode);
  const setThreshold = useApp((s) => s.setThreshold);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    void init();
    // Apply shared config links (#config=...).
    const cfg = decodeShareLink();
    if (cfg) {
      setThreshold(cfg.threshold);
      history.replaceState(null, '', '#/chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <header className="topbar">
        <button
          className="menu-btn"
          aria-label="Open panel"
          onClick={() => setDrawer(true)}
        >
          ☰
        </button>
        <div className="brand">
          {APP_NAME}
          <small>private RAG · zero servers</small>
        </div>
        <PrivacyBadge mode={privacyMode} />
      </header>

      <div className="layout">
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
        <aside className={`sidebar${drawer ? ' open' : ''}`}>
          <Sidebar onNavigate={() => setDrawer(false)} />
        </aside>
        <div className="main">
          <nav className="nav">
            <a href="#/chat" className={route === '#/chat' ? 'active' : ''}>
              Chat
            </a>
            <a href="#/eval" className={route === '#/eval' ? 'active' : ''}>
              Eval
            </a>
          </nav>
          {route === '#/eval' ? <EvalPanel /> : <Chat />}
          <div className="footer">
            {APP_NAME} · embeddings + chat run entirely in your browser ·{' '}
            <ThresholdFooter />
          </div>
        </div>
      </div>
    </>
  );
}
