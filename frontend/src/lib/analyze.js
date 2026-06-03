// Column type inference + per-column statistics, computed client-side.
// Designed to run inside the parse web worker on the full dataset.

const DATE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;

function isNumber(v) {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim() !== "") return Number.isFinite(Number(v.replace(/,/g, "")));
  return false;
}

function isDate(v) {
  if (v instanceof Date) return true;
  if (typeof v === "string" && DATE_RE.test(v.trim())) return !isNaN(Date.parse(v));
  return false;
}

function inferType(values) {
  if (!values.length) return "text";
  const sample = values.slice(0, 1000);
  let nums = 0, dates = 0;
  for (const v of sample) {
    if (isNumber(v)) nums++;
    else if (isDate(v)) dates++;
  }
  if (nums / sample.length >= 0.9) return "number";
  if (dates / sample.length >= 0.9) return "date";
  // categorical if few distinct values relative to count
  const distinct = new Set(sample).size;
  if (distinct <= 50 && distinct / sample.length < 0.5) return "category";
  return "text";
}

function numStats(values) {
  const nums = values.map(v => Number(String(v).replace(/,/g, ""))).filter(Number.isFinite).sort((a, b) => a - b);
  const n = nums.length;
  if (!n) return { count: 0 };
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 ? nums[(n - 1) / 2] : (nums[n / 2 - 1] + nums[n / 2]) / 2;
  return { count: n, min: nums[0], max: nums[n - 1], mean, median, sum };
}

function catStats(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([value, count]) => ({ value: String(value), count }));
  return { distinct: counts.size, top };
}

function dateStats(values) {
  const ts = values.map(v => Date.parse(v)).filter(t => !isNaN(t));
  if (!ts.length) return { count: 0 };
  return { count: ts.length, min: new Date(Math.min(...ts)).toISOString().slice(0, 10), max: new Date(Math.max(...ts)).toISOString().slice(0, 10) };
}

export function analyzeColumns(rows) {
  if (!rows?.length) return { columns: [], stats: {} };
  const colNames = Object.keys(rows[0]);
  const columns = [];
  const stats = {};

  for (const col of colNames) {
    const present = [];
    let missing = 0;
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i][col];
      if (v === null || v === undefined || v === "") missing++;
      else present.push(v);
    }
    const type = inferType(present);
    columns.push({ name: col, type });
    const base = { missing, total: rows.length };
    if (type === "number") stats[col] = { ...base, ...numStats(present) };
    else if (type === "date") stats[col] = { ...base, ...dateStats(present) };
    else if (type === "category") stats[col] = { ...base, ...catStats(present) };
    else stats[col] = { ...base, distinct: new Set(present).size };
  }
  return { columns, stats };
}
