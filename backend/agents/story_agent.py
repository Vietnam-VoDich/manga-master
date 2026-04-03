"""
Story Agent — turns a person's description into a manga script.
Uses Claude to generate the story arc, then Gemini for images, ElevenLabs for voice.
"""
import anthropic
import os
import json
from typing import Optional

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

STORY_SYSTEM = """You are a manga storytelling agent. Given a description of a real person,
you create a short, funny, warm, and dramatic manga script about them.

Style: Think Naruto meets slice-of-life. Personal, specific, full of humour and heart.
The narrator voice is like a wise but cheeky friend who knows everything about this person.

Output JSON with this structure:
{
  "title": "manga title",
  "title_jp": "japanese kanji (1-2 chars, meaningful)",
  "tagline": "one punchy line",
  "acts": [
    {
      "act": "Act I — The Setup",
      "title": "chapter title",
      "pages": [
        {
          "type": "text",
          "narr": "narrative text, can use <em>emphasis</em>",
          "date": "optional place/time label"
        },
        {
          "type": "img",
          "image_prompt": "detailed prompt for manga image generation — describe scene, mood, composition, always end with: black and white manga ink style, dramatic, high contrast",
          "caption": "caption text below image, can use <em>emphasis</em>",
          "bubble": "optional speech bubble text, or null"
        }
      ]
    }
  ],
  "climax_quote": "the big emotional moment — a line that defines them",
  "climax_context": "one sentence of context for the quote",
  "ending_text": "closing reflection, poetic, 3-4 lines using <em>emphasis</em>",
  "ending_kanji": "kanji for the end card",
  "music_prompt": "22-word description for ElevenLabs sound generation — mood, instruments, tempo"
}

Rules:
- Preview = Acts I only (2 pages max). Full = 4-5 acts, 20-25 pages.
- Make it SPECIFIC to this person. Use their actual habits, quirks, dreams.
- The image prompts must describe real scenes, not abstract concepts.
- Humour is important — real people are funny. Find the comedy in their life.
"""

async def generate_story(
    subject_name: str,
    description: str,
    preview_only: bool = True
) -> dict:
    prompt = f"""Create a manga story about {subject_name}.

Here is what we know about them:
{description}

Generate {"a PREVIEW (Act I only, 2 pages max)" if preview_only else "the FULL manga (4-5 acts, 20-25 pages)"}.
"""
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=STORY_SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )

    text = message.content[0].text
    # extract JSON
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])
