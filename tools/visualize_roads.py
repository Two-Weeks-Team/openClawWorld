#!/usr/bin/env python3
"""
Visualize roads and zone boundaries from the village map reference image.
Creates a preview image showing road layout and zone boundaries.
"""

from PIL import Image, ImageDraw, ImageFont
import json
import os

MAP_WIDTH = 64
MAP_HEIGHT = 52
TILE_SIZE = 32

ZONE_COLORS = {
    "lobby": (144, 238, 144, 180),
    "office": (173, 216, 230, 180),
    "meeting-center": (255, 218, 185, 180),
    "lounge-cafe": (255, 182, 193, 180),
    "arcade": (221, 160, 221, 180),
    "plaza": (255, 255, 224, 180),
}

ROAD_COLOR = (200, 200, 200, 255)
GRASS_COLOR = (34, 139, 34, 255)
WATER_COLOR = (65, 105, 225, 255)
BOUNDARY_COLOR = (139, 69, 19, 255)

ZONE_BOUNDS = {
    "lobby": {"x": 12, "y": 6, "width": 24, "height": 8},
    "office": {"x": 36, "y": 6, "width": 18, "height": 14},
    "meeting-center": {"x": 3, "y": 17, "width": 20, "height": 17},
    "lounge-cafe": {"x": 23, "y": 17, "width": 20, "height": 17},
    "arcade": {"x": 43, "y": 17, "width": 18, "height": 11},
    "plaza": {"x": 43, "y": 28, "width": 18, "height": 18},
}

ROADS = [
    {"x": 17, "y": 14, "width": 3, "height": 25, "type": "vertical_main"},
    {"x": 20, "y": 17, "width": 23, "height": 3, "type": "horizontal_top"},
    {"x": 20, "y": 31, "width": 23, "height": 3, "type": "horizontal_bottom"},
    {"x": 40, "y": 20, "width": 3, "height": 11, "type": "vertical_right"},
    {"x": 8, "y": 6, "width": 4, "height": 8, "type": "diagonal_bridge"},
]

PLAZA_CENTER = {"x": 20, "y": 20, "width": 20, "height": 11}


def create_road_map():
    img_width = MAP_WIDTH * TILE_SIZE
    img_height = MAP_HEIGHT * TILE_SIZE

    img = Image.new("RGBA", (img_width, img_height), GRASS_COLOR)
    draw = ImageDraw.Draw(img)

    for y in range(6):
        for x in range(MAP_WIDTH):
            px = x * TILE_SIZE
            py = y * TILE_SIZE
            draw.rectangle(
                [px, py, px + TILE_SIZE - 1, py + TILE_SIZE - 1], fill=WATER_COLOR
            )

    for x in range(8):
        for y in range(6, 20):
            px = x * TILE_SIZE
            py = y * TILE_SIZE
            draw.rectangle(
                [px, py, px + TILE_SIZE - 1, py + TILE_SIZE - 1], fill=WATER_COLOR
            )

    px = PLAZA_CENTER["x"] * TILE_SIZE
    py = PLAZA_CENTER["y"] * TILE_SIZE
    pw = PLAZA_CENTER["width"] * TILE_SIZE
    ph = PLAZA_CENTER["height"] * TILE_SIZE
    draw.rectangle([px, py, px + pw - 1, py + ph - 1], fill=ROAD_COLOR)

    for road in ROADS:
        rx = road["x"] * TILE_SIZE
        ry = road["y"] * TILE_SIZE
        rw = road["width"] * TILE_SIZE
        rh = road["height"] * TILE_SIZE
        draw.rectangle([rx, ry, rx + rw - 1, ry + rh - 1], fill=ROAD_COLOR)

    for zone_name, bounds in ZONE_BOUNDS.items():
        zx = bounds["x"] * TILE_SIZE
        zy = bounds["y"] * TILE_SIZE
        zw = bounds["width"] * TILE_SIZE
        zh = bounds["height"] * TILE_SIZE

        overlay = Image.new("RGBA", (zw, zh), ZONE_COLORS[zone_name])
        img.paste(overlay, (zx, zy), overlay)

        draw.rectangle(
            [zx, zy, zx + zw - 1, zy + zh - 1], outline=BOUNDARY_COLOR, width=3
        )

        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        except:
            font = ImageFont.load_default()

        label = zone_name.upper().replace("-", "\n")
        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = zx + (zw - text_width) // 2
        text_y = zy + (zh - text_height) // 2

        draw.rectangle(
            [text_x - 5, text_y - 5, text_x + text_width + 5, text_y + text_height + 5],
            fill=(255, 255, 255, 200),
        )
        draw.text((text_x, text_y), label, fill=(0, 0, 0, 255), font=font)

    for y in range(MAP_HEIGHT + 1):
        draw.line(
            [(0, y * TILE_SIZE), (img_width, y * TILE_SIZE)],
            fill=(100, 100, 100, 100),
            width=1,
        )
    for x in range(MAP_WIDTH + 1):
        draw.line(
            [(x * TILE_SIZE, 0), (x * TILE_SIZE, img_height)],
            fill=(100, 100, 100, 100),
            width=1,
        )

    legend_x = 10
    legend_y = img_height - 150
    draw.rectangle(
        [legend_x, legend_y, legend_x + 200, legend_y + 140], fill=(255, 255, 255, 220)
    )
    draw.text((legend_x + 10, legend_y + 10), "LEGEND:", fill=(0, 0, 0), font=font)
    draw.rectangle(
        [legend_x + 10, legend_y + 35, legend_x + 30, legend_y + 55], fill=ROAD_COLOR
    )
    draw.text((legend_x + 40, legend_y + 35), "Road/Path", fill=(0, 0, 0), font=font)
    draw.rectangle(
        [legend_x + 10, legend_y + 60, legend_x + 30, legend_y + 80], fill=GRASS_COLOR
    )
    draw.text((legend_x + 40, legend_y + 60), "Grass", fill=(0, 0, 0), font=font)
    draw.rectangle(
        [legend_x + 10, legend_y + 85, legend_x + 30, legend_y + 105], fill=WATER_COLOR
    )
    draw.text((legend_x + 40, legend_y + 85), "Water", fill=(0, 0, 0), font=font)
    draw.rectangle(
        [legend_x + 10, legend_y + 110, legend_x + 30, legend_y + 130],
        outline=BOUNDARY_COLOR,
        width=2,
    )
    draw.text(
        (legend_x + 40, legend_y + 110), "Zone Boundary", fill=(0, 0, 0), font=font
    )

    return img


def main():
    output_dir = "assets/extracted/visualization"
    os.makedirs(output_dir, exist_ok=True)

    road_map = create_road_map()
    road_map.save(f"{output_dir}/road_map.png")
    print(f"Road map saved to {output_dir}/road_map.png")

    road_data = {
        "map_size": {"width": MAP_WIDTH, "height": MAP_HEIGHT, "tile_size": TILE_SIZE},
        "zones": ZONE_BOUNDS,
        "roads": ROADS,
        "plaza_center": PLAZA_CENTER,
    }

    with open(f"{output_dir}/road_data.json", "w") as f:
        json.dump(road_data, f, indent=2)
    print(f"Road data saved to {output_dir}/road_data.json")


if __name__ == "__main__":
    main()
