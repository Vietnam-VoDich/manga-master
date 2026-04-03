"""
Central model + service config.
Change models here or via env vars — nothing else needs updating.
"""
import os

# ── Azure OpenAI (story agent) ──────────────────────────────────────────────
AZURE_OPENAI_KEY      = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_API_VERSION     = os.getenv("AZURE_API_VERSION", "2024-12-01-preview")

# Swap this to "gpt-5", "gpt-5-mini", "o3", etc. in Railway env vars
STORY_MODEL = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-mini")

# ── Gemini (image generation) ───────────────────────────────────────────────
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
# Options: gemini-3.1-flash-image-preview | gemini-3-pro-image-preview
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "gemini-3.1-flash-image-preview")

# ── ElevenLabs (voice + music) ──────────────────────────────────────────────
ELEVENLABS_API_KEY       = os.getenv("ELEVENLABS_API_KEY")
NARRATOR_VOICE_ID        = os.getenv("ELEVENLABS_NARRATOR_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
ELEVENLABS_MUSIC_SECONDS = int(os.getenv("ELEVENLABS_MUSIC_SECONDS", "22"))

# ── Clerk (auth) ────────────────────────────────────────────────────────────
CLERK_SECRET_KEY  = os.getenv("CLERK_SECRET_KEY")
CLERK_JWKS_URL    = os.getenv("CLERK_JWKS_URL")  # https://<your-clerk-domain>/.well-known/jwks.json

# ── Stripe ──────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY    = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PRICE_ID      = os.getenv("STRIPE_PRICE_ID")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# ── App ─────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mangamaster")

# ── Storage (local disk in dev, Railway volume in prod) ─────────────────────
STORAGE_BASE_URL = os.getenv("STORAGE_BASE_URL", "http://localhost:8000/static")
STATIC_DIR       = os.getenv("STATIC_DIR", "/app/static")
