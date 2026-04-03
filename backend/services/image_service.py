"""
Image service — generates manga-style images using Gemini.
If a reference photo is provided, it edits it into manga style to resemble the person.
"""
from google import genai
from google.genai import types
from PIL import Image
import io, os, base64, httpx

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-3.1-flash-image-preview"

async def generate_manga_image(prompt: str) -> bytes:
    """Generate a manga panel from a text prompt."""
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
            image_generation_config=types.ImageGenerationConfig(
                number_of_images=1,
            )
        )
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            return part.inline_data.data
    raise ValueError("No image returned from Gemini")


async def manga_ify_photo(photo_bytes: bytes, scene_prompt: str) -> bytes:
    """
    Take a real photo and generate a manga panel where the character resembles the person.
    Uses Gemini image editing.
    """
    img = Image.open(io.BytesIO(photo_bytes))

    edit_prompt = (
        f"Convert this person into a manga character for a panel where: {scene_prompt}. "
        "Keep the person's key facial features — face shape, hair, any distinctive traits. "
        "Style: high-contrast black and white manga ink art, dramatic shadows, cinematic composition."
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=[edit_prompt, img],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            return part.inline_data.data

    # fallback: generate without photo
    return await generate_manga_image(scene_prompt + ", black and white manga ink style")
