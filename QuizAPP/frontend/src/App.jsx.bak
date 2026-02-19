import { useState } from "react";
import UploadSection from "./components/UploadSection";
import QuizSection from "./components/QuizSection";
import ResultsSummary from "./components/ResultsSummary";

export default function App() {
  const [stage, setStage] = useState("upload"); // upload | quiz | results
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});

  function handleQuizReady(quizData) {
    setQuiz(quizData);
    setAnswers({});
    setStage("quiz");
  }

  function handleQuizComplete(finalAnswers) {
    setAnswers(finalAnswers);
    setStage("results");
  }

  function handleRestart() {
    setQuiz(null);
    setAnswers({});
    setStage("upload");
  }

  return (
    <div className="app">
      {stage === "upload" && (
        <UploadSection onQuizReady={handleQuizReady} />
      )}
      {stage === "quiz" && (
        <QuizSection
          quiz={quiz}
          onComplete={handleQuizComplete}
          onRestart={handleRestart}
        />
      )}
      {stage === "results" && (
        <ResultsSummary
          quiz={quiz}
          answers={answers}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
