import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import PDFCard from "./PDFCard";

export default function Library({ onQuizReady }) {
  const { user, logout, authHeader } = useAuth();
  const [pdfs, setPdfs]             = useState([]);
  const [selected, setSelected]     = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState("");
  const [uploadMsg, setUploadMsg]   = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const [showAdmin, setShowAdmin]   = useState(false);
  const fileRef = useRef();

  // ── Load PDFs ─────────────────────────────────────────────────
  async function loadPdfs() {
    const res  = await fetch("/api/pdfs/list", { headers: authHeader() });
    const data = await res.json();
    setPdfs(Array.isArray(data) ? data : []);
  }

  useEffect(() => { loadPdfs(); }, []);

  // ── Stats ─────────────────────────────────────────────────────
  const totalAnswered = pdfs.reduce((s, p) => s + (p.total_answered || 0), 0);
  const totalCorrect  = pdfs.reduce((s, p) => s + (p.total_correct  || 0), 0);
  const covered       = pdfs.filter((p) => p.sessions > 0).length;

  // ── Upload PDFs ───────────────────────────────────────────────
  async function handleUpload(files) {
    if (!files?.length) return;
    setUploading(true);
    setUploadMsg("");

    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));

    const res  = await fetch("/api/pdfs/upload", {
      method: "POST",
      headers: authHeader(),
      body: form,
    });
    const data = await res.json();
    setUploadMsg(`✓ ${data.count} PDF(s) uploaded successfully`);
    await loadPdfs();
    setUploading(false);
  }

  // ── Delete PDF ────────────────────────────────────────────────
  async function handleDelete(pdfId) {
    if (!confirm("Delete this PDF and all its progress?")) return;
    await fetch(`/api/pdfs/${pdfId}`, { method: "DELETE", headers: authHeader() });
    await loadPdfs();
    if (selected?.id === pdfId) setSelected(null);
  }

  // ── Generate Quiz ─────────────────────────────────────────────
  async function handleGenerate() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_id: selected.id,
          num_questions: numQuestions,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      onQuizReady(data.quiz, selected);
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
            <p className="lib-subtitle">Welcome, <strong>{user.username}</strong>
              {user.is_admin && <span className="admin-badge">Admin</span>}
            </p>
          </div>
        </div>

        <div className="lib-stats">
          <div className="stat-pill">
            <span className="stat-num">{totalAnswered}</span>
            <span className="stat-label">Questions Done</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">
              {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%
            </span>
            <span className="stat-label">Avg Score</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{covered}/{pdfs.length}</span>
            <span className="stat-label">Topics Covered</span>
          </div>
        </div>

        <div className="lib-header-actions">
          {user.is_admin && (
            <button className="btn-secondary" onClick={() => setShowAdmin(!showAdmin)}>
              {showAdmin ? "← Library" : "⚙ Admin"}
            </button>
          )}
          <button className="btn-secondary" onClick={logout}>Sign Out</button>
        </div>
      </header>

      {/* ── Admin Panel ── */}
      {showAdmin && user.is_admin && <AdminPanel authHeader={authHeader} />}

      {!showAdmin && (<>

        {/* ── Upload Zone ── */}
        <section className="lib-section">
          <h2 className="lib-section-title">📤 Upload Your PDFs
            <span className="section-hint">Upload all 19 at once — drag & drop supported</span>
          </h2>
          <div
            className={`drop-zone ${dragOver ? "drag-active" : ""}`}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleUpload(e.dataTransfer.files);
            }}
          >
            <input ref={fileRef} type="file" accept="application/pdf" multiple
              style={{ display: "none" }}
              onChange={(e) => handleUpload(e.target.files)} />
            {uploading
              ? <p className="drop-placeholder"><span className="spinner" /> Uploading…</p>
              : <p className="drop-placeholder">
                  Drop PDFs here or <span>click to browse</span><br />
                  <small style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                    Multiple files supported · Max 200MB each
                  </small>
                </p>
            }
          </div>
          {uploadMsg && <p className="upload-success">{uploadMsg}</p>}
        </section>

        {/* ── PDF Grid ── */}
        {pdfs.length > 0 && (
          <section className="lib-section">
            <h2 className="lib-section-title">📚 Your Library ({pdfs.length} PDFs)</h2>
            <div className="pdf-grid">
              {pdfs.map((pdf, i) => (
                <PDFCard
                  key={pdf.id}
                  pdf={pdf}
                  index={i}
                  isSelected={selected?.id === pdf.id}
                  onSelect={() => { setSelected(pdf); setError(""); }}
                  onDelete={() => handleDelete(pdf.id)}
                />
              ))}
            </div>
          </section>
        )}

        {pdfs.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">📂</p>
            <p className="empty-title">No PDFs yet</p>
            <p className="empty-sub">Upload your medical PDFs above to get started</p>
          </div>
        )}

        {/* ── Generate Bar ── */}
        {selected && (
          <section className="lib-section generate-bar">
            <div className="generate-info">
              <span className="generate-for">
                Quiz for: <strong>{selected.name}</strong>
              </span>
            </div>
            <div className="generate-controls">
              <div className="control-group">
                <label>Questions</label>
                <div className="btn-group">
                  {[5, 10, 15, 20].map((n) => (
                    <button key={n}
                      className={`btn-count ${numQuestions === n ? "active" : ""}`}
                      onClick={() => setNumQuestions(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="control-group">
                <label>Difficulty</label>
                <div className="btn-group">
                  {["easy", "medium", "hard"].map((d) => (
                    <button key={d}
                      className={`btn-diff btn-diff-${d} ${difficulty === d ? "active" : ""}`}
                      onClick={() => setDifficulty(d)}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="lib-error">{error}</p>}
            <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
              {loading ? <><span className="spinner" /> Generating…</> : <>⚡ Generate Quiz</>}
            </button>
          </section>
        )}

      </>)}
    </div>
  );
}


// ── Admin Panel Component ──────────────────────────────────────
function AdminPanel({ authHeader }) {
  const [users, setUsers] = useState([]);

  async function loadUsers() {
    const res = await fetch("/api/auth/users", { headers: authHeader() });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  useEffect(() => { loadUsers(); }, []);

  async function toggleAdmin(id) {
    await fetch(`/api/auth/users/${id}/toggle-admin`, {
      method: "POST", headers: authHeader(),
    });
    loadUsers();
  }

  async function deleteUser(id, name) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/auth/users/${id}`, { method: "DELETE", headers: authHeader() });
    loadUsers();
  }

  return (
    <section className="lib-section">
      <h2 className="lib-section-title">⚙ Admin — User Management</h2>
      <div className="admin-table">
        <div className="admin-row admin-header">
          <span>Username</span>
          <span>Email</span>
          <span>Role</span>
          <span>Joined</span>
          <span>Actions</span>
        </div>
        {users.map((u) => (
          <div key={u.id} className="admin-row">
            <span className="admin-username">{u.username}</span>
            <span className="admin-email">{u.email}</span>
            <span>
              <span className={`role-badge ${u.is_admin ? "role-admin" : "role-user"}`}>
                {u.is_admin ? "Admin" : "User"}
              </span>
            </span>
            <span className="admin-date">{u.created_at?.slice(0, 10)}</span>
            <span className="admin-actions">
              <button className="btn-pill" onClick={() => toggleAdmin(u.id)}>
                {u.is_admin ? "Revoke Admin" : "Make Admin"}
              </button>
              <button className="btn-pill btn-pill-danger" onClick={() => deleteUser(u.id, u.username)}>
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
