#!/usr/bin/env python3
"""Generate custom pixel art sprites from JSON definitions."""

from PIL import Image
import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
MANIFEST_PATH = SCRIPT_DIR / "sprites" / "custom-sprites.json"


def load_manifest() -> dict:
    """Load custom-sprites.json manifest file."""
    with open(MANIFEST_PATH) as f:
        return json.load(f)


def generate_sprite(sprite_def: dict, palette: dict, charmap: dict) -> Image.Image:
    """Render a sprite from ASCII pixel art definition using palette colors."""
    width = sprite_def["width"]
    height = sprite_def["height"]
    pixels_data = sprite_def["pixels"]

    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pixels = img.load()

    for y, row in enumerate(pixels_data):
        for x, char in enumerate(row):
            if x < width and y < height:
                color_name = charmap.get(char, "transparent")
                color = tuple(palette.get(color_name, [0, 0, 0, 0]))
                pixels[x, y] = color

    return img


def main() -> None:
    """Generate custom pixel art sprites from JSON manifest definitions."""
    manifest = load_manifest()
    palette = manifest["palette"]
    charmap = manifest["charmap"]
    sprites = manifest["sprites"]

    sprite_filter = sys.argv[1] if len(sys.argv) > 1 else None

    generated = 0
    for sprite_def in sprites:
        sprite_id = sprite_def["id"]

        if sprite_filter and sprite_id != sprite_filter:
            continue

        output_path = sprite_def["output"]
        description = sprite_def.get("description", "")

        img = generate_sprite(sprite_def, palette, charmap)

        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        img.save(output_path)

        print(f"[{sprite_id}] {img.size[0]}x{img.size[1]} -> {output_path}")
        print(f"    {description}")
        generated += 1

    print(f"\nGenerated {generated} sprite(s)")
    print(f"Manifest version: {manifest['version']}")


if __name__ == "__main__":
    main()
