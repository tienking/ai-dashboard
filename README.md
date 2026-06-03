# AI Dashboard

A full-stack project under the **tienmai.space** umbrella, served at
[tienmai.space/projects/ai-dashboard](https://tienmai.space/projects/ai-dashboard).

> First entry in the `projects/` collection. Each project is an independent
> full-stack app (own repo, own backend port) served under `/projects/<name>`.

---

## Status

🚧 Skeleton only — backend health endpoint + frontend landing page. Features TBD.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Backend | Python / FastAPI · Uvicorn (port **8002**) |
| Frontend | React 19 + Vite (base `/projects/ai-dashboard/`) |
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
    └── src/
        ├── main.jsx
        ├── App.jsx          # Landing page + API health check
        └── index.css        # Dark theme CSS vars (tienmai.space palette)
```

---

## Local Development

```bash
# Backend
python -m venv ai-dashboard-venv
source ai-dashboard-venv/bin/activate    # Windows: ai-dashboard-venv\Scripts\activate
pip install -r requirements.txt
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

All routes are namespaced under `/api/ai-dashboard/` so Nginx can route this
project's API to port 8002 without clashing with other projects on the domain.

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
