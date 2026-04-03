"""
Storage — saves images and audio to Supabase Storage (acts as S3).
"""
from supabase import create_client
import os, uuid

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
BUCKET = "manga-assets"

def upload(data: bytes, ext: str, folder: str = "pages") -> str:
    """Upload bytes, return public URL."""
    filename = f"{folder}/{uuid.uuid4()}.{ext}"
    supabase.storage.from_(BUCKET).upload(filename, data, {"content-type": _mime(ext)})
    return supabase.storage.from_(BUCKET).get_public_url(filename)

def _mime(ext: str) -> str:
    return {"png": "image/png", "mp3": "audio/mpeg", "jpg": "image/jpeg"}.get(ext, "application/octet-stream")
