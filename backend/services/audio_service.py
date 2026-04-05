"""
Audio service — ElevenLabs for narration voice + ambient music.
Voice and music model are configurable via env vars.
"""
import httpx
from core.config import ELEVENLABS_API_KEY, NARRATOR_VOICE_ID, ELEVENLABS_MUSIC_SECONDS

HEADERS = {"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}


async def generate_narration(text: str, voice_id: str | None = None) -> bytes:
    """Convert narration caption to speech."""
    vid = voice_id or NARRATOR_VOICE_ID
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
            headers=HEADERS,
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
        )
        r.raise_for_status()
        return r.content


async def generate_theme_music(prompt: str) -> bytes:
    """Generate looping ambient background track."""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.elevenlabs.io/v1/sound-generation",
            headers=HEADERS,
            json={
                "text": prompt,
                "duration_seconds": ELEVENLABS_MUSIC_SECONDS,
                "prompt_influence": 0.4,
            },
        )
        r.raise_for_status()
        return r.content


async def transcribe_voice(audio_bytes: bytes, filename: str = "voice.webm") -> str:
    """Transcribe a voice recording using Azure OpenAI Whisper."""
    from openai import AzureOpenAI
    from core.config import AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION
    import io

    az = AzureOpenAI(
        api_key=AZURE_OPENAI_KEY,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_version=AZURE_OPENAI_API_VERSION,
    )
    result = az.audio.transcriptions.create(
        model="whisper",
        file=(filename, io.BytesIO(audio_bytes), "audio/webm"),
    )
    return result.text
