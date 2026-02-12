#!/usr/bin/env python3
"""
Generate a village road map with proper tilemap data for Phaser.
Creates visual tilemap image and collision data.
"""

from PIL import Image, ImageDraw, ImageFont
import json
import os
import math

MAP_WIDTH = 64
MAP_HEIGHT = 52
TILE_SIZE = 16

GRASS = 0
ROAD = 1
WATER = 2
GRASS_PLAZA = 3

ZONE_BOUNDS = {
    "lobby": {"x": 12, "y": 3, "width": 24, "height": 9, "spawn": (24, 7)},
    "office": {"x": 37, "y": 3, "width": 22, "height": 14, "spawn": (48, 10)},
    "meeting-center": {"x": 3, "y": 20, "width": 14, "height": 20, "spawn": (10, 30)},
    "lounge-cafe": {"x": 17, "y": 38, "width": 22, "height": 12, "spawn": (28, 44)},
    "arcade": {"x": 40, "y": 18, "width": 18, "height": 14, "spawn": (49, 25)},
    "plaza": {"x": 40, "y": 33, "width": 18, "height": 17, "spawn": (49, 42)},
}


def create_tile_map():
    ground = [[GRASS for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT)]
    collision = [[0 for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT)]

    for y in range(3):
        for x in range(MAP_WIDTH):
            ground[y][x] = WATER
            collision[y][x] = 1
    for y in range(3, 20):
        for x in range(5):
            ground[y][x] = WATER
            collision[y][x] = 1

    for i in range(14):
        y = 3 + i
        x_start = 5 + int(i * 0.8)
        x_end = x_start + 3
        for x in range(x_start, min(x_end, 18)):
            if y < MAP_HEIGHT and x < MAP_WIDTH:
                ground[y][x] = ROAD
                collision[y][x] = 0

    for y in range(12, 16):
        for x in range(17, 40):
            ground[y][x] = ROAD
            collision[y][x] = 0

    for y in range(16, 38):
        for x in range(17, 21):
            ground[y][x] = ROAD
            collision[y][x] = 0

    for y in range(16, 18):
        for x in range(21, 40):
            ground[y][x] = ROAD
            collision[y][x] = 0

    for y in range(18, 33):
        for x in range(37, 40):
            ground[y][x] = ROAD
            collision[y][x] = 0

    for y in range(33, 36):
        for x in range(21, 58):
            ground[y][x] = ROAD
            collision[y][x] = 0

    for y in range(36, 50):
        for x in range(17, 58):
            ground[y][x] = ROAD
            collision[y][x] = 0

    for y in range(18, 33):
        for x in range(21, 37):
            ground[y][x] = GRASS_PLAZA
            collision[y][x] = 0

    for zone_name, bounds in ZONE_BOUNDS.items():
        for y in range(bounds["y"], bounds["y"] + bounds["height"]):
            for x in range(bounds["x"], bounds["x"] + bounds["width"]):
                if 0 <= y < MAP_HEIGHT and 0 <= x < MAP_WIDTH:
                    if ground[y][x] == GRASS:
                        collision[y][x] = 0

    return ground, collision


def render_visual_map(ground, collision):
    colors = {
        GRASS: (76, 153, 0, 255),
        ROAD: (210, 210, 210, 255),
        WATER: (64, 164, 223, 255),
        GRASS_PLAZA: (102, 178, 51, 255),
    }

    zone_colors = {
        "lobby": (200, 230, 201, 200),
        "office": (187, 222, 251, 200),
        "meeting-center": (255, 224, 178, 200),
        "lounge-cafe": (248, 187, 208, 200),
        "arcade": (225, 190, 231, 200),
        "plaza": (255, 249, 196, 200),
    }

    img_width = MAP_WIDTH * TILE_SIZE
    img_height = MAP_HEIGHT * TILE_SIZE
    img = Image.new("RGBA", (img_width, img_height))

    road_tile = Image.new("RGBA", (32, 32), colors[ROAD])
    draw_road = ImageDraw.Draw(road_tile)
    for i in range(0, 32, 8):
        draw_road.line([(i, 0), (i, 32)], fill=(180, 180, 180), width=1)
        draw_road.line([(0, i), (32, i)], fill=(180, 180, 180), width=1)

    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            px = x * TILE_SIZE
            py = y * TILE_SIZE
            tile_type = ground[y][x]

            if tile_type == ROAD:
                img.paste(road_tile, (px, py))
            else:
                tile = Image.new("RGBA", (32, 32), colors[tile_type])
                img.paste(tile, (px, py))

    for zone_name, bounds in ZONE_BOUNDS.items():
        color = zone_colors[zone_name]
        for y in range(bounds["y"], bounds["y"] + bounds["height"]):
            for x in range(bounds["x"], bounds["x"] + bounds["width"]):
                if 0 <= y < MAP_HEIGHT and 0 <= x < MAP_WIDTH:
                    if ground[y][x] == GRASS:
                        px = x * TILE_SIZE
                        py = y * TILE_SIZE
                        overlay = Image.new("RGBA", (32, 32), color)
                        img.paste(overlay, (px, py), overlay)

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
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
    except:
        font = ImageFont.load_default()

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
            [text_x - 4, text_y - 4, text_x + text_width + 4, text_y + text_height + 4],
            fill=(0, 0, 0, 200),
        )
        draw.text((text_x, text_y), label, fill=(255, 255, 255), font=font)

        spawn = bounds["spawn"]
        sx = spawn[0] * TILE_SIZE + TILE_SIZE // 2
        sy = spawn[1] * TILE_SIZE + TILE_SIZE // 2
        draw.ellipse(
            [sx - 8, sy - 8, sx + 8, sy + 8], fill=(255, 255, 0, 200), outline=(0, 0, 0)
        )

    for y in range(MAP_HEIGHT + 1):
        draw.line(
            [(0, y * TILE_SIZE), (img_width, y * TILE_SIZE)],
            fill=(60, 60, 60, 80),
            width=1,
        )
    for x in range(MAP_WIDTH + 1):
        draw.line(
            [(x * TILE_SIZE, 0), (x * TILE_SIZE, img_height)],
            fill=(60, 60, 60, 80),
            width=1,
        )

    return img


def render_collision_map(collision):
    img_width = MAP_WIDTH * TILE_SIZE
    img_height = MAP_HEIGHT * TILE_SIZE
    img = Image.new("RGBA", (img_width, img_height))

    walkable = Image.new("RGBA", (32, 32), (0, 255, 0, 100))
    blocked = Image.new("RGBA", (32, 32), (255, 0, 0, 150))

    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            px = x * TILE_SIZE
            py = y * TILE_SIZE

            if collision[y][x] == 0:
                img.paste(walkable, (px, py))
            else:
                img.paste(blocked, (px, py))

    draw = ImageDraw.Draw(img)
    for y in range(MAP_HEIGHT + 1):
        draw.line(
            [(0, y * TILE_SIZE), (img_width, y * TILE_SIZE)],
            fill=(100, 100, 100, 150),
            width=1,
        )
    for x in range(MAP_WIDTH + 1):
        draw.line(
            [(x * TILE_SIZE, 0), (x * TILE_SIZE, img_height)],
            fill=(100, 100, 100, 150),
            width=1,
        )

    return img


def create_combined_preview(visual, collision_overlay):
    combined = visual.copy()
    combined = Image.alpha_composite(combined, collision_overlay)

    draw = ImageDraw.Draw(combined)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except:
        font = ImageFont.load_default()

    legend_x = 10
    legend_y = combined.height - 80
    draw.rectangle(
        [legend_x, legend_y, legend_x + 200, legend_y + 70], fill=(0, 0, 0, 220)
    )
    draw.text(
        (legend_x + 10, legend_y + 10),
        "COLLISION LEGEND",
        fill=(255, 255, 255),
        font=font,
    )
    draw.rectangle(
        [legend_x + 10, legend_y + 30, legend_x + 25, legend_y + 45],
        fill=(0, 255, 0, 150),
    )
    draw.text(
        (legend_x + 35, legend_y + 30),
        "Walkable (Road)",
        fill=(255, 255, 255),
        font=font,
    )
    draw.rectangle(
        [legend_x + 10, legend_y + 50, legend_x + 25, legend_y + 65],
        fill=(255, 0, 0, 150),
    )
    draw.text(
        (legend_x + 35, legend_y + 50),
        "Blocked (Water)",
        fill=(255, 255, 255),
        font=font,
    )

    return combined


def main():
    output_dir = "assets/extracted/visualization"
    os.makedirs(output_dir, exist_ok=True)

    ground, collision = create_tile_map()

    visual_map = render_visual_map(ground, collision)
    visual_map.save(f"{output_dir}/village_map_with_roads.png")
    print(f"Visual map saved to {output_dir}/village_map_with_roads.png")

    collision_map = render_collision_map(collision)
    collision_map.save(f"{output_dir}/collision_overlay.png")
    print(f"Collision overlay saved to {output_dir}/collision_overlay.png")

    combined = create_combined_preview(visual_map, collision_map)
    combined.save(f"{output_dir}/combined_preview.png")
    print(f"Combined preview saved to {output_dir}/combined_preview.png")

    map_data = {
        "width": MAP_WIDTH,
        "height": MAP_HEIGHT,
        "tileSize": TILE_SIZE,
        "zones": ZONE_BOUNDS,
        "ground": ground,
        "collision": collision,
    }

    with open(f"{output_dir}/map_data.json", "w") as f:
        json.dump(map_data, f)
    print(f"Map data saved to {output_dir}/map_data.json")

    print(
        f"\nMap size: {MAP_WIDTH}x{MAP_HEIGHT} tiles ({MAP_WIDTH * TILE_SIZE}x{MAP_HEIGHT * TILE_SIZE} px)"
    )

    walkable_count = sum(row.count(0) for row in collision)
    blocked_count = sum(row.count(1) for row in collision)
    print(f"Walkable tiles: {walkable_count}")
    print(f"Blocked tiles: {blocked_count}")


if __name__ == "__main__":
    main()
