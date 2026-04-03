# Manga Master

Turn anyone into a manga. Upload a photo, describe someone, get a full AI-generated manga with voice narration and a cinematic soundtrack.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 → Vercel |
| Backend | FastAPI (Python) → Railway |
| Database | PostgreSQL → Railway |
| Auth | Supabase |
| Storage | Supabase Storage |
| AI Story | Claude (claude-opus-4-6) |
| AI Images | Gemini (gemini-3.1-flash-image-preview) |
| Voice/Music | ElevenLabs |
| Payments | Stripe |

## Local dev

**Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in keys
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local  # fill in keys
npm run dev
```

## Product flow

1. User lands on home page, sees sample mangas
2. Clicks "Create" → uploads photo + describes person (text or voice)
3. Backend agent: Claude generates story script → Gemini renders panels (resembling the photo) → ElevenLabs voices the narration + generates soundtrack
4. User gets 2 pages free (preview)
5. Subscribe $12/mo → unlock full 20–25 page manga
