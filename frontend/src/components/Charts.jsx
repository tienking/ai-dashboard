import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from "recharts";
import { computeChart } from "../lib/aggregate";

const ACCENT = "#ec563d";
const PALETTE = ["#ec563d", "#60a5fa", "#4ade80", "#a78bfa", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#a3e635", "#e879f9", "#2dd4bf", "#f87171"];
const AXIS = { fontSize: 11, fill: "#6b7280", fontFamily: "DM Mono, monospace" };
const GRID = "rgba(255,255,255,0.06)";

const fmt = (n) => {
  if (typeof n !== "number" || !Number.isFinite(n)) return n;
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return Math.round(n * 100) / 100;
};

const tooltipStyle = {
  contentStyle: { background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontFamily: "DM Mono, monospace" },
  labelStyle: { color: "#f0f0f0" },
  itemStyle: { color: "#9ca3af" },
};

function ChartBody({ chart }) {
  const result = chart._computed;
  if (!result) return null;

  if (result.kind === "kpi") {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", padding: "8px 4px" }}>
        <div style={{ fontSize: 38, fontWeight: 800, color: ACCENT, lineHeight: 1.1 }}>{fmt(result.value)}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, fontFamily: "DM Mono, monospace" }}>
          {chart.agg || "sum"}{chart.y ? ` · ${chart.y}` : ""}
        </div>
      </div>
    );
  }

  const data = result.data || [];
  if (!data.length) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280", fontSize: 12 }}>No data</div>;

  if (result.kind === "bar" || result.kind === "histogram") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS} tickFormatter={fmt} tickLine={false} axisLine={false} width={44} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => fmt(v)} />
          <Bar dataKey="value" fill={ACCENT} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (result.kind === "line" || result.kind === "area") {
    const C = result.kind === "area" ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <C data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS} tickFormatter={fmt} tickLine={false} axisLine={false} width={44} />
          <Tooltip {...tooltipStyle} formatter={(v) => fmt(v)} />
          {result.kind === "area"
            ? <Area type="monotone" dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.18} strokeWidth={2} />
            : <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} dot={false} />}
        </C>
      </ResponsiveContainer>
    );
  }

  if (result.kind === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="78%" innerRadius="45%" paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />)}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v) => fmt(v)} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "DM Mono, monospace" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (result.kind === "scatter") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis type="number" dataKey="x" name={chart.x} tick={AXIS} tickFormatter={fmt} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis type="number" dataKey="y" name={chart.y} tick={AXIS} tickFormatter={fmt} tickLine={false} axisLine={false} width={44} />
          <Tooltip {...tooltipStyle} cursor={{ stroke: GRID }} formatter={(v) => fmt(v)} />
          <Scatter data={data} fill={ACCENT} fillOpacity={0.55} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (result.kind === "table") {
    return (
      <div style={{ overflowY: "auto", height: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "6px 8px", color: "var(--text)" }}>{d.name}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: ACCENT, fontFamily: "DM Mono, monospace" }}>{fmt(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

export default function Charts({ spec, rows }) {
  if (!spec?.charts?.length) return null;

  // Compute aggregated data for each chart once.
  const charts = spec.charts.map((c) => ({ ...c, _computed: computeChart(c, rows) }));

  return (
    <div>
      {spec.title && <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{spec.title}</h2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {charts.map((chart, i) => {
          const isKpi = chart.type === "kpi";
          return (
            <div key={i} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
              padding: "14px 16px", gridColumn: isKpi ? "span 1" : undefined,
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>{chart.title}</div>
              <div style={{ height: isKpi ? 90 : 220 }}>
                <ChartBody chart={chart} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
