import { useApp } from '../state';

export default function EvalPanel() {
  const evalRunning = useApp((s) => s.evalRunning);
  const evalResult = useApp((s) => s.evalResult);
  const runEvalHarness = useApp((s) => s.runEvalHarness);
  const threshold = useApp((s) => s.threshold);
  const totalChunks = useApp((s) => s.totalChunks);

  return (
    <div className="eval-wrap">
      <div>
        <h2 style={{ margin: '0 0 6px' }}>Retrieval eval</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
          Runs the 15-question Stripe FAQ set through embed → retrieve and scores
          each against the current threshold ({threshold.toFixed(2)}). Use it to
          tune the threshold instead of guessing. No LLM calls — fast and
          deterministic.
        </p>
      </div>

      <div>
        <button
          className="primary"
          disabled={evalRunning || totalChunks === 0}
          onClick={() => void runEvalHarness()}
        >
          {evalRunning ? 'Running…' : 'Run eval'}
        </button>
        {totalChunks === 0 && (
          <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--muted)' }}>
            Load documents first.
          </span>
        )}
      </div>

      {evalResult && (
        <>
          <div className="eval-summary">
            <div className="stat">
              <b>{(evalResult.passRate * 100).toFixed(0)}%</b>overall pass
            </div>
            <div className="stat">
              <b>
                {evalResult.groundedPass}/{evalResult.groundedTotal}
              </b>
              grounded answered
            </div>
            <div className="stat">
              <b>
                {evalResult.probePass}/{evalResult.probeTotal}
              </b>
              no-match probes correct
            </div>
          </div>
          <table className="eval-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Top score</th>
                <th>Expected</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {evalResult.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.q}</td>
                  <td>
                    {r.topScore.toFixed(3)}
                    <div className="score-bar">
                      <div style={{ width: `${Math.min(r.topScore * 100, 100)}%` }} />
                    </div>
                  </td>
                  <td>{r.expectMatch ? 'answer' : 'no match'}</td>
                  <td className={r.pass ? 'pass' : 'fail'}>
                    {r.pass ? 'PASS' : 'FAIL'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
