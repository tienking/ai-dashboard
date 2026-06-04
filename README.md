# AI Dashboard

A full-stack project under the **tienmai.space** umbrella, served at
[tienmai.space/projects/ai-dashboard](https://tienmai.space/projects/ai-dashboard).

> First entry in the `projects/` collection. Each project is an independent
> full-stack app (own repo, own backend port) served under `/projects/<name>`.

---

## What it does

1. **Upload** an Excel/CSV file — parsed entirely in the browser via a Web Worker
   (PapaParse / SheetJS), so large files (100k+ rows) don't freeze the UI and the
   raw data never leaves the device.
2. **Auto schema + stats** — column types (number/date/category/text) and per-column
   statistics computed client-side.
3. **AI dashboard** — schema + stats + a 30-row sample are sent to Gemini, which
   returns a dashboard spec (which charts, which columns, how to aggregate). The
   frontend aggregates the full dataset client-side and renders with Recharts.
4. **Chatbot** (bottom-right) — answers questions about the data and can modify the
   dashboard on request (AI returns an updated spec applied live).
5. **Saved dashboards** — datasets + specs persist in IndexedDB (client-side only,
   0 bytes on the VPS). Reopen or delete from the start screen.

> Privacy/cost by design: the VPS stores no uploaded data and the AI only ever
> receives a compact summary (schema + stats + small sample), never the full rows.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Backend | Python / FastAPI · Uvicorn (port **8002**) · google-genai (Gemini `gemini-2.5-flash`) |
| Frontend | React 19 + Vite (base `/projects/ai-dashboard/`) |
| Parsing | PapaParse (CSV) + SheetJS/xlsx (Excel) in a Web Worker |
| Charts | Recharts · client-side aggregation engine |
| Storage | IndexedDB (`idb`) — datasets + specs, client-side only |
| Fonts | Inter (text/numbers) + JetBrains Mono (labels) |
| Hosting | Hostinger VPS (shared), Nginx, systemd, GitLab CI/CD |

---

## Project Structure

```
ai-dashboard/
├── main.py                  # FastAPI entry point
├── api.py                   # Routes (namespaced /api/ai-dashboard/*)
├── config.py                # Env loader
├── requirements.txt
├── .env.example
├── .gitlab-ci.yml           # CI/CD (deploy on push to main)
├── deploy/
│   ├── ai-dashboard.service # systemd unit (port 8002)
│   └── nginx-snippet.conf   # Nginx location blocks
└── frontend/
    ├── index.html
    ├── vite.config.js       # base "/projects/ai-dashboard/", proxy → 8002
    ├── public/
    │   └── favicon.svg      # 📊 chart icon
    └── src/
        ├── main.jsx
        ├── App.jsx          # Upload → schema → AI dashboard → preview; saved list
        ├── index.css        # Dark theme CSS vars + fonts
        ├── components/
        │   ├── Charts.jsx       # Recharts renderer (kpi/bar/hbar/line/area/
        │   │                    # pie/donut/radial/treemap/scatter/histogram/table)
        │   └── ChatPopup.jsx    # Bottom-right chatbot (Q&A + live chart edits)
        └── lib/
            ├── parse.js         # Promise wrapper around the parse worker
            ├── parse.worker.js  # CSV/Excel parsing off the main thread
            ├── analyze.js       # Column type inference + per-column stats
            ├── aggregate.js     # Spec → aggregated chart data (client-side)
            ├── db.js            # IndexedDB save/list/get/delete
            └── ai.js            # API client (sends only schema+stats+sample)
```

---

## Local Development

```bash
# Backend
python -m venv ai-dashboard-venv
source ai-dashboard-venv/bin/activate    # Windows: ai-dashboard-venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                      # set GEMINI_API_KEY
uvicorn main:app --port 8002

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                              # proxies /api/ to http://127.0.0.1:8002
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai-dashboard/health` | Health check → `{status, service}` |
| POST | `/api/ai-dashboard/generate` | schema+stats+sample → dashboard spec |
| POST | `/api/ai-dashboard/chat` | Q&A about the data; may return an updated spec |

All routes are namespaced under `/api/ai-dashboard/` so Nginx can route this
project's API to port 8002 without clashing with other projects on the domain.
The backend is a thin Gemini proxy — it never receives or stores raw data.

### Dashboard spec (shared contract between AI and the renderer)

```json
{ "title": "...", "charts": [
  { "type": "kpi|bar|hbar|line|area|pie|donut|radial|treemap|scatter|histogram|table",
    "title": "...", "x": "<col>", "y": "<col>", "agg": "sum|avg|count|min|max",
    "limit": 12, "bins": 20 }
]}
```

The AI generates a comprehensive dashboard (4-5 KPIs + 7-10 varied charts) and the
chatbot can return an updated spec to edit it live.

Requires `GEMINI_API_KEY` in `.env` (reuses the tienmai-space key). Model is set via
`GEMINI_MODEL` (default `gemini-2.5-flash`).

---

## Deployment

Auto-deploy via GitLab CI/CD on push to `main`. On the VPS:

```bash
# /usr/local/bin/deploy-ai-dashboard.sh
cd /root/projects/ai-dashboard
git pull origin main
source ai-dashboard-venv/bin/activate
pip install -r requirements.txt --quiet
cd frontend && npm install --silent && npm run build && cd ..
systemctl restart ai-dashboard
```

Add the blocks from `deploy/nginx-snippet.conf` to the tienmai Nginx server block.
