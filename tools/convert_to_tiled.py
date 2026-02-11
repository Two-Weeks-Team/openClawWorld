#!/usr/bin/env python3
"""
Convert map_data.json to Tiled-compatible JSON format for Phaser.
"""

import json
from pathlib import Path


def convert_to_tiled(input_path: Path, output_path: Path):
    """Convert custom map format to Tiled JSON format."""
    with open(input_path) as f:
        data = json.load(f)

    width = data["width"]
    height = data["height"]
    tile_size = data["tileSize"]

    # generate_road_map.py defines: GRASS=0, ROAD=1, WATER=2, GRASS_PLAZA=3
    # tileset.svg defines: 1=grass, 2=path, 3=water, 4=stone, 5=wood, 7=sand
    tile_map = {
        0: 1,  # GRASS -> grass (tile 1, green)
        1: 2,  # ROAD -> path/dirt (tile 2, brown)
        2: 3,  # WATER -> water (tile 3, blue)
        3: 1,  # GRASS_PLAZA -> grass (tile 1, green)
    }

    ground_data = []
    collision_data = []

    for row in data["ground"]:
        for tile in row:
            ground_data.append(tile_map.get(tile, 1))

    for row in data["collision"]:
        for tile in row:
            # Collision: 0 = walkable (empty), 1 = blocked (use tile 4 for visual)
            collision_data.append(4 if tile == 1 else 0)

    # Create spawn points as objects
    objects = []
    obj_id = 1
    for zone_id, zone in data["zones"].items():
        spawn = zone.get(
            "spawn", [zone["x"] + zone["width"] // 2, zone["y"] + zone["height"] // 2]
        )
        objects.append(
            {
                "id": obj_id,
                "name": f"spawn_{zone_id}",
                "type": "spawn",
                "x": spawn[0] * tile_size,
                "y": spawn[1] * tile_size,
                "width": tile_size,
                "height": tile_size,
                "properties": [{"name": "zoneId", "type": "string", "value": zone_id}],
            }
        )
        obj_id += 1

        # Add zone boundary marker
        objects.append(
            {
                "id": obj_id,
                "name": f"zone_{zone_id}",
                "type": "zone",
                "x": zone["x"] * tile_size,
                "y": zone["y"] * tile_size,
                "width": zone["width"] * tile_size,
                "height": zone["height"] * tile_size,
                "properties": [{"name": "zoneId", "type": "string", "value": zone_id}],
            }
        )
        obj_id += 1

    tiled_map = {
        "version": 1.1,
        "tiledversion": "1.10.2",
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "width": width,
        "height": height,
        "tilewidth": tile_size,
        "tileheight": tile_size,
        "nextlayerid": 4,
        "nextobjectid": obj_id,
        "infinite": False,
        "tilesets": [
            {
                "firstgid": 1,
                "name": "tileset",
                "tilewidth": tile_size,
                "tileheight": tile_size,
                "tilecount": 32,
                "columns": 8,
                "image": "tileset.svg",
                "imagewidth": 256,
                "imageheight": 128,
            }
        ],
        "properties": [{"name": "mapId", "type": "string", "value": "village"}],
        "layers": [
            {
                "id": 1,
                "name": "ground",
                "type": "tilelayer",
                "x": 0,
                "y": 0,
                "width": width,
                "height": height,
                "visible": True,
                "opacity": 1,
                "data": ground_data,
            },
            {
                "id": 2,
                "name": "collision",
                "type": "tilelayer",
                "x": 0,
                "y": 0,
                "width": width,
                "height": height,
                "visible": True,
                "opacity": 1,
                "data": collision_data,
            },
            {
                "id": 3,
                "name": "objects",
                "type": "objectgroup",
                "x": 0,
                "y": 0,
                "visible": True,
                "opacity": 1,
                "objects": objects,
            },
        ],
    }

    with open(output_path, "w") as f:
        json.dump(tiled_map, f, indent=2)

    print(f"Converted map saved to {output_path}")
    print(
        f"Map size: {width}x{height} tiles ({width * tile_size}x{height * tile_size} px)"
    )
    print(f"Ground tiles: {len(ground_data)}")
    print(f"Collision tiles: {sum(1 for t in collision_data if t > 0)}")
    print(f"Spawn points: {len([o for o in objects if o['type'] == 'spawn'])}")
    print(f"Zone markers: {len([o for o in objects if o['type'] == 'zone'])}")


if __name__ == "__main__":
    root = Path(__file__).parent.parent
    input_path = root / "assets" / "extracted" / "visualization" / "map_data.json"
    output_path = (
        root / "packages" / "client" / "public" / "assets" / "maps" / "village.json"
    )

    convert_to_tiled(input_path, output_path)
