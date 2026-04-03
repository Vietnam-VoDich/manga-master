"""
Story Agent — Azure OpenAI generates the manga script.
Model is configured via AZURE_OPENAI_DEPLOYMENT env var (default: gpt-5-mini).
Swap to gpt-5, o3, etc. with zero code changes.
"""
from openai import AzureOpenAI
from core.config import AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT, AZURE_API_VERSION, STORY_MODEL
import json

client = AzureOpenAI(
    api_key=AZURE_OPENAI_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_API_VERSION,
)

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
  "climax_quote": "the big emotional/funny moment quote that defines this person",
  "climax_attr": "one-line context for the quote",
  "ending_text": "closing reflection, 3-4 lines, use <em>emphasis</em>",
  "ending_kanji": "single kanji for end card",
  "music_prompt": "20-word ambient music description for ElevenLabs — mood, instruments, tempo"
}

Rules:
- Preview mode: Act I only, 3 pages max.
- Full mode: 4-5 acts, 18-22 pages total.
- Be SPECIFIC. Use their actual habits, quirks, dreams, disasters.
- Image prompts = real scenes, not abstract.
- Find both the comedy AND the heart."""


async def generate_story(subject_name: str, description: str, preview_only: bool = True) -> dict:
    mode = "PREVIEW (Act I only, 3 pages max)" if preview_only else "FULL manga (4-5 acts, 18-22 pages)"
    prompt = f"Create a {mode} manga about {subject_name}.\n\nAbout them:\n{description}"

    response = client.chat.completions.create(
        model=STORY_MODEL,
        messages=[
            {"role": "system", "content": STORY_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        max_tokens=4096,
        temperature=0.85,
        response_format={"type": "json_object"},
    )

    script = json.loads(response.choices[0].message.content)

    # Flatten all act pages into a single list
    pages = []
    for act in script.get("acts", []):
        pages.extend(act.get("pages", []))

    pages.append({"type": "climax", "quote": script.get("climax_quote", ""), "attr": script.get("climax_attr", "")})
    pages.append({"type": "ending", "ending_text": script.get("ending_text", ""), "ending_kanji": script.get("ending_kanji", "終")})

    script["pages"] = pages
    script["model_used"] = STORY_MODEL
    return script
