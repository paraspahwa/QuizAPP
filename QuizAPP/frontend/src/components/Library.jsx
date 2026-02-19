import { useState, useRef } from "react";
import PDFCard from "./PDFCard";

const API_BASE = "/api";

// ── Update these 19 names to match your actual PDF files ──────
export const PDF_LIBRARY = [
  { id: 1,  name: "Psychiatry",         emoji: "🔬", color: "#FF6B6B" },
  { id: 2,  name: "Physiology",           emoji: "❤️", color: "#FF8E53" },
  { id: 3,  name: "Pharmacology",            emoji: "🧠", color: "#A855F7" },
  { id: 4,  name: "Microbiology",          emoji: "🫁", color: "#06B6D4" },
  { id: 5,  name: "Anaesthesia",     emoji: "🫀", color: "#10B981" },
  { id: 6,  name: "Pediatrics",        emoji: "⚗️", color: "#F59E0B" },
  { id: 7,  name: "Biochemistry",           emoji: "🩺", color: "#3B82F6" },
  { id: 8,  name: "Community-Medicine",         emoji: "🦴", color: "#EC4899" },
  { id: 9,  name: "Forensic Medicine",           emoji: "🩸", color: "#EF4444" },
  { id: 10, name: "Ophthalmology",             emoji: "🎗️", color: "#8B5CF6" },
  { id: 11, name: "Dermatology",           emoji: "🛡️", color: "#14B8A6" },
  { id: 12, name: "Medicine",   emoji: "🦠", color: "#F97316" },
  { id: 13, name: "Surgery",           emoji: "🧩", color: "#6366F1" },
  { id: 14, name: "Orthopedics",          emoji: "🦴", color: "#84CC16" },
  { id: 15, name: "Radiology",        emoji: "👁️", color: "#22D3EE" },
  { id: 16, name: "ENT",                  emoji: "👂", color: "#FB923C" },
  { id: 17, name: "Obstetrics&Gynecology",           emoji: "🌸", color: "#F472B6" },
  { id: 18, name: "Pathology",           emoji: "🔬", color: "#8B5CF6" },
  { id: 19, name: "Emergency Medicine",   emoji: "🚨", color: "#FBBF24" },
];

export default function Library({ progress, onQuizReady }) {
  const [selected, setSelected] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [manualFile, setManualFile] = useState(null);
  const fileRef = useRef();

  const totalAnswered = Object.values(progress).reduce((s, p) => s + (p.totalAnswered || 0), 0);
  const totalCorrect = Object.values(progress).reduce((s, p) => s + (p.totalCorrect || 0), 0);
  const coveredPDFs = Object.keys(progress).length;

  async function handleGenerate() {
    if (!selected && !manualFile) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    const pdfName = manualFile ? manualFile.name.replace(".pdf", "") : selected.name;

    if (manualFile) {
      formData.append("file", manualFile);
    } else {
      // Fetch the PDF from the server by name
      try {
        const blob = await fetch(`/pdfs/${selected.name}.pdf`).then(r => {
          if (!r.ok) throw new Error("PDF not found on server");
          return r.blob();
        });
        formData.append("file", blob, `${selected.name}.pdf`);
      } catch {
        // Fallback: ask user to upload manually
        setError(`Could not auto-load "${selected.name}.pdf". Please upload it manually using the upload zone below.`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(
        `${API_BASE}/upload-and-generate?num_questions=${numQuestions}&difficulty=${difficulty}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      onQuizReady(data.quiz, pdfName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="library">
      {/* ── Header ── */}
      <header className="lib-header">
        <div className="lib-brand">
          <span className="lib-logo">⚕</span>
          <div>
            <h1 className="lib-title">MedQuiz<span className="lib-title-accent">AI</span></h1>
            <p className="lib-subtitle">Your Medical Knowledge Engine</p>
          </div>
        </div>
        <div className="lib-stats">
          <div className="stat-pill">
            <span className="stat-num">{totalAnswered}</span>
            <span className="stat-label">Questions Done</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%</span>
            <span className="stat-label">Avg Score</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{coveredPDFs}/19</span>
            <span className="stat-label">Topics Covered</span>
          </div>
        </div>
      </header>

      {/* ── PDF Grid ── */}
      <section className="lib-section">
        <h2 className="lib-section-title">📚 Select a Topic</h2>
        <div className="pdf-grid">
          {PDF_LIBRARY.map((pdf) => (
            <PDFCard
              key={pdf.id}
              pdf={pdf}
              progress={progress[pdf.name]}
              isSelected={selected?.id === pdf.id}
              onSelect={() => {
                setSelected(pdf);
                setManualFile(null);
                setError("");
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Manual Upload ── */}
      <section className="lib-section">
        <h2 className="lib-section-title">📤 Or Upload Any PDF</h2>
        <div
          className={`drop-zone ${dragOver ? "drag-active" : ""} ${manualFile ? "has-file" : ""}`}
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f?.type === "application/pdf") {
              setManualFile(f);
              setSelected(null);
            }
          }}
        >
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }}
            onChange={(e) => { setManualFile(e.target.files[0]); setSelected(null); }} />
          {manualFile
            ? <p className="drop-filename">📄 {manualFile.name}</p>
            : <p className="drop-placeholder">Drop PDF here or <span>click to browse</span></p>}
        </div>
      </section>

      {/* ── Controls ── */}
      {(selected || manualFile) && (
        <section className="lib-section generate-bar">
          <div className="generate-info">
            <span className="generate-for">
              Generating quiz for: <strong>{manualFile ? manualFile.name : selected.name}</strong>
            </span>
          </div>
          <div className="generate-controls">
            <div className="control-group">
              <label>Questions</label>
              <div className="btn-group">
                {[5, 10, 15, 20].map(n => (
                  <button key={n} className={`btn-count ${numQuestions === n ? "active" : ""}`}
                    onClick={() => setNumQuestions(n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>Difficulty</label>
              <div className="btn-group">
                {["easy", "medium", "hard"].map(d => (
                  <button key={d} className={`btn-diff btn-diff-${d} ${difficulty === d ? "active" : ""}`}
                    onClick={() => setDifficulty(d)}>{d}</button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="lib-error">{error}</p>}
          <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <><span className="spinner" /> Generating Quiz…</>
            ) : (
              <><span>⚡</span> Generate Quiz</>
            )}
          </button>
        </section>
      )}
    </div>
  );
}

