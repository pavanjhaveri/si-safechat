import { useState } from 'react';
import { useApp, type PrivacyMode } from '../state';
import { APP_NAME } from '../lib/config';
import Chat from './Chat';
import SourcesPanel from './SourcesPanel';
import EvalPanel from './EvalPanel';

type Tab = 'chat' | 'sources' | 'eval';

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
  const [tab, setTab] = useState<Tab>('chat');

  if (!open) {
    return (
      <button className="fab" onClick={onOpen} aria-label={`Open ${APP_NAME} chat`}>
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
