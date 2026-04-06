from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from db.database import get_db
from db.models import Manga, User
from agents.story_agent import generate_story, generate_story_streaming, generate_continuation, agent_decide
from services.image_service import generate_manga_image, manga_ify_photo
from services.audio_service import generate_narration, generate_theme_music
from services.storage_service import upload
from core.auth import verify_clerk_token
from typing import Optional, List
import httpx, asyncio, json, logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ── helpers ────────────────────────────────────────────────────────────────────

def _compress_image(raw_bytes: bytes, quality: int = 82) -> bytes:
    """Compress to JPEG for faster loading."""
    from PIL import Image
    import io
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        return buf.getvalue()
    except Exception:
        return raw_bytes


async def _render_one_image(page: dict, photo_bytes: bytes | None, all_photos: list[dict] | None = None) -> dict | None:
    """Render a single image page — generate image + narration.
    all_photos: list of {bytes, caption} dicts for multi-photo reference.
    """
    try:
        if all_photos and len(all_photos) > 0:
            img_bytes = await manga_ify_photo(
                all_photos[0]["bytes"],
                page["image_prompt"],
                extra_photos=all_photos[1:] if len(all_photos) > 1 else None,
            )
        elif photo_bytes:
            img_bytes = await manga_ify_photo(photo_bytes, page["image_prompt"])
        else:
            img_bytes = await generate_manga_image(page["image_prompt"])
        img_bytes = _compress_image(img_bytes)
        img_url = await upload(img_bytes, "jpg", "pages")
    except Exception:
        return None

    narr_url = None
    caption = page.get("caption", "")
    if caption:
        try:
            narr_bytes = await generate_narration(caption)
            narr_url = await upload(narr_bytes, "mp3", "narration")
        except Exception:
            pass

    return {
        "type": "img",
        "image_url": img_url,
        "caption": caption,
        "bubble": page.get("bubble"),
        "narration_url": narr_url,
    }


async def _render_pages(raw_pages: list, photo_bytes: bytes | None, all_photos: list[dict] | None = None) -> list:
    """Render story-script pages into fully-resolved page dicts. Images rendered in parallel."""
    # Separate img pages for parallel rendering, keep order
    img_indices = []
    img_tasks = []
    for i, page in enumerate(raw_pages):
        if page["type"] == "img":
            img_indices.append(i)
            img_tasks.append(_render_one_image(page, photo_bytes, all_photos))

    # Run all image generations in parallel
    img_results = await asyncio.gather(*img_tasks) if img_tasks else []
    img_map = {}
    for idx, result in zip(img_indices, img_results):
        if result:
            img_map[idx] = result

    # Build final page list preserving order
    pages = []
    for i, page in enumerate(raw_pages):
        if page["type"] == "text":
            pages.append(page)
        elif page["type"] == "img":
            if i in img_map:
                pages.append(img_map[i])
        elif page["type"] in ("climax", "ending"):
            pages.append(page)

    return pages


async def _fetch_photo(photo_url: str | None) -> bytes | None:
    """Re-fetch stored photo bytes from its URL."""
    if not photo_url:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(photo_url)
            r.raise_for_status()
            return r.content
    except Exception:
        return None


async def _load_all_photos(manga) -> list[dict] | None:
    """Load all reference photos from manga.photos JSON. Returns list of {bytes, caption}."""
    photos_meta = manga.photos or []
    if not photos_meta:
        # Fallback to legacy single photo
        b = await _fetch_photo(manga.photo_url)
        return [{"bytes": b, "caption": ""}] if b else None
    results = []
    for pm in photos_meta:
        b = await _fetch_photo(pm.get("url"))
        if b:
            results.append({"bytes": b, "caption": pm.get("caption", "")})
    return results if results else None


def _pages_summary(pages: list) -> str:
    lines = []
    for i, p in enumerate(pages):
        if p.get("type") == "text":
            lines.append(f"p{i+1} text: {p.get('title','')} — {(p.get('narr') or '')[:80]}…")
        elif p.get("type") == "img":
            lines.append(f"p{i+1} image: {(p.get('caption') or '')[:60]}")
        elif p.get("type") == "climax":
            lines.append(f"p{i+1} climax: {(p.get('quote') or '')[:60]}")
        elif p.get("type") == "ending":
            lines.append(f"p{i+1} ending")
    return "\n".join(lines)


# ── background tasks ────────────────────────────────────────────────────────────

async def _build_manga(manga_id: str, photo_bytes: bytes | None, db: Session, tone: str = "humorous", all_photos: list[dict] | None = None):
    """Full generation pipeline — streams pages to DB as each act completes."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        return
    try:
        manga.status = "generating"
        db.commit()

        user = db.query(User).filter(User.id == manga.user_id).first() if manga.user_id else None
        preview_only = not (user and user.is_subscribed)

        # Build photo context for story agent from captions
        photo_context = ""
        if all_photos:
            captions = [f"Photo {i+1}: {p['caption']}" for i, p in enumerate(all_photos) if p.get("caption")]
            if captions:
                photo_context = "\n\nReference photos provided:\n" + "\n".join(captions)

        pages = []
        music_task = None
        outline = {}

        description_with_photos = manga.subject_description + photo_context
        async for chunk in generate_story_streaming(manga.subject_name, description_with_photos, preview_only, tone):
            if not outline and chunk.get("outline"):
                # First chunk — outline arrived, set title/tagline and start music
                outline = chunk["outline"]
                manga.title      = outline.get("title")
                manga.title_jp   = outline.get("title_jp")
                manga.tagline    = outline.get("tagline")
                manga.model_used = chunk.get("model_used")
                manga.pages      = []
                manga.status     = "streaming"
                db.commit()
                async def _save_music(prompt: str, mid: str):
                    try:
                        music_bytes = await generate_theme_music(prompt)
                        music_url = await upload(music_bytes, "mp3", "themes")
                        # Re-fetch manga in this task's context and save immediately
                        m = db.query(Manga).filter(Manga.id == mid).first()
                        if m:
                            m.audio_theme_url = music_url
                            db.commit()
                    except Exception:
                        pass
                music_task = asyncio.create_task(
                    _save_music(outline.get("music_prompt", "cinematic dramatic orchestral slow"), manga_id)
                )

            # Render new pages from this act — images in parallel
            act_img_pages = [p for p in chunk.get("new_pages", []) if p["type"] == "img"]
            act_other_pages = [p for p in chunk.get("new_pages", []) if p["type"] != "img"]

            # Generate all images for this act in parallel
            img_tasks = [_render_one_image(p, photo_bytes, all_photos) for p in act_img_pages]
            img_results = await asyncio.gather(*img_tasks) if img_tasks else []

            # Rebuild page order
            img_iter = iter(img_results)
            for page in chunk.get("new_pages", []):
                if page["type"] == "text":
                    pages.append(page)
                elif page["type"] == "img":
                    rendered = next(img_iter)
                    if rendered:
                        pages.append(rendered)
                elif page["type"] in ("climax", "ending"):
                    pages.append(page)

                # Commit after each page so frontend can poll and see it
                manga.pages = list(pages)
                flag_modified(manga, "pages")
                db.commit()

        # Wait for music task to finish (it saves itself to DB already)
        if music_task:
            await asyncio.shield(music_task)

        manga.is_preview = preview_only
        manga.status = "preview" if preview_only else "complete"
        db.commit()

    except Exception as e:
        manga.status = "error"
        db.commit()
        raise e


async def _continue_manga(manga_id: str, db: Session):
    """Continue an existing preview manga: generate Acts II-V and append."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        return
    try:
        manga.status = "generating"
        db.commit()

        # Act I pages are already stored — keep them
        act_one_pages = list(manga.pages or [])

        photo_bytes = await _fetch_photo(manga.photo_url)
        all_photos = await _load_all_photos(manga)

        script = await generate_continuation(
            manga.subject_name,
            manga.subject_description,
            act_one_pages,
            manga.title or manga.subject_name,
            manga.tagline or "",
        )

        # Start music generation in parallel if not already present
        music_task = None
        if not manga.audio_theme_url:
            music_prompt = script.get("music_prompt", "cinematic dramatic orchestral slow")
            async def _save_music_continue(prompt: str, mid: str):
                try:
                    music_bytes = await generate_theme_music(prompt)
                    music_url = await upload(music_bytes, "mp3", "themes")
                    m = db.query(Manga).filter(Manga.id == mid).first()
                    if m:
                        m.audio_theme_url = music_url
                        db.commit()
                except Exception:
                    pass
            music_task = asyncio.create_task(_save_music_continue(music_prompt, manga_id))

        new_pages = await _render_pages(script.get("pages", []), photo_bytes, all_photos)

        if music_task:
            await asyncio.shield(music_task)

        manga.pages = act_one_pages + new_pages
        manga.is_preview = False
        manga.status = "complete"
        db.commit()

    except Exception as e:
        manga.status = "error"
        db.commit()
        raise e


async def _run_enhance(manga_id: str, user_id: str, instruction: str, db: Session):
    """Agent-driven enhance: decide action, execute, update manga."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        return
    try:
        current_pages = list(manga.pages or [])
        summary = _pages_summary(current_pages)

        decision = await agent_decide(
            manga.subject_name,
            manga.title or manga.subject_name,
            manga.tagline or "",
            summary,
            instruction,
        )

        action = decision.get("action", "add_pages")
        photo_bytes = await _fetch_photo(manga.photo_url)
        all_photos = await _load_all_photos(manga)

        if action == "add_pages":
            new_raw = decision.get("pages", [])
            new_pages = await _render_pages(new_raw, photo_bytes, all_photos)

            insert_before = decision.get("insert_before", "climax")
            insert_at = len(current_pages)
            for i, p in enumerate(current_pages):
                if insert_before == "climax" and p.get("type") == "climax":
                    insert_at = i
                    break
                elif insert_before == "ending" and p.get("type") == "ending":
                    insert_at = i
                    break

            updated = current_pages[:insert_at] + new_pages + current_pages[insert_at:]
            manga.pages = updated

        elif action == "replace_ending":
            updated = [p for p in current_pages if p.get("type") != "ending"]
            updated.append({
                "type": "ending",
                "ending_text": decision.get("ending_text", ""),
                "ending_kanji": decision.get("ending_kanji", "終"),
            })
            manga.pages = updated

        elif action == "replace_climax":
            updated = []
            for p in current_pages:
                if p.get("type") == "climax":
                    updated.append({
                        "type": "climax",
                        "quote": decision.get("climax_quote", p.get("quote", "")),
                        "attr": decision.get("climax_attr", p.get("attr", "")),
                    })
                else:
                    updated.append(p)
            manga.pages = updated

        elif action == "rewrite_act":
            # Replace specific pages by index with new content
            indices = decision.get("rewrite_page_indices", [])
            new_raw = decision.get("pages", [])
            new_pages = await _render_pages(new_raw, photo_bytes, all_photos)
            if indices and new_pages:
                # Build updated page list: keep pages not in indices, insert new ones at first index
                insert_at = min(indices)
                kept_before = [p for i, p in enumerate(current_pages) if i < insert_at]
                kept_after = [p for i, p in enumerate(current_pages) if i > max(indices)]
                manga.pages = kept_before + new_pages + kept_after

        elif action == "regenerate":
            # Full regeneration — treat as a new expand
            manga.pages = []
            manga.is_preview = False
            db.commit()
            await _continue_manga(manga_id, db)
            return  # _continue_manga sets status itself

        manga.status = "complete"
        manga.enhance_message = decision.get("reasoning", "Story updated.")
        db.commit()

    except Exception as e:
        manga.status = "error"
        db.commit()
        raise e


# ── endpoints ──────────────────────────────────────────────────────────────────

@router.post("/create")
async def create_manga(
    background_tasks: BackgroundTasks,
    subject_name: str = Form(...),
    description: str = Form(...),
    user_id: Optional[str] = Form(None),
    tone: str = Form("humorous"),
    captions: Optional[str] = Form(None),  # JSON array of caption strings
    photo: UploadFile | None = File(None),
    photos: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    """No auth required — guests can generate a preview manga.
    Accepts either a single `photo` or multiple `photos[]` with optional `captions` (JSON array).
    """
    # Parse captions
    caption_list = []
    if captions:
        try:
            caption_list = json.loads(captions)
        except Exception:
            caption_list = []

    manga = Manga(user_id=user_id or None, subject_name=subject_name, subject_description=description)
    db.add(manga)
    db.commit()
    db.refresh(manga)

    # Handle multiple photos
    all_photos = []
    photo_files = photos if photos else ([photo] if photo else [])
    for i, pf in enumerate(photo_files):
        if not pf or not pf.filename:
            continue
        try:
            pbytes = await pf.read()
            photo_url = await upload(pbytes, "jpg", "photos")
            cap = caption_list[i] if i < len(caption_list) else ""
            all_photos.append({"bytes": pbytes, "url": photo_url, "caption": cap})
        except Exception:
            logger.warning(f"Failed to upload photo {i}")

    # Store photo metadata in DB
    if all_photos:
        manga.photo_url = all_photos[0]["url"]  # backward compat
        manga.photos = [{"url": p["url"], "caption": p["caption"]} for p in all_photos]
        db.commit()

    # Strip bytes from all_photos before passing (only keep for generation)
    photo_bytes = all_photos[0]["bytes"] if all_photos else None
    gen_photos = all_photos if all_photos else None

    background_tasks.add_task(_build_manga, manga.id, photo_bytes, db, tone, gen_photos)
    return {"manga_id": manga.id, "status": "pending"}


@router.get("/{manga_id}")
def get_manga(manga_id: str, user_id: Optional[str] = None, db: Session = Depends(get_db)):
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    # Allow access if: owner, guest (no user_id on manga), public, or still generating
    is_owner = user_id and user_id == manga.user_id
    if manga.user_id and not manga.is_public:
        if not is_owner:
            raise HTTPException(403, "Private")
    # Build response — strip user_id for non-owners to prevent privacy leak
    result = {
        "id": manga.id,
        "title": manga.title,
        "title_jp": manga.title_jp,
        "tagline": manga.tagline,
        "subject_name": manga.subject_name,
        "subject_description": manga.subject_description,
        "status": manga.status,
        "pages": manga.pages or [],
        "audio_theme_url": manga.audio_theme_url,
        "is_preview": manga.is_preview,
        "is_public": manga.is_public,
        "model_used": manga.model_used,
        "enhance_message": manga.enhance_message,
    }
    # Only expose user_id and photo_url to the owner
    if is_owner:
        result["user_id"] = manga.user_id
        result["photo_url"] = manga.photo_url
    return result


@router.post("/{manga_id}/share")
def toggle_share(manga_id: str, body: dict, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    if manga.user_id != body.get("user_id"):
        raise HTTPException(403, "Not your manga")
    manga.is_public = not manga.is_public
    db.commit()
    return {"is_public": manga.is_public}


@router.patch("/{manga_id}/claim")
def claim_manga(manga_id: str, body: dict, db: Session = Depends(get_db)):
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    if manga.user_id:
        return manga
    manga.user_id = body.get("user_id")
    db.commit()
    db.refresh(manga)
    return manga


@router.delete("/{manga_id}")
def delete_manga(manga_id: str, user_id: Optional[str] = None, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    """Delete a manga. Only the owner can delete."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    if not user_id or manga.user_id != user_id:
        raise HTTPException(403, "Not your manga")
    db.delete(manga)
    db.commit()
    return {"deleted": True}


@router.post("/{manga_id}/expand")
async def expand_manga(manga_id: str, body: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Continue a preview manga into a full story. Keeps Act I, adds Acts II-V."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    user_id = body.get("user_id")
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if not user or not user.is_subscribed:
        raise HTTPException(403, "Subscription required")

    # Keep Act I pages; continuation will append the rest
    act_one = [p for p in (manga.pages or []) if p.get("type") not in ("climax", "ending")]
    manga.pages = act_one
    manga.status = "pending"
    manga.is_preview = False
    db.commit()

    background_tasks.add_task(_continue_manga, manga_id, db)
    return {"manga_id": manga_id, "status": "pending"}


@router.post("/{manga_id}/enhance")
async def enhance_manga(manga_id: str, body: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Async agent-driven story enhancement. Returns immediately; client polls manga status."""
    manga = db.query(Manga).filter(Manga.id == manga_id).first()
    if not manga:
        raise HTTPException(404, "Not found")
    user_id = body.get("user_id")
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if not user or not user.is_subscribed:
        raise HTTPException(403, "Subscription required")

    instruction = body.get("instruction", "")
    manga.status = "enhancing"
    db.commit()

    background_tasks.add_task(_run_enhance, manga_id, user_id, instruction, db)
    return {"status": "enhancing"}


@router.get("/user/{user_id}")
def list_mangas(user_id: str, db: Session = Depends(get_db), _claims: dict = Depends(verify_clerk_token)):
    mangas = db.query(Manga).filter(Manga.user_id == user_id).order_by(Manga.created_at.desc()).all()
    result = []
    for m in mangas:
        cover = next((p["image_url"] for p in (m.pages or []) if p.get("type") == "img"), None)
        result.append({
            "id": m.id, "title": m.title, "subject_name": m.subject_name,
            "title_jp": m.title_jp, "tagline": m.tagline,
            "status": m.status, "is_preview": m.is_preview, "is_public": m.is_public,
            "created_at": str(m.created_at),
            "cover_image": cover,
        })
    return result
