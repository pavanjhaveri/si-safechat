import { useEffect, useState } from 'react';
import { useApp } from './state';
import { decodeShareLink } from './lib/sharing';
import Landing from './components/Landing';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const init = useApp((s) => s.init);
  const setThreshold = useApp((s) => s.setThreshold);
  const loadSample = useApp((s) => s.loadSample);
  // The bot starts collapsed (bubble only); it expands on user action or
  // when a sample finishes loading.
  const [widgetOpen, setWidgetOpen] = useState(false);

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

  const handleLoadSample = (id: string) => {
    setWidgetOpen(true);
    void loadSample(id);
  };

  return (
    <>
      <Landing onStartChat={() => setWidgetOpen(true)} onLoadSample={handleLoadSample} />
      <ChatWidget
        open={widgetOpen}
        onOpen={() => setWidgetOpen(true)}
        onClose={() => setWidgetOpen(false)}
      />
    </>
  );
}
