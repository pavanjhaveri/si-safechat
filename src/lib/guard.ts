// SI SafeChat — input guard. Hard rule: the chatbot answers ONLY from
// loaded documents. This classifier runs BEFORE retrieval/LLM and rejects
// prompt-injection attempts in the user's question. (Document-side
// injection is neutralized by the system prompt: chunks are DATA, never
// instructions.)
//
// The pattern list is data (exported) so it stays reviewable and tunable
// without touching logic. It is heuristic by design — the system prompt +
// retrieval short-circuit remain the semantic backstops.

export type GuardVerdict = 'ok' | 'injection';

export const INJECTION_REFUSAL =
  "I can't do that — I only answer questions about your loaded documents.";

interface InjectionPattern {
  re: RegExp;
  label: string;
}

export const INJECTION_PATTERNS: InjectionPattern[] = [
  { re: /ignore\s+(all\s+|any\s+)?(previous|prior|above)\s+(instructions|rules|directions|prompts?)/i, label: 'override-previous' },
  { re: /disregard\s+(all\s+|any\s+)?(previous|prior|above|your)\s+(instructions|rules)/i, label: 'override-disregard' },
  { re: /forget\s+(your\s+|all\s+)?(previous\s+)?instructions/i, label: 'override-forget' },
  { re: /reveal\s+(your\s+)?(system\s+prompt|prompt|instructions|rules)/i, label: 'prompt-reveal' },
  { re: /show\s+me\s+(your\s+)?(system\s+prompt|instructions)/i, label: 'prompt-reveal' },
  { re: /you\s+are\s+now\b/i, label: 'role-reassign' },
  { re: /\bact\s+as\s+(?!an?\s*assistant\b)/i, label: 'role-act-as' },
  { re: /pretend\s+(to\s+be|you('re| are))/i, label: 'role-pretend' },
  { re: /jailbreak/i, label: 'jailbreak' },
  { re: /\bDAN\s+mode\b/i, label: 'dan-mode' },
  { re: /developer\s+mode/i, label: 'developer-mode' },
  { re: /^\s*(system|developer)\s*:/im, label: 'fake-system-prefix' },
  { re: /do\s+anything\s+now\b/i, label: 'do-anything-now' },
  { re: /bypass\s+(your\s+)?(rules|restrictions|filters)/i, label: 'bypass' },
];

export function classifyQuestion(q: string): GuardVerdict {
  const text = q.trim();
  if (!text) return 'ok';
  for (const p of INJECTION_PATTERNS) {
    if (p.re.test(text)) return 'injection';
  }
  return 'ok';
}
