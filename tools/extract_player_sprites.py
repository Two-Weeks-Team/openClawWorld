#!/usr/bin/env python3
"""Extract player sprites from Kenney Roguelike Characters Pack using manifest."""

from PIL import Image
import json
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
MANIFEST_PATH = SCRIPT_DIR / "kenney-curation.json"


def load_manifest():
    with open(MANIFEST_PATH) as f:
        return json.load(f)


def get_tile(img, col, row, tile_size=16, spacing=1):
    x = col * (tile_size + spacing)
    y = row * (tile_size + spacing)
    return img.crop((x, y, x + tile_size, y + tile_size))


def main():
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

    os.makedirs(os.path.dirname(output_config["pngPath"]), exist_ok=True)
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


if __name__ == "__main__":
    main()
