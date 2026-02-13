#!/usr/bin/env python3
"""Extract NPC sprites from Kenney Roguelike Characters Pack."""

from PIL import Image
import json
import os

KENNEY_PATH = "packages/client/public/assets/kenney"
CHAR_SPRITESHEET = f"{KENNEY_PATH}/characters/characters_spritesheet.png"

OUTPUT_PNG = "packages/client/public/assets/sprites/npcs.png"
OUTPUT_JSON = "packages/client/public/assets/sprites/npcs.json"

TILE_SIZE = 16
SPACING = 1

NPC_MAPPING = [
    {"id": "greeter", "col": 0, "row": 0, "desc": "Reception - friendly"},
    {"id": "security", "col": 1, "row": 0, "desc": "Guard - uniform"},
    {"id": "office-pm", "col": 2, "row": 0, "desc": "PM - business casual"},
    {"id": "it-help", "col": 3, "row": 0, "desc": "IT - casual"},
    {"id": "meeting-host", "col": 4, "row": 0, "desc": "Host - formal"},
    {"id": "barista", "col": 5, "row": 0, "desc": "Barista - apron"},
    {"id": "arcade-host", "col": 6, "row": 0, "desc": "Arcade - casual"},
    {"id": "ranger", "col": 7, "row": 0, "desc": "Park - green"},
    {"id": "fountain-keeper", "col": 8, "row": 0, "desc": "Fountain - worker"},
]


def get_tile(img, col, row):
    x = col * (TILE_SIZE + SPACING)
    y = row * (TILE_SIZE + SPACING)
    return img.crop((x, y, x + TILE_SIZE, y + TILE_SIZE))


def main():
    source_img = Image.open(CHAR_SPRITESHEET)
    print(f"Source spritesheet size: {source_img.size}")

    num_npcs = len(NPC_MAPPING)
    output_width = num_npcs * TILE_SIZE
    output_height = TILE_SIZE

    output_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))

    frames = {}

    for idx, npc in enumerate(NPC_MAPPING):
        tile = get_tile(source_img, npc["col"], npc["row"])
        out_x = idx * TILE_SIZE
        output_img.paste(tile, (out_x, 0))

        frames[npc["id"]] = {
            "frame": {"x": out_x, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
            "sourceSize": {"w": TILE_SIZE, "h": TILE_SIZE},
            "spriteSourceSize": {"x": 0, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
        }
        print(f"NPC {npc['id']}: ({npc['col']}, {npc['row']}) -> x={out_x}")

    os.makedirs(os.path.dirname(OUTPUT_PNG), exist_ok=True)
    output_img.save(OUTPUT_PNG)
    print(f"\nSaved NPC spritesheet to {OUTPUT_PNG}")
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

    with open(OUTPUT_JSON, "w") as f:
        json.dump(atlas_json, f, indent=2)
    print(f"Saved NPC atlas JSON to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
