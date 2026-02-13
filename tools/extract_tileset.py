#!/usr/bin/env python3
"""
Extract tiles from Kenney asset packs using manifest-based configuration.

Reads tile definitions from kenney-curation.json and creates the game tileset.
Output: 128x64 tileset (8x4 tiles at 16x16)
"""

from PIL import Image
import json
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
MANIFEST_PATH = SCRIPT_DIR / "kenney-curation.json"


def load_manifest():
    with open(MANIFEST_PATH) as f:
        return json.load(f)


def get_tile(img, col, row, tile_size=16, spacing=0):
    x = col * (tile_size + spacing)
    y = row * (tile_size + spacing)
    return img.crop((x, y, x + tile_size, y + tile_size))


def main():
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
            print(f"WARNING: Source not found: {path}")

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
                print(f"ERROR: Tile {tile_id}: {e}")
                placeholder = Image.new(
                    "RGBA", (tile_size, tile_size), (255, 0, 255, 255)
                )
                tileset.paste(placeholder, (out_x, out_y))
        else:
            print(f"WARNING: Source '{source_name}' not found for tile '{tile_id}'")
            placeholder = Image.new("RGBA", (tile_size, tile_size), (255, 0, 255, 255))
            tileset.paste(placeholder, (out_x, out_y))

    output_path = output_config["path"]
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    tileset.save(output_path)

    print(f"\n{'=' * 60}")
    print(f"Saved tileset to {output_path}")
    print(f"Output size: {tileset.size} ({len(tiles_config)} tiles)")
    print(f"Manifest version: {manifest['version']}")


if __name__ == "__main__":
    main()
