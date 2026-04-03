from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Manga, User
from agents.story_agent import generate_story
from services.image_service import generate_manga_image, manga_ify_photo
from services.audio_service import generate_narration, generate_theme_music
from services.storage_service import upload
from core.auth import verify_clerk_token

router = APIRouter()


async def _build_manga(manga_id: str, photo_bytes: bytes | None, db: Session):
    """Background task: full generation pipeline."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        return
    try:
        manga.status = "generating"
        db.commit()

        user = db.query(User).filter(User.id == manga.user_id).first()
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
    user_id: str = Form(...),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _claims: dict = Depends(verify_clerk_token),
):
    photo_bytes = await photo.read() if photo else None
    manga = Manga(user_id=user_id, subject_name=subject_name, subject_description=description)
    db.add(manga)
    db.commit()
    db.refresh(manga)
    background_tasks.add_task(_build_manga, manga.id, photo_bytes, db)
    return {"manga_id": manga.id, "status": "pending"}


@router.get("/{manga_id}")
def get_manga(manga_id: str, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    return manga


@router.get("/user/{user_id}")
def list_mangas(user_id: str, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    return db.query(Manga).filter(Manga.user_id == user_id).order_by(Manga.created_at.desc()).all()
