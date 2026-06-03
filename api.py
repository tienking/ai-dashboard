from fastapi import APIRouter

router = APIRouter()

# All routes are namespaced under /api/ai-dashboard/ so Nginx can route this
# project's API to its own backend (port 8002) without clashing with the other
# projects on the same domain.

@router.get("/api/ai-dashboard/health")
async def health():
    return {"status": "ok", "service": "ai-dashboard"}
