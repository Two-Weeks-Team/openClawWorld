#!/usr/bin/env python3
"""Extract NPC sprites from Kenney Roguelike Characters Pack using manifest."""

from PIL import Image
import json
import os
from pathlib import Path

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


def main() -> None:
    """Extract NPC sprites from manifest and save as spritesheet with atlas JSON."""
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

    os.makedirs(os.path.dirname(output_config["pngPath"]), exist_ok=True)
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


if __name__ == "__main__":
    main()
