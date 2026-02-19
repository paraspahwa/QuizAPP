import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./components/AuthPage";
import Library from "./components/Library";
import QuizSection from "./components/QuizSection";
import ResultsSummary from "./components/ResultsSummary";

export default function App() {
  const { user, loading, authHeader } = useAuth();
  const [stage, setStage]     = useState("library");
  const [quiz, setQuiz]       = useState(null);
  const [activePdf, setActivePdf] = useState(null);
  const [answers, setAnswers] = useState({});

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="lib-logo">⚕</span>
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  async function handleQuizReady(quizData, pdf) {
    setQuiz(quizData);
    setActivePdf(pdf);
    setAnswers({});
    setStage("quiz");
  }

  async function handleQuizComplete(finalAnswers) {
    setAnswers(finalAnswers);

    const correct = Object.values(finalAnswers).filter((a) => a.isCorrect).length;
    const total   = quiz.questions.length;
    const pct     = Math.round((correct / total) * 100);

    // Save progress to server
    await fetch("/api/quiz/save-progress", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        pdf_id:             activePdf.id,
        pdf_name:           activePdf.name,
        questions_answered: total,
        questions_correct:  correct,
        score_pct:          pct,
      }),
    });

    setStage("results");
  }

  function handleRestart() {
    setQuiz(null);
    setActivePdf(null);
    setAnswers({});
    setStage("library");
  }

  return (
    <div className="app">
      {stage === "library" && (
        <Library onQuizReady={handleQuizReady} />
      )}
      {stage === "quiz" && (
        <QuizSection
          quiz={quiz}
          pdfName={activePdf?.name}
          onComplete={handleQuizComplete}
          onRestart={handleRestart}
        />
      )}
      {stage === "results" && (
        <ResultsSummary
          quiz={quiz}
          answers={answers}
          pdfName={activePdf?.name}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
