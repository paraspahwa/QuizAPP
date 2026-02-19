function ProgressRing({ pct, color, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
        fill="white" fontSize="11" fontWeight="700">
        {pct}%
      </text>
    </svg>
  );
}

export default function PDFCard({ pdf, progress, isSelected, onSelect }) {
  const answered = progress?.totalAnswered || 0;
  const correct = progress?.totalCorrect || 0;
  const sessions = progress?.sessions || 0;
  const avgScore = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const lastScore = progress?.lastScore ?? null;

  // "coverage" = how many sessions (max out visually at 10)
  const coveragePct = Math.min(sessions * 10, 100);

  return (
    <div
      className={`pdf-card ${isSelected ? "pdf-card-selected" : ""}`}
      onClick={onSelect}
      style={{ "--card-color": pdf.color }}
    >
      <div className="pdf-card-glow" />
      <div className="pdf-card-top">
        <span className="pdf-emoji">{pdf.emoji}</span>
        <ProgressRing pct={coveragePct} color={pdf.color} />
      </div>
      <p className="pdf-name">{pdf.name}</p>
      <div className="pdf-stats-row">
        <span className="pdf-stat">
          <span className="pdf-stat-num">{answered}</span>
          <span className="pdf-stat-label">Q done</span>
        </span>
        <span className="pdf-stat-divider" />
        <span className="pdf-stat">
          <span className="pdf-stat-num">{sessions}</span>
          <span className="pdf-stat-label">sessions</span>
        </span>
        <span className="pdf-stat-divider" />
        <span className="pdf-stat">
          <span className="pdf-stat-num">{lastScore !== null ? `${lastScore}%` : "—"}</span>
          <span className="pdf-stat-label">last score</span>
        </span>
      </div>
      {isSelected && <div className="pdf-selected-bar" />}
    </div>
  );
}

