#!/usr/bin/env python3
"""
Extract tiles from Kenney Roguelike City Pack to create a game tileset.

The city_tilemap.png is 592x448 pixels with 37x28 tiles at 16x16 each.
No spacing between tiles (packed format).

Output: 128x64 tileset (8x4 tiles at 16x16)
"""

from PIL import Image
import os

# Source tilemap
KENNEY_PATH = "docs/reference/Kenney Game Assets All-in-1 3.3.0/2D assets"
CITY_TILEMAP = f"{KENNEY_PATH}/Roguelike City Pack/Tilemap/tilemap_packed.png"
INTERIOR_TILEMAP = (
    f"{KENNEY_PATH}/Roguelike Interior Pack/Tilesheets/roguelikeIndoor_transparent.png"
)

# Output
OUTPUT_PATH = "packages/client/public/assets/maps/tileset.png"

# Tile size
TILE_SIZE = 16

# City tilemap: 37 columns, 28 rows (no spacing in packed version)
CITY_COLS = 37
CITY_ROWS = 28


def get_tile_from_city(img, col, row):
    """Extract a tile from city tilemap (0-indexed)."""
    x = col * TILE_SIZE
    y = row * TILE_SIZE
    return img.crop((x, y, x + TILE_SIZE, y + TILE_SIZE))


def get_tile_from_interior(img, col, row, spacing=1):
    """Extract a tile from interior tilemap (0-indexed, with 1px spacing)."""
    x = col * (TILE_SIZE + spacing)
    y = row * (TILE_SIZE + spacing)
    return img.crop((x, y, x + TILE_SIZE, y + TILE_SIZE))


def main():
    # Load source tilemaps
    city_img = Image.open(CITY_TILEMAP)
    interior_img = Image.open(INTERIOR_TILEMAP)

    print(f"City tilemap size: {city_img.size}")
    print(f"Interior tilemap size: {interior_img.size}")

    # Create output tileset (8x4 = 32 tiles)
    # 128x64 pixels (8 columns, 4 rows)
    tileset = Image.new("RGBA", (128, 64), (0, 0, 0, 0))

    # Tile mapping based on current game requirements:
    # Row 0: Basic terrain (grass, road variants)
    # Row 1: Floor types for different zones
    # Row 2: Walls, doors, water
    # Row 3: Decorations, special tiles

    # Selected tiles from city_tilemap (by visual inspection of common roguelike layouts):
    # Grass: typically around row 0-2, col 0-5
    # Road: typically middle rows
    # Water: typically bottom rows or edges
    # Buildings: various

    tile_mapping = [
        # Row 0: Basic terrain
        (0, 0, "city"),  # 0: empty/void
        (1, 0, "city"),  # 1: grass light
        (2, 0, "city"),  # 2: grass dark
        (0, 1, "city"),  # 3: road horizontal
        (1, 1, "city"),  # 4: road vertical
        (2, 1, "city"),  # 5: road corner
        (3, 1, "city"),  # 6: road intersection
        (4, 1, "city"),  # 7: path/sidewalk
        # Row 1: Zone floors
        (0, 2, "city"),  # 8: floor_lobby (tile)
        (1, 2, "city"),  # 9: floor_office
        (2, 2, "city"),  # 10: floor_meeting
        (3, 2, "city"),  # 11: floor_lounge
        (4, 2, "city"),  # 12: floor_arcade
        (5, 2, "city"),  # 13: floor_plaza
        (6, 2, "city"),  # 14: floor_park
        (7, 2, "city"),  # 15: floor_lake (water edge)
        # Row 2: Walls and barriers
        (0, 5, "city"),  # 16: wall solid
        (1, 5, "city"),  # 17: wall_top
        (2, 5, "city"),  # 18: wall_left
        (3, 5, "city"),  # 19: wall_right
        (4, 5, "city"),  # 20: wall_bottom
        (0, 8, "city"),  # 21: door closed
        (1, 8, "city"),  # 22: door open
        (0, 10, "city"),  # 23: water
        # Row 3: Decorations and special
        (0, 12, "city"),  # 24: tree
        (1, 12, "city"),  # 25: bush
        (2, 12, "city"),  # 26: flower
        (0, 15, "city"),  # 27: fountain
        (1, 15, "city"),  # 28: bench
        (2, 15, "city"),  # 29: lamp
        (3, 15, "city"),  # 30: sign
        (4, 15, "city"),  # 31: chest
    ]

    # Place tiles into output tileset
    for idx, (col, row, source) in enumerate(tile_mapping):
        out_col = idx % 8
        out_row = idx // 8
        out_x = out_col * TILE_SIZE
        out_y = out_row * TILE_SIZE

        try:
            if source == "city":
                tile = get_tile_from_city(city_img, col, row)
            else:
                tile = get_tile_from_interior(interior_img, col, row)

            tileset.paste(tile, (out_x, out_y))
            print(f"Tile {idx}: ({col}, {row}) from {source} -> ({out_col}, {out_row})")
        except Exception as e:
            print(f"Error extracting tile {idx}: {e}")
            # Fill with placeholder color
            placeholder = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), (255, 0, 255, 255))
            tileset.paste(placeholder, (out_x, out_y))

    # Save output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    tileset.save(OUTPUT_PATH)
    print(f"\nSaved tileset to {OUTPUT_PATH}")
    print(f"Output size: {tileset.size}")


if __name__ == "__main__":
    main()
