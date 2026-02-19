import { useState } from "react";
import QuizCard from "./QuizCard";

export default function QuizSection({ quiz, pdfName, onComplete, onRestart }) {
  const [answers, setAnswers] = useState({});

  function handleAnswer(questionIndex, optionIndex, isCorrect) {
    setAnswers((prev) => ({ ...prev, [questionIndex]: { optionIndex, isCorrect } }));
  }

  const total = quiz.questions.length;
  const answered = Object.keys(answers).length;
  const correct = Object.values(answers).filter((a) => a.isCorrect).length;
  const allAnswered = answered === total;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="quiz-section">
      {/* Top bar */}
      <div className="quiz-topbar">
        <button className="btn-back" onClick={onRestart}>← Library</button>
        <div className="quiz-topbar-center">
          <span className="quiz-topic-label">{pdfName}</span>
        </div>
        <div className="quiz-score-live">
          <span className="score-live-num">{correct}</span>
          <span className="score-live-sep">/</span>
          <span className="score-live-total">{answered}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="quiz-progress-wrap">
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="quiz-progress-label">{answered}/{total} answered</span>
      </div>

      {/* Questions */}
      <div className="questions-list">
        {quiz.questions.map((q, i) => (
          <QuizCard key={i} question={q} index={i} onAnswer={handleAnswer} />
        ))}
      </div>

      {/* Submit */}
      {allAnswered && (
        <div className="submit-bar">
          <div className="submit-summary">
            <span>🎯 You scored <strong>{correct}/{total}</strong> — {Math.round((correct / total) * 100)}%</span>
          </div>
          <button className="btn-generate" onClick={() => onComplete(answers)}>
            View Full Results →
          </button>
        </div>
      )}
    </div>
  );
}

