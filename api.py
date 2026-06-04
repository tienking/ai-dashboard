from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, GEMINI_MODEL
import json
import re

client = genai.Client(api_key=GEMINI_API_KEY)
router = APIRouter()

# ── Models ─────────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    columns: List[Dict[str, Any]]            # [{name, type}]
    stats: Dict[str, Any]                    # per-column stats
    sample: List[Dict[str, Any]]             # ~30 sample rows
    row_count: int = 0

class ChatRequest(BaseModel):
    message: str
    columns: List[Dict[str, Any]]
    stats: Dict[str, Any]
    sample: List[Dict[str, Any]]
    row_count: int = 0
    current_spec: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, str]]] = None   # [{role, content}]

# ── Dashboard spec contract (shared with the frontend renderer) ────────────────

SPEC_DOC = """
Dashboard spec = JSON object:
{
  "title": "<short dashboard title>",
  "charts": [ <chart>, ... ]    // 10-14 items total (including KPIs)
}

chart = {
  "type": "kpi" | "bar" | "hbar" | "line" | "area" | "pie" | "donut" | "radial" | "treemap" | "scatter" | "histogram" | "table",
  "title": "<chart title>",
  "x":      "<column name>",     // dimension (category/date for most; number for scatter/histogram)
  "y":      "<column name>",     // measure (numeric column); omit for count-based charts
  "agg":    "sum" | "avg" | "count" | "min" | "max",   // how to aggregate y over each x group
  "bins":   <int>,               // histogram only (default 20)
  "limit":  <int>                // grouped charts: keep top-N groups (default 12)
}

Rules:
- "kpi": one headline number. Use y + agg (e.g. total revenue = sum of "amount"). No x.
- "bar": x = a category column, y = numeric measure with agg (or omit y to count rows). Best for short labels.
- "hbar": horizontal bar — SAME as bar but better when category names are long. Prefer hbar over bar when labels are long.
- "line"/"area": x = a date column (or ordered category), y = numeric measure with agg. Good for trends over time.
- "pie": x = category, y = measure — proportions of a whole (use when ≤6 groups).
- "donut": like pie but with a hollow center showing the total. Use for a clean part-to-whole view.
- "radial": x = category, y = measure — stylish ranking of the top groups (use for ≤7 groups).
- "treemap": x = category, y = measure — composition/share when there are many groups.
- "scatter": x and y both numeric columns. Shows correlation.
- "histogram": x = a numeric column. Shows distribution.
- "table": x = a category column, y = numeric measure with agg → a small ranked table.
- Only use column names that exist. Pick the chart type that best fits each insight — VARY the types
  (mix bar/hbar, line/area, donut/pie/radial/treemap) instead of using the same type repeatedly.
- Be COMPREHENSIVE: produce 4-5 KPIs and 7-10 charts (10-14 items total). Analyze the data from many
  angles — overall totals, a breakdown for EACH important categorical column, trends over every date
  column, distributions of key numeric columns, correlations between numeric pairs, and top-N rankings.
  Don't stop at a few charts; cover the dataset thoroughly.
"""

def _build_data_context(columns, stats, sample, row_count):
    cols = "\n".join(f"- {c['name']} ({c['type']})" for c in columns)
    return (
        f"Dataset has {row_count} rows.\n\n"
        f"Columns:\n{cols}\n\n"
        f"Per-column stats (JSON):\n{json.dumps(stats, ensure_ascii=False, default=str)[:6000]}\n\n"
        f"Sample rows (JSON):\n{json.dumps(sample[:30], ensure_ascii=False, default=str)[:6000]}"
    )

def _extract_json(text: str):
    raw = re.sub(r"^```(?:json)?\s*", "", text.strip()).rstrip("` \n")
    return json.loads(raw)

# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/api/ai-dashboard/health")
async def health():
    return {"status": "ok", "service": "ai-dashboard"}

@router.post("/api/ai-dashboard/generate")
async def generate(req: GenerateRequest):
    """Generate a dashboard spec from the dataset schema + stats + sample."""
    prompt = (
        "You are a data analyst. Design an insightful dashboard for the dataset below.\n"
        "Return ONLY valid JSON matching this spec, no other text:\n"
        f"{SPEC_DOC}\n\n=== DATASET ===\n{_build_data_context(req.columns, req.stats, req.sample, req.row_count)}"
    )
    try:
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=8192),
        )
        return _extract_json(resp.text)
    except Exception as e:
        print(f"generate error: {e}")
        raise HTTPException(status_code=500, detail="Couldn't generate the dashboard. Please try again.")

@router.post("/api/ai-dashboard/chat")
async def chat(req: ChatRequest):
    """Answer questions about the data. May also return an updated dashboard spec
    when the user asks to change/add/remove charts."""
    system = (
        "You are an AI data analyst assistant for a dashboard tool. You help the user understand "
        "their dataset and adjust the dashboard. Always reply in English.\n\n"
        "You can SEE: column schema, per-column statistics, and a sample of rows — but NOT the full dataset. "
        "For exact aggregate numbers, reason from the provided stats; if a precise figure isn't available, say so plainly.\n\n"
        "When the user asks to change the dashboard (add/remove/modify a chart, change chart type, group differently, "
        "filter, sort, etc.), return an UPDATED full dashboard spec.\n\n"
        "ALWAYS respond with ONLY valid JSON, no other text:\n"
        '{ "reply": "<your conversational answer>", "spec": <updated dashboard spec> | null }\n'
        "Set \"spec\" to null when the user is only asking for information (not changing the dashboard).\n\n"
        f"Dashboard spec format:\n{SPEC_DOC}"
    )
    data_ctx = _build_data_context(req.columns, req.stats, req.sample, req.row_count)
    if req.current_spec:
        data_ctx += f"\n\nCurrent dashboard spec:\n{json.dumps(req.current_spec, ensure_ascii=False)[:4000]}"

    contents = []
    for m in (req.history or [])[-8:]:
        role = "model" if m.get("role") == "assistant" else "user"
        contents.append(types.Content(role=role, parts=[types.Part(text=m.get("content", ""))]))
    contents.append(types.Content(role="user", parts=[types.Part(text=f"{data_ctx}\n\n=== USER MESSAGE ===\n{req.message}")]))

    try:
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system, temperature=0.4),
        )
        result = _extract_json(resp.text)
        return {"reply": result.get("reply", ""), "spec": result.get("spec")}
    except Exception as e:
        print(f"chat error: {e}")
        return {"reply": "Something went wrong. Please try again.", "spec": None}
