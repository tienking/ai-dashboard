import { useState, useEffect } from "react";

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/ai-dashboard/health")
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: "unreachable" }));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", animation: "fadeUp 0.4s ease both" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 14 }}>
          TIENMAI.SPACE / PROJECTS
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>AI Dashboard</h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 28 }}>
          Project skeleton is up and running.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: health?.status === "ok" ? "#4ade80" : "var(--text-muted)" }} />
          <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            API: {health ? health.status : "checking..."}
          </span>
        </div>
      </div>
    </div>
  );
}
