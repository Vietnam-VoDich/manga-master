"""
Story Agent — Azure OpenAI generates the manga script.
Primary: GPT-5.2 (openai-api-key-13 resource)
Fallback: GPT-5-mini (ozgur-mm7lh32d resource)

Generation is split into multiple small calls to avoid token limits:
  1. Outline call  → title, tagline, act names, music prompt (~400 tokens out)
  2. Per-act call  → pages for one act only (~800 tokens out each)
  3. Ending call   → climax quote + ending text (~300 tokens out)
"""
from openai import AzureOpenAI
from core.config import (
    AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION,
    AZURE_FALLBACK_KEY, AZURE_FALLBACK_ENDPOINT, AZURE_FALLBACK_DEPLOYMENT, AZURE_FALLBACK_API_VERSION,
)
import json, logging

logger = logging.getLogger(__name__)

def _primary_client() -> tuple[AzureOpenAI, str]:
    return AzureOpenAI(
        api_key=AZURE_OPENAI_KEY,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_version=AZURE_OPENAI_API_VERSION,
    ), AZURE_OPENAI_DEPLOYMENT

def _fallback_client() -> tuple[AzureOpenAI, str]:
    return AzureOpenAI(
        api_key=AZURE_FALLBACK_KEY,
        azure_endpoint=AZURE_FALLBACK_ENDPOINT,
        api_version=AZURE_FALLBACK_API_VERSION,
    ), AZURE_FALLBACK_DEPLOYMENT


# ── prompts ────────────────────────────────────────────────────────────────────

OUTLINE_SYSTEM = """You are a manga story planner. Given a person's description, plan a manga.

Output ONLY valid JSON:
{
  "title": "manga title (English)",
  "title_jp": "1-2 meaningful Japanese kanji",
  "tagline": "one punchy line",
  "acts": ["Act I — The Setup", "Act II — The Struggle", "Act III — The Turn", "Act IV — The Cost", "Act V — The Resolution"],
  "music_prompt": "20-word ambient music description — mood, instruments, tempo"
}

Rules:
- 4-5 acts for full manga, 1 act for preview
- Act names should reflect the person's specific story arc
- Keep titles punchy and specific to this person"""


ACT_SYSTEM = """You are a manga page writer. Write pages for ONE act of a manga.

Output ONLY valid JSON:
{
  "pages": [
    {
      "type": "text",
      "act": "Act label",
      "title": "chapter title",
      "narr": "narrative — MAX 3 short punchy sentences. Use <em>word</em> for emphasis.",
      "date": "place/time label or null"
    },
    {
      "type": "img",
      "image_prompt": "detailed scene — end with: black and white manga ink style, dramatic, high contrast",
      "caption": "caption text, use <em>word</em> for emphasis",
      "bubble": "short speech bubble text (plain text, no HTML tags) or null"
    }
  ]
}

Rules:
- EXACTLY 1 text page + 1-3 image pages per act
- Be SPECIFIC. Use the person's actual habits, quirks, and details.
- CRITICAL: Each image_prompt MUST describe a COMPLETELY DIFFERENT scene, angle, location, or moment. Never repeat the same setting or composition across panels. Vary: close-up vs wide shot, indoor vs outdoor, different characters in frame, different actions, different times of day.
- Image prompts = real scenes with real people doing real things, not abstract.
- narr: MAX 3 short punchy sentences. Rhythmic, not paragraphs.
- bubble: plain text only, NO HTML tags like <em>. Keep it short and punchy.
- Find both the comedy AND the heart."""


ENDING_SYSTEM = """You are a manga ending writer. Write the climax and ending for a manga.

Output ONLY valid JSON:
{
  "climax_quote": "the defining quote of this person's story — funny, poetic, or devastating",
  "climax_attr": "one-line context for the quote",
  "ending_text": "closing reflection, 2-3 short lines, use <em>emphasis</em>",
  "ending_kanji": "single kanji that captures the whole story"
}"""


AGENT_SYSTEM = """You are a manga story editing agent. The user wants to modify their manga.
Decide what action to take based on their instruction and the current story state.

Available actions:
- add_pages: Add 2-6 new pages to the story (text + image pages)
- replace_ending: Rewrite the ending (ending_text, ending_kanji)
- replace_climax: Rewrite the climax quote
- regenerate: Recommend a full restart (when user explicitly asks to start over)

Output ONLY valid JSON:
{
  "action": "add_pages|replace_ending|replace_climax|regenerate",
  "reasoning": "one sentence explaining what you're doing — shown to user",
  "insert_before": "climax|ending|end",
  "pages": [
    {
      "type": "text",
      "act": "act label",
      "title": "chapter title",
      "narr": "narrative text"
    },
    {
      "type": "img",
      "image_prompt": "detailed scene — end with: black and white manga ink style, dramatic, high contrast",
      "caption": "caption",
      "bubble": "speech bubble or null"
    }
  ],
  "ending_text": "new ending text (for replace_ending)",
  "ending_kanji": "kanji (for replace_ending)",
  "climax_quote": "new quote (for replace_climax)",
  "climax_attr": "attribution (for replace_climax)"
}

Rules:
- add_pages is the default for "add X" / "more X" / "dramatic scene" type requests
- replace_ending for "make ending X" / "different ending" requests
- replace_climax for "change the big moment" requests
- regenerate ONLY if user says "start over" / "from scratch" / "completely different"
- insert_before: use "climax" to add before the climax, "ending" to add before ending, "end" to append"""


# ── core call ──────────────────────────────────────────────────────────────────

def _call_with_system(client: AzureOpenAI, deployment: str, system: str, prompt: str, max_tokens: int = 3000) -> dict:
    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        max_completion_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    choice = response.choices[0]
    content = choice.message.content
    if not content:
        raise ValueError(f"Empty response (finish_reason={choice.finish_reason})")
    if choice.finish_reason == "length":
        raise ValueError(f"Response truncated (finish_reason=length)")
    return json.loads(content)


def _try_primary_then_fallback(system: str, prompt: str, max_tokens: int = 3000) -> tuple[dict, str]:
    """Try primary model, fall back to secondary. Returns (result, model_used)."""
    try:
        client, deployment = _primary_client()
        result = _call_with_system(client, deployment, system, prompt, max_tokens)
        logger.info(f"Generated with primary: {deployment}")
        return result, AZURE_OPENAI_DEPLOYMENT
    except Exception as e:
        logger.warning(f"Primary ({AZURE_OPENAI_DEPLOYMENT}) failed: {e} — trying fallback")
        client, deployment = _fallback_client()
        result = _call_with_system(client, deployment, system, prompt, max_tokens)
        logger.info(f"Generated with fallback: {deployment}")
        return result, AZURE_FALLBACK_DEPLOYMENT


# ── public API ─────────────────────────────────────────────────────────────────

async def generate_story(subject_name: str, description: str, preview_only: bool = True) -> dict:
    """
    Split generation:
    1. Outline call → title, tagline, act names, music
    2. One call per act → pages
    3. Ending call → climax + ending  (skipped for preview)

    Returns an async generator of dicts via generate_story_streaming().
    This sync version collects everything and returns at once (for backward compat).
    """
    base_prompt = f"Person: {subject_name}\nAbout them: {description}"

    # 1. Outline
    num_acts = 1 if preview_only else 5
    outline_prompt = f"{base_prompt}\n\nPlan a {'PREVIEW (1 act only)' if preview_only else 'FULL (4-5 acts)'} manga."
    outline, model_used = _try_primary_then_fallback(OUTLINE_SYSTEM, outline_prompt, max_tokens=600)

    act_names = outline.get("acts", ["Act I — The Setup"])[:num_acts]

    # 2. Per-act pages
    all_pages = []
    story_so_far = ""
    for act_name in act_names:
        act_prompt = (
            f"{base_prompt}\n\n"
            f"Manga title: {outline.get('title', subject_name)}\n"
            f"Tagline: {outline.get('tagline', '')}\n"
            + (f"Story so far:\n{story_so_far}\n\n" if story_so_far else "")
            + f"Now write pages for: {act_name}"
        )
        act_result, _ = _try_primary_then_fallback(ACT_SYSTEM, act_prompt, max_tokens=2000)
        pages = act_result.get("pages", [])
        all_pages.extend(pages)
        # Brief summary for context in next act
        titles = [p.get("title", "") for p in pages if p.get("type") == "text"]
        story_so_far += f"{act_name}: {', '.join(titles)}\n"

    # 3. Ending (full manga only)
    if not preview_only:
        ending_prompt = (
            f"{base_prompt}\n\n"
            f"Manga: {outline.get('title')}\n"
            f"Story arc: {story_so_far}\n\n"
            "Write the climax and ending."
        )
        ending, _ = _try_primary_then_fallback(ENDING_SYSTEM, ending_prompt, max_tokens=500)
        all_pages.append({"type": "climax", "quote": ending.get("climax_quote", ""), "attr": ending.get("climax_attr", "")})
        all_pages.append({"type": "ending", "ending_text": ending.get("ending_text", ""), "ending_kanji": ending.get("ending_kanji", "終")})

    return {
        "title": outline.get("title"),
        "title_jp": outline.get("title_jp"),
        "tagline": outline.get("tagline"),
        "music_prompt": outline.get("music_prompt", "cinematic dramatic orchestral"),
        "model_used": model_used,
        "pages": all_pages,
    }


TONE_INSTRUCTIONS = {
    "emotional": "Write with deep emotional resonance — heartfelt, moving, bittersweet. Find the humanity in their story. Make the reader feel something real.",
    "humorous": "Write with warmth and wit — light comedy, charming observations, gentle jokes about their quirks. Fun but respectful.",
    "roast": "Write like a brutal comedy roast between best friends. Savage, exaggerated, wildly funny. Roast their habits, quirks, dating life, and life choices mercilessly. Make up embarrassing fictional scenarios based on their real traits. Think: what their best friend would say at a roast dinner after 5 drinks. Spicy, edgy, absurd situations — but always funny, never cruel. The more specific and personal the joke, the better.",
}


async def generate_story_streaming(subject_name: str, description: str, preview_only: bool = True, tone: str = "humorous"):
    """
    Async generator — yields partial results after each act is written.
    Each yield: {"outline": {...}, "new_pages": [...], "done": bool}
    """
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["humorous"])
    base_prompt = f"Person: {subject_name}\nAbout them: {description}\n\nTone: {tone_instruction}"
    num_acts = 1 if preview_only else 5

    # 1. Outline
    outline_prompt = f"{base_prompt}\n\nPlan a {'PREVIEW (1 act only)' if preview_only else 'FULL (4-5 acts)'} manga."
    outline, model_used = _try_primary_then_fallback(OUTLINE_SYSTEM, outline_prompt, max_tokens=600)
    yield {"outline": outline, "model_used": model_used, "new_pages": [], "done": False}

    act_names = outline.get("acts", ["Act I — The Setup"])[:num_acts]
    story_so_far = ""

    # 2. Per-act pages
    prev_image_prompts = []
    for i, act_name in enumerate(act_names):
        avoid_clause = ""
        if prev_image_prompts:
            avoid_clause = "\n\nPrevious image prompts (DO NOT repeat these scenes):\n" + "\n".join(f"- {p}" for p in prev_image_prompts[-6:]) + "\n"
        act_prompt = (
            f"{base_prompt}\n\n"
            f"Manga title: {outline.get('title', subject_name)}\n"
            f"Tagline: {outline.get('tagline', '')}\n"
            + (f"Story so far:\n{story_so_far}\n\n" if story_so_far else "")
            + avoid_clause
            + f"Now write pages for: {act_name}"
        )
        act_result, _ = _try_primary_then_fallback(ACT_SYSTEM, act_prompt, max_tokens=2000)
        pages = act_result.get("pages", [])
        titles = [p.get("title", "") for p in pages if p.get("type") == "text"]
        prev_image_prompts.extend(p.get("image_prompt", "") for p in pages if p.get("type") == "img")
        story_so_far += f"{act_name}: {', '.join(titles)}\n"
        yield {"outline": outline, "model_used": model_used, "new_pages": pages, "done": False}

    # 3. Ending
    if not preview_only:
        ending_prompt = (
            f"{base_prompt}\n\n"
            f"Manga: {outline.get('title')}\n"
            f"Story arc: {story_so_far}\n\nWrite the climax and ending."
        )
        ending, _ = _try_primary_then_fallback(ENDING_SYSTEM, ending_prompt, max_tokens=500)
        ending_pages = [
            {"type": "climax", "quote": ending.get("climax_quote", ""), "attr": ending.get("climax_attr", "")},
            {"type": "ending", "ending_text": ending.get("ending_text", ""), "ending_kanji": ending.get("ending_kanji", "終")},
        ]
        yield {"outline": outline, "model_used": model_used, "new_pages": ending_pages, "done": True}
    else:
        yield {"outline": outline, "model_used": model_used, "new_pages": [], "done": True}


async def generate_continuation(subject_name: str, description: str, act_one_pages: list, title: str, tagline: str) -> dict:
    """Generate Acts II-V one act at a time. Returns all pages + climax/ending."""
    page_summary = []
    for i, p in enumerate(act_one_pages):
        if p.get("type") == "text":
            page_summary.append(f"p{i+1} text: {p.get('title', '')} — {p.get('narr', '')[:80]}")
        elif p.get("type") == "img":
            page_summary.append(f"p{i+1} image: {p.get('caption', '')[:60]}")
    act_one_summary = "\n".join(page_summary)

    act_names = ["Act II — The Struggle", "Act III — The Turn", "Act IV — The Cost", "Act V — The Resolution"]
    all_pages = []
    story_so_far = f"Act I summary:\n{act_one_summary}\n"
    prev_image_prompts = [p.get("caption", "")[:60] for p in act_one_pages if p.get("type") == "img"]

    for act_name in act_names:
        avoid_clause = ""
        if prev_image_prompts:
            avoid_clause = "\n\nPrevious image prompts (DO NOT repeat these scenes):\n" + "\n".join(f"- {p}" for p in prev_image_prompts[-6:]) + "\n"
        act_prompt = (
            f"Person: {subject_name}\nAbout them: {description}\n\n"
            f"Manga: {title}\nTagline: {tagline}\n\n"
            f"Story so far:\n{story_so_far}\n\n"
            + avoid_clause
            + f"Write pages for: {act_name}"
        )
        act_result, _ = _try_primary_then_fallback(ACT_SYSTEM, act_prompt, max_tokens=2000)
        pages = act_result.get("pages", [])
        all_pages.extend(pages)
        titles = [p.get("title", "") for p in pages if p.get("type") == "text"]
        prev_image_prompts.extend(p.get("image_prompt", "") for p in pages if p.get("type") == "img")
        story_so_far += f"{act_name}: {', '.join(titles)}\n"

    ending_prompt = (
        f"Person: {subject_name}\nAbout them: {description}\n\n"
        f"Manga: {title}\nTagline: {tagline}\n\n"
        f"Story arc: {story_so_far}\n\nWrite the climax and ending."
    )
    ending, _ = _try_primary_then_fallback(ENDING_SYSTEM, ending_prompt, max_tokens=500)
    all_pages.append({"type": "climax", "quote": ending.get("climax_quote", ""), "attr": ending.get("climax_attr", "")})
    all_pages.append({"type": "ending", "ending_text": ending.get("ending_text", ""), "ending_kanji": ending.get("ending_kanji", "終")})

    return {"pages": all_pages}


async def agent_decide(subject_name: str, title: str, tagline: str, pages_summary: str, instruction: str) -> dict:
    """Agent decides what action to take based on user instruction."""
    prompt = (
        f'Manga: "{title}" about {subject_name}\n'
        f"Tagline: {tagline}\n\n"
        f"Current story ({len(pages_summary.splitlines())} pages):\n{pages_summary}\n\n"
        f"User instruction: {instruction}"
    )
    result, _ = _try_primary_then_fallback(AGENT_SYSTEM, prompt, max_tokens=3000)
    return result
