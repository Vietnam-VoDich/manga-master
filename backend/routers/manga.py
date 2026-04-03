from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Manga, User
from agents.story_agent import generate_story
from services.image_service import generate_manga_image, manga_ify_photo
from services.audio_service import generate_narration, generate_theme_music
from services.storage_service import upload
import json

router = APIRouter()

async def _build_manga(manga_id: str, photo_bytes: bytes | None, db: Session):
    """Background task: generate full manga pipeline."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        return

    try:
        manga.status = "generating"
        db.commit()

        user = db.query(User).filter(User.id == manga.user_id).first()
        preview_only = not (user and user.is_subscribed)

        # 1. Generate story script
        script = await generate_story(manga.subject_name, manga.subject_description, preview_only)

        # 2. Generate theme music
        music_bytes = await generate_theme_music(script["music_prompt"])
        manga.audio_theme_url = upload(music_bytes, "mp3", "themes")

        # 3. Generate pages
        pages = []
        for act in script["acts"]:
            for page in act["pages"]:
                if page["type"] == "text":
                    pages.append({"type": "text", **page})
                elif page["type"] == "img":
                    if photo_bytes:
                        img_bytes = await manga_ify_photo(photo_bytes, page["image_prompt"])
                    else:
                        img_bytes = await generate_manga_image(page["image_prompt"])
                    img_url = upload(img_bytes, "png", "pages")

                    narr_text = page.get("caption", "")
                    narr_bytes = await generate_narration(narr_text) if narr_text else None
                    narr_url = upload(narr_bytes, "mp3", "narration") if narr_bytes else None

                    pages.append({
                        "type": "img",
                        "image_url": img_url,
                        "caption": page.get("caption"),
                        "bubble": page.get("bubble"),
                        "narration_url": narr_url,
                    })

        manga.pages = pages
        manga.title = script["title"]
        manga.status = "preview" if preview_only else "complete"
        manga.is_preview = preview_only
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
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    # TODO: replace with real auth dependency
    user_id: str = Form(...),
):
    photo_bytes = await photo.read() if photo else None

    manga = Manga(
        user_id=user_id,
        subject_name=subject_name,
        subject_description=description,
        status="pending",
    )
    db.add(manga)
    db.commit()
    db.refresh(manga)

    background_tasks.add_task(_build_manga, manga.id, photo_bytes, db)
    return {"manga_id": manga.id, "status": "pending"}


@router.get("/{manga_id}")
def get_manga(manga_id: str, db: Session = Depends(get_db)):
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Manga not found")
    return manga


@router.get("/user/{user_id}")
def list_mangas(user_id: str, db: Session = Depends(get_db)):
    return db.query(Manga).filter(Manga.user_id == user_id).order_by(Manga.created_at.desc()).all()
