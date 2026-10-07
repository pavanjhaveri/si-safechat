// SI SafeChat — privacy-friendly analytics helper (GoatCounter).
// Counts only: pageviews (automatic via the script tag) plus explicitly
// named, payload-free events below. Never document names, question text,
// or any app content.

declare global {
  interface Window {
    goatcounter?: {
      count: (vars?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Count one anonymous event (e.g. "generate-chatbot"). No payload is ever
 * attached — the event name alone is the whole signal.
 */
export function trackEvent(name: string): void {
  try {
    window.goatcounter?.count({ event: true, path: `event/${name}` });
  } catch {
    /* analytics is best-effort; ad blockers may remove it */
  }
}
