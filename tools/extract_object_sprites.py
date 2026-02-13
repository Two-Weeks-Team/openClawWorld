#!/usr/bin/env python3
"""Extract object sprites from Kenney Roguelike packs.

Extracts decorative objects and interactive items from:
- City tilemap subset in repository
- Interior tilemap subset in repository

Output: objects.png atlas + objects.json (Phaser atlas format)
"""

from PIL import Image
import json
import os

KENNEY_PATH = "packages/client/public/assets/kenney"
CITY_TILEMAP = f"{KENNEY_PATH}/tiles/city_tilemap.png"
INTERIOR_SPRITESHEET = f"{KENNEY_PATH}/interior/interior_tilemap.png"

OUTPUT_PNG = "packages/client/public/assets/sprites/objects.png"
OUTPUT_JSON = "packages/client/public/assets/sprites/objects.json"

TILE_SIZE = 16
SPACING = 1  # For spaced tilesheets
CITY_COLS = 37  # city_tilemap.png columns at 16x16

# Object mapping using individual tile files for City Pack
# Tile numbers determined from Kenney Roguelike City Pack analysis
# Row 20-23 contains decorative objects
CITY_OBJECTS = [
    # Fountain - water feature (tile 919 is a nice fountain base)
    {"id": "fountain", "tile_num": 919, "desc": "Fountain - plaza decoration"},
    # Bench - seating (tile 958 is a wooden bench)
    {"id": "bench", "tile_num": 958, "desc": "Bench - park seating"},
    # Lamp - street lighting (tile 765 is a lamp post)
    {"id": "lamp", "tile_num": 765, "desc": "Lamp - street light"},
    # Sign - information board (tile 882 is a signpost)
    {"id": "sign", "tile_num": 882, "desc": "Sign - information board"},
]

# Interior objects using spritesheet coordinates (col, row)
# Interior Pack: 27 cols x 18 rows, 1px spacing
INTERIOR_OBJECTS = [
    # Chest closed - treasure container (around row 12-13)
    {"id": "chest", "col": 24, "row": 12, "desc": "Chest - closed treasure"},
    # Chest open - opened container
    {"id": "chest-open", "col": 25, "row": 12, "desc": "Chest - opened"},
    # Portal - magical doorway (around row 15-16)
    {"id": "portal", "col": 0, "row": 17, "desc": "Portal - magical doorway"},
]


def get_city_tile(img: Image.Image, tile_num: int) -> Image.Image:
    """Extract a city tile using 1-based tile index."""
    if tile_num <= 0:
        raise ValueError(f"tile_num must be >= 1, got {tile_num}")

    tile_index = tile_num - 1
    col = tile_index % CITY_COLS
    row = tile_index // CITY_COLS
    x = col * TILE_SIZE
    y = row * TILE_SIZE

    if x + TILE_SIZE > img.width or y + TILE_SIZE > img.height:
        raise ValueError(
            f"tile_{tile_num:04d} out of bounds (col={col}, row={row}) for image {img.size}"
        )

    return img.crop((x, y, x + TILE_SIZE, y + TILE_SIZE))


def get_interior_tile(img: Image.Image, col: int, row: int) -> Image.Image:
    """Extract tile from Interior spritesheet with 1px spacing."""
    x = col * (TILE_SIZE + SPACING)
    y = row * (TILE_SIZE + SPACING)
    if x + TILE_SIZE > img.width or y + TILE_SIZE > img.height:
        raise ValueError(
            f"interior tile out of bounds (col={col}, row={row}) for image {img.size}"
        )
    return img.crop((x, y, x + TILE_SIZE, y + TILE_SIZE))


def main():
    print("=== Extracting Object Sprites from Kenney Packs ===\n")

    # Load source tilemaps/spritesheets from tracked repo assets
    city_img = Image.open(CITY_TILEMAP).convert("RGBA")
    interior_img = Image.open(INTERIOR_SPRITESHEET).convert("RGBA")
    print(f"City tilemap size: {city_img.size}")
    print(f"Interior spritesheet size: {interior_img.size}")

    # Calculate output dimensions
    all_objects = CITY_OBJECTS + INTERIOR_OBJECTS
    num_objects = len(all_objects)
    output_width = num_objects * TILE_SIZE
    output_height = TILE_SIZE

    # Create output atlas
    output_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
    frames = {}

    idx = 0

    # Extract city objects from packed city tilemap
    print("\n--- City Pack Objects ---")
    for obj in CITY_OBJECTS:
        try:
            tile = get_city_tile(city_img, obj["tile_num"])
            out_x = idx * TILE_SIZE
            output_img.paste(tile, (out_x, 0))

            frames[obj["id"]] = {
                "frame": {"x": out_x, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
                "sourceSize": {"w": TILE_SIZE, "h": TILE_SIZE},
                "spriteSourceSize": {"x": 0, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
            }
            print(f"  {obj['id']}: tile_{obj['tile_num']:04d} -> x={out_x}")
            idx += 1
        except ValueError as e:
            print(f"  WARNING: {e}")

    # Extract Interior Pack objects (spritesheet)
    print("\n--- Interior Pack Objects ---")
    for obj in INTERIOR_OBJECTS:
        try:
            tile = get_interior_tile(interior_img, obj["col"], obj["row"])
            out_x = idx * TILE_SIZE
            output_img.paste(tile, (out_x, 0))

            frames[obj["id"]] = {
                "frame": {"x": out_x, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
                "sourceSize": {"w": TILE_SIZE, "h": TILE_SIZE},
                "spriteSourceSize": {"x": 0, "y": 0, "w": TILE_SIZE, "h": TILE_SIZE},
            }
            print(f"  {obj['id']}: ({obj['col']}, {obj['row']}) -> x={out_x}")
            idx += 1
        except ValueError as e:
            print(f"  WARNING: {e}")

    # Save output PNG
    os.makedirs(os.path.dirname(OUTPUT_PNG), exist_ok=True)
    output_img.save(OUTPUT_PNG)
    print(f"\nSaved object spritesheet to {OUTPUT_PNG}")
    print(f"Output size: {output_img.size} ({idx} objects)")

    # Create Phaser atlas JSON
    atlas_json = {
        "frames": frames,
        "meta": {
            "image": "objects.png",
            "size": {"w": output_width, "h": output_height},
            "scale": 1,
            "format": "RGBA8888",
        },
    }

    with open(OUTPUT_JSON, "w") as f:
        json.dump(atlas_json, f, indent=2)
    print(f"Saved object atlas JSON to {OUTPUT_JSON}")

    # Print summary
    print("\n=== Object Atlas Summary ===")
    print(f"Total objects: {len(frames)}")
    for obj_id in frames:
        print(f"  - {obj_id}")


if __name__ == "__main__":
    main()
