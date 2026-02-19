#!/usr/bin/env python3
"""Shared utilities for Kenney asset extraction scripts.

Provides common functions used across extract_tileset.py, extract_npc_sprites.py,
extract_player_sprites.py, and extract_object_sprites.py.
"""

import json
import os
from pathlib import Path
from typing import Optional

from PIL import Image

SCRIPT_DIR = Path(__file__).parent
MANIFEST_PATH = SCRIPT_DIR / "kenney-curation.json"


def load_manifest() -> dict:
    """Load kenney-curation.json manifest file."""
    with open(MANIFEST_PATH) as f:
        return json.load(f)


def get_tile(
    img: Image.Image,
    col: int,
    row: int,
    tile_size: int = 16,
    spacing: int = 0,
    width: int = 1,
    height: int = 1,
) -> Image.Image:
    """Extract tile(s) from a spritesheet at the given grid position.

    Args:
        img: Source spritesheet image.
        col: Column index in the grid.
        row: Row index in the grid.
        tile_size: Size of each tile in pixels.
        spacing: Spacing between tiles in pixels.
        width: Number of tiles wide (default 1).
        height: Number of tiles tall (default 1).

    Returns:
        Cropped tile image.
    """
    x = col * (tile_size + spacing)
    y = row * (tile_size + spacing)
    w = width * tile_size + (width - 1) * spacing
    h = height * tile_size + (height - 1) * spacing
    return img.crop((x, y, x + w, y + h))


def generate_sprite_preview(
    output_img: Image.Image,
    items: list,
    tile_size: int,
    preview_path: str,
    id_key: str = "id",
    get_out_x=None,
    get_dimensions=None,
) -> None:
    """Generate a labeled preview of extracted sprites.

    Args:
        output_img: The assembled spritesheet.
        items: List of sprite config dicts.
        tile_size: Default tile size.
        preview_path: Output path for preview PNG.
        id_key: Key to use for label text from each item.
        get_out_x: Optional callable(item, idx) -> out_x. Defaults to idx * tile_size.
        get_dimensions: Optional callable(item) -> (w, h). Defaults to (tile_size, tile_size).
    """
    from PIL import ImageDraw, ImageFont

    scale = 4
    label_h = 14

    if get_dimensions:
        max_h = max((get_dimensions(item)[1] for item in items), default=tile_size)
        pw = sum(get_dimensions(item)[0] * scale for item in items)
    else:
        max_h = tile_size
        pw = len(items) * tile_size * scale
    ph = max_h * scale + label_h

    preview = Image.new("RGBA", (pw, ph), (40, 40, 40, 255))
    draw = ImageDraw.Draw(preview)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 9)
    except (OSError, IOError):
        font = ImageFont.load_default()

    px = 0
    for idx, item in enumerate(items):
        if get_out_x:
            out_x = get_out_x(item, idx)
        else:
            out_x = idx * tile_size

        if get_dimensions:
            w, h = get_dimensions(item)
        else:
            w, h = tile_size, tile_size

        sprite = output_img.crop((out_x, 0, out_x + w, h))
        scaled = sprite.resize((w * scale, h * scale), Image.Resampling.NEAREST)
        preview.paste(scaled, (px, 0), scaled)

        label = item.get(id_key, str(idx)) if isinstance(item, dict) else str(idx)
        if len(label) > 12:
            label = label[:11] + ".."
        draw.text((px + 2, h * scale + 1), label, fill=(200, 200, 200, 255), font=font)
        draw.rectangle([px, 0, px + w * scale, h * scale], outline=(80, 80, 80, 200))
        px += w * scale

    os.makedirs(os.path.dirname(preview_path) or ".", exist_ok=True)
    preview.save(preview_path)
    print(f"Preview saved to {preview_path}")


def verify_sprites(
    output_img: Image.Image,
    items: list,
    source_img: Optional[Image.Image],
    tile_size: int,
    spacing: int = 0,
    label: str = "Sprites",
    get_coords=None,
    get_out_x=None,
) -> bool:
    """Verify extracted sprites against source using pHash.

    Args:
        output_img: Assembled spritesheet.
        items: List of sprite config dicts.
        source_img: Source spritesheet for comparison.
        tile_size: Tile size.
        spacing: Source spacing.
        label: Label for verification output.
        get_coords: Optional callable(item) -> (col, row). Defaults to item["base"]["col"], item["base"]["row"].
        get_out_x: Optional callable(item, idx) -> out_x. Defaults to idx * tile_size.

    Returns:
        True if all verifications pass.
    """
    try:
        import imagehash
    except ImportError:
        print("Warning: imagehash not installed, skipping verification")
        return True

    if source_img is None:
        print(f"Warning: No source image for {label}, skipping verification")
        return True

    print(f"\n{'=' * 60}")
    print(f"VERIFICATION: {label}")
    print(f"{'=' * 60}")

    all_pass = True
    for idx, item in enumerate(items):
        item_id = item.get("id", str(idx))

        if get_out_x:
            out_x = get_out_x(item, idx)
        else:
            out_x = idx * tile_size

        extracted = output_img.crop((out_x, 0, out_x + tile_size, tile_size))

        if get_coords:
            col, row = get_coords(item)
        else:
            base = item.get("base", item)
            col, row = base["col"], base["row"]

        original = get_tile(source_img, col, row, tile_size, spacing)

        h_ext = imagehash.phash(extracted)
        h_orig = imagehash.phash(original)
        dist = h_ext - h_orig

        status = "PASS" if dist == 0 else f"FAIL(dist={dist})"
        if dist > 0:
            all_pass = False
        print(f"  {item_id:20s} {status}")

    return all_pass
