#!/usr/bin/env python3
"""
Phaser 3 Asset Extraction Pipeline
Extracts sprites from source sprite sheets and outputs packed atlas + Phaser JSON + manifest + preview.
100% deterministic: same input produces identical output.
"""

import argparse
import json
import math
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow (PIL) is required. Install with: pip install Pillow")
    sys.exit(1)


# =============================================================================
# Configuration Loading
# =============================================================================


def load_config(path: Path) -> Dict[str, Any]:
    """Load and validate JSON config file."""
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # Validate required fields
    required = ["sheetName", "inputPath", "outputTileSize", "mode"]
    for field in required:
        if field not in config:
            raise ValueError(f"Config missing required field: {field}")

    # Set defaults
    config.setdefault("sourceImageSize", {"width": 2048, "height": 2048})
    config.setdefault("gridLine", {"enabled": False})
    config.setdefault(
        "blankDetector", {"enabled": True, "mode": "transparent", "threshold": 0.95}
    )
    config.setdefault("excludeRects", [])
    config.setdefault("multiTile", [])
    config.setdefault("aliases", {})

    if config["gridLine"].get("enabled", False):
        config["gridLine"].setdefault("thickness", 2)
        config["gridLine"].setdefault("color", [0, 0, 0, 255])
        config["gridLine"].setdefault("tolerance", 50)

    return config


# =============================================================================
# Grid Line Removal
# =============================================================================


def color_distance(c1: Tuple[int, ...], c2: Tuple[int, ...]) -> float:
    """Calculate Euclidean distance between two RGBA colors."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))


def remove_gridlines(image: Image.Image, config: Dict[str, Any]) -> Image.Image:
    """Remove black grid lines by sampling neighbors."""
    grid_config = config.get("gridLine", {})
    if not grid_config.get("enabled", False):
        return image

    thickness = grid_config.get("thickness", 2)
    line_color = tuple(grid_config.get("color", [0, 0, 0, 255]))
    tolerance = grid_config.get("tolerance", 50)

    # Work on a copy
    result = image.copy()
    pixels = result.load()
    width, height = result.size

    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]
            # Check if pixel is close to grid line color
            if (
                len(pixel) >= 3
                and color_distance(pixel[: len(line_color)], line_color) <= tolerance
            ):
                # Sample from left neighbor if available, else right
                if x > 0:
                    pixels[x, y] = pixels[x - 1, y]
                elif x < width - 1:
                    pixels[x, y] = pixels[x + 1, y]
                # If still grid-like, try top neighbor
                new_pixel = pixels[x, y]
                if (
                    color_distance(new_pixel[: len(line_color)], line_color)
                    <= tolerance
                ):
                    if y > 0:
                        pixels[x, y] = pixels[x, y - 1]
                    elif y < height - 1:
                        pixels[x, y] = pixels[x, y + 1]

    return result


# =============================================================================
# Blank Tile Detection
# =============================================================================


def is_blank_tile(tile: Image.Image, config: Dict[str, Any]) -> bool:
    """Detect empty/transparent/checkerboard tiles."""
    blank_config = config.get("blankDetector", {})
    if not blank_config.get("enabled", True):
        return False

    mode = blank_config.get("mode", "transparent")
    threshold = blank_config.get("threshold", 0.95)

    # Ensure RGBA mode
    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")

    pixels = list(tile.getdata())
    total_pixels = len(pixels)

    if total_pixels == 0:
        return True

    if mode == "transparent":
        # Count transparent pixels (alpha < 10)
        transparent_count = sum(1 for p in pixels if p[3] < 10)
        return (transparent_count / total_pixels) >= threshold

    elif mode == "checkerboard":
        # Detect grey checkerboard pattern (common in sprite sheets)
        # Checkerboard typically alternates between two similar grey colors
        grey_colors = [
            (192, 192, 192, 255),  # Light grey
            (128, 128, 128, 255),  # Dark grey
            (204, 204, 204, 255),  # Another light grey
            (153, 153, 153, 255),  # Another medium grey
            (170, 170, 170, 255),
            (85, 85, 85, 255),
        ]

        checkerboard_count = 0
        for p in pixels:
            is_grey = any(color_distance(p, grey) < 50 for grey in grey_colors)
            # Also check for near-transparent
            is_transparent = p[3] < 10
            if is_grey or is_transparent:
                checkerboard_count += 1

        return (checkerboard_count / total_pixels) >= threshold

    elif mode == "sample":
        # Sample from a specific rect to determine blank color
        sample_rect = blank_config.get("sampleRect", {"x": 0, "y": 0, "w": 4, "h": 4})
        # This mode compares tile to the sampled region color
        # For simplicity, treat as transparent check
        transparent_count = sum(1 for p in pixels if p[3] < 10)
        return (transparent_count / total_pixels) >= threshold

    return False


def is_in_exclude_rect(
    x: int, y: int, w: int, h: int, exclude_rects: List[Dict]
) -> bool:
    """Check if a region overlaps with any exclude rect."""
    for rect in exclude_rects:
        rx, ry, rw, rh = rect["x"], rect["y"], rect["w"], rect["h"]
        # Check overlap
        if x < rx + rw and x + w > rx and y < ry + rh and y + h > ry:
            return True
    return False


# =============================================================================
# Tile Extraction - Grid Mode
# =============================================================================


def extract_grid_tiles(
    image: Image.Image, config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Extract tiles using grid mode."""
    grid = config.get("grid", {})
    cols = grid.get("cols", 8)
    rows = grid.get("rows", 8)
    cell_width = grid.get("cellWidth", 256)
    cell_height = grid.get("cellHeight", 256)

    prefix = config.get("namingPrefix", "tile")
    exclude_rects = config.get("excludeRects", [])
    multi_tiles = config.get("multiTile", [])
    output_size = config.get("outputTileSize", 32)

    # Build set of cells that are part of multi-tile sprites
    multi_tile_cells = set()
    for mt in multi_tiles:
        for r in range(mt["rows"]):
            for c in range(mt["cols"]):
                multi_tile_cells.add((mt["startCol"] + c, mt["startRow"] + r))

    tiles = []

    # Extract multi-tile sprites first
    for mt in multi_tiles:
        name = mt["name"]
        start_col = mt["startCol"]
        start_row = mt["startRow"]
        mt_cols = mt["cols"]
        mt_rows = mt["rows"]

        x = start_col * cell_width
        y = start_row * cell_height
        w = mt_cols * cell_width
        h = mt_rows * cell_height

        # Check exclusion
        if is_in_exclude_rect(x, y, w, h, exclude_rects):
            continue

        # Extract combined region
        region = image.crop((x, y, x + w, y + h))

        # Skip if blank
        if is_blank_tile(region, config):
            continue

        # Scale to output size (proportional)
        out_w = output_size * mt_cols
        out_h = output_size * mt_rows
        scaled = region.resize((out_w, out_h), Image.Resampling.LANCZOS)

        tiles.append(
            {
                "name": name,
                "image": scaled,
                "source": {"x": x, "y": y, "w": w, "h": h},
                "col": start_col,
                "row": start_row,
                "width": out_w,
                "height": out_h,
            }
        )

    # Extract individual cells
    for row in range(rows):
        for col in range(cols):
            # Skip if part of multi-tile
            if (col, row) in multi_tile_cells:
                continue

            x = col * cell_width
            y = row * cell_height

            # Check exclusion
            if is_in_exclude_rect(x, y, cell_width, cell_height, exclude_rects):
                continue

            # Extract cell
            region = image.crop((x, y, x + cell_width, y + cell_height))

            # Skip if blank
            if is_blank_tile(region, config):
                continue

            # Scale to output size
            scaled = region.resize((output_size, output_size), Image.Resampling.LANCZOS)

            name = f"{prefix}_{row}_{col}"
            tiles.append(
                {
                    "name": name,
                    "image": scaled,
                    "source": {"x": x, "y": y, "w": cell_width, "h": cell_height},
                    "col": col,
                    "row": row,
                    "width": output_size,
                    "height": output_size,
                }
            )

    return tiles


# =============================================================================
# Tile Extraction - Rects Mode
# =============================================================================


def extract_rect_tiles(
    image: Image.Image, config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Extract tiles using explicit rectangles mode."""
    rects = config.get("rects", [])
    output_size = config.get("outputTileSize", 32)
    exclude_rects = config.get("excludeRects", [])

    tiles = []

    # Sort rects by name for determinism
    sorted_rects = sorted(rects, key=lambda r: r["name"])

    for rect in sorted_rects:
        name = rect["name"]
        x, y, w, h = rect["x"], rect["y"], rect["w"], rect["h"]

        # Check exclusion
        if is_in_exclude_rect(x, y, w, h, exclude_rects):
            continue

        # Extract region
        region = image.crop((x, y, x + w, y + h))

        # Skip if blank
        if is_blank_tile(region, config):
            continue

        # Scale to output size
        scaled = region.resize((output_size, output_size), Image.Resampling.LANCZOS)

        tiles.append(
            {
                "name": name,
                "image": scaled,
                "source": {"x": x, "y": y, "w": w, "h": h},
                "col": x // w if w > 0 else 0,
                "row": y // h if h > 0 else 0,
                "width": output_size,
                "height": output_size,
            }
        )

    return tiles


# =============================================================================
# Atlas Packing
# =============================================================================


def pack_tiles(
    tiles: List[Dict[str, Any]], output_tile_size: int
) -> Tuple[Image.Image, Dict[str, Dict]]:
    """
    Deterministically pack tiles into atlas using row-major order.
    Returns (atlas_image, frames_dict).
    """
    if not tiles:
        # Return minimal atlas
        atlas = Image.new("RGBA", (output_tile_size, output_tile_size), (0, 0, 0, 0))
        return atlas, {}

    # Sort tiles by name for determinism
    sorted_tiles = sorted(tiles, key=lambda t: t["name"])

    # Calculate atlas dimensions
    # Try to make roughly square atlas, but ensure power of 2 for GPU efficiency
    total_area = sum(t["width"] * t["height"] for t in sorted_tiles)

    # Find max tile dimensions
    max_w = max(t["width"] for t in sorted_tiles)
    max_h = max(t["height"] for t in sorted_tiles)

    # Calculate minimum size needed
    min_side = math.ceil(math.sqrt(total_area))

    # Round up to next power of 2, minimum 64
    def next_power_of_2(n: int) -> int:
        p = 64
        while p < n:
            p *= 2
        return min(p, 4096)  # Cap at 4096

    atlas_size = next_power_of_2(max(min_side, max_w, max_h))

    # Try packing with row-major order
    frames = {}
    current_x = 0
    current_y = 0
    row_height = 0

    # First pass: try to fit everything
    positions = []
    for tile in sorted_tiles:
        tw, th = tile["width"], tile["height"]

        # Check if tile fits in current row
        if current_x + tw > atlas_size:
            # Move to next row
            current_x = 0
            current_y += row_height
            row_height = 0

        # Check if we need to increase atlas size
        while current_y + th > atlas_size:
            atlas_size = min(atlas_size * 2, 4096)
            if atlas_size >= 4096 and current_y + th > atlas_size:
                print(f"Warning: Atlas exceeds 4096px, some tiles may not fit")
                break

        positions.append((current_x, current_y))
        current_x += tw
        row_height = max(row_height, th)

    # Create atlas
    atlas = Image.new("RGBA", (atlas_size, atlas_size), (0, 0, 0, 0))

    # Place tiles
    for tile, (px, py) in zip(sorted_tiles, positions):
        atlas.paste(tile["image"], (px, py))

        tw, th = tile["width"], tile["height"]
        frames[tile["name"]] = {
            "frame": {"x": px, "y": py, "w": tw, "h": th},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": tw, "h": th},
            "sourceSize": {"w": tw, "h": th},
        }

    return atlas, frames


# =============================================================================
# Output Generation
# =============================================================================


def generate_phaser_json(
    frames: Dict[str, Dict], atlas_size: int, image_name: str
) -> Dict[str, Any]:
    """Generate Phaser atlas JSON (TexturePacker-compatible)."""
    # Sort frames by key for determinism
    sorted_frames = {k: frames[k] for k in sorted(frames.keys())}

    return {
        "frames": sorted_frames,
        "meta": {
            "app": "openClawWorld-extract",
            "version": "1.0",
            "image": image_name,
            "format": "RGBA8888",
            "size": {"w": atlas_size, "h": atlas_size},
            "scale": "1",
        },
    }


def generate_manifest(
    tiles: List[Dict[str, Any]], config: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate human-readable manifest with source coordinates."""
    # Sort by name for determinism
    sorted_tiles = sorted(tiles, key=lambda t: t["name"])

    entries = []
    for tile in sorted_tiles:
        entry = {
            "name": tile["name"],
            "source": tile["source"],
            "output": {"w": tile["width"], "h": tile["height"]},
        }
        entries.append(entry)

    return {
        "sheetName": config.get("sheetName", "unknown"),
        "sourceFile": config.get("inputPath", "unknown"),
        "totalFrames": len(entries),
        "outputTileSize": config.get("outputTileSize", 32),
        "frames": entries,
        "aliases": config.get("aliases", {}),
    }


def generate_preview(tiles: List[Dict[str, Any]], cols: int = 16) -> Image.Image:
    """Generate contact sheet preview for QA with labels."""
    if not tiles:
        return Image.new("RGBA", (64, 64), (100, 100, 100, 255))

    # Sort by name for determinism
    sorted_tiles = sorted(tiles, key=lambda t: t["name"])

    # Calculate preview dimensions
    # Add space for labels below each tile
    label_height = 12
    tile_with_label = max(t["height"] for t in sorted_tiles) + label_height
    tile_width = max(t["width"] for t in sorted_tiles)

    rows = math.ceil(len(sorted_tiles) / cols)

    preview_width = cols * tile_width
    preview_height = rows * tile_with_label

    # Create preview image with grey background
    preview = Image.new("RGBA", (preview_width, preview_height), (50, 50, 50, 255))
    draw = ImageDraw.Draw(preview)

    # Try to load a font, fall back to default
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 8)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 8)
        except (OSError, IOError):
            font = ImageFont.load_default()

    for i, tile in enumerate(sorted_tiles):
        col = i % cols
        row = i // cols

        x = col * tile_width
        y = row * tile_with_label

        # Center tile in cell
        tx = x + (tile_width - tile["width"]) // 2
        ty = y

        # Paste tile
        preview.paste(tile["image"], (tx, ty), tile["image"])

        # Draw label (truncate if too long)
        label = tile["name"]
        if len(label) > 10:
            label = label[:8] + ".."

        label_y = y + tile["height"] + 1
        draw.text((x + 2, label_y), label, fill=(200, 200, 200, 255), font=font)

    return preview


# =============================================================================
# Main Processing
# =============================================================================


def process_sheet(
    sheet_name: str,
    config_dir: Path,
    src_dir: Path,
    out_dir: Path,
    public_out_dir: Optional[Path] = None,
) -> bool:
    """Process a single sprite sheet."""
    print(f"\n{'=' * 60}")
    print(f"Processing: {sheet_name}")
    print(f"{'=' * 60}")

    # Load config
    config_path = config_dir / f"{sheet_name}.json"
    try:
        config = load_config(config_path)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as e:
        print(f"Error loading config: {e}")
        return False

    # Load source image
    input_path = src_dir / config["inputPath"]
    if not input_path.exists():
        print(f"Error: Source image not found: {input_path}")
        return False

    print(f"Loading source: {input_path}")
    image = Image.open(input_path).convert("RGBA")
    print(f"Source size: {image.size}")

    # Apply crop if specified
    if "crop" in config:
        crop = config["crop"]
        image = image.crop(
            (crop["x"], crop["y"], crop["x"] + crop["w"], crop["y"] + crop["h"])
        )
        print(f"Cropped to: {image.size}")

    # Remove grid lines
    if config.get("gridLine", {}).get("enabled", False):
        print("Removing grid lines...")
        image = remove_gridlines(image, config)

    # Extract tiles based on mode
    mode = config["mode"]
    print(f"Extraction mode: {mode}")

    if mode == "grid":
        tiles = extract_grid_tiles(image, config)
    elif mode == "rects":
        tiles = extract_rect_tiles(image, config)
    else:
        print(f"Error: Unknown mode '{mode}'")
        return False

    print(f"Extracted {len(tiles)} tiles")

    if not tiles:
        print("Warning: No tiles extracted")
        return False

    # Pack tiles into atlas
    output_size = config.get("outputTileSize", 32)
    atlas, frames = pack_tiles(tiles, output_size)
    print(f"Atlas size: {atlas.size}")

    # Create output directory
    sheet_out_dir = out_dir / sheet_name
    sheet_out_dir.mkdir(parents=True, exist_ok=True)

    # Save atlas
    atlas_path = sheet_out_dir / "packed.png"
    atlas.save(atlas_path, "PNG")
    print(f"Saved atlas: {atlas_path}")

    # Generate and save Phaser JSON
    phaser_json = generate_phaser_json(frames, atlas.size[0], "packed.png")
    json_path = sheet_out_dir / "packed.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(phaser_json, f, indent=2, sort_keys=True)
    print(f"Saved Phaser JSON: {json_path}")

    # Generate and save manifest
    manifest = generate_manifest(tiles, config)
    manifest_path = sheet_out_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)
    print(f"Saved manifest: {manifest_path}")

    # Generate and save preview
    preview = generate_preview(tiles)
    preview_path = sheet_out_dir / "preview.png"
    preview.save(preview_path, "PNG")
    print(f"Saved preview: {preview_path}")

    # Copy to public directory if specified
    if public_out_dir:
        public_sheet_dir = public_out_dir / sheet_name
        public_sheet_dir.mkdir(parents=True, exist_ok=True)

        # Copy atlas and JSON to public
        shutil.copy(atlas_path, public_sheet_dir / "packed.png")
        shutil.copy(json_path, public_sheet_dir / "packed.json")
        print(f"Copied to public: {public_sheet_dir}")

    print(f"Successfully processed {sheet_name}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Extract sprites from source sheets for Phaser 3 games."
    )
    parser.add_argument(
        "--sheet",
        type=str,
        help="Process a single sheet by name (e.g., terrain, props)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all sheets found in config directory",
    )
    parser.add_argument(
        "--config-dir",
        type=str,
        default="tools/extract_assets/config",
        help="Path to config directory (default: tools/extract_assets/config)",
    )
    parser.add_argument(
        "--src-dir",
        type=str,
        default="assets/source",
        help="Path to source images directory (default: assets/source)",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default="assets/extracted",
        help="Path to output directory (default: assets/extracted)",
    )
    parser.add_argument(
        "--public-out-dir",
        type=str,
        default="packages/client/public/assets/extracted",
        help="Path to public output directory (default: packages/client/public/assets/extracted)",
    )
    parser.add_argument(
        "--clean", action="store_true", help="Remove existing outputs before processing"
    )

    args = parser.parse_args()

    # Resolve paths relative to project root
    # Find project root (directory containing this script's parent)
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent

    config_dir = project_root / args.config_dir
    src_dir = project_root / args.src_dir
    out_dir = project_root / args.out_dir
    public_out_dir = project_root / args.public_out_dir if args.public_out_dir else None

    print(f"Project root: {project_root}")
    print(f"Config dir: {config_dir}")
    print(f"Source dir: {src_dir}")
    print(f"Output dir: {out_dir}")
    if public_out_dir:
        print(f"Public output dir: {public_out_dir}")

    # Validate directories
    if not config_dir.exists():
        print(f"Error: Config directory not found: {config_dir}")
        sys.exit(1)

    if not src_dir.exists():
        print(f"Error: Source directory not found: {src_dir}")
        sys.exit(1)

    # Clean if requested
    if args.clean:
        if out_dir.exists():
            print(f"Cleaning output directory: {out_dir}")
            shutil.rmtree(out_dir)
        if public_out_dir and public_out_dir.exists():
            print(f"Cleaning public output directory: {public_out_dir}")
            shutil.rmtree(public_out_dir)

    # Determine sheets to process
    sheets_to_process = []

    if args.sheet:
        sheets_to_process = [args.sheet]
    elif args.all:
        # Find all JSON configs (excluding schema.json)
        for config_file in sorted(config_dir.glob("*.json")):
            if config_file.name != "schema.json":
                sheets_to_process.append(config_file.stem)
    else:
        parser.print_help()
        print("\nError: Specify --sheet SHEET_NAME or --all")
        sys.exit(1)

    print(f"\nSheets to process: {sheets_to_process}")

    # Process each sheet
    success_count = 0
    fail_count = 0

    for sheet in sheets_to_process:
        if process_sheet(sheet, config_dir, src_dir, out_dir, public_out_dir):
            success_count += 1
        else:
            fail_count += 1

    # Summary
    print(f"\n{'=' * 60}")
    print(f"SUMMARY: {success_count} succeeded, {fail_count} failed")
    print(f"{'=' * 60}")

    sys.exit(0 if fail_count == 0 else 1)


if __name__ == "__main__":
    main()
