export default function ResultsSummary({ quiz, answers, pdfName, progress, onRestart }) {
  const total = quiz.questions.length;
  const score = Object.values(answers).filter((a) => a.isCorrect).length;
  const pct = Math.round((score / total) * 100);

  const grade =
    pct >= 90 ? { label: "Outstanding!", emoji: "🏆", color: "#FBBF24" } :
    pct >= 70 ? { label: "Great Work!",  emoji: "🎯", color: "#34D399" } :
    pct >= 50 ? { label: "Keep Going!",  emoji: "📖", color: "#60A5FA" } :
                { label: "Need Review",  emoji: "💪", color: "#F87171" };

  return (
    <div className="results-page">
      <div className="results-card">
        {/* Topic badge */}
        <div className="results-topic">{pdfName}</div>

        {/* Score ring */}
        <div className="results-score-wrap">
          <svg width="160" height="160" className="results-ring">
            <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="80" cy="80" r="68" fill="none"
              stroke={grade.color} strokeWidth="10"
              strokeDasharray={2 * Math.PI * 68}
              strokeDashoffset={2 * Math.PI * 68 * (1 - pct / 100)}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="results-score-inner">
            <span className="results-pct">{pct}%</span>
            <span className="results-fraction">{score}/{total}</span>
          </div>
        </div>

        <p className="results-grade" style={{ color: grade.color }}>
          {grade.emoji} {grade.label}
        </p>

        {/* All-time stats */}
        {progress && (
          <div className="results-alltime">
            <div className="alltime-stat">
              <span className="alltime-num">{progress.totalAnswered}</span>
              <span className="alltime-label">Total Questions</span>
            </div>
            <div className="alltime-stat">
              <span className="alltime-num">{progress.sessions}</span>
              <span className="alltime-label">Sessions</span>
            </div>
            <div className="alltime-stat">
              <span className="alltime-num">
                {Math.round((progress.totalCorrect / progress.totalAnswered) * 100)}%
              </span>
              <span className="alltime-label">Avg Score</span>
            </div>
          </div>
        )}
      </div>

      {/* Question breakdown */}
      <div className="results-breakdown">
        <h3 className="breakdown-title">Question Breakdown</h3>
        {quiz.questions.map((q, i) => {
          const ans = answers[i];
          const chosen = q.options[ans?.optionIndex];
          const correct = q.options.find((o) => o.is_correct);
          return (
            <div key={i} className={`result-row ${ans?.isCorrect ? "row-right" : "row-wrong"}`}>
              <span className="row-icon">{ans?.isCorrect ? "✓" : "✗"}</span>
              <div className="row-content">
                <p className="row-q"><strong>Q{i + 1}:</strong> {q.question}</p>
                <p className="row-chosen">Your answer: <em>{chosen?.text}</em></p>
                {!ans?.isCorrect && (
                  <p className="row-correct">✓ Correct: <em>{correct?.text}</em></p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="results-actions">
        <button className="btn-generate" onClick={onRestart}>← Back to Library</button>
      </div>
    </div>
  );
}

