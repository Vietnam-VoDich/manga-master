from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import manga, auth, stripe, webhooks, transcribe
from core.config import FRONTEND_URL, STATIC_DIR
from db.database import engine
from sqlalchemy import text
import os

app = FastAPI(title="Manga Master API", version="1.0.0")

# Run safe migrations on startup
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE mangas ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE"))
    conn.commit()

_cors_origins = ["http://localhost:3000"]
if FRONTEND_URL:
    _cors_origins.append(FRONTEND_URL)
    # allow all *.vercel.app previews
if "vercel.app" in (FRONTEND_URL or ""):
    _cors_origins.append("https://*.vercel.app")
_cors_origins += ["https://emaki.app", "https://www.emaki.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://(.*\.vercel\.app|emaki\.app|www\.emaki\.app)",
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
    return {
        "status": "ok",
        "primary_model": os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.2"),
        "fallback_model": os.getenv("AZURE_FALLBACK_DEPLOYMENT", "gpt-5-mini"),
        "image_model": os.getenv("IMAGE_MODEL", "gemini-3.1-flash-image-preview"),
    }
