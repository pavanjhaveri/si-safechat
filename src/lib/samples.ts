// SI SafeChat — bundled demo samples. One tap loads a sample document
// through the normal ingest pipeline, so the chatbot is instantly ready.
// Samples are same-origin static files: no CORS issues, still zero-server.
// Content is originally written for the demo (not verbatim copies).

import { normalizeText, type ParsedDoc } from './ingest';

export interface SampleDef {
  id: string;
  title: string;
  blurb: string;
  file: string;
  sourceName: string;
}

export const SAMPLES: SampleDef[] = [
  {
    id: 'stripe',
    title: 'Stripe payments FAQ',
    blurb: 'Card payments, payouts, fees, refunds, disputes — the classic RAG demo.',
    file: 'stripe-faq.md',
    sourceName: 'Sample: Stripe payments FAQ',
  },
  {
    id: 'amazon',
    title: 'Amazon shopping FAQ',
    blurb: 'Returns, shipping, Prime, refunds, order tracking.',
    file: 'amazon-faq.md',
    sourceName: 'Sample: Amazon shopping FAQ',
  },
  {
    id: 'sisafechat',
    title: 'SI SafeChat guide',
    blurb: 'Ask the chatbot about itself — models, privacy modes, limits.',
    file: 'si-safechat-guide.md',
    sourceName: 'Sample: SI SafeChat guide',
  },
];

/** Fetch a sample file and shape it as a parsed doc for ingestDocs(). */
export async function fetchSample(def: SampleDef): Promise<ParsedDoc> {
  const url = `${import.meta.env.BASE_URL}samples/${def.file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sample failed to load (${res.status}).`);
  const clean = normalizeText(await res.text());
  if (clean.length < 50) throw new Error('Sample content is empty.');
  return {
    sourceId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sample-${def.id}-${Date.now()}`,
    sourceName: def.sourceName,
    kind: 'md',
    texts: [clean],
    charCount: clean.length,
  };
}
