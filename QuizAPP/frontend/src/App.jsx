import { useState, useEffect } from "react";
import Library from "./components/Library";
import QuizSection from "./components/QuizSection";
import ResultsSummary from "./components/ResultsSummary";

export default function App() {
  const [stage, setStage] = useState("library"); // library | quiz | results
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [activePDF, setActivePDF] = useState(null);
  const [progress, setProgress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("quiz-progress") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("quiz-progress", JSON.stringify(progress));
  }, [progress]);

  function handleQuizReady(quizData, pdfName) {
    setQuiz(quizData);
    setActivePDF(pdfName);
    setAnswers({});
    setStage("quiz");
  }

  function handleQuizComplete(finalAnswers) {
    setAnswers(finalAnswers);
    // Update progress for this PDF
    const correct = Object.values(finalAnswers).filter((a) => a.isCorrect).length;
    const total = quiz.questions.length;
    setProgress((prev) => {
      const existing = prev[activePDF] || { totalAnswered: 0, totalCorrect: 0, sessions: 0 };
      return {
        ...prev,
        [activePDF]: {
          totalAnswered: existing.totalAnswered + total,
          totalCorrect: existing.totalCorrect + correct,
          sessions: existing.sessions + 1,
          lastScore: Math.round((correct / total) * 100),
          lastSession: new Date().toLocaleDateString(),
        },
      };
    });
    setStage("results");
  }

  function handleRestart() {
    setQuiz(null);
    setActivePDF(null);
    setAnswers({});
    setStage("library");
  }

  return (
    <div className="app">
      {stage === "library" && (
        <Library progress={progress} onQuizReady={handleQuizReady} />
      )}
      {stage === "quiz" && (
        <QuizSection
          quiz={quiz}
          pdfName={activePDF}
          onComplete={handleQuizComplete}
          onRestart={handleRestart}
        />
      )}
      {stage === "results" && (
        <ResultsSummary
          quiz={quiz}
          answers={answers}
          pdfName={activePDF}
          progress={progress[activePDF]}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

