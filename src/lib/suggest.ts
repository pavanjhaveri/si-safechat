// SI SafeChat — suggested prompts. After documents are indexed, the user
// gets 3 tappable question suggestions (zero blank-page problem).
//
// Two tiers:
//   Tier A — the local LLM is already ready: ask it to write 3 questions
//            from representative excerpts (best quality).
//   Tier B — heuristic, no model needed: key topics per source turned into
//            question templates. Runs instantly at ingest time.
//
// Suggestions regenerate whenever the knowledge base changes.

import type { Chunk } from './ingest';
import { isEngineReady, streamChat } from './llm';

const STOPWORDS = new Set(
  `a,about,above,after,again,against,all,also,am,an,and,any,are,as,at,be,because,been,before,being,below,between,both,but,by,can,cannot,could,did,do,does,doing,down,during,each,few,for,from,further,had,has,have,having,he,her,here,hers,herself,him,himself,his,how,i,if,in,into,is,it,its,itself,let,me,more,most,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,she,should,so,some,such,than,that,the,their,theirs,them,themselves,then,there,these,they,this,those,through,to,too,under,until,up,very,was,we,were,what,when,where,which,while,who,whom,why,with,would,you,your,yours,yourself,yourselves,one,two,new,may,many,much,like,just,also,per,via,within,without,using,used,use,often,every,across`.split(
    ',',
  ),
);

function topTerms(text: string, exclude: Set<string>, n: number): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9']+/)) {
    const w = raw.replace(/^'+|'+$/g, '');
    if (w.length < 4 || STOPWORDS.has(w) || exclude.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

/** Short display name: strip path/extension/date clutter. */
export function shortSourceName(name: string): string {
  return name
    .replace(/\.(pdf|docx?|txt|md|zip)$/i, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
    .slice(0, 40);
}

const TEMPLATES: ((topic: string, source: string) => string)[] = [
  (t, s) => `What does ${s} say about ${t}?`,
  (t) => `How does ${t} work, according to the documents?`,
  (t) => `What are the key points about ${t}?`,
  (t) => `Explain ${t} based on the loaded content.`,
];

/** Tier B: heuristic suggestions, one per source (max 3). */
export function heuristicSuggestions(chunks: Chunk[]): string[] {
  const bySource = new Map<string, { name: string; texts: string[] }>();
  for (const c of chunks) {
    const e = bySource.get(c.sourceId) ?? { name: c.sourceName, texts: [] };
    e.texts.push(c.text);
    bySource.set(c.sourceId, e);
  }
  const out: string[] = [];
  const usedTopics = new Set<string>();
  let ti = 0;
  for (const { name, texts } of bySource.values()) {
    if (out.length >= 3) break;
    const source = shortSourceName(name) || 'the documents';
    const topics = topTerms(texts.join(' '), usedTopics, 3);
    if (topics.length === 0) {
      out.push(`What are the main topics covered in ${source}?`);
      continue;
    }
    const topic = topics[0];
    usedTopics.add(topic);
    out.push(TEMPLATES[ti % TEMPLATES.length](topic, source));
    ti++;
  }
  return out.slice(0, 3);
}

/** Tier A: let the ready LLM write 3 questions from excerpts. Null on failure. */
async function llmSuggestions(chunks: Chunk[]): Promise<string[] | null> {
  try {
    const excerpts = chunks
      .slice(0, 3)
      .map((c, i) => `[${i + 1}] ${c.text.slice(0, 600)}`)
      .join('\n\n');
    let full = '';
    await streamChat(
      [
        {
          role: 'system',
          content:
            'You write short questions a user would ask about the given excerpts. Reply with exactly 3 numbered questions and nothing else.',
        },
        { role: 'user', content: `Excerpts:\n${excerpts}\n\nWrite 3 distinct questions.` },
      ],
      (t) => {
        full += t;
      },
    );
    const lines = full
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter((l) => l.length >= 10 && l.length <= 180);
    const unique = [...new Set(lines)].slice(0, 3);
    return unique.length === 3 ? unique : null;
  } catch {
    return null;
  }
}

/** Generate up to 3 suggestions for the current KB. Never throws. */
export async function generateSuggestions(chunks: Chunk[]): Promise<string[]> {
  if (chunks.length === 0) return [];
  if (isEngineReady()) {
    const fromLlm = await llmSuggestions(chunks);
    if (fromLlm) return fromLlm;
  }
  return heuristicSuggestions(chunks);
}
