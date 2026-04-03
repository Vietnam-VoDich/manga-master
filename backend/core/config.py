"""
Central model + service config.
To swap models: change env vars in Railway — no code changes needed.
"""
import os

# ── Azure OpenAI — Primary (GPT-5.2) ────────────────────────────────────────
AZURE_OPENAI_KEY      = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.2")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")

# ── Azure OpenAI — Fallback (GPT-5-mini) ────────────────────────────────────
AZURE_FALLBACK_KEY        = os.getenv("AZURE_FALLBACK_KEY")
AZURE_FALLBACK_ENDPOINT   = os.getenv("AZURE_FALLBACK_ENDPOINT")
AZURE_FALLBACK_DEPLOYMENT = os.getenv("AZURE_FALLBACK_DEPLOYMENT", "gpt-5-mini")
AZURE_FALLBACK_API_VERSION = os.getenv("AZURE_FALLBACK_API_VERSION", "2024-12-01-preview")

# ── Gemini (image generation) ────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
IMAGE_MODEL    = os.getenv("IMAGE_MODEL", "gemini-3.1-flash-image-preview")

# ── ElevenLabs (voice + music) ───────────────────────────────────────────────
ELEVENLABS_API_KEY       = os.getenv("ELEVENLABS_API_KEY")
NARRATOR_VOICE_ID        = os.getenv("ELEVENLABS_NARRATOR_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
ELEVENLABS_MUSIC_SECONDS = int(os.getenv("ELEVENLABS_MUSIC_SECONDS", "22"))

# ── Clerk ────────────────────────────────────────────────────────────────────
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_JWKS_URL   = os.getenv("CLERK_JWKS_URL")

# ── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY     = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PRICE_ID       = os.getenv("STRIPE_PRICE_ID")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# ── App ──────────────────────────────────────────────────────────────────────
FRONTEND_URL     = os.getenv("FRONTEND_URL", "http://localhost:3000")
DATABASE_URL     = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mangamaster")
STATIC_DIR       = os.getenv("STATIC_DIR", "/app/static")
STORAGE_BASE_URL = os.getenv("STORAGE_BASE_URL", "http://localhost:8000/static")
