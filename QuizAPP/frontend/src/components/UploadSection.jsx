import { useState, useRef } from "react";

// /api/* is proxied to the backend by both nginx (Docker) and vite.config.js (local dev)
const API_BASE = "/api";

export default function UploadSection({ onQuizReady }) {
  const [file, setFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  async function handleGenerate() {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${API_BASE}/upload-and-generate?num_questions=${numQuestions}&difficulty=${difficulty}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong.");
      onQuizReady(data.quiz);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload-section">
      <h1>PDF Quiz Generator</h1>
      <p className="subtitle">
        Upload a PDF — get an instant quiz with explanations for every answer
      </p>

      <div
        className="drop-zone"
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f?.type === "application/pdf") setFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files[0])}
        />
        {file ? (
          <p className="file-name">📄 {file.name}</p>
        ) : (
          <p>
            Drop your PDF here or <span className="link">click to browse</span>
          </p>
        )}
      </div>

      <div className="controls">
        <label>
          Questions
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <button
        className="btn-primary"
        onClick={handleGenerate}
        disabled={!file || loading}
      >
        {loading ? "Generating quiz…" : "Generate Quiz"}
      </button>
    </div>
  );
}
