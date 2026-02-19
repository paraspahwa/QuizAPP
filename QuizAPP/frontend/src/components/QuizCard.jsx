import { useState } from "react";

const LABELS = ["A", "B", "C", "D"];

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

  return (
    <div className="quiz-card">
      <div className="qcard-header">
        <span className="qcard-num">Q{index + 1}</span>
        <p className="qcard-text">{question.question}</p>
      </div>

      <div className="options">
        {question.options.map((opt, i) => (
          <div key={i} className={getOptionClass(opt, i)} onClick={() => handleSelect(i)}>
            <div className="option-row">
              <span className="option-label">{LABELS[i]}</span>
              <span className="option-text">{opt.text}</span>
              {revealed && opt.is_correct && <span className="badge-correct">✓ Correct</span>}
              {revealed && !opt.is_correct && selected === i && <span className="badge-wrong">✗ Wrong</span>}
            </div>
            {revealed && (
              <div className="explanation">
                <span>{opt.is_correct ? "💡" : "ℹ️"}</span>
                <span>{opt.explanation}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {revealed && question.concept_summary && (
        <div className="concept-box">
          <span className="concept-icon">📚</span>
          <span><strong>Key Concept:</strong> {question.concept_summary}</span>
        </div>
      )}
    </div>
  );
}

