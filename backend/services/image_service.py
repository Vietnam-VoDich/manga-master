"""
Manga image generation — Gemini.
If a reference photo is given, edits it into manga style so the character resembles the person.
IMAGE_MODEL env var controls which Gemini model is used.
"""
from google import genai
from google.genai import types
from PIL import Image
from core.config import GEMINI_API_KEY, IMAGE_MODEL
import io, logging, re

logger = logging.getLogger(__name__)

client = genai.Client(api_key=GEMINI_API_KEY)

# Relax all safety filters to minimum
SAFETY_SETTINGS = [
    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
]

IMAGE_CONFIG = types.ImageConfig(aspect_ratio="3:4")


def _clean_prompt_for_retry(prompt: str) -> str:
    """Remove potentially problematic words and simplify for retry."""
    # Remove words that might trigger safety filters
    remove_words = [
        "sexy", "seductive", "flirty", "intimate", "sensual",
        "kissing", "touching", "undress", "naked", "nude",
        "drunk", "wasted", "hammered", "smashed",
        "fight", "punch", "attack", "violence", "blood",
    ]
    cleaned = prompt
    for word in remove_words:
        cleaned = re.sub(rf'\b{word}\b', '', cleaned, flags=re.IGNORECASE)
    # Add safe framing
    cleaned = cleaned.strip() + ". Keep the image appropriate and artistic."
    return cleaned


async def generate_manga_image(prompt: str) -> bytes:
    """Text-to-manga panel in 3:4 portrait ratio. Retries with cleaned prompt on safety block."""
    # Attempt 1: original prompt
    try:
        response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=IMAGE_CONFIG,
                safety_settings=SAFETY_SETTINGS,
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                return part.inline_data.data
    except Exception as e:
        logger.warning(f"Image gen attempt 1 failed: {e}")

    # Attempt 2: cleaned prompt
    cleaned = _clean_prompt_for_retry(prompt)
    logger.info(f"Retrying with cleaned prompt: {cleaned[:80]}...")
    try:
        response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=cleaned,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=IMAGE_CONFIG,
                safety_settings=SAFETY_SETTINGS,
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                return part.inline_data.data
    except Exception as e:
        logger.warning(f"Image gen attempt 2 failed: {e}")

    # Attempt 3: generic fallback
    fallback = "A dramatic manga panel, black and white ink style, high contrast, cinematic composition"
    logger.info("Retrying with generic fallback prompt")
    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=fallback,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
            image_config=IMAGE_CONFIG,
            safety_settings=SAFETY_SETTINGS,
        ),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            return part.inline_data.data
    raise ValueError("All image generation attempts failed")


async def manga_ify_photo(photo_bytes: bytes, scene_prompt: str, extra_photos: list[dict] | None = None) -> bytes:
    """
    Turn a real photo into a manga panel.
    The generated character MUST resemble the subject in the photo (person or animal).
    extra_photos: optional list of {bytes, caption} for additional reference photos.
    """
    img = Image.open(io.BytesIO(photo_bytes))

    # Build multi-photo contents if we have extra references
    if extra_photos:
        contents = [
            "You are given multiple reference photos. Each character in the manga panel MUST closely resemble "
            "the subject in their respective reference photo.\n"
            "If a subject is a PERSON: preserve their exact face shape, nose, eyes, jawline, hair style, hair color, skin tone, and distinctive features.\n"
            "If a subject is an ANIMAL/PET: preserve their exact species, breed, fur color/pattern, size, and markings. Keep them as an animal.\n\n"
            "Reference photo 1:\n",
            img,
        ]
        for i, ep in enumerate(extra_photos):
            cap = ep.get("caption", "")
            label = f"\n\nReference photo {i+2}"
            if cap:
                label += f" ({cap})"
            label += ":\n"
            contents.append(label)
            contents.append(Image.open(io.BytesIO(ep["bytes"])))
        contents.append(
            f"\n\nScene: {scene_prompt}\n"
            "Style: high-contrast black and white manga ink art, dramatic shadows, cinematic."
        )
    else:
        contents = [
            "IMPORTANT: The main character in this image MUST closely resemble the subject in the reference photo. "
            "If the subject is a PERSON: preserve their exact face shape, nose, eyes, jawline, hair style, hair color, skin tone, and any distinctive features (beard, glasses, etc). "
            "If the subject is an ANIMAL/PET: preserve their exact species, breed, fur color/pattern, size, and distinctive markings. Keep them as an animal — do NOT turn them into a human. "
            "The character should be immediately recognizable as this subject drawn in manga style.\n\n"
            f"Scene: {scene_prompt}\n"
            "Style: high-contrast black and white manga ink art, dramatic shadows, cinematic.",
            img,
        ]

    # Attempt 1: with photo reference(s)
    try:
        response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=IMAGE_CONFIG,
                safety_settings=SAFETY_SETTINGS,
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                return part.inline_data.data
    except Exception as e:
        logger.warning(f"Photo manga-ify attempt 1 failed: {e}")

    # Attempt 2: retry with simpler prompt but still with primary photo
    try:
        simple_prompt = (
            "Draw the subject from the reference photo as a manga character in this scene: " + scene_prompt + ". "
            "If it's a person, keep their face the same. If it's an animal, keep it as that animal. Black and white manga ink style."
        )
        response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=[simple_prompt, img],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=IMAGE_CONFIG,
                safety_settings=SAFETY_SETTINGS,
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                return part.inline_data.data
    except Exception as e:
        logger.warning(f"Photo manga-ify attempt 2 failed: {e}")

    # Fallback: generate without photo
    return await generate_manga_image(scene_prompt + ", black and white manga ink style, dramatic, high contrast")
