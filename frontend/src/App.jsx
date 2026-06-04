import { useState, useRef, useCallback, useEffect } from "react";
import { parseFile } from "./lib/parse";
import { saveDataset, listDatasets, getDataset, deleteDataset } from "./lib/db";
import { generateDashboard } from "./lib/ai";
import Charts from "./components/Charts";
import ChatPopup from "./components/ChatPopup";

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState([]);
  const fileRef = useRef(null);

  const refreshSaved = useCallback(() => { listDatasets().then(setSaved).catch(() => {}); }, []);
  useEffect(() => { refreshSaved(); }, [refreshSaved]);

  const openSaved = useCallback(async (id) => {
    setError(""); setLoading(true);
    try {
      const ds = await getDataset(id);
      if (ds) { setDataset(ds); setSpec(ds.spec || null); }
    } catch { setError("Couldn't open the saved dashboard."); }
    setLoading(false);
  }, []);

  const removeSaved = useCallback(async (id, e) => {
    e.stopPropagation();
    await deleteDataset(id);
    refreshSaved();
  }, [refreshSaved]);

  const runGenerate = useCallback(async (ds) => {
    setGenerating(true); setSpec(null);
    try {
      const newSpec = await generateDashboard(ds);
      setSpec(newSpec);
      await saveDataset({ ...ds, spec: newSpec });
    } catch (e) {
      setError("AI: " + (e.message || "couldn't generate the dashboard."));
    }
    setGenerating(false);
  }, []);

  // Chat asked to modify the dashboard — apply + persist.
  const applySpec = useCallback((newSpec) => {
    setSpec(newSpec);
    if (dataset) saveDataset({ ...dataset, spec: newSpec });
  }, [dataset]);

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
      refreshSaved();
      runGenerate(ds);
    } catch (e) {
      setError(e.message || "Couldn't read the file.");
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
            + New file
          </button>
        )}
      </header>

      <main style={{ flex: 1, width: "100%", padding: "28px 32px 60px" }}>
        {/* Upload state */}
        {!dataset && (
          <div style={{ maxWidth: 560, margin: "60px auto 0", textAlign: "center" }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>Automatic data analysis</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.7 }}>
              Upload an Excel or CSV file — AI analyzes it and builds a dashboard for you.
              Everything runs right in your browser; nothing is sent to a server.
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
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Analyzing data...</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Drag & drop a file here</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>or click to choose — .csv, .xlsx, .xls</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={e => handleFile(e.target.files?.[0])} style={{ display: "none" }} />
            </div>

            {error && <p style={{ fontSize: 13, color: "#f87171", marginTop: 16 }}>{error}</p>}

            {saved.length > 0 && (
              <div style={{ marginTop: 44, textAlign: "left" }}>
                <h2 style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 12 }}>SAVED ({saved.length})</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {saved.map(s => (
                    <div key={s.id} onClick={() => openSaved(s.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", transition: "border-color .15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.spec ? "📊 " : "📄 "}{s.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                          {s.rowCount?.toLocaleString()} rows · {s.columns?.length} cols · {new Date(s.createdAt).toLocaleDateString("en-US")}
                        </div>
                      </div>
                      <button onClick={e => removeSaved(s.id, e)} title="Delete"
                        style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dataset loaded */}
        {dataset && (
          <div style={{ animation: "fadeUp .3s ease both" }}>
            {/* Summary */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>{dataset.name}</h1>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} cols
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 26 }}>
              Parsed & analyzed — everything runs in your browser.
            </p>

            {/* AI Dashboard */}
            <div style={{ marginBottom: 38 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>DASHBOARD (AI)</h2>
                {spec && !generating && (
                  <button onClick={() => runGenerate(dataset)}
                    style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-display)" }}>
                    ↻ Regenerate
                  </button>
                )}
              </div>

              {generating && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "40px 0", justifyContent: "center" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                  <span style={{ fontSize: 14, color: "var(--text-muted)" }}>AI is designing your dashboard...</span>
                </div>
              )}

              {!generating && spec && <Charts spec={spec} rows={dataset.rows} />}

              {!generating && !spec && (
                <div style={{ padding: "24px 0" }}>
                  <button onClick={() => runGenerate(dataset)}
                    style={{ fontSize: 13, padding: "10px 20px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontFamily: "var(--font-display)" }}>
                    ✦ Generate dashboard with AI
                  </button>
                </div>
              )}
            </div>

            {/* Preview */}
            <h2 style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 12 }}>PREVIEW (FIRST 20 ROWS)</h2>
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

      {dataset && <ChatPopup dataset={dataset} spec={spec} onSpecUpdate={applySpec} />}
    </div>
  );
}
