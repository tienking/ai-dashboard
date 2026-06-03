import { useState, useRef, useCallback } from "react";
import { parseFile } from "./lib/parse";
import { saveDataset } from "./lib/db";
import { generateDashboard } from "./lib/ai";
import Charts from "./components/Charts";

const TYPE_COLORS = {
  number:   { bg: "rgba(96,165,250,0.15)",  fg: "#60a5fa" },
  date:     { bg: "rgba(167,139,250,0.15)", fg: "#a78bfa" },
  category: { bg: "rgba(74,222,128,0.15)",  fg: "#4ade80" },
  text:     { bg: "rgba(156,163,175,0.15)", fg: "#9ca3af" },
};

const fmt = (n) => {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

function StatSummary({ col, stats }) {
  const s = stats[col.name];
  if (!s) return null;
  if (col.type === "number") return <span>min {fmt(s.min)} · max {fmt(s.max)} · avg {fmt(s.mean)}</span>;
  if (col.type === "date") return <span>{s.min} → {s.max}</span>;
  if (col.type === "category") return <span>{s.distinct} nhóm · top: {s.top?.[0]?.value}</span>;
  return <span>{s.distinct} giá trị khác nhau</span>;
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const runGenerate = useCallback(async (ds) => {
    setGenerating(true); setSpec(null);
    try {
      const newSpec = await generateDashboard(ds);
      setSpec(newSpec);
      await saveDataset({ ...ds, spec: newSpec });
    } catch (e) {
      setError("AI: " + (e.message || "không tạo được dashboard."));
    }
    setGenerating(false);
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(""); setLoading(true); setDataset(null); setSpec(null);
    try {
      const { rows, columns, stats, rowCount } = await parseFile(file);
      const ds = {
        id: crypto.randomUUID(),
        name: file.name,
        createdAt: Date.now(),
        columns, stats, rowCount, rows,
      };
      await saveDataset(ds);
      setDataset(ds);
      setLoading(false);
      runGenerate(ds);
    } catch (e) {
      setError(e.message || "Không đọc được file.");
      setLoading(false);
    }
  }, [runGenerate]);

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ padding: "16px 28px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.12em" }}>AI DASHBOARD</p>
          <span style={{ color: "var(--border)" }}>·</span>
          <p style={{ fontSize: 14, fontWeight: 600 }}>tienmai.space</p>
        </div>
        {dataset && (
          <button onClick={() => { setDataset(null); setSpec(null); setError(""); }}
            style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "var(--font-display)" }}>
            + File mới
          </button>
        )}
      </header>

      <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "28px 28px 60px" }}>
        {/* Upload state */}
        {!dataset && (
          <div style={{ maxWidth: 560, margin: "60px auto 0", textAlign: "center" }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>Phân tích data tự động</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.7 }}>
              Upload file Excel hoặc CSV — AI sẽ phân tích và tạo dashboard cho bạn.
              Toàn bộ dữ liệu xử lý ngay trên trình duyệt, không gửi lên server.
            </p>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-hover)"}`,
                borderRadius: 16, padding: "48px 24px", cursor: "pointer",
                background: dragOver ? "var(--accent-dim)" : "var(--bg-card)",
                transition: "all .15s",
              }}>
              {loading ? (
                <>
                  <div style={{ width: 32, height: 32, margin: "0 auto 16px", borderRadius: "50%", border: "3px solid var(--accent)", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Đang phân tích dữ liệu...</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Kéo thả file vào đây</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>hoặc bấm để chọn — .csv, .xlsx, .xls</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={e => handleFile(e.target.files?.[0])} style={{ display: "none" }} />
            </div>

            {error && <p style={{ fontSize: 13, color: "#f87171", marginTop: 16 }}>{error}</p>}
          </div>
        )}

        {/* Dataset loaded */}
        {dataset && (
          <div style={{ animation: "fadeUp .3s ease both" }}>
            {/* Summary */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>{dataset.name}</h1>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {dataset.rowCount.toLocaleString()} dòng · {dataset.columns.length} cột
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 26 }}>
              Đã đọc & phân tích xong — dữ liệu xử lý hoàn toàn trên trình duyệt.
            </p>

            {/* AI Dashboard */}
            <div style={{ marginBottom: 38 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>DASHBOARD (AI)</h2>
                {spec && !generating && (
                  <button onClick={() => runGenerate(dataset)}
                    style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-display)" }}>
                    ↻ Tạo lại
                  </button>
                )}
              </div>

              {generating && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "40px 0", justifyContent: "center" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                  <span style={{ fontSize: 14, color: "var(--text-muted)" }}>AI đang thiết kế dashboard...</span>
                </div>
              )}

              {!generating && spec && <Charts spec={spec} rows={dataset.rows} />}

              {!generating && !spec && (
                <div style={{ padding: "24px 0" }}>
                  <button onClick={() => runGenerate(dataset)}
                    style={{ fontSize: 13, padding: "10px 20px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontFamily: "var(--font-display)" }}>
                    ✦ Tạo dashboard với AI
                  </button>
                </div>
              )}
            </div>

            {/* Schema */}
            <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 12 }}>CẤU TRÚC DỮ LIỆU</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, marginBottom: 36 }}>
              {dataset.columns.map(col => {
                const c = TYPE_COLORS[col.type];
                return (
                  <div key={col.name} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: 5, background: c.bg, color: c.fg, flexShrink: 0 }}>{col.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
                      <StatSummary col={col} stats={dataset.stats} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Preview */}
            <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 12 }}>XEM TRƯỚC (20 DÒNG ĐẦU)</h2>
            <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-card)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {dataset.columns.map(col => (
                      <th key={col.name} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", position: "sticky", top: 0, background: "var(--bg-surface)" }}>{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      {dataset.columns.map(col => (
                        <td key={col.name} style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--text)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row[col.name] == null ? <span style={{ color: "var(--text-dim)" }}>—</span> : String(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
