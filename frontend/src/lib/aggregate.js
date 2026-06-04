// Turns a chart spec + the full in-memory dataset into a small array of points
// ready for charting. All heavy work stays client-side; charts only ever receive
// aggregated data (≤ a few hundred points), never the raw rows.

const toNum = (v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v.replace(/,/g, "")); return Number.isFinite(n) ? n : null; }
  return null;
};

function aggregate(values, agg) {
  const nums = values.map(toNum).filter((n) => n !== null);
  switch (agg) {
    case "count": return values.length;
    case "sum":   return nums.reduce((a, b) => a + b, 0);
    case "avg":   return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "min":   return nums.length ? Math.min(...nums) : 0;
    case "max":   return nums.length ? Math.max(...nums) : 0;
    default:      return values.length;
  }
}

function groupBy(rows, dim, measure, agg, limit) {
  const groups = new Map();
  for (const r of rows) {
    const key = r[dim];
    if (key === null || key === undefined || key === "") continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(measure ? r[measure] : 1);
  }
  let data = [...groups.entries()].map(([name, vals]) => ({
    name: String(name),
    value: measure ? aggregate(vals, agg || "sum") : vals.length,
  }));
  data.sort((a, b) => b.value - a.value);
  if (limit && data.length > limit) data = data.slice(0, limit);
  return data;
}

function timeSeries(rows, dim, measure, agg) {
  const groups = new Map();
  for (const r of rows) {
    const key = r[dim];
    if (key === null || key === undefined || key === "") continue;
    const k = key instanceof Date ? key.toISOString().slice(0, 10) : String(key);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(measure ? r[measure] : 1);
  }
  return [...groups.entries()]
    .map(([name, vals]) => ({ name, value: measure ? aggregate(vals, agg || "sum") : vals.length }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

function histogram(rows, col, bins = 20) {
  const nums = rows.map((r) => toNum(r[col])).filter((n) => n !== null);
  if (!nums.length) return [];
  const min = Math.min(...nums), max = Math.max(...nums);
  if (min === max) return [{ name: String(min), value: nums.length }];
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  for (const n of nums) {
    let idx = Math.floor((n - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  const round = (x) => Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100;
  return counts.map((c, i) => ({ name: `${round(min + i * width)}`, value: c }));
}

function scatter(rows, x, y, cap = 500) {
  const pts = [];
  for (const r of rows) {
    const xv = toNum(r[x]), yv = toNum(r[y]);
    if (xv !== null && yv !== null) pts.push({ x: xv, y: yv });
  }
  if (pts.length <= cap) return pts;
  const step = Math.ceil(pts.length / cap);
  return pts.filter((_, i) => i % step === 0);
}

// Returns { kind, data, value? } describing what to render.
export function computeChart(chart, rows) {
  const limit = chart.limit || 12;
  switch (chart.type) {
    case "kpi":
      return { kind: "kpi", value: aggregate(rows.map((r) => (chart.y ? r[chart.y] : 1)), chart.agg || "sum") };
    case "bar":
    case "hbar":
    case "pie":
    case "donut":
    case "radial":
    case "treemap":
    case "table":
      return { kind: chart.type, data: groupBy(rows, chart.x, chart.y, chart.agg, limit) };
    case "line":
    case "area":
      return { kind: chart.type, data: timeSeries(rows, chart.x, chart.y, chart.agg) };
    case "histogram":
      return { kind: "histogram", data: histogram(rows, chart.x, chart.bins || 20) };
    case "scatter":
      return { kind: "scatter", data: scatter(rows, chart.x, chart.y) };
    default:
      return { kind: "empty", data: [] };
  }
}
