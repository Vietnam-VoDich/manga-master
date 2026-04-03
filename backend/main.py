from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import manga, auth, stripe, webhooks
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Manga Master API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://manga-master.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(manga.router, prefix="/manga", tags=["manga"])
app.include_router(stripe.router, prefix="/stripe", tags=["stripe"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

@app.get("/health")
def health():
    return {"status": "ok"}
