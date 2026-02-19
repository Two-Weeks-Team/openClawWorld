#!/usr/bin/env python3
"""Extract player sprites from Kenney Roguelike Characters Pack using manifest.

Flags:
  --verify   Verify extraction by comparing pHash against source
  --preview  Generate labeled preview PNG
"""

import argparse
import os
import sys

from PIL import Image

from extract_utils import load_manifest, get_tile, verify_sprites, generate_sprite_preview


def main() -> None:
    """Extract player sprites from manifest and save as spritesheet with atlas JSON."""
    import json

    parser = argparse.ArgumentParser(description="Extract player sprites from Kenney characters pack.")
    parser.add_argument("--verify", action="store_true", help="Verify extraction accuracy")
    parser.add_argument("--preview", action="store_true", help="Generate labeled preview PNG")
    args = parser.parse_args()

    manifest = load_manifest()
    char_source = manifest["sources"]["characters"]
    players_config = manifest["players"]["sprites"]
    output_config = manifest["outputs"]["players"]

    source_img = Image.open(char_source["path"])
    tile_size = char_source["tileSize"]
    spacing = char_source["spacing"]
    print(f"Source spritesheet size: {source_img.size}")

    num_players = len(players_config)
    output_width = num_players * tile_size
    output_height = tile_size

    output_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
    frames = {}

    for idx, player in enumerate(players_config):
        player_id = player["id"]
        base = player["base"]
        col, row = base["col"], base["row"]

        tile = get_tile(source_img, col, row, tile_size, spacing)
        out_x = idx * tile_size
        output_img.paste(tile, (out_x, 0))

        frames[player_id] = {
            "frame": {"x": out_x, "y": 0, "w": tile_size, "h": tile_size},
            "sourceSize": {"w": tile_size, "h": tile_size},
            "spriteSourceSize": {"x": 0, "y": 0, "w": tile_size, "h": tile_size},
        }
        desc = player.get("description", "")
        print(f"Player {player_id:20s}: ({col:2d},{row:2d}) -> x={out_x:3d} | {desc}")

    os.makedirs(os.path.dirname(output_config["pngPath"]) or ".", exist_ok=True)
    output_img.save(output_config["pngPath"])
    print(f"\nSaved player spritesheet to {output_config['pngPath']}")
    print(f"Output size: {output_img.size}")

    atlas_json = {
        "frames": frames,
        "meta": {
            "image": "players.png",
            "size": {"w": output_width, "h": output_height},
            "scale": 1,
            "format": "RGBA8888",
        },
    }

    with open(output_config["jsonPath"], "w") as f:
        json.dump(atlas_json, f, indent=2)
    print(f"Saved player atlas JSON to {output_config['jsonPath']}")
    print(f"Manifest version: {manifest['version']}")

    if args.verify:
        if not verify_sprites(output_img, players_config, source_img, tile_size, spacing, label="Player sprites"):
            sys.exit(1)

    if args.preview:
        preview_path = output_config["pngPath"].replace(".png", "_preview.png")
        generate_sprite_preview(output_img, players_config, tile_size, preview_path)


if __name__ == "__main__":
    main()
