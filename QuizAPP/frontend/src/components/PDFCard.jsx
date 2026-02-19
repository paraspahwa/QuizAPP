const COLORS = [
  "#FF6B6B","#FF8E53","#A855F7","#06B6D4","#10B981",
  "#F59E0B","#3B82F6","#EC4899","#EF4444","#8B5CF6",
  "#14B8A6","#F97316","#6366F1","#84CC16","#22D3EE",
  "#FB923C","#F472B6","#34D399","#FBBF24",
];

const EMOJIS = [
  "📖","❤️","🧠","🫁","🫀","⚗️","🩺","🦴","🩸","🎗️",
  "🛡️","🦠","🧩","🦴","👁️","👂","🌸","👶","🚨",
];

function Ring({ pct, color, size = 54 }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ}
        strokeDashoffset={circ - (pct / 100) * circ}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
        fill="white" fontSize="10" fontWeight="700">{pct}%</text>
    </svg>
  );
}

export default function PDFCard({ pdf, index, isSelected, onSelect, onDelete }) {
  const color    = COLORS[index % COLORS.length];
  const emoji    = EMOJIS[index % EMOJIS.length];
  const sessions = pdf.sessions || 0;
  const answered = pdf.total_answered || 0;
  const lastScore = pdf.last_score ?? null;
  const coverage = Math.min(sessions * 10, 100);

  function handleDelete(e) {
    e.stopPropagation();
    onDelete();
  }

  return (
    <div
      className={`pdf-card ${isSelected ? "pdf-card-selected" : ""}`}
      onClick={onSelect}
      style={{ "--card-color": color }}
    >
      <div className="pdf-card-glow" />

      <button className="pdf-delete-btn" onClick={handleDelete} title="Delete PDF">×</button>

      <div className="pdf-card-top">
        <span className="pdf-emoji">{emoji}</span>
        <Ring pct={coverage} color={color} />
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
          <span className="pdf-stat-label">last</span>
        </span>
      </div>

      {isSelected && <div className="pdf-selected-bar" />}
    </div>
  );
}
