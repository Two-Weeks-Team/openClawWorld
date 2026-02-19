#!/usr/bin/env python3
"""
Extract tiles from Kenney asset packs using manifest-based configuration.

Reads tile definitions from kenney-curation.json and creates the game tileset.
Output: 128x64 tileset (8x4 tiles at 16x16)

Flags:
  --verify   After extraction, compare each tile's pHash against the source to validate accuracy
  --preview  Generate a labeled preview PNG alongside the tileset
"""

import argparse
import json
import os
import sys
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
    tileset: Image.Image,
    tiles_config: list,
    source_images: dict,
    output_config: dict,
) -> bool:
    """Verify extracted tileset by comparing pHash of each tile against source."""
    try:
        import imagehash
    except ImportError:
        print("Warning: imagehash not installed, skipping verification")
        print("Install with: pip install imagehash")
        return True

    tile_size = output_config["tileSize"]
    columns = output_config["columns"]
    all_pass = True

    print(f"\n{'=' * 60}")
    print("VERIFICATION: Comparing extracted tiles against sources")
    print(f"{'=' * 60}")

    for tile_def in tiles_config:
        tile_id = tile_def["id"]
        tile_index = tile_def["index"]
        source_name = tile_def["source"]
        col = tile_def["col"]
        row = tile_def["row"]

        out_col = tile_index % columns
        out_row = tile_index // columns
        out_x = out_col * tile_size
        out_y = out_row * tile_size

        # Extract from output tileset
        extracted = tileset.crop((out_x, out_y, out_x + tile_size, out_y + tile_size))

        # Extract from source
        if source_name in source_images:
            source = source_images[source_name]
            original = get_tile(
                source["image"],
                col, row,
                tile_size=source["tileSize"],
                spacing=source["spacing"],
            )

            h_extracted = imagehash.phash(extracted)
            h_original = imagehash.phash(original)
            dist = h_extracted - h_original

            status = "PASS" if dist == 0 else f"WARN(dist={dist})"
            if dist > 3:
                status = f"FAIL(dist={dist})"
                all_pass = False

            print(f"  [{tile_index:2d}] {tile_id:20s} {status}")

    if all_pass:
        print("\nAll tiles verified successfully.")
    else:
        print("\nSome tiles have mismatches. Check source coordinates.")

    return all_pass


def generate_preview(
    tileset: Image.Image,
    tiles_config: list,
    output_config: dict,
    preview_path: str,
) -> None:
    """Generate a labeled preview PNG showing tile IDs over each slot."""
    from PIL import ImageDraw, ImageFont

    tile_size = output_config["tileSize"]
    columns = output_config["columns"]
    rows_count = output_config["rows"]

    # Scale up for readability
    scale = 4
    label_h = 14
    cell_h = tile_size * scale + label_h

    preview_w = columns * tile_size * scale
    preview_h = rows_count * cell_h

    preview = Image.new("RGBA", (preview_w, preview_h), (40, 40, 40, 255))
    draw = ImageDraw.Draw(preview)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 9)
    except (OSError, IOError):
        font = ImageFont.load_default()

    # Paste scaled tiles
    for tile_def in tiles_config:
        tile_index = tile_def["index"]
        tile_id = tile_def["id"]

        out_col = tile_index % columns
        out_row = tile_index // columns
        out_x = out_col * tile_size
        out_y = out_row * tile_size

        tile_img = tileset.crop((out_x, out_y, out_x + tile_size, out_y + tile_size))
        scaled = tile_img.resize(
            (tile_size * scale, tile_size * scale),
            Image.Resampling.NEAREST,
        )

        px = out_col * tile_size * scale
        py = out_row * cell_h

        preview.paste(scaled, (px, py), scaled)

        # Draw label
        label = f"{tile_index}:{tile_id}"
        if len(label) > 12:
            label = label[:11] + ".."
        draw.text(
            (px + 2, py + tile_size * scale + 1),
            label,
            fill=(200, 200, 200, 255),
            font=font,
        )

        # Draw border
        draw.rectangle(
            [px, py, px + tile_size * scale, py + tile_size * scale],
            outline=(80, 80, 80, 200),
        )

    preview.save(preview_path)
    print(f"Preview saved to {preview_path}")


def main() -> None:
    """Extract tiles from Kenney packs based on manifest and save as tileset PNG."""
    parser = argparse.ArgumentParser(
        description="Extract tiles from Kenney asset packs using manifest configuration."
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify extraction accuracy via pHash comparison",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Generate labeled preview PNG alongside tileset",
    )
    args = parser.parse_args()

    manifest = load_manifest()
    sources_config = manifest["sources"]
    output_config = manifest["outputs"]["tileset"]
    tiles_config = manifest["tileset"]["tiles"]

    source_images = {}
    for source_name, source_info in sources_config.items():
        path = source_info["path"]
        if os.path.exists(path):
            source_images[source_name] = {
                "image": Image.open(path),
                "tileSize": source_info["tileSize"],
                "spacing": source_info["spacing"],
            }
            print(f"Loaded {source_name}: {path}")
        else:
            raise FileNotFoundError(f"Source not found: {path}")

    output_width = output_config["width"]
    output_height = output_config["height"]
    tile_size = output_config["tileSize"]
    columns = output_config["columns"]

    tileset = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))

    for tile_def in tiles_config:
        tile_id = tile_def["id"]
        tile_index = tile_def["index"]
        source_name = tile_def["source"]
        col = tile_def["col"]
        row = tile_def["row"]
        purpose = tile_def.get("purpose", "")

        out_col = tile_index % columns
        out_row = tile_index // columns
        out_x = out_col * tile_size
        out_y = out_row * tile_size

        if source_name in source_images:
            source = source_images[source_name]
            try:
                tile = get_tile(
                    source["image"],
                    col,
                    row,
                    tile_size=source["tileSize"],
                    spacing=source["spacing"],
                )
                tileset.paste(tile, (out_x, out_y))
                print(
                    f"[{tile_index:2d}] {tile_id:20s} ({col:2d},{row:2d}) from {source_name:10s} -> ({out_col},{out_row}) | {purpose}"
                )
            except Exception as e:
                raise RuntimeError(f"Tile extraction failed for {tile_id}: {e}") from e
        else:
            raise RuntimeError(
                f"Source '{source_name}' not loaded for tile '{tile_id}'"
            )

    output_path = output_config["path"]
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    tileset.save(output_path)

    print(f"\n{'=' * 60}")
    print(f"Saved tileset to {output_path}")
    print(f"Output size: {tileset.size} ({len(tiles_config)} tiles)")
    print(f"Manifest version: {manifest['version']}")

    if args.verify:
        verify_extraction(tileset, tiles_config, source_images, output_config)

    if args.preview:
        preview_path = output_path.replace(".png", "_preview.png")
        generate_preview(tileset, tiles_config, output_config, preview_path)


if __name__ == "__main__":
    main()
