"""
Audio service — ElevenLabs for narration voice + ambient music.
"""
import httpx, os

ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
# Default narrator voice — warm, storytelling feel
NARRATOR_VOICE_ID = os.getenv("ELEVENLABS_NARRATOR_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")

async def generate_narration(text: str, voice_id: str = None) -> bytes:
    """Convert narration text to speech via ElevenLabs."""
    vid = voice_id or NARRATOR_VOICE_ID
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
            headers={"xi-api-key": ELEVEN_API_KEY, "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
            }
        )
        r.raise_for_status()
        return r.content


async def generate_theme_music(prompt: str) -> bytes:
    """Generate ambient background music via ElevenLabs sound generation."""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.elevenlabs.io/v1/sound-generation",
            headers={"xi-api-key": ELEVEN_API_KEY, "Content-Type": "application/json"},
            json={"text": prompt, "duration_seconds": 22, "prompt_influence": 0.4}
        )
        r.raise_for_status()
        return r.content
