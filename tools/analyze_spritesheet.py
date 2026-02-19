#!/usr/bin/env python3
"""
Analyze character/object spritesheets to detect individual sprites and group animations.

Features:
- Grid-based sprite extraction for uniform spritesheets (Kenney standard)
- Bounding box detection for non-uniform sprites via connected component analysis
- pHash-based similarity grouping (same character, different frames)
- Animation sequence estimation (position proximity + size similarity)
- Visual output with bounding box overlays

Usage (grid mode - Kenney characters):
    python tools/analyze_spritesheet.py \
        --input packages/client/public/assets/kenney/characters/characters_spritesheet.png \
        --mode grid --tile-size 16 --spacing 1 \
        --output tools/analysis/roguelike_characters_analysis.json

Usage (auto-detect mode):
    python tools/analyze_spritesheet.py \
        --input some_spritesheet.png \
        --mode auto \
        --output tools/analysis/spritesheet_analysis.json
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

try:
    import imagehash
except ImportError:
    print("Error: imagehash is required. Install with: pip install imagehash")
    sys.exit(1)

try:
    import numpy as np
except ImportError:
    print("Error: numpy is required. Install with: pip install numpy")
    sys.exit(1)


# =============================================================================
# Sprite Detection
# =============================================================================


def detect_sprites_grid(
    img: Image.Image,
    tile_size: int = 16,
    spacing: int = 0,
    blank_threshold: float = 0.95,
) -> List[Dict[str, Any]]:
    """Detect sprites using uniform grid extraction."""
    width, height = img.size
    step = tile_size + spacing
    cols = width // step
    rows = height // step

    sprites = []
    for row in range(rows):
        for col in range(cols):
            x = col * step
            y = row * step
            tile = img.crop((x, y, x + tile_size, y + tile_size))

            # Check blank
            pixels = list(tile.getdata())
            if not pixels:
                continue
            transparent = sum(1 for p in pixels if len(p) >= 4 and p[3] < 10)
            if (transparent / len(pixels)) >= blank_threshold:
                continue

            phash = str(imagehash.phash(tile))

            sprites.append({
                "id": f"sprite_{row}_{col}",
                "col": col,
                "row": row,
                "bbox": {"x": x, "y": y, "w": tile_size, "h": tile_size},
                "phash": phash,
                "area": tile_size * tile_size,
            })

    return sprites


def detect_sprites_auto(
    img: Image.Image,
    min_size: int = 4,
    blank_threshold: int = 10,
) -> List[Dict[str, Any]]:
    """
    Auto-detect sprites via connected component analysis on alpha channel.
    Groups adjacent opaque pixels into bounding boxes.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    arr = np.array(img)
    alpha = arr[:, :, 3]

    # Binary mask: opaque pixels
    mask = (alpha > blank_threshold).astype(np.uint8)

    # Simple flood-fill connected component labeling
    height, width = mask.shape
    labels = np.zeros_like(mask, dtype=np.int32)
    current_label = 0
    label_pixels: Dict[int, List[Tuple[int, int]]] = {}

    for y in range(height):
        for x in range(width):
            if mask[y, x] == 1 and labels[y, x] == 0:
                current_label += 1
                # BFS flood fill
                stack = [(y, x)]
                component_pixels = []
                while stack:
                    cy, cx = stack.pop()
                    if cy < 0 or cy >= height or cx < 0 or cx >= width:
                        continue
                    if labels[cy, cx] != 0 or mask[cy, cx] == 0:
                        continue
                    labels[cy, cx] = current_label
                    component_pixels.append((cx, cy))
                    # 4-connected neighbors
                    stack.extend([
                        (cy - 1, cx), (cy + 1, cx),
                        (cy, cx - 1), (cy, cx + 1),
                    ])
                if len(component_pixels) >= min_size:
                    label_pixels[current_label] = component_pixels

    # Compute bounding boxes
    sprites = []
    for label_id, pixels in label_pixels.items():
        xs = [p[0] for p in pixels]
        ys = [p[1] for p in pixels]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        w = x_max - x_min + 1
        h = y_max - y_min + 1

        if w < min_size or h < min_size:
            continue

        sprite_img = img.crop((x_min, y_min, x_min + w, y_min + h))
        phash = str(imagehash.phash(sprite_img))

        sprites.append({
            "id": f"sprite_{label_id}",
            "bbox": {"x": x_min, "y": y_min, "w": w, "h": h},
            "phash": phash,
            "area": len(pixels),
            "pixel_count": len(pixels),
        })

    # Sort by position (top-left to bottom-right)
    sprites.sort(key=lambda s: (s["bbox"]["y"], s["bbox"]["x"]))

    # Re-index
    for i, s in enumerate(sprites):
        s["id"] = f"sprite_{i}"

    return sprites


# =============================================================================
# Similarity Grouping
# =============================================================================


def group_by_similarity(
    sprites: List[Dict[str, Any]],
    threshold: int = 8,
) -> List[List[str]]:
    """Group sprites by pHash similarity (same character, different frames)."""
    n = len(sprites)
    hashes = [imagehash.hex_to_hash(s["phash"]) for s in sprites]

    visited = set()
    groups = []

    for i in range(n):
        if i in visited:
            continue
        group = [sprites[i]["id"]]
        visited.add(i)

        for j in range(i + 1, n):
            if j in visited:
                continue
            dist = hashes[i] - hashes[j]
            if dist <= threshold:
                group.append(sprites[j]["id"])
                visited.add(j)

        if len(group) > 1:
            groups.append(group)

    return groups


def estimate_animation_sequences(
    sprites: List[Dict[str, Any]],
    similarity_groups: List[List[str]],
    proximity_threshold: int = 32,
) -> List[Dict[str, Any]]:
    """
    Estimate animation sequences from similarity groups.
    Sprites that are similar and horizontally adjacent are likely animation frames.
    """
    sprite_map = {s["id"]: s for s in sprites}
    sequences = []

    for group in similarity_groups:
        group_sprites = [sprite_map[sid] for sid in group if sid in sprite_map]
        if len(group_sprites) < 2:
            continue

        # Sort by x position (left to right)
        group_sprites.sort(key=lambda s: (s["bbox"]["y"], s["bbox"]["x"]))

        # Check if they form a horizontal strip (same y, sequential x)
        rows: Dict[int, List] = defaultdict(list)
        for s in group_sprites:
            # Group by approximate row (within threshold)
            row_key = s["bbox"]["y"] // proximity_threshold
            rows[row_key].append(s)

        for row_key, row_sprites in rows.items():
            if len(row_sprites) >= 2:
                sequences.append({
                    "frames": [s["id"] for s in row_sprites],
                    "frameCount": len(row_sprites),
                    "direction": "horizontal",
                    "startPos": {
                        "x": row_sprites[0]["bbox"]["x"],
                        "y": row_sprites[0]["bbox"]["y"],
                    },
                })

    return sequences


# =============================================================================
# Preview Generation
# =============================================================================


def generate_preview(
    image_path: str,
    sprites: List[Dict[str, Any]],
    similarity_groups: List[List[str]],
    output_path: str,
    scale: int = 2,
) -> None:
    """Generate preview with bounding box overlays and group coloring."""
    img = Image.open(image_path).convert("RGBA")
    preview = img.resize(
        (img.width * scale, img.height * scale),
        Image.Resampling.NEAREST,
    )
    draw = ImageDraw.Draw(preview, "RGBA")

    # Assign colors to similarity groups
    group_colors = [
        (255, 0, 0),     # red
        (0, 255, 0),     # green
        (0, 0, 255),     # blue
        (255, 255, 0),   # yellow
        (255, 0, 255),   # magenta
        (0, 255, 255),   # cyan
        (255, 128, 0),   # orange
        (128, 0, 255),   # purple
        (0, 255, 128),   # spring green
        (255, 128, 128), # light red
    ]

    sprite_to_group_color: Dict[str, Tuple[int, ...]] = {}
    for gi, group in enumerate(similarity_groups):
        color = group_colors[gi % len(group_colors)]
        for sid in group:
            sprite_to_group_color[sid] = color

    default_color = (200, 200, 200)

    for sprite in sprites:
        bbox = sprite["bbox"]
        x1 = bbox["x"] * scale
        y1 = bbox["y"] * scale
        x2 = (bbox["x"] + bbox["w"]) * scale
        y2 = (bbox["y"] + bbox["h"]) * scale

        color = sprite_to_group_color.get(sprite["id"], default_color)
        draw.rectangle([x1, y1, x2, y2], outline=color + (200,), width=1)

    preview.save(output_path)
    print(f"Preview saved to {output_path}")


# =============================================================================
# CLI
# =============================================================================


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analyze spritesheets to detect sprites and animation sequences."
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to spritesheet PNG",
    )
    parser.add_argument(
        "--mode", "-m",
        choices=["grid", "auto"],
        default="grid",
        help="Detection mode: grid (uniform tiles) or auto (connected components)",
    )
    parser.add_argument(
        "--tile-size", "-t",
        type=int,
        default=16,
        help="Tile size for grid mode (default: 16)",
    )
    parser.add_argument(
        "--spacing", "-s",
        type=int,
        default=0,
        help="Spacing between tiles for grid mode (default: 0)",
    )
    parser.add_argument(
        "--output", "-o",
        help="Output JSON report path",
    )
    parser.add_argument(
        "--preview", "-p",
        help="Generate preview PNG with bounding box overlays",
    )
    parser.add_argument(
        "--similarity-threshold",
        type=int,
        default=8,
        help="pHash hamming distance threshold for grouping (default: 8)",
    )

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    img = Image.open(args.input).convert("RGBA")
    print(f"Image: {args.input}")
    print(f"Size: {img.size}")
    print(f"Mode: {args.mode}")

    # Detect sprites
    if args.mode == "grid":
        sprites = detect_sprites_grid(
            img,
            tile_size=args.tile_size,
            spacing=args.spacing,
        )
    else:
        sprites = detect_sprites_auto(img)

    print(f"Detected {len(sprites)} sprites")

    # Group by similarity
    similarity_groups = group_by_similarity(sprites, args.similarity_threshold)
    print(f"Similarity groups: {len(similarity_groups)}")

    # Estimate animation sequences
    sequences = estimate_animation_sequences(sprites, similarity_groups)
    print(f"Estimated animation sequences: {len(sequences)}")

    # Build report
    report = {
        "source": args.input,
        "imageSize": {"w": img.width, "h": img.height},
        "mode": args.mode,
        "detectionParams": {
            "tileSize": args.tile_size if args.mode == "grid" else None,
            "spacing": args.spacing if args.mode == "grid" else None,
        },
        "totalSprites": len(sprites),
        "sprites": sprites,
        "similarityGroups": similarity_groups,
        "animationSequences": sequences,
    }

    if args.output:
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\nAnalysis saved to {args.output}")
    else:
        # Print summary only to avoid flooding terminal
        print(json.dumps({
            "source": report["source"],
            "totalSprites": report["totalSprites"],
            "similarityGroups": len(report["similarityGroups"]),
            "animationSequences": len(report["animationSequences"]),
        }, indent=2))

    if args.preview:
        os.makedirs(os.path.dirname(args.preview) or ".", exist_ok=True)
        generate_preview(args.input, sprites, similarity_groups, args.preview)


if __name__ == "__main__":
    main()
