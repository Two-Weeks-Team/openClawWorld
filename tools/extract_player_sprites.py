#!/usr/bin/env python3
"""Extract player sprites from Kenney Roguelike Characters Pack."""

from PIL import Image
import json
import os

KENNEY_PATH = "docs/reference/Kenney Game Assets All-in-1 3.3.0/2D assets"
CHAR_SPRITESHEET = (
    f"{KENNEY_PATH}/Roguelike Characters Pack/Spritesheet/roguelikeChar_transparent.png"
)

OUTPUT_PNG = "packages/client/public/assets/sprites/players.png"
OUTPUT_JSON = "packages/client/public/assets/sprites/players.json"

TILE_SIZE = 16
SPACING = 1

PLAYER_MAPPING = [
    {"id": "player-human", "col": 0, "row": 0, "desc": "Human player"},
    {"id": "player-agent", "col": 1, "row": 0, "desc": "AI agent (robot style)"},
    {"id": "player-object", "col": 24, "row": 0, "desc": "Object/item entity"},
]


def get_tile(img, col, row):
    x = col * (TILE_SIZE + SPACING)
    y = row * (TILE_SIZE + SPACING)
    return img.crop((x, y, x + TILE_SIZE, y + TILE_SIZE))


def main():
    source_img = Image.open(CHAR_SPRITESHEET)
    print(f"Source spritesheet size: {source_img.size}")

    num_players = len(PLAYER_MAPPING)
    output_width = num_players * TILE_SIZE
    output_height = TILE_SIZE

    output_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))

    frames = {}

    for idx, player in enumerate(PLAYER_MAPPING):
        tile = get_tile(source_img, player["col"], player["row"])
        out_x = idx * TILE_SIZE
        output_img.paste(tile, (out_x, 0))

        frames[player["id"]] = {
            "frame": {"x": out_x, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
            "sourceSize": {"w": TILE_SIZE, "h": TILE_SIZE},
            "spriteSourceSize": {"x": 0, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
        }
        print(f"Player {player['id']}: ({player['col']}, {player['row']}) -> x={out_x}")

    os.makedirs(os.path.dirname(OUTPUT_PNG), exist_ok=True)
    output_img.save(OUTPUT_PNG)
    print(f"\nSaved player spritesheet to {OUTPUT_PNG}")
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

    with open(OUTPUT_JSON, "w") as f:
        json.dump(atlas_json, f, indent=2)
    print(f"Saved player atlas JSON to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
