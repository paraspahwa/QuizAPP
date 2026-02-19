import { useState } from "react";

export default function QuizCard({ question, index, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  function handleSelect(i) {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    onAnswer(index, i, question.options[i].is_correct);
  }

  function getOptionClass(opt, i) {
    if (!revealed) return selected === i ? "option selected" : "option";
    if (opt.is_correct) return "option correct";
    if (selected === i) return "option incorrect";
    return "option dimmed";
  }

  const labels = ["A", "B", "C", "D"];

  return (
    <div className="quiz-card">
      <div className="question-header">
        <span className="question-number">Q{index + 1}</span>
        <p className="question-text">{question.question}</p>
      </div>

      <div className="options">
        {question.options.map((opt, i) => (
          <div
            key={i}
            className={getOptionClass(opt, i)}
            onClick={() => handleSelect(i)}
          >
            <div className="option-row">
              <span className="option-label">{labels[i]}</span>
              <span className="option-text">{opt.text}</span>
              {revealed && opt.is_correct && (
                <span className="option-badge">✓ Correct</span>
              )}
              {revealed && !opt.is_correct && selected === i && (
                <span className="option-badge">✗ Wrong</span>
              )}
            </div>

            {revealed && (
              <div className="explanation">
                <span className="explanation-icon">
                  {opt.is_correct ? "💡" : "ℹ️"}
                </span>
                {opt.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {revealed && question.concept_summary && (
        <div className="concept-summary">
          <strong>📚 Key Concept:</strong> {question.concept_summary}
        </div>
      )}
    </div>
  );
}
