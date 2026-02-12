#!/usr/bin/env python3
"""
Render the village map based on reference image.
Accurate road layout matching the provided reference.
"""

from PIL import Image, ImageDraw, ImageFont
import json
import os

MAP_WIDTH = 64
MAP_HEIGHT = 52
TILE_SIZE = 16

TILE_GRASS = 1
TILE_ROAD = 2
TILE_WATER = 3
TILE_PLAZA_GRASS = 4

ZONE_BOUNDS = {
    "lobby": {"x": 12, "y": 3, "width": 24, "height": 9},
    "office": {"x": 37, "y": 3, "width": 22, "height": 14},
    "meeting-center": {"x": 3, "y": 18, "width": 14, "height": 22},
    "lounge-cafe": {"x": 17, "y": 36, "width": 22, "height": 14},
    "arcade": {"x": 40, "y": 18, "width": 18, "height": 14},
    "plaza": {"x": 40, "y": 33, "width": 18, "height": 17},
}


def create_tile_map():
    tile_map = [[TILE_GRASS for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT)]

    for y in range(3):
        for x in range(MAP_WIDTH):
            tile_map[y][x] = TILE_WATER
    for y in range(3, 20):
        for x in range(5):
            tile_map[y][x] = TILE_WATER

    for i in range(12):
        y = 3 + i
        x_start = 5 + i
        x_end = 8 + i
        for x in range(x_start, min(x_end, MAP_WIDTH)):
            if y < MAP_HEIGHT:
                tile_map[y][x] = TILE_ROAD

    for y in range(12, 16):
        for x in range(17, 40):
            tile_map[y][x] = TILE_ROAD

    for y in range(16, 36):
        for x in range(17, 21):
            tile_map[y][x] = TILE_ROAD

    for y in range(16, 18):
        for x in range(21, 40):
            tile_map[y][x] = TILE_ROAD

    for y in range(18, 33):
        for x in range(37, 40):
            tile_map[y][x] = TILE_ROAD

    for y in range(33, 36):
        for x in range(21, 40):
            tile_map[y][x] = TILE_ROAD

    for y in range(36, 50):
        for x in range(17, 60):
            tile_map[y][x] = TILE_ROAD

    for y in range(18, 33):
        for x in range(21, 37):
            tile_map[y][x] = TILE_PLAZA_GRASS

    return tile_map


def render_map():
    grass_tile = Image.new("RGBA", (32, 32), (76, 153, 0, 255))
    road_tile = Image.new("RGBA", (32, 32), (210, 210, 210, 255))
    water_tile = Image.new("RGBA", (32, 32), (64, 164, 223, 255))
    plaza_grass = Image.new("RGBA", (32, 32), (102, 178, 51, 255))

    draw_road = ImageDraw.Draw(road_tile)
    for i in range(0, 32, 8):
        draw_road.line([(i, 0), (i, 32)], fill=(180, 180, 180), width=1)
        draw_road.line([(0, i), (32, i)], fill=(180, 180, 180), width=1)

    zone_colors = {
        "lobby": (200, 230, 201, 255),
        "office": (187, 222, 251, 255),
        "meeting-center": (255, 224, 178, 255),
        "lounge-cafe": (248, 187, 208, 255),
        "arcade": (225, 190, 231, 255),
        "plaza": (255, 249, 196, 255),
    }

    tile_map = create_tile_map()

    img_width = MAP_WIDTH * TILE_SIZE
    img_height = MAP_HEIGHT * TILE_SIZE
    img = Image.new("RGBA", (img_width, img_height), (0, 0, 0, 255))

    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            px = x * TILE_SIZE
            py = y * TILE_SIZE
            tile_id = tile_map[y][x]

            if tile_id == TILE_WATER:
                img.paste(water_tile, (px, py))
            elif tile_id == TILE_ROAD:
                img.paste(road_tile, (px, py))
            elif tile_id == TILE_PLAZA_GRASS:
                img.paste(plaza_grass, (px, py))
            else:
                img.paste(grass_tile, (px, py))

    for zone_name, bounds in ZONE_BOUNDS.items():
        color = zone_colors[zone_name]
        for y in range(bounds["y"], bounds["y"] + bounds["height"]):
            for x in range(bounds["x"], bounds["x"] + bounds["width"]):
                if 0 <= y < MAP_HEIGHT and 0 <= x < MAP_WIDTH:
                    if tile_map[y][x] == TILE_GRASS:
                        px = x * TILE_SIZE
                        py = y * TILE_SIZE
                        zone_tile = Image.new("RGBA", (32, 32), color)
                        img.paste(zone_tile, (px, py))

    draw = ImageDraw.Draw(img)

    boundary_color = (121, 85, 61, 255)
    for zone_name, bounds in ZONE_BOUNDS.items():
        zx = bounds["x"] * TILE_SIZE
        zy = bounds["y"] * TILE_SIZE
        zw = bounds["width"] * TILE_SIZE
        zh = bounds["height"] * TILE_SIZE
        draw.rectangle(
            [zx, zy, zx + zw - 1, zy + zh - 1], outline=boundary_color, width=4
        )

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except:
        font = ImageFont.load_default()
        small_font = font

    for zone_name, bounds in ZONE_BOUNDS.items():
        zx = bounds["x"] * TILE_SIZE
        zy = bounds["y"] * TILE_SIZE
        zw = bounds["width"] * TILE_SIZE
        zh = bounds["height"] * TILE_SIZE

        label = zone_name.upper().replace("-", "\n")
        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        text_x = zx + (zw - text_width) // 2
        text_y = zy + (zh - text_height) // 2

        draw.rectangle(
            [text_x - 6, text_y - 6, text_x + text_width + 6, text_y + text_height + 6],
            fill=(0, 0, 0, 200),
        )
        draw.text((text_x, text_y), label, fill=(255, 255, 255), font=font)

    for y in range(MAP_HEIGHT + 1):
        draw.line(
            [(0, y * TILE_SIZE), (img_width, y * TILE_SIZE)],
            fill=(80, 80, 80, 60),
            width=1,
        )
    for x in range(MAP_WIDTH + 1):
        draw.line(
            [(x * TILE_SIZE, 0), (x * TILE_SIZE, img_height)],
            fill=(80, 80, 80, 60),
            width=1,
        )

    legend_y = 10
    legend_x = img_width - 240
    draw.rectangle(
        [legend_x, legend_y, legend_x + 230, legend_y + 220], fill=(0, 0, 0, 220)
    )
    draw.text(
        (legend_x + 10, legend_y + 10), "VILLAGE MAP", fill=(255, 255, 255), font=font
    )
    draw.text(
        (legend_x + 10, legend_y + 35),
        "64x52 tiles (2048x1664 px)",
        fill=(180, 180, 180),
        font=small_font,
    )

    items = [
        ("Road/Path", (210, 210, 210)),
        ("Grass", (76, 153, 0)),
        ("Plaza Grass", (102, 178, 51)),
        ("Water", (64, 164, 223)),
        ("Lobby Zone", zone_colors["lobby"][:3]),
        ("Office Zone", zone_colors["office"][:3]),
        ("Meeting Zone", zone_colors["meeting-center"][:3]),
        ("Lounge Zone", zone_colors["lounge-cafe"][:3]),
        ("Arcade Zone", zone_colors["arcade"][:3]),
        ("Plaza Zone", zone_colors["plaza"][:3]),
    ]

    for i, (name, color) in enumerate(items):
        iy = legend_y + 55 + i * 16
        draw.rectangle([legend_x + 10, iy, legend_x + 25, iy + 12], fill=color)
        draw.text((legend_x + 35, iy - 2), name, fill=(255, 255, 255), font=small_font)

    return img


def main():
    output_dir = "assets/extracted/visualization"
    os.makedirs(output_dir, exist_ok=True)

    rendered_map = render_map()
    rendered_map.save(f"{output_dir}/village_map_with_roads.png")
    print(f"Rendered map saved to {output_dir}/village_map_with_roads.png")
    print(
        f"Map size: {MAP_WIDTH}x{MAP_HEIGHT} tiles ({MAP_WIDTH * TILE_SIZE}x{MAP_HEIGHT * TILE_SIZE} px)"
    )


if __name__ == "__main__":
    main()
