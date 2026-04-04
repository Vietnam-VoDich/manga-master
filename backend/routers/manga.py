from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Manga, User
from agents.story_agent import generate_story
from services.image_service import generate_manga_image, manga_ify_photo
from services.audio_service import generate_narration, generate_theme_music
from services.storage_service import upload
from core.auth import verify_clerk_token
from typing import Optional

router = APIRouter()


async def _build_manga(manga_id: str, photo_bytes: bytes | None, db: Session):
    """Background task: full generation pipeline."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        return
    try:
        manga.status = "generating"
        db.commit()

        # Guest or unsubscribed user = preview only (cover + 1 page)
        user = db.query(User).filter(User.id == manga.user_id).first() if manga.user_id else None
        preview_only = not (user and user.is_subscribed)

        # 1. Story script
        script = await generate_story(manga.subject_name, manga.subject_description, preview_only)
        manga.title      = script.get("title")
        manga.title_jp   = script.get("title_jp")
        manga.tagline    = script.get("tagline")
        manga.model_used = script.get("model_used")

        # 2. Theme music
        music_bytes = await generate_theme_music(script.get("music_prompt", "cinematic dramatic orchestral slow"))
        manga.audio_theme_url = await upload(music_bytes, "mp3", "themes")

        # 3. Pages
        pages = []
        for page in script.get("pages", []):
            if page["type"] == "text":
                pages.append(page)

            elif page["type"] == "img":
                if photo_bytes:
                    img_bytes = await manga_ify_photo(photo_bytes, page["image_prompt"])
                else:
                    img_bytes = await generate_manga_image(page["image_prompt"])
                img_url = await upload(img_bytes, "png", "pages")

                narr_url = None
                caption = page.get("caption", "")
                if caption:
                    narr_bytes = await generate_narration(caption)
                    narr_url = await upload(narr_bytes, "mp3", "narration")

                pages.append({
                    "type": "img",
                    "image_url": img_url,
                    "caption": caption,
                    "bubble": page.get("bubble"),
                    "narration_url": narr_url,
                })

            elif page["type"] in ("climax", "ending"):
                pages.append(page)

        manga.pages = pages
        manga.is_preview = preview_only
        manga.status = "preview" if preview_only else "complete"
        db.commit()

    except Exception as e:
        manga.status = "error"
        db.commit()
        raise e


@router.post("/create")
async def create_manga(
    background_tasks: BackgroundTasks,
    subject_name: str = Form(...),
    description: str = Form(...),
    user_id: Optional[str] = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """No auth required — guests can generate a preview manga."""
    photo_bytes = await photo.read() if photo else None
    manga = Manga(user_id=user_id or None, subject_name=subject_name, subject_description=description)
    db.add(manga)
    db.commit()
    db.refresh(manga)
    background_tasks.add_task(_build_manga, manga.id, photo_bytes, db)
    return {"manga_id": manga.id, "status": "pending"}


@router.get("/{manga_id}")
def get_manga(manga_id: str, db: Session = Depends(get_db)):
    """No auth required — guests can poll their manga status."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    return manga


@router.patch("/{manga_id}/claim")
def claim_manga(manga_id: str, body: dict, db: Session = Depends(get_db)):
    """Associate a guest manga with a user after they sign up."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    if manga.user_id:
        return manga  # Already claimed, no-op
    manga.user_id = body.get("user_id")
    db.commit()
    db.refresh(manga)
    return manga


@router.post("/{manga_id}/expand")
async def expand_manga(manga_id: str, body: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Re-generate the full story for a subscribed user's preview manga."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    user_id = body.get("user_id")
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if not user or not user.is_subscribed:
        raise HTTPException(403, "Subscription required")
    # Reset to pending so the reader shows "generating"
    manga.status = "pending"
    manga.is_preview = False
    manga.pages = []
    db.commit()
    # Re-fetch photo if stored
    background_tasks.add_task(_build_manga, manga_id, None, db)
    return {"manga_id": manga_id, "status": "pending"}


@router.get("/user/{user_id}")
def list_mangas(user_id: str, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    return db.query(Manga).filter(Manga.user_id == user_id).order_by(Manga.created_at.desc()).all()
