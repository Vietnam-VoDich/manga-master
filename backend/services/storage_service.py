"""
Storage — saves files to local disk in dev, Railway volume in prod.
Files are served via FastAPI /static mount.
"""
import os, uuid, aiofiles
from core.config import STORAGE_BASE_URL, STATIC_DIR


def _mime(ext: str) -> str:
    return {"png": "image/png", "mp3": "audio/mpeg", "jpg": "image/jpeg"}.get(ext, "application/octet-stream")


async def upload(data: bytes, ext: str, folder: str = "pages") -> str:
    """Write bytes to disk, return public URL."""
    dest_dir = os.path.join(STATIC_DIR, folder)
    os.makedirs(dest_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(dest_dir, filename)
    async with aiofiles.open(path, "wb") as f:
        await f.write(data)
    return f"{STORAGE_BASE_URL}/{folder}/{filename}"
