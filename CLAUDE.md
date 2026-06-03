# CLAUDE.md — Project Instructions for Claude Code

> Loaded automatically at the start of every session.

This is **ai-dashboard**, a full-stack project in the `tienmai.space/projects/` collection.
It runs as an independent service: own repo, FastAPI backend on **port 8002**, served at
`tienmai.space/projects/ai-dashboard` via the shared Nginx on the Hostinger VPS.

---

## Commit Message Standard

Conventional Commits. Format:

```
type(scope): short description — ≤72 chars

- What changed and why
- Bundle doc updates into the same commit

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

**Types**: `feat` · `fix` · `refactor` · `style` · `docs` · `chore` · `ci`
**Scopes** (optional): `api` · `ui` · `auth` · `db` · `ai`

## Documentation Update Rule

After every code change, check and update in the same commit:
- `README.md` — features, tech stack, API
- `CLAUDE.md` — workflow rules or conventions
- (Add `PROJECT_CONTEXT.xml` / `SETUP.md` once the project grows.)

Use `type: docs` only when the commit touches docs exclusively.

## Workflow Conventions

- **Git**: commit only — never push. The developer pushes.
- **Remotes**: `origin` (GitLab) + `github` (GitHub). Branch `main` only.
- **No force-push** on `main`.

## Code Conventions

- **Comments**: English only.
- **Frontend styling**: 100% inline styles — no CSS classes/Tailwind/modules.
  Dark theme via CSS vars in `index.css` (shared tienmai.space palette, orange accent).
- **API namespace**: every route lives under `/api/ai-dashboard/` so Nginx can route to
  port 8002. Never use a bare `/api/...` path.
- **Vite base**: `/projects/ai-dashboard/` — keep it so assets resolve under the subpath.

## After Deploy

```bash
journalctl -u ai-dashboard -n 30   # look for "Application startup complete."
```

## tienmai.space project family

| Project | Port | Path |
|---------|------|------|
| tienmai-space (portfolio + admin) | 8000 | `/` , `/admin` |
| job-tracker | 8001 | `/jobtracker` |
| ai-dashboard | 8002 | `/projects/ai-dashboard` |
