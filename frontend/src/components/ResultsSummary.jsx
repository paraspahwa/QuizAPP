export default function ResultsSummary({ quiz, answers, onRestart }) {
  const total = quiz.questions.length;
  const score = Object.values(answers).filter((a) => a.isCorrect).length;
  const pct = Math.round((score / total) * 100);

  const grade =
    pct >= 90 ? "Excellent 🏆" :
    pct >= 70 ? "Good Job 👍" :
    pct >= 50 ? "Keep Studying 📖" :
    "Needs Work 💪";

  return (
    <div className="results-section">
      <h2>Quiz Complete!</h2>

      <div className="score-circle">
        <span className="score-number">{score}/{total}</span>
        <span className="score-pct">{pct}%</span>
      </div>

      <p className="grade">{grade}</p>

      <div className="results-breakdown">
        {quiz.questions.map((q, i) => {
          const ans = answers[i];
          const chosen = q.options[ans?.optionIndex];
          const correct = q.options.find((o) => o.is_correct);

          return (
            <div
              key={i}
              className={`result-item ${ans?.isCorrect ? "right" : "wrong"}`}
            >
              <p className="result-question">
                <strong>Q{i + 1}:</strong> {q.question}
              </p>
              <p className="result-chosen">
                Your answer: <em>{chosen?.text}</em>{" "}
                {ans?.isCorrect ? "✓" : "✗"}
              </p>
              {!ans?.isCorrect && (
                <p className="result-correct">
                  Correct: <em>{correct?.text}</em>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-primary" onClick={onRestart}>
        Upload New PDF
      </button>
    </div>
  );
}
