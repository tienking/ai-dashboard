from fastapi import FastAPI
from api import router

app = FastAPI(title="AI Dashboard API")
app.include_router(router)
