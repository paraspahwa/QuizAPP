import { useState } from "react";
import QuizCard from "./QuizCard";

export default function QuizSection({ quiz, onComplete, onRestart }) {
  const [answers, setAnswers] = useState({});

  function handleAnswer(questionIndex, optionIndex, isCorrect) {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: { optionIndex, isCorrect },
    }));
  }

  const total = quiz.questions.length;
  const answered = Object.keys(answers).length;
  const allAnswered = answered === total;
  const score = Object.values(answers).filter((a) => a.isCorrect).length;

  return (
    <div className="quiz-section">
      <div className="quiz-header">
        <button className="btn-secondary" onClick={onRestart}>
          ← New Quiz
        </button>
        <span className="progress">
          {answered} / {total} answered
        </span>
      </div>

      <div className="questions-list">
        {quiz.questions.map((q, i) => (
          <QuizCard
            key={i}
            question={q}
            index={i}
            onAnswer={handleAnswer}
          />
        ))}
      </div>

      {allAnswered && (
        <div className="submit-bar">
          <p>
            All done! Score: <strong>{score}/{total}</strong>
          </p>
          <button className="btn-primary" onClick={() => onComplete(answers)}>
            View Full Results →
          </button>
        </div>
      )}
    </div>
  );
}
