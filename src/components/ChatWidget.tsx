import { useEffect, useRef, useState } from 'react';
import { useApp, type PrivacyMode } from '../state';
import { APP_NAME } from '../lib/config';
import Chat from './Chat';
import SourcesPanel from './SourcesPanel';
import EvalPanel from './EvalPanel';

type Tab = 'chat' | 'sources' | 'eval';

const SEEN_KEY = 'si-safechat:widget-seen';

function PrivacyBadge({ mode }: { mode: PrivacyMode }) {
  const title =
    mode === 'local'
      ? 'LOCAL mode: everything runs on this device. No document content leaves your browser.'
      : 'NETWORK mode: you fetched a web page just now, which contacted that site directly. Parsing, embeddings and chat remain on-device.';
  return (
    <span className={`privacy-badge ${mode}`} title={title}>
      <span className="dot" />
      {mode === 'local' ? 'LOCAL' : 'NETWORK'}
    </span>
  );
}

export default function ChatWidget({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const privacyMode = useApp((s) => s.privacyMode);
  const expandChatSignal = useApp((s) => s.expandChatSignal);
  const [tab, setTab] = useState<Tab>('chat');
  const [pulsing, setPulsing] = useState(false);
  const firstSignal = useRef(true);

  // Expand + jump to Chat when a sample finishes loading.
  useEffect(() => {
    if (firstSignal.current) {
      firstSignal.current = false;
      return;
    }
    setTab('chat');
    onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandChatSignal]);

  // One-time attention pulse on the collapsed bubble for first-time visitors.
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setPulsing(true);
    } catch {
      /* ignore */
    }
  }, []);

  const handleOpen = () => {
    setPulsing(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    onOpen();
  };

  if (!open) {
    return (
      <button
        className={`fab${pulsing ? ' pulse' : ''}`}
        onClick={handleOpen}
        aria-label={`Open ${APP_NAME} chat`}
      >
        💬
      </button>
    );
  }

  return (
    <div className="widget-panel" role="dialog" aria-label={`${APP_NAME} chat`}>
      <div className="widget-header">
        <span className="widget-title">💬 {APP_NAME}</span>
        <PrivacyBadge mode={privacyMode} />
        <button className="widget-min" onClick={onClose} aria-label="Minimize chat">
          —
        </button>
      </div>
      <div className="widget-tabs">
        {(['chat', 'sources', 'eval'] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t === 'chat' ? 'Chat' : t === 'sources' ? 'Sources' : 'Eval'}
          </button>
        ))}
      </div>
      <div className="widget-body">
        {tab === 'chat' && <Chat />}
        {tab === 'sources' && <SourcesPanel />}
        {tab === 'eval' && <EvalPanel />}
      </div>
    </div>
  );
}
