import { useEffect, useState } from 'react';
import { useApp } from './state';
import { decodeShareLink } from './lib/sharing';
import Landing from './components/Landing';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const init = useApp((s) => s.init);
  const setThreshold = useApp((s) => s.setThreshold);
  // The bot starts expanded, floating over the landing page.
  const [widgetOpen, setWidgetOpen] = useState(true);

  useEffect(() => {
    void init();
    // Apply shared config links (#config=...).
    const cfg = decodeShareLink();
    if (cfg) {
      setThreshold(cfg.threshold);
      history.replaceState(null, '', '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Landing onStartChat={() => setWidgetOpen(true)} />
      <ChatWidget
        open={widgetOpen}
        onOpen={() => setWidgetOpen(true)}
        onClose={() => setWidgetOpen(false)}
      />
    </>
  );
}
