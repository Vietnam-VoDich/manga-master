"""
Story Agent — turns a person's description into a manga script.
Uses Azure OpenAI (gpt-4o-mini) for story generation.
"""
from openai import AzureOpenAI
import os, json

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2024-08-01-preview",
)
DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-mini")  # set to gpt-5 or gpt-5-mini in Azure portal

STORY_SYSTEM = """You are a manga storytelling agent. Given a description of a real person,
you create a short, funny, warm, and dramatic manga script about their life.

Style: Think slice-of-life meets epic drama. Personal, specific, full of humour and heart.
The narrator voice is like a wise but cheeky friend who knows everything about this person.

Output ONLY valid JSON with this structure:
{
  "title": "manga title",
  "title_jp": "1-2 japanese kanji characters that are meaningful",
  "tagline": "one punchy line",
  "acts": [
    {
      "act": "Act I — The Setup",
      "pages": [
        {
          "type": "text",
          "act": "Act I — The Setup",
          "title": "chapter title",
          "narr": "narrative text, use <em>word</em> for emphasis",
          "date": "optional place/time label"
        },
        {
          "type": "img",
          "image_prompt": "detailed scene description for manga image — always end with: black and white manga ink style, dramatic, high contrast",
          "caption": "caption text, use <em>word</em> for emphasis",
          "bubble": "speech bubble text or null"
        }
      ]
    }
  ],
  "climax_quote": "the big emotional moment quote that defines this person",
  "climax_attr": "context for the quote",
  "ending_text": "closing reflection, 3-4 lines, use <em>emphasis</em>",
  "ending_kanji": "single kanji for the end card",
  "music_prompt": "20-word description for ambient music generation — mood, instruments, tempo"
}

Rules:
- Preview mode: Acts I only, max 3 pages total.
- Full mode: 4-5 acts, 18-22 pages total.
- Be SPECIFIC to this person. Use their actual habits, quirks, dreams, flaws.
- Image prompts describe real scenes, not abstract concepts.
- Find the comedy AND the heart in their life."""


async def generate_story(subject_name: str, description: str, preview_only: bool = True) -> dict:
    mode = "PREVIEW (Act I only, 3 pages max)" if preview_only else "FULL manga (4-5 acts, 18-22 pages)"
    prompt = f"Create a {mode} manga story about {subject_name}.\n\nAbout them:\n{description}"

    response = client.chat.completions.create(
        model=DEPLOYMENT,
        messages=[
            {"role": "system", "content": STORY_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        max_tokens=4096,
        temperature=0.8,
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content
    script = json.loads(text)

    # Flatten acts into pages list with climax + ending appended
    pages = []
    for act in script.get("acts", []):
        pages.extend(act.get("pages", []))

    pages.append({"type": "climax", "quote": script.get("climax_quote", ""), "attr": script.get("climax_attr", "")})
    pages.append({"type": "ending", "ending_text": script.get("ending_text", ""), "ending_kanji": script.get("ending_kanji", "終")})

    script["pages"] = pages
    return script
