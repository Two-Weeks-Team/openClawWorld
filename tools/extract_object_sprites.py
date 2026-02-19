#!/usr/bin/env python3
"""Extract object sprites from Kenney Roguelike packs using manifest.

Reads object definitions from kenney-curation.json instead of hardcoded arrays.
Output: objects.png atlas + objects.json (Phaser atlas format)

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
    img: Image.Image, col: int, row: int, tile_size: int = 16, spacing: int = 0
) -> Image.Image:
    """Extract a single tile from a spritesheet at the given grid position."""
    x = col * (tile_size + spacing)
    y = row * (tile_size + spacing)
    return img.crop((x, y, x + tile_size, y + tile_size))


def verify_extraction(
    output_img: Image.Image,
    objects_extracted: list,
    source_images: dict,
    tile_size: int,
) -> bool:
    """Verify each extracted object sprite against the source."""
    try:
        import imagehash
    except ImportError:
        print("Warning: imagehash not installed, skipping verification")
        return True

    print(f"\n{'=' * 60}")
    print("VERIFICATION: Object sprites")
    print(f"{'=' * 60}")

    all_pass = True
    for entry in objects_extracted:
        obj_id = entry["id"]
        out_x = entry["out_x"]
        w = entry.get("w", tile_size)
        h = entry.get("h", tile_size)

        extracted = output_img.crop((out_x, 0, out_x + w, h))
        h_ext = imagehash.phash(extracted)

        source_name = entry["source"]
        if source_name in source_images:
            src = source_images[source_name]
            original = get_tile(
                src["image"],
                entry["col"], entry["row"],
                tile_size=src["tileSize"],
                spacing=src["spacing"],
            )
            h_orig = imagehash.phash(original)
            dist = h_ext - h_orig
            status = "PASS" if dist == 0 else f"FAIL(dist={dist})"
            if dist > 0:
                all_pass = False
        else:
            status = "SKIP(no source)"

        print(f"  {obj_id:20s} {status}")

    return all_pass


def generate_preview(
    output_img: Image.Image,
    objects_extracted: list,
    tile_size: int,
    preview_path: str,
) -> None:
    """Generate a labeled preview of extracted object sprites."""
    from PIL import ImageDraw, ImageFont

    scale = 4
    label_h = 14
    n = len(objects_extracted)
    pw = n * tile_size * scale
    ph = tile_size * scale + label_h

    preview = Image.new("RGBA", (pw, ph), (40, 40, 40, 255))
    draw = ImageDraw.Draw(preview)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 9)
    except (OSError, IOError):
        font = ImageFont.load_default()

    for i, entry in enumerate(objects_extracted):
        out_x = entry["out_x"]
        tile = output_img.crop((out_x, 0, out_x + tile_size, tile_size))
        scaled = tile.resize((tile_size * scale, tile_size * scale), Image.Resampling.NEAREST)

        px = i * tile_size * scale
        preview.paste(scaled, (px, 0), scaled)

        label = entry["id"]
        if len(label) > 10:
            label = label[:9] + ".."
        draw.text((px + 2, tile_size * scale + 1), label, fill=(200, 200, 200, 255), font=font)
        draw.rectangle([px, 0, px + tile_size * scale, tile_size * scale], outline=(80, 80, 80, 200))

    preview.save(preview_path)
    print(f"Preview saved to {preview_path}")


def main():
    parser = argparse.ArgumentParser(description="Extract object sprites from Kenney packs.")
    parser.add_argument("--verify", action="store_true", help="Verify extraction accuracy")
    parser.add_argument("--preview", action="store_true", help="Generate labeled preview PNG")
    args = parser.parse_args()

    print("=== Extracting Object Sprites from Kenney Packs ===\n")

    manifest = load_manifest()
    sources_config = manifest["sources"]
    objects_config = manifest["objects"]["sprites"]
    output_config = manifest["outputs"]["objects"]

    # Load source images
    source_images = {}
    for source_name, source_info in sources_config.items():
        path = source_info["path"]
        if os.path.exists(path):
            source_images[source_name] = {
                "image": Image.open(path).convert("RGBA"),
                "tileSize": source_info["tileSize"],
                "spacing": source_info["spacing"],
            }
            print(f"Loaded {source_name}: {path} ({source_images[source_name]['image'].size})")

    tile_size = 16
    num_objects = len(objects_config)
    output_width = num_objects * tile_size
    output_height = tile_size

    output_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
    frames = {}
    objects_extracted = []

    for idx, obj in enumerate(objects_config):
        obj_id = obj["id"]
        source_name = obj["source"]
        col = obj["col"]
        row = obj["row"]
        desc = obj.get("description", "")

        if source_name not in source_images:
            print(f"  WARNING: Source '{source_name}' not found for {obj_id}, skipping")
            continue

        src = source_images[source_name]
        try:
            tile = get_tile(src["image"], col, row, src["tileSize"], src["spacing"])
            out_x = idx * tile_size
            output_img.paste(tile, (out_x, 0))

            frames[obj_id] = {
                "frame": {"x": out_x, "y": 0, "w": tile_size, "h": tile_size},
                "sourceSize": {"w": tile_size, "h": tile_size},
                "spriteSourceSize": {"x": 0, "y": 0, "w": tile_size, "h": tile_size},
            }

            objects_extracted.append({
                "id": obj_id,
                "source": source_name,
                "col": col,
                "row": row,
                "out_x": out_x,
            })

            print(f"  {obj_id:15s}: ({col:2d},{row:2d}) from {source_name:10s} -> x={out_x} | {desc}")
        except Exception as e:
            print(f"  WARNING: Failed to extract {obj_id}: {e}")

    # Save output
    os.makedirs(os.path.dirname(output_config["pngPath"]), exist_ok=True)
    output_img.save(output_config["pngPath"])
    print(f"\nSaved object spritesheet to {output_config['pngPath']}")
    print(f"Output size: {output_img.size} ({len(frames)} objects)")

    atlas_json = {
        "frames": frames,
        "meta": {
            "image": "objects.png",
            "size": {"w": output_width, "h": output_height},
            "scale": 1,
            "format": "RGBA8888",
        },
    }

    with open(output_config["jsonPath"], "w") as f:
        json.dump(atlas_json, f, indent=2)
    print(f"Saved object atlas JSON to {output_config['jsonPath']}")

    print("\n=== Object Atlas Summary ===")
    print(f"Total objects: {len(frames)}")
    for obj_id in frames:
        print(f"  - {obj_id}")

    if args.verify:
        verify_extraction(output_img, objects_extracted, source_images, tile_size)

    if args.preview:
        preview_path = output_config["pngPath"].replace(".png", "_preview.png")
        generate_preview(output_img, objects_extracted, tile_size, preview_path)


if __name__ == "__main__":
    main()
