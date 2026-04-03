"""
Manga image generation — Gemini.
If a reference photo is given, edits it into manga style so the character resembles the person.
IMAGE_MODEL env var controls which Gemini model is used.
"""
from google import genai
from google.genai import types
from PIL import Image
from core.config import GEMINI_API_KEY, IMAGE_MODEL
import io

client = genai.Client(api_key=GEMINI_API_KEY)


async def generate_manga_image(prompt: str) -> bytes:
    """Text-to-manga panel."""
    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            return part.inline_data.data
    raise ValueError("No image returned from Gemini")


async def manga_ify_photo(photo_bytes: bytes, scene_prompt: str) -> bytes:
    """
    Turn a real photo into a manga panel.
    The generated character will resemble the person in the photo.
    """
    img = Image.open(io.BytesIO(photo_bytes))
    edit_prompt = (
        f"Convert this person into a manga character for a scene where: {scene_prompt}. "
        "Keep the person's key facial features — face shape, hair style, any distinctive traits. "
        "Style: high-contrast black and white manga ink art, dramatic shadows, cinematic."
    )
    try:
        response = client.models.generate_content(
            model=IMAGE_MODEL,
            contents=[edit_prompt, img],
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                return part.inline_data.data
    except Exception:
        pass
    # Fallback: generate without photo
    return await generate_manga_image(scene_prompt + ", black and white manga ink style, dramatic, high contrast")
