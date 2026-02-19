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
import sys

from PIL import Image

from extract_utils import load_manifest, get_tile, generate_sprite_preview


def verify_extraction(
    output_img: Image.Image,
    objects_extracted: list,
    source_images: dict,
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
        w = entry.get("w", 16)
        h = entry.get("h", 16)

        extracted = output_img.crop((out_x, 0, out_x + w, h))
        h_ext = imagehash.phash(extracted)

        source_name = entry["source"]
        if source_name in source_images:
            src = source_images[source_name]
            src_ts = src["tileSize"]
            obj_tw = w // src_ts if w > src_ts else 1
            obj_th = h // src_ts if h > src_ts else 1
            original = get_tile(
                src["image"],
                entry["col"], entry["row"],
                tile_size=src_ts,
                spacing=src["spacing"],
                width=obj_tw, height=obj_th,
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

    # Pre-compute output dimensions accounting for multi-tile objects
    # Use source tileSize for each object rather than hardcoded value
    total_width = 0
    max_height = 0
    for obj in objects_config:
        source_name = obj["source"]
        src_ts = source_images[source_name]["tileSize"] if source_name in source_images else 16
        obj_w = obj.get("width", 1) * src_ts
        obj_h = obj.get("height", 1) * src_ts
        total_width += obj_w
        max_height = max(max_height, obj_h)

    if max_height == 0:
        max_height = 16

    output_width = total_width
    output_height = max_height

    output_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
    frames = {}
    objects_extracted = []
    out_x = 0

    for obj in objects_config:
        obj_id = obj["id"]
        source_name = obj["source"]
        col = obj["col"]
        row = obj["row"]
        obj_tw = obj.get("width", 1)
        obj_th = obj.get("height", 1)
        desc = obj.get("description", "")

        if source_name not in source_images:
            print(f"  WARNING: Source '{source_name}' not found for {obj_id}, skipping")
            continue

        src = source_images[source_name]
        src_ts = src["tileSize"]
        try:
            sprite = get_tile(
                src["image"], col, row, src_ts, src["spacing"],
                width=obj_tw, height=obj_th,
            )
            w = sprite.width
            h = sprite.height
            output_img.paste(sprite, (out_x, 0))

            frames[obj_id] = {
                "frame": {"x": out_x, "y": 0, "w": w, "h": h},
                "sourceSize": {"w": w, "h": h},
                "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            }

            objects_extracted.append({
                "id": obj_id,
                "source": source_name,
                "col": col,
                "row": row,
                "out_x": out_x,
                "w": w,
                "h": h,
            })

            size_str = f"{obj_tw}x{obj_th}" if obj_tw > 1 or obj_th > 1 else "1x1"
            print(f"  {obj_id:15s}: ({col:2d},{row:2d}) {size_str:>3s} from {source_name:10s} -> x={out_x} | {desc}")
            out_x += w
        except Exception as e:
            print(f"  WARNING: Failed to extract {obj_id}: {e}")

    # Save output
    os.makedirs(os.path.dirname(output_config["pngPath"]) or ".", exist_ok=True)
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
        if not verify_extraction(output_img, objects_extracted, source_images):
            sys.exit(1)

    if args.preview:
        preview_path = output_config["pngPath"].replace(".png", "_preview.png")
        generate_sprite_preview(
            output_img, objects_extracted, 16, preview_path,
            get_out_x=lambda item, idx: item["out_x"],
            get_dimensions=lambda item: (item.get("w", 16), item.get("h", 16)),
        )


if __name__ == "__main__":
    main()
