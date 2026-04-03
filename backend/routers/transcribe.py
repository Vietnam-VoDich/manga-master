from fastapi import APIRouter, UploadFile, File
from services.audio_service import transcribe_voice

router = APIRouter()

@router.post("/")
async def transcribe(audio: UploadFile = File(...)):
    """Transcribe a voice recording to text via Azure Whisper."""
    data = await audio.read()
    text = await transcribe_voice(data, audio.filename or "voice.webm")
    return {"text": text}
