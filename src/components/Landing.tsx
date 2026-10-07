import { APP_NAME } from '../lib/config';
import { SAMPLES } from '../lib/samples';

export default function Landing({
  onStartChat,
  onLoadSample,
}: {
  onStartChat: () => void;
  onLoadSample: (id: string) => void;
}) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="logo">💬</span>
          <span>{APP_NAME}</span>
        </div>
        <nav>
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <button className="primary" onClick={onStartChat}>
          Open chat
        </button>
      </header>

      <section className="hero">
        <h1>
          Chat with your documents.
          <br />
          <span className="accent-text">Nothing leaves your device.</span>
        </h1>
        <p className="lede">
          {APP_NAME} is a 100% serverless chatbot that answers questions{' '}
          <b>only from the PDFs, docs, and pages you give it</b>. Parsing,
          embeddings, search, and the AI itself all run inside your browser —
          there is no backend, no database service, no sign-up, and only
          anonymous visit counting.
        </p>
        <div className="cta-row">
          <button className="accent big" onClick={onStartChat}>
            Start chatting →
          </button>
          <a className="btn big ghost" href="#how">
            See how it works
          </a>
        </div>
        <div className="chips">
          <span>$0 hosting</span>
          <span>No account</span>
          <span>No servers</span>
          <span>Anonymous counts only</span>
        </div>
      </section>

      <section className="section">
        <h2>Try it with sample data</h2>
        <p className="section-lede">
          No documents handy? Load a demo pack — the chatbot is ready instantly,
          and everything still runs on your device.
        </p>
        <div className="sample-grid">
          {SAMPLES.map((s) => (
            <div key={s.id} className="sample-card">
              <span className="sample-badge">SAMPLE</span>
              <h3>{s.title}</h3>
              <p>{s.blurb}</p>
              <button className="accent" onClick={() => onLoadSample(s.id)}>
                Load &amp; chat →
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="section">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-n">1</div>
            <h3>Drop your documents</h3>
            <p>
              PDF, Word, text, Markdown, zip archives, web pages, or pasted
              text. Everything is parsed in memory on your device.
            </p>
          </div>
          <div className="step">
            <div className="step-n">2</div>
            <h3>Ask anything</h3>
            <p>
              Your question is turned into a vector and matched against your
              content with cosine similarity — right in the browser.
            </p>
          </div>
          <div className="step">
            <div className="step-n">3</div>
            <h3>Get cited answers</h3>
            <p>
              An on-device AI answers strictly from the matched chunks, with
              citations. No match? It says so — it never hallucinates.
            </p>
          </div>
        </div>
      </section>

      <section id="privacy" className="section">
        <h2>Privacy, made visible</h2>
        <p className="section-lede">
          The badge in the chat header always tells you the current mode. No
          fine print.
        </p>
        <div className="privacy-cards">
          <div className="privacy-card local">
            <h3>🟢 LOCAL</h3>
            <p>
              Parse → embed → retrieve → generate, 100% on-device. Zero document
              content ever leaves your browser. Chatbot setup fetches public AI
              weights once — cached on-device after that.
            </p>
          </div>
          <div className="privacy-card network">
            <h3>🟡 NETWORK</h3>
            <p>
              Shown only while you fetch a web page — which contacts that site
              directly. There is no proxy: blocked pages fall back to paste.
              Parsing, embeddings, and chat stay on-device regardless.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Honest limits</h2>
        <ul className="limits">
          <li>Chat needs WebGPU — desktop Chrome or Edge is the sweet spot.</li>
          <li>First-time chatbot setup is one-time (~1GB, WiFi recommended).</li>
          <li>Retrieval, eval, and export work without the chat model.</li>
          <li>Built for focused collections (tens of MB), not the whole internet.</li>
        </ul>
        <div className="cta-row">
          <button className="accent big" onClick={onStartChat}>
            Try it now →
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        {APP_NAME} · open-source MVP · embeddings + chat run entirely in your
        browser · anonymous visit counting via GoatCounter (no cookies, no
        personal data)
      </footer>
    </div>
  );
}
