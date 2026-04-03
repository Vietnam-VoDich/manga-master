from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import manga, auth, stripe, webhooks, transcribe
from core.config import FRONTEND_URL, STATIC_DIR
import os

app = FastAPI(title="Manga Master API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated images + audio
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(auth.router,        prefix="/auth",       tags=["auth"])
app.include_router(manga.router,       prefix="/manga",      tags=["manga"])
app.include_router(stripe.router,      prefix="/stripe",     tags=["stripe"])
app.include_router(webhooks.router,    prefix="/webhooks",   tags=["webhooks"])
app.include_router(transcribe.router,  prefix="/transcribe", tags=["transcribe"])

@app.get("/health")
def health():
    return {"status": "ok", "story_model": os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-mini")}
