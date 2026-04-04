"""
Story Agent — Azure OpenAI generates the manga script.
Primary: GPT-5.2 (openai-api-key-13 resource)
Fallback: GPT-5-mini (ozgur-mm7lh32d resource)
Model is auto-swapped on failure — no manual intervention needed.
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


def _call(client: AzureOpenAI, deployment: str, prompt: str) -> dict:
    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": STORY_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        max_completion_tokens=16000,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    if not content:
        reason = response.choices[0].finish_reason
        raise ValueError(f"Empty response from model (finish_reason={reason})")
    return json.loads(content)


async def generate_story(subject_name: str, description: str, preview_only: bool = True) -> dict:
    mode = "PREVIEW (Act I only, 3 pages max)" if preview_only else "FULL manga (4-5 acts, 18-22 pages)"
    prompt = f"Create a {mode} manga about {subject_name}.\n\nAbout them:\n{description}"

    model_used = AZURE_OPENAI_DEPLOYMENT
    try:
        client, deployment = _primary_client()
        script = _call(client, deployment, prompt)
        logger.info(f"Story generated with primary model: {deployment}")
    except Exception as e:
        logger.warning(f"Primary model ({AZURE_OPENAI_DEPLOYMENT}) failed: {e} — trying fallback")
        try:
            client, deployment = _fallback_client()
            script = _call(client, deployment, prompt)
            model_used = AZURE_FALLBACK_DEPLOYMENT
            logger.info(f"Story generated with fallback model: {deployment}")
        except Exception as e2:
            logger.error(f"Fallback model also failed: {e2}")
            raise

    # Flatten acts → pages list, append climax + ending (full only)
    pages = []
    for act in script.get("acts", []):
        pages.extend(act.get("pages", []))
    if not preview_only:
        pages.append({"type": "climax", "quote": script.get("climax_quote", ""), "attr": script.get("climax_attr", "")})
        pages.append({"type": "ending", "ending_text": script.get("ending_text", ""), "ending_kanji": script.get("ending_kanji", "終")})

    script["pages"] = pages
    script["model_used"] = model_used
    return script
