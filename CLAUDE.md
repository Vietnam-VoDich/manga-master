# Emaki — Manga Master

**Live site:** https://emaki.app  
**Stack:** Next.js 15 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk + Stripe

---

## What This App Does

Emaki turns anyone into a manga character. You type a name and description (or upload a photo), and the app generates a personalized manga story with:
- AI-written script (Azure OpenAI GPT-5.2)
- AI-drawn panels (Gemini image generation)
- Voice narration per panel (ElevenLabs TTS)
- Cinematic theme music (ElevenLabs music gen)

**Free users** get a 2-page Act I preview.  
**Subscribers ($12/mo)** get the full 20+ page manga (5 acts), plus story enhancement and editing.

---

## Repo Structure

```
manga-master/
├── backend/          FastAPI — Railway
│   ├── main.py
│   ├── routers/
│   │   ├── manga.py       Core generation & CRUD
│   │   ├── auth.py        Clerk user sync
│   │   ├── stripe.py      Checkout + billing portal
│   │   ├── webhooks.py    Stripe webhook → flip is_subscribed
│   │   └── transcribe.py  Audio transcription (unused)
│   ├── agents/
│   │   └── story_agent.py Script generation (outline → acts → ending)
│   ├── services/
│   │   ├── image_service.py  Gemini image gen + photo manga-ification
│   │   ├── audio_service.py  ElevenLabs TTS + music
│   │   └── storage_service.py  Disk write → public URL
│   ├── db/
│   │   ├── models.py      SQLAlchemy: User, Manga
│   │   └── database.py    Engine + session
│   └── core/
│       ├── config.py      All env vars in one place
│       └── auth.py        Clerk JWT verification
│
└── frontend/         Next.js 15 App Router — Vercel
    └── src/
        ├── app/
        │   ├── page.tsx           Landing page
        │   ├── create/page.tsx    Generation form
        │   ├── manga/[id]/
        │   │   ├── page.tsx       Reader (polling, audio, navigation)
        │   │   └── edit/page.tsx  Split-screen story editor (subscribers)
        │   ├── dashboard/page.tsx User's manga library
        │   ├── sign-in/page.tsx   Clerk sign-in (dark theme)
        │   ├── sign-up/page.tsx   Clerk sign-up (dark theme)
        │   ├── pricing/page.tsx   Pricing page
        │   ├── sample/            Static sample mangas (Churchill, HCM, Napoleon, etc.)
        │   └── globals.css        Clerk CSS overrides (must use !important)
        └── lib/
            └── api.ts             All API calls, attaches Clerk JWT
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | String (UUID) | Internal ID |
| clerk_id | String | Clerk's user ID |
| email | String | |
| name | String | nullable |
| is_subscribed | Boolean | Flipped by Stripe webhook |
| stripe_customer_id | String | Set on checkout.session.completed |
| stripe_subscription_id | String | Used to match cancellation events |

### `mangas`
| Column | Type | Notes |
|---|---|---|
| id | String (UUID) | |
| user_id | String | null = guest manga |
| title | String | English title (AI-generated) |
| title_jp | String | 1-2 kanji (AI-generated) |
| tagline | String | One punchy line |
| subject_name | String | Person's name |
| subject_description | Text | User input |
| photo_url | String | Stored on Railway volume, re-used for expand/enhance |
| status | String | `pending → generating → streaming → preview/complete/error` |
| pages | JSON | Array of page objects (see below) |
| audio_theme_url | String | ElevenLabs music |
| is_preview | Boolean | true = only Act I generated |
| is_public | Boolean | true = shareable via link |
| model_used | String | Which model generated it |
| enhance_message | String | Last agent action description |

### Page Object Types (inside `pages` JSON column)
```json
{ "type": "text", "act": "Act I — ...", "title": "...", "narr": "...", "date": "..." }
{ "type": "img", "image_url": "...", "caption": "...", "bubble": "...", "narration_url": "..." }
{ "type": "climax", "quote": "...", "attr": "..." }
{ "type": "ending", "ending_text": "...", "ending_kanji": "終" }
```

---

## Generation Pipeline

### Initial build — `_build_manga` in `routers/manga.py`

```
POST /manga/create
  → creates DB record (status=pending)
  → background task: _build_manga()
      → generate_story_streaming() async generator
          → outline call  (title, tagline, acts, music_prompt)
          → per-act calls (text page + 1-3 image pages each)
          → ending call   (climax quote + ending text)
      → each act:
          - render pages (generate image via Gemini, narration via ElevenLabs)
          - commit to DB immediately so frontend can poll and see them
      → parallel: generate theme music via ElevenLabs
          → saves audio_theme_url to DB as soon as ready (not waiting for pages)
      → status = "preview" (free) or "complete" (subscriber)
```

**Free users** get Act I only (`preview_only=True` → 1 act). Status = `preview`.  
**Subscribers** get all 5 acts. Status = `complete`.

### Expand — `_continue_manga`

Called when a subscriber clicks "Expand →" on a preview manga, or "Retry →" on an error.

```
POST /manga/{id}/expand
  → keeps Act I pages untouched
  → calls generate_continuation() — generates Acts II-V
  → renders new pages
  → if no audio_theme_url: generates theme music in parallel
  → appends new pages to existing ones
  → status = "complete"
```

### Enhance — `_run_enhance` (agent-driven)

Called when subscriber types an instruction in the story editor or "Continue the story" field.

```
POST /manga/{id}/enhance { instruction: "..." }
  → status = "enhancing"
  → agent_decide() decides which action to take:
      - "add_pages"     → generates new img/text pages, inserts before climax or ending
      - "replace_ending" → rewrites the ending text
      - "replace_climax" → rewrites the climax quote
      - "regenerate"    → calls _continue_manga from scratch
  → status = "complete", enhance_message = agent's reasoning
```

---

## Frontend: Manga Reader (`/manga/[id]/page.tsx`)

### Navigation
- Arrow keys (← →) or spacebar
- Click left/right 28% zones
- Swipe on mobile (touch events)
- Bottom nav bar (subtle, appears on hover on desktop)

### Page flow
1. **Cover screen** — blurred first image, title, "Open Book" button, starts music
2. **Reader** — one page at a time, fade transition (150ms opacity)
3. **Upsell page** (preview mangas only) — subscribe CTA or "Expand →" for subscribers
4. **After-story screen** (complete mangas only) — appears when pressing → past last page:
   - Share button (owner only)
   - "Create another →" link
   - "Continue the story" textarea → calls enhance API (subscribers + owner only)

### Polling
Polls `GET /manga/{id}?user_id=...` every 3 seconds while `status` is `pending/generating/streaming`.  
Shows reader immediately once any pages exist (doesn't wait for `done`).  
Stops polling when `status` is `preview/complete/error`.  
Music URL is picked up from any poll response — doesn't need to wait for status=done.

### Audio
- Theme music: HTMLAudio element, loop, volume 0.35, starts on "Open Book"
- Per-page narration: generated and stored in `narration_url` but **not currently played** (wasted compute — TODO: either use or disable)

---

## Infrastructure

### Backend — Railway
- **Service:** `manga-master`
- **Environment:** `production`
- **Persistent volume:** `/app/static` (5GB) — survives redeploys, stores all images/audio
- **Static serving:** FastAPI mounts `/static` → `STATIC_DIR`
- **Database:** Railway PostgreSQL (auto-migrated via `ALTER TABLE ... IF NOT EXISTS` on startup)
- **Startup migration:** resets any `generating/streaming` mangas to `error` (Railway restarts kill background tasks)

### Frontend — Vercel
- **Team:** Vietnam-VoDich
- **Framework:** Next.js 15 App Router
- **Deploy:** Auto-deploys on push to `main` at `Vietnam-VoDich/manga-master`
- **OG image:** Must use `www.emaki.app/og-image.png` — bare domain does 307 redirect that WhatsApp won't follow

### Auth — Clerk
- **Production instance** with custom domain `clerk.emaki.app`
- **Styling:** Dark theme via `appearance` prop. Gray text issues override via global CSS `globals.css` using `.cl-*` class selectors with `!important` — the `appearance` API alone is not reliable for all elements
- **Email:** Still on `@accounts.dev` sender — goes to spam. TODO: configure Resend/custom SMTP for `@emaki.app`
- **Name collection:** Disabled in Clerk settings, so `user.firstName` is often null — dashboard falls back to "Hello"

### Payments — Stripe
- **Mode:** Test mode (TODO: switch to live)
- **Price:** $12/month subscription
- **Webhook:** `POST /webhooks/stripe` — flips `user.is_subscribed` on `checkout.session.completed`, unflips on `customer.subscription.deleted/paused`

---

## AI Models

| Purpose | Model | Config |
|---|---|---|
| Story script | Azure OpenAI GPT-5.2 | Primary — `AZURE_OPENAI_DEPLOYMENT` |
| Story script (fallback) | Azure OpenAI GPT-5-mini | `AZURE_FALLBACK_DEPLOYMENT` |
| Image generation | Gemini `gemini-3.1-flash-image-preview` | `IMAGE_MODEL` env var |
| Photo manga-ification | Same Gemini model | Sends user photo + style prompt |
| Voice narration | ElevenLabs TTS | `NARRATOR_VOICE_ID` (default: EXAVITQu4vr4xnSDxMaL) |
| Theme music | ElevenLabs music gen | `ELEVENLABS_MUSIC_SECONDS` (default: 22s) |

Story generation is split into multiple small LLM calls to avoid token limits:
1. **Outline** (~400 tokens out) — title, tagline, act names, music prompt
2. **Per-act** (~800 tokens out each) — text + image pages for one act
3. **Ending** (~300 tokens out) — climax quote + ending paragraph

---

## Key Env Vars

### Backend (Railway)
```
AZURE_OPENAI_KEY / AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_DEPLOYMENT
AZURE_FALLBACK_KEY / AZURE_FALLBACK_ENDPOINT / AZURE_FALLBACK_DEPLOYMENT
GEMINI_API_KEY
ELEVENLABS_API_KEY / ELEVENLABS_NARRATOR_VOICE_ID / ELEVENLABS_MUSIC_SECONDS
CLERK_SECRET_KEY / CLERK_JWKS_URL
STRIPE_SECRET_KEY / STRIPE_PRICE_ID / STRIPE_WEBHOOK_SECRET
DATABASE_URL
FRONTEND_URL=https://www.emaki.app
STATIC_DIR=/app/static
STORAGE_BASE_URL=https://your-railway-domain/static
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-railway-domain
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/upsert` | None | Create/sync user after Clerk login. Returns `{id, is_subscribed}` |
| GET | `/auth/me/{clerk_id}` | None | Get user by Clerk ID |

### Manga
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/manga/create` | None | Create manga (guests allowed). Kicks off background generation |
| GET | `/manga/{id}` | None | Get manga. 403 if private and not owner |
| GET | `/manga/user/{user_id}` | Clerk JWT | List user's mangas with cover image |
| PATCH | `/manga/{id}/claim` | None | Claim guest manga to logged-in user |
| POST | `/manga/{id}/expand` | None (checks subscription in DB) | Expand preview to full story |
| POST | `/manga/{id}/enhance` | None (checks subscription in DB) | AI-driven story enhancement |
| POST | `/manga/{id}/share` | Clerk JWT | Toggle `is_public` |

### Payments
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/stripe/checkout` | Clerk JWT | Create Stripe checkout session |
| POST | `/stripe/portal` | Clerk JWT | Create billing portal session |
| POST | `/webhooks/stripe` | Stripe signature | Handle subscription events |

---

## Known Issues & TODO

### High Priority
- **Narrator audio not played** — `narration_url` is generated and stored per image panel but never played in the reader. Either wire it up to play on each page turn, or disable ElevenLabs TTS to save API cost.
- **After-story screen not showing** — newly deployed. If a manga is `is_preview=true`, the `after` page is NOT added (only `upsell`). If `complete`, pressing → past the last page should show the after screen. May need a hard refresh if the page was loaded before deployment.
- **Stripe live mode** — still on test keys. Need to swap `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` for live values in Railway.

### Medium Priority
- **Clerk emails going to spam** — sender is `@accounts.dev`. Fix: configure custom SMTP (Resend) in Clerk dashboard for `@emaki.app` sender.
- **User name shows "Hello"** — Clerk name collection is off. Either enable it in Clerk settings or collect name during onboarding.
- **No photo_url on old mangas** — mangas created before photo storage was added can't be enhanced with consistent character appearance.

### Low Priority
- **Guest manga claiming** — works but feels janky. Guest creates manga → signs up → `last_manga_id` from localStorage is claimed. If user navigates away before signing up, the link is lost.
- **Static file growth** — images/audio accumulate on the Railway volume forever. No cleanup. At scale, need S3/R2 + CDN.
- **No rate limiting** — anyone can spam `/manga/create` and burn API credits.

---

## Git / Deploy Workflow

```bash
# Push to GitHub → Railway (backend) and Vercel (frontend) auto-deploy
git add .
git commit -m "..."
git push origin main  # Vietnam-VoDich/manga-master
```

**Important:** The repo was previously accidentally connected to `bitzuist12/manga-master`. That repo has been made private. The correct remote is `Vietnam-VoDich/manga-master`.

Railway redeploys trigger a startup migration that resets any stuck `generating/streaming` mangas to `error`. This is intentional — Railway restarts kill all background tasks, so those mangas would be stuck forever otherwise.
