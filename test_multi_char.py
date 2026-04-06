"""
Quick test: Can Gemini handle multiple character photos in one manga panel?

Test 1: Single group photo + description of who's who
Test 2: Two separate photos + scene prompt
Test 3: Two photos + complex interaction scene

Usage: python test_multi_char.py <photo1> [photo2]
  e.g. python test_multi_char.py umurjan-with-photo.jpeg
  e.g. python test_multi_char.py photo_ata.jpg photo_hanh.jpg
"""
import sys, os, io, time
from PIL import Image
from google import genai
from google.genai import types

API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
MODEL = os.getenv("IMAGE_MODEL", "gemini-3.1-flash-image-preview")

client = genai.Client(api_key=API_KEY)

SAFETY = [
    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
]
IMG_CONFIG = types.ImageConfig(aspect_ratio="3:4")


def generate(contents: list, label: str) -> str:
    """Send to Gemini and save output image."""
    print(f"\n{'='*60}")
    print(f"TEST: {label}")
    print(f"{'='*60}")
    start = time.time()
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=IMG_CONFIG,
                safety_settings=SAFETY,
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                fname = f"test_output_{label.replace(' ', '_')}.jpg"
                img = Image.open(io.BytesIO(part.inline_data.data))
                img.save(fname, "JPEG", quality=90)
                elapsed = time.time() - start
                print(f"  ✓ Saved: {fname} ({img.size[0]}x{img.size[1]}) in {elapsed:.1f}s")
                return fname
            if part.text:
                print(f"  Text response: {part.text[:200]}")
        print(f"  ✗ No image returned")
    except Exception as e:
        elapsed = time.time() - start
        print(f"  ✗ Failed ({elapsed:.1f}s): {e}")
    return ""


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_multi_char.py <photo1> [photo2]")
        print("  Single photo  = group photo test (identifies people by description)")
        print("  Two photos    = separate reference photos test")
        sys.exit(1)

    photos = []
    for path in sys.argv[1:]:
        img = Image.open(path)
        photos.append(img)
        print(f"Loaded: {path} ({img.size[0]}x{img.size[1]})")

    if len(photos) == 1:
        # ── GROUP PHOTO TESTS ──
        print("\n>> Mode: Single group photo — testing character identification\n")

        # Test 1: Simple scene with both characters identified
        generate(
            [
                "This photo shows two people. "
                "Person A is the one on the LEFT. Person B is the one on the RIGHT.\n\n"
                "Draw a manga panel where Person A (left in photo) is cooking in a kitchen "
                "while Person B (right in photo) is sneaking food from the pot behind their back. "
                "Both characters MUST closely resemble their respective person from the reference photo. "
                "Preserve each person's exact face, hair, and features. "
                "Black and white manga ink style, dramatic, high contrast.",
                photos[0],
            ],
            "group_kitchen",
        )

        # Test 2: Different scene — can it keep them distinct?
        generate(
            [
                "This photo shows two people. "
                "Person A is the one on the LEFT. Person B is the one on the RIGHT.\n\n"
                "Draw a manga panel: Person A and Person B are sitting across from each other "
                "at a small café table, having an intense argument. Person A is pointing at Person B. "
                "Person B has their arms crossed, looking unimpressed. "
                "Both MUST closely resemble their actual appearance from the photo. "
                "Black and white manga ink style, dramatic, high contrast.",
                photos[0],
            ],
            "group_cafe",
        )

        # Test 3: Action scene
        generate(
            [
                "This photo shows two people. "
                "Person A is the one on the LEFT. Person B is the one on the RIGHT.\n\n"
                "Draw a manga panel: Person A is dramatically running down a street holding a briefcase, "
                "while Person B is chasing after them on a bicycle, shouting. "
                "Dynamic action lines, motion blur effect. "
                "Both MUST resemble the actual people in the reference photo. "
                "Black and white manga ink style, dramatic, high contrast.",
                photos[0],
            ],
            "group_chase",
        )

    else:
        # ── SEPARATE PHOTOS TESTS ──
        print(f"\n>> Mode: {len(photos)} separate photos — testing multi-reference\n")

        # Test 1: Two photos, simple scene
        generate(
            [
                f"Reference photo 1 — this is Character A:\n",
                photos[0],
                f"\nReference photo 2 — this is Character B:\n",
                photos[1],
                "\nDraw a manga panel: Character A and Character B are sitting on a park bench together. "
                "Character A is reading a book. Character B is asleep leaning on Character A's shoulder. "
                "Both characters MUST closely resemble their respective reference photos. "
                "Preserve each person's exact facial features, hair, and build. "
                "Black and white manga ink style, dramatic, high contrast.",
            ],
            "separate_park",
        )

        # Test 2: Interaction scene
        generate(
            [
                f"Reference photo 1 — this is Character A:\n",
                photos[0],
                f"\nReference photo 2 — this is Character B:\n",
                photos[1],
                "\nDraw a manga panel: Character A is at a whiteboard presenting something, "
                "looking confident. Character B is in the audience looking skeptical with one eyebrow raised. "
                "Both MUST closely resemble their reference photos. "
                "Black and white manga ink style, dramatic, high contrast.",
            ],
            "separate_meeting",
        )

        # Test 3: Dynamic scene
        generate(
            [
                f"Reference photo 1 — this is Character A:\n",
                photos[0],
                f"\nReference photo 2 — this is Character B:\n",
                photos[1],
                "\nDraw a manga panel: Character A and Character B are cooking together in a kitchen. "
                "Character A is tossing food in a wok with dramatic flair. "
                "Character B is watching in horror as flames shoot up. "
                "Both MUST resemble their reference photos exactly. "
                "Black and white manga ink style, dramatic, high contrast.",
            ],
            "separate_cooking",
        )

    print(f"\n{'='*60}")
    print("Done! Check test_output_*.jpg files")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
