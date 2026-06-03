// Thin client for the AI backend. Only sends schema + stats + a small sample —
// never the full dataset.

function payload(dataset, extra = {}) {
  return JSON.stringify({
    columns: dataset.columns,
    stats: dataset.stats,
    sample: dataset.rows.slice(0, 30),
    row_count: dataset.rowCount,
    ...extra,
  });
}

export async function generateDashboard(dataset) {
  const res = await fetch("/api/ai-dashboard/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload(dataset),
  });
  if (!res.ok) throw new Error("Không tạo được dashboard.");
  return res.json(); // dashboard spec
}

export async function chatAboutData(dataset, message, currentSpec, history) {
  const res = await fetch("/api/ai-dashboard/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload(dataset, { message, current_spec: currentSpec, history }),
  });
  if (!res.ok) throw new Error("Chat lỗi.");
  return res.json(); // { reply, spec }
}
