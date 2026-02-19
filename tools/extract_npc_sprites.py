#!/usr/bin/env python3
"""Extract NPC sprites from Kenney Roguelike Characters Pack using manifest.

Flags:
  --verify   Verify extraction by comparing pHash against source
  --preview  Generate labeled preview PNG
"""

import argparse
import json
import os
from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).parent
MANIFEST_PATH = SCRIPT_DIR / "kenney-curation.json"


def load_manifest() -> dict:
    """Load kenney-curation.json manifest file."""
    with open(MANIFEST_PATH) as f:
        return json.load(f)


def get_tile(
    img: Image.Image, col: int, row: int, tile_size: int = 16, spacing: int = 1
) -> Image.Image:
    """Extract a single tile from a spritesheet at the given grid position."""
    x = col * (tile_size + spacing)
    y = row * (tile_size + spacing)
    return img.crop((x, y, x + tile_size, y + tile_size))


def verify_extraction(
    output_img: Image.Image,
    npcs_config: list,
    source_img: Image.Image,
    tile_size: int,
    spacing: int,
) -> bool:
    """Verify each extracted NPC sprite against the source."""
    try:
        import imagehash
    except ImportError:
        print("Warning: imagehash not installed, skipping verification")
        return True

    print(f"\n{'=' * 60}")
    print("VERIFICATION: NPC sprites")
    print(f"{'=' * 60}")

    all_pass = True
    for idx, npc in enumerate(npcs_config):
        npc_id = npc["id"]
        base = npc["base"]
        col, row = base["col"], base["row"]

        out_x = idx * tile_size
        extracted = output_img.crop((out_x, 0, out_x + tile_size, tile_size))
        original = get_tile(source_img, col, row, tile_size, spacing)

        h_ext = imagehash.phash(extracted)
        h_orig = imagehash.phash(original)
        dist = h_ext - h_orig

        status = "PASS" if dist == 0 else f"FAIL(dist={dist})"
        if dist > 0:
            all_pass = False
        print(f"  {npc_id:20s} {status}")

    return all_pass


def generate_preview(
    output_img: Image.Image,
    npcs_config: list,
    tile_size: int,
    preview_path: str,
) -> None:
    """Generate a labeled preview of extracted NPC sprites."""
    from PIL import ImageDraw, ImageFont

    scale = 4
    label_h = 14
    n = len(npcs_config)
    pw = n * tile_size * scale
    ph = tile_size * scale + label_h

    preview = Image.new("RGBA", (pw, ph), (40, 40, 40, 255))
    draw = ImageDraw.Draw(preview)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 9)
    except (OSError, IOError):
        font = ImageFont.load_default()

    for idx, npc in enumerate(npcs_config):
        out_x = idx * tile_size
        tile = output_img.crop((out_x, 0, out_x + tile_size, tile_size))
        scaled = tile.resize((tile_size * scale, tile_size * scale), Image.Resampling.NEAREST)

        px = idx * tile_size * scale
        preview.paste(scaled, (px, 0), scaled)

        label = npc["id"]
        if len(label) > 10:
            label = label[:9] + ".."
        draw.text((px + 2, tile_size * scale + 1), label, fill=(200, 200, 200, 255), font=font)
        draw.rectangle([px, 0, px + tile_size * scale, tile_size * scale], outline=(80, 80, 80, 200))

    preview.save(preview_path)
    print(f"Preview saved to {preview_path}")


def main() -> None:
    """Extract NPC sprites from manifest and save as spritesheet with atlas JSON."""
    parser = argparse.ArgumentParser(description="Extract NPC sprites from Kenney characters pack.")
    parser.add_argument("--verify", action="store_true", help="Verify extraction accuracy")
    parser.add_argument("--preview", action="store_true", help="Generate labeled preview PNG")
    args = parser.parse_args()

    manifest = load_manifest()
    char_source = manifest["sources"]["characters"]
    npcs_config = manifest["npcs"]["sprites"]
    output_config = manifest["outputs"]["npcs"]

    source_img = Image.open(char_source["path"])
    tile_size = char_source["tileSize"]
    spacing = char_source["spacing"]
    print(f"Source spritesheet size: {source_img.size}")

    num_npcs = len(npcs_config)
    output_width = num_npcs * tile_size
    output_height = tile_size

    output_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
    frames = {}

    for idx, npc in enumerate(npcs_config):
        npc_id = npc["id"]
        base = npc["base"]
        col, row = base["col"], base["row"]

        tile = get_tile(source_img, col, row, tile_size, spacing)
        out_x = idx * tile_size
        output_img.paste(tile, (out_x, 0))

        frames[npc_id] = {
            "frame": {"x": out_x, "y": 0, "w": tile_size, "h": tile_size},
            "sourceSize": {"w": tile_size, "h": tile_size},
            "spriteSourceSize": {"x": 0, "y": 0, "w": tile_size, "h": tile_size},
        }
        zone = npc.get("zone", "Unknown")
        print(f"NPC {npc_id:20s}: ({col:2d},{row:2d}) -> x={out_x:3d} | Zone: {zone}")

    os.makedirs(os.path.dirname(output_config["pngPath"]) or ".", exist_ok=True)
    output_img.save(output_config["pngPath"])
    print(f"\nSaved NPC spritesheet to {output_config['pngPath']}")
    print(f"Output size: {output_img.size}")

    atlas_json = {
        "frames": frames,
        "meta": {
            "image": "npcs.png",
            "size": {"w": output_width, "h": output_height},
            "scale": 1,
            "format": "RGBA8888",
        },
    }

    with open(output_config["jsonPath"], "w") as f:
        json.dump(atlas_json, f, indent=2)
    print(f"Saved NPC atlas JSON to {output_config['jsonPath']}")
    print(f"Manifest version: {manifest['version']}")

    if args.verify:
        verify_extraction(output_img, npcs_config, source_img, tile_size, spacing)

    if args.preview:
        preview_path = output_config["pngPath"].replace(".png", "_preview.png")
        generate_preview(output_img, npcs_config, tile_size, preview_path)


if __name__ == "__main__":
    main()
