"""
Story Agent — Azure OpenAI generates the manga script.
Primary: GPT-5.2 (openai-api-key-13 resource)
Fallback: GPT-5-mini (ozgur-mm7lh32d resource)
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


STORY_SYSTEM = """You are a manga storytelling agent. Given a description of a real person,
create a funny, warm, and dramatic manga script about their life.

Style: slice-of-life meets epic drama. Personal, specific, full of humour and heart.
The narrator is a wise but cheeky friend who knows everything about this person.

Output ONLY valid JSON:
{
  "title": "manga title",
  "title_jp": "1-2 japanese kanji (meaningful)",
  "tagline": "one punchy line",
  "acts": [
    {
      "act": "Act I — The Setup",
      "pages": [
        {
          "type": "text",
          "act": "Act I — The Setup",
          "title": "chapter title",
          "narr": "narrative, use <em>word</em> for emphasis",
          "date": "optional place/time label or null"
        },
        {
          "type": "img",
          "image_prompt": "detailed scene for manga image — end with: black and white manga ink style, dramatic, high contrast",
          "caption": "caption text, use <em>word</em> for emphasis",
          "bubble": "speech bubble text or null"
        }
      ]
    }
  ],
  "climax_quote": "the big emotional/funny moment that defines this person",
  "climax_attr": "one-line context for the quote",
  "ending_text": "closing reflection, 3-4 lines, use <em>emphasis</em>",
  "ending_kanji": "single kanji for end card",
  "music_prompt": "20-word ambient music description for ElevenLabs — mood, instruments, tempo"
}

Rules:
- Preview mode: Act I only, EXACTLY 1 text page + 1 img page. No climax, no ending in preview.
- Full mode: 4-5 acts, 18-22 pages total.
- Be SPECIFIC. Use their actual habits, quirks, dreams, disasters.
- Image prompts = real scenes, not abstract.
- Find both the comedy AND the heart."""


CONTINUATION_SYSTEM = """You are a manga storytelling agent. You are continuing an existing manga story.
Act I has already been written. Generate Acts II through V (the rest of the story).

Output ONLY valid JSON:
{
  "acts": [
    {
      "act": "Act II — The Struggle",
      "pages": [
        {
          "type": "text",
          "act": "Act II — The Struggle",
          "title": "chapter title",
          "narr": "narrative, use <em>word</em> for emphasis",
          "date": "optional place/time label or null"
        },
        {
          "type": "img",
          "image_prompt": "detailed scene — end with: black and white manga ink style, dramatic, high contrast",
          "caption": "caption text",
          "bubble": "speech bubble or null"
        }
      ]
    }
  ],
  "climax_quote": "the big emotional/funny moment that defines this person",
  "climax_attr": "one-line context for the quote",
  "ending_text": "closing reflection, 3-4 lines, use <em>emphasis</em>",
  "ending_kanji": "single kanji for end card"
}

Rules:
- Generate Acts II, III, IV, V — 3-4 acts with 4-5 pages each (14-18 new pages total).
- Keep the same tone, style, and humour established in Act I.
- Build toward the climax and a satisfying ending.
- Be SPECIFIC to this person's story. No generic arcs."""


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
- insert_before: use "climax" to add before the climax, "ending" to add after climax but before ending, "end" to append at very end"""


def _call_with_system(client: AzureOpenAI, deployment: str, system: str, prompt: str, max_tokens: int = 16000) -> dict:
    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        max_completion_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    if not content:
        reason = response.choices[0].finish_reason
        raise ValueError(f"Empty response from model (finish_reason={reason})")
    return json.loads(content)


def _call(client: AzureOpenAI, deployment: str, prompt: str) -> dict:
    return _call_with_system(client, deployment, STORY_SYSTEM, prompt)


def _try_primary_then_fallback(system: str, prompt: str, max_tokens: int = 16000) -> tuple[dict, str]:
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


async def generate_story(subject_name: str, description: str, preview_only: bool = True) -> dict:
    mode = "PREVIEW (Act I only, EXACTLY 1 text page + 1 img page)" if preview_only else "FULL manga (4-5 acts, 18-22 pages)"
    prompt = f"Create a {mode} manga about {subject_name}.\n\nAbout them:\n{description}"

    script, model_used = _try_primary_then_fallback(STORY_SYSTEM, prompt)

    pages = []
    for act in script.get("acts", []):
        pages.extend(act.get("pages", []))
    if not preview_only:
        pages.append({"type": "climax", "quote": script.get("climax_quote", ""), "attr": script.get("climax_attr", "")})
        pages.append({"type": "ending", "ending_text": script.get("ending_text", ""), "ending_kanji": script.get("ending_kanji", "終")})

    script["pages"] = pages
    script["model_used"] = model_used
    return script


async def generate_continuation(subject_name: str, description: str, act_one_pages: list, title: str, tagline: str) -> dict:
    """Generate Acts II-V to continue an existing Act I. Returns pages + climax/ending."""
    page_summary = []
    for i, p in enumerate(act_one_pages):
        if p.get("type") == "text":
            page_summary.append(f"Page {i+1} (text): {p.get('title', '')} — {p.get('narr', '')[:100]}...")
        elif p.get("type") == "img":
            page_summary.append(f"Page {i+1} (image): {p.get('caption', '')[:80]}")

    prompt = f"""Continue the manga "{title}" about {subject_name}.
Tagline: {tagline}

Act I already written:
{chr(10).join(page_summary)}

About them: {description}

Generate Acts II through V to complete the story."""

    script, _ = _try_primary_then_fallback(CONTINUATION_SYSTEM, prompt)

    pages = []
    for act in script.get("acts", []):
        pages.extend(act.get("pages", []))
    pages.append({"type": "climax", "quote": script.get("climax_quote", ""), "attr": script.get("climax_attr", "")})
    pages.append({"type": "ending", "ending_text": script.get("ending_text", ""), "ending_kanji": script.get("ending_kanji", "終")})

    return {"pages": pages}


async def agent_decide(subject_name: str, title: str, tagline: str, pages_summary: str, instruction: str) -> dict:
    """Agent decides what action to take based on user instruction."""
    prompt = f"""Manga: "{title}" about {subject_name}
Tagline: {tagline}

Current story ({len(pages_summary.splitlines())} pages):
{pages_summary}

User instruction: {instruction}"""

    result, _ = _try_primary_then_fallback(AGENT_SYSTEM, prompt, max_tokens=4000)
    return result
