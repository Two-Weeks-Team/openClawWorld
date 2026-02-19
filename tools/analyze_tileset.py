#!/usr/bin/env python3
"""
Advanced Kenney tileset/tilemap analysis with deep tile metrics.

Features:
- Grid-based tile extraction with configurable tile_size and spacing
- Blank tile detection via alpha channel threshold
- Dominant color extraction per tile (quantized histogram)
- Perceptual hash (pHash) for duplicate/similarity detection
- Color-based category classification (nature, road, water, wall, etc.)
- Edge connectivity scoring (how well tiles connect to neighbors)
- Symmetry detection (horizontal, vertical, rotational)
- Pattern frequency analysis (repeating structures)
- Tile relationship mapping (adjacency compatibility)
- Palette complexity metrics per tile

Usage:
    python tools/analyze_tileset.py \
        --input packages/client/public/assets/kenney/tiles/city_tilemap.png \
        --tile-size 16 --spacing 0 \
        --output tools/analysis/roguelike_city_analysis.json \
        --deep-metrics
"""

import argparse
import json
import math
import os
import sys
from collections import Counter, defaultdict
from colorsys import rgb_to_hsv
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    from PIL import Image
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
    np = None


# =============================================================================
# Color Category Classification
# =============================================================================

def _classify_by_color(r: int, g: int, b: int) -> str:
    """Classify a tile by its dominant RGB color into a semantic category."""
    if r < 20 and g < 20 and b < 20:
        return "void"
    if b > 120 and b > r * 1.3 and b > g * 1.2:
        return "water"
    if g > 100 and g > r * 1.2 and g > b * 1.2:
        return "nature"
    if r > 100 and g > 60 and b < g and (r / max(g, 1)) > 1.1 and (r / max(g, 1)) < 2.0:
        return "wood"
    if abs(r - g) < 30 and abs(g - b) < 30 and abs(r - b) < 30:
        if r > 180:
            return "light_surface"
        elif r > 100:
            return "road"
        else:
            return "wall"
    if r > 140 and r > g * 1.5 and r > b * 1.5:
        return "brick"
    if r > 150 and g > 130 and b < 100:
        return "sand"
    return "decoration"


# =============================================================================
# Core Tile Analysis Functions
# =============================================================================

def is_blank_tile(tile: Image.Image, threshold: float = 0.95) -> bool:
    """Check if a tile is mostly transparent (blank)."""
    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")
    pixels = list(tile.getdata())
    if not pixels:
        return True
    transparent_count = sum(1 for p in pixels if p[3] < 10)
    return (transparent_count / len(pixels)) >= threshold


def get_dominant_color(tile: Image.Image) -> Tuple[int, int, int]:
    """Extract the dominant (most frequent) color from a tile, ignoring transparency."""
    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")

    pixels = list(tile.getdata())
    opaque_pixels = [(r, g, b) for r, g, b, a in pixels if a > 50]

    if not opaque_pixels:
        return (0, 0, 0)

    quantized = [
        ((r >> 4) << 4, (g >> 4) << 4, (b >> 4) << 4)
        for r, g, b in opaque_pixels
    ]
    counter = Counter(quantized)
    return counter.most_common(1)[0][0]


def compute_phash(tile: Image.Image) -> str:
    """Compute perceptual hash of a tile image."""
    return str(imagehash.phash(tile))


def find_duplicates(
    tiles: List[Dict[str, Any]], threshold: int = 3
) -> List[List[int]]:
    """Find groups of duplicate/near-duplicate tiles by pHash hamming distance."""
    n = len(tiles)
    hashes = []
    for t in tiles:
        hashes.append(imagehash.hex_to_hash(t["phash"]))

    visited = set()
    groups = []

    for i in range(n):
        if i in visited or tiles[i]["isEmpty"]:
            continue
        group = [i]
        for j in range(i + 1, n):
            if j in visited or tiles[j]["isEmpty"]:
                continue
            dist = hashes[i] - hashes[j]
            if dist <= threshold:
                group.append(j)
                visited.add(j)
        if len(group) > 1:
            groups.append(group)
            visited.update(group)

    return groups


# =============================================================================
# Advanced Metrics (Deep Analysis)
# =============================================================================

def compute_edge_signature(tile: Image.Image) -> Dict[str, str]:
    """
    Compute edge pixel signatures for each side of the tile.
    Used to determine how well tiles connect to each other.

    Returns hashed strings for top, bottom, left, right edges.
    """
    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")

    if np is None:
        return {"top": "", "bottom": "", "left": "", "right": ""}

    arr = np.array(tile)
    h, w = arr.shape[:2]

    # Extract edge pixel strips (2px deep for robustness)
    depth = min(2, h // 4, w // 4)

    top_strip = arr[:depth, :, :3].tobytes()
    bottom_strip = arr[-depth:, :, :3].tobytes()
    left_strip = arr[:, :depth, :3].tobytes()
    right_strip = arr[:, -depth:, :3].tobytes()

    # Hash each edge strip for quick comparison
    import hashlib
    return {
        "top": hashlib.md5(top_strip).hexdigest()[:8],
        "bottom": hashlib.md5(bottom_strip).hexdigest()[:8],
        "left": hashlib.md5(left_strip).hexdigest()[:8],
        "right": hashlib.md5(right_strip).hexdigest()[:8],
    }


def compute_edge_connectivity(
    tiles_data: List[Dict[str, Any]],
    grid_cols: int,
    grid_rows: int,
) -> Dict[int, Dict[str, Any]]:
    """
    Compute edge connectivity scores for each tile.
    A tile with high connectivity has edges that match its neighbors.

    Returns {tile_index: {score: float, matchingEdges: int, totalEdges: int}}
    """
    if np is None:
        return {}

    index_map = {}
    for t in tiles_data:
        if not t["isEmpty"] and "edgeSignature" in t:
            index_map[t["index"]] = t

    connectivity = {}

    for t in tiles_data:
        if t["isEmpty"] or "edgeSignature" not in t:
            continue

        idx = t["index"]
        col, row = t["col"], t["row"]
        sig = t["edgeSignature"]

        matching = 0
        total = 0

        # Check top neighbor
        if row > 0:
            neighbor_idx = (row - 1) * grid_cols + col
            if neighbor_idx in index_map:
                total += 1
                if sig["top"] == index_map[neighbor_idx]["edgeSignature"]["bottom"]:
                    matching += 1

        # Check bottom neighbor
        if row < grid_rows - 1:
            neighbor_idx = (row + 1) * grid_cols + col
            if neighbor_idx in index_map:
                total += 1
                if sig["bottom"] == index_map[neighbor_idx]["edgeSignature"]["top"]:
                    matching += 1

        # Check left neighbor
        if col > 0:
            neighbor_idx = row * grid_cols + (col - 1)
            if neighbor_idx in index_map:
                total += 1
                if sig["left"] == index_map[neighbor_idx]["edgeSignature"]["right"]:
                    matching += 1

        # Check right neighbor
        if col < grid_cols - 1:
            neighbor_idx = row * grid_cols + (col + 1)
            if neighbor_idx in index_map:
                total += 1
                if sig["right"] == index_map[neighbor_idx]["edgeSignature"]["left"]:
                    matching += 1

        score = matching / total if total > 0 else 0.0
        connectivity[idx] = {
            "score": round(score, 3),
            "matchingEdges": matching,
            "totalEdges": total,
        }

    return connectivity


def detect_symmetry(tile: Image.Image) -> Dict[str, bool]:
    """
    Detect tile symmetry types:
    - horizontal: left-right mirror symmetry
    - vertical: top-bottom mirror symmetry
    - rotational90: 90-degree rotational symmetry
    - rotational180: 180-degree rotational symmetry
    """
    if np is None:
        return {"horizontal": False, "vertical": False, "rotational90": False, "rotational180": False}

    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")

    arr = np.array(tile)[:, :, :3]  # RGB only
    h, w = arr.shape[:2]

    # Tolerance for pixel comparison (account for compression artifacts)
    tolerance = 10

    def arrays_similar(a, b, tol=tolerance):
        return np.mean(np.abs(a.astype(int) - b.astype(int))) < tol

    h_flip = arr[:, ::-1]
    v_flip = arr[::-1, :]

    horizontal = arrays_similar(arr, h_flip)
    vertical = arrays_similar(arr, v_flip)

    # Rotational: only check if tile is square
    rotational90 = False
    rotational180 = False
    if h == w:
        rot180 = np.rot90(arr, 2)
        rotational180 = arrays_similar(arr, rot180)
        rot90 = np.rot90(arr, 1)
        rotational90 = arrays_similar(arr, rot90)

    return {
        "horizontal": bool(horizontal),
        "vertical": bool(vertical),
        "rotational90": bool(rotational90),
        "rotational180": bool(rotational180),
    }


def compute_palette_complexity(tile: Image.Image) -> Dict[str, Any]:
    """
    Compute palette complexity metrics for a tile.

    Returns:
    - uniqueColors: number of distinct colors
    - dominantRatio: ratio of the most common color
    - colorEntropy: Shannon entropy of color distribution
    - hueSpread: how many hue bins are used (0-12)
    """
    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")

    pixels = list(tile.getdata())
    opaque_pixels = [(r, g, b) for r, g, b, a in pixels if a > 50]

    if not opaque_pixels:
        return {"uniqueColors": 0, "dominantRatio": 0, "colorEntropy": 0, "hueSpread": 0}

    # Quantize 4-bit
    quantized = [((r >> 4) << 4, (g >> 4) << 4, (b >> 4) << 4) for r, g, b in opaque_pixels]
    counter = Counter(quantized)

    unique_count = len(counter)
    total = len(quantized)
    dominant_count = counter.most_common(1)[0][1]
    dominant_ratio = dominant_count / total

    # Shannon entropy
    entropy = 0.0
    for count in counter.values():
        p = count / total
        if p > 0:
            entropy -= p * math.log2(p)

    # Hue spread
    hue_bins = set()
    for r, g, b in opaque_pixels[::max(1, len(opaque_pixels) // 100)]:  # Sample
        h, s, v = rgb_to_hsv(r / 255, g / 255, b / 255)
        if s > 0.1 and v > 0.1:
            hue_bins.add(int(h * 12) % 12)

    return {
        "uniqueColors": unique_count,
        "dominantRatio": round(dominant_ratio, 3),
        "colorEntropy": round(entropy, 3),
        "hueSpread": len(hue_bins),
    }


def find_pattern_frequencies(
    tiles_data: List[Dict[str, Any]],
    grid_cols: int,
) -> Dict[str, Any]:
    """
    Analyze repeating patterns in tile placement.

    Detects:
    - Row patterns (same tile sequence repeating)
    - Column patterns
    - 2x2 block patterns (common in Kenney tilesets for multi-tile objects)
    - Category adjacency frequencies
    """
    # Category adjacency
    adjacency = defaultdict(lambda: defaultdict(int))
    pattern_2x2 = Counter()

    non_empty = {t["index"]: t for t in tiles_data if not t["isEmpty"]}

    for t in tiles_data:
        if t["isEmpty"]:
            continue

        idx = t["index"]
        col, row = t["col"], t["row"]
        cat = t["category"]

        # Right neighbor category
        right_idx = row * grid_cols + (col + 1)
        if right_idx in non_empty:
            adjacency[cat][non_empty[right_idx]["category"]] += 1

        # Bottom neighbor category
        bottom_idx = (row + 1) * grid_cols + col
        if bottom_idx in non_empty:
            adjacency[cat][non_empty[bottom_idx]["category"]] += 1

        # 2x2 blocks
        r_idx = row * grid_cols + (col + 1)
        b_idx = (row + 1) * grid_cols + col
        br_idx = (row + 1) * grid_cols + (col + 1)

        if all(i in non_empty for i in [r_idx, b_idx, br_idx]):
            block_key = (
                non_empty[idx]["phash"][:4],
                non_empty[r_idx]["phash"][:4],
                non_empty[b_idx]["phash"][:4],
                non_empty[br_idx]["phash"][:4],
            )
            pattern_2x2[block_key] += 1

    # Find repeating 2x2 patterns
    repeating_blocks = [
        {"pattern": list(k), "count": v}
        for k, v in pattern_2x2.most_common(20)
        if v > 1
    ]

    return {
        "categoryAdjacency": {k: dict(v) for k, v in adjacency.items()},
        "repeating2x2Blocks": repeating_blocks,
        "totalRepeating2x2": len(repeating_blocks),
    }


def compute_tile_relationships(
    tiles_data: List[Dict[str, Any]],
    duplicate_threshold: int = 3,
) -> Dict[str, Any]:
    """
    Map relationships between tiles:
    - Similar tiles (pHash within threshold)
    - Category clusters (groups of same-category tiles)
    - Potential animation frames (similar tiles in sequence)
    """
    non_blank = [t for t in tiles_data if not t["isEmpty"]]
    hashes = {t["index"]: imagehash.hex_to_hash(t["phash"]) for t in non_blank}

    # Similarity graph (edges between similar tiles)
    similarity_pairs = []
    for i, t1 in enumerate(non_blank):
        for t2 in non_blank[i + 1:]:
            dist = hashes[t1["index"]] - hashes[t2["index"]]
            if 0 < dist <= duplicate_threshold:
                similarity_pairs.append({
                    "tileA": t1["index"],
                    "tileB": t2["index"],
                    "distance": int(dist),
                })

    # Category clusters
    category_clusters = defaultdict(list)
    for t in non_blank:
        category_clusters[t["category"]].append(t["index"])

    # Potential animation sequences (consecutive similar tiles in same row)
    animation_candidates = []
    for t in non_blank:
        col, row = t["col"], t["row"]
        sequence = [t["index"]]
        for offset in range(1, 8):
            next_col = col + offset
            next_idx = row * max(t["col"] + 1, 1)  # approximate grid cols
            # Look for next tile in sequence
            found = None
            for t2 in non_blank:
                if t2["col"] == next_col and t2["row"] == row:
                    dist = hashes.get(t["index"], None)
                    dist2 = hashes.get(t2["index"], None)
                    if dist is not None and dist2 is not None:
                        if dist - dist2 <= duplicate_threshold + 2:
                            found = t2
                    break
            if found:
                sequence.append(found["index"])
            else:
                break
        if len(sequence) >= 3:
            animation_candidates.append(sequence)

    # Deduplicate animation candidates
    seen = set()
    unique_animations = []
    for seq in animation_candidates:
        key = tuple(seq)
        if key not in seen:
            seen.add(key)
            unique_animations.append(seq)

    return {
        "similarityPairs": similarity_pairs[:100],  # Cap for JSON size
        "totalSimilarPairs": len(similarity_pairs),
        "categoryClusters": dict(category_clusters),
        "animationCandidates": unique_animations[:50],
    }


# =============================================================================
# Grid Extraction & Main Analysis
# =============================================================================

def analyze_tileset(
    image_path: str,
    tile_size: int = 16,
    spacing: int = 0,
    blank_threshold: float = 0.95,
    duplicate_threshold: int = 3,
    deep_metrics: bool = False,
) -> Dict[str, Any]:
    """
    Analyze a tileset image and produce metadata for all tiles.

    Args:
        image_path: Path to the tileset PNG
        tile_size: Width/height of each tile in pixels
        spacing: Pixels between tiles (grid line width)
        blank_threshold: Alpha ratio above which a tile is considered blank
        duplicate_threshold: Max hamming distance for duplicate detection
        deep_metrics: Enable advanced analysis (edge connectivity, symmetry, etc.)
    """
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size

    step = tile_size + spacing
    if spacing == 0:
        cols = width // tile_size
        rows = height // tile_size
    else:
        cols = width // step
        rows = height // step

    total_tiles = cols * rows
    tiles: List[Dict[str, Any]] = []
    categories: Dict[str, List[int]] = {}

    print(f"Image: {image_path}")
    print(f"Size: {width}x{height}, Grid: {cols}x{rows}, Tile: {tile_size}px, Spacing: {spacing}px")
    print(f"Total grid positions: {total_tiles}")
    if deep_metrics:
        print("Deep metrics: enabled")

    for row in range(rows):
        for col in range(cols):
            index = row * cols + col
            x = col * step
            y = row * step
            tile_img = img.crop((x, y, x + tile_size, y + tile_size))

            empty = is_blank_tile(tile_img, blank_threshold)

            if empty:
                tile_data = {
                    "index": index,
                    "col": col,
                    "row": row,
                    "dominantColor": [0, 0, 0],
                    "category": "empty",
                    "phash": "0" * 16,
                    "isEmpty": True,
                }
            else:
                dominant = get_dominant_color(tile_img)
                category = _classify_by_color(*dominant)
                phash = compute_phash(tile_img)

                tile_data = {
                    "index": index,
                    "col": col,
                    "row": row,
                    "dominantColor": list(dominant),
                    "category": category,
                    "phash": phash,
                    "isEmpty": False,
                }

                # Deep metrics per tile
                if deep_metrics:
                    tile_data["edgeSignature"] = compute_edge_signature(tile_img)
                    tile_data["symmetry"] = detect_symmetry(tile_img)
                    tile_data["paletteComplexity"] = compute_palette_complexity(tile_img)

                categories.setdefault(category, []).append(index)

            tiles.append(tile_data)

    # Find duplicates among non-blank tiles
    duplicates = find_duplicates(tiles, duplicate_threshold)
    non_blank_count = len([t for t in tiles if not t["isEmpty"]])

    print(f"Non-blank tiles: {non_blank_count} / {total_tiles}")
    print(f"Duplicate groups found: {len(duplicates)}")
    print(f"Categories: {', '.join(f'{k}({len(v)})' for k, v in sorted(categories.items()))}")

    result = {
        "source": image_path,
        "grid": {
            "cols": cols,
            "rows": rows,
            "tileSize": tile_size,
            "spacing": spacing,
        },
        "totalTiles": total_tiles,
        "nonBlankTiles": non_blank_count,
        "tiles": tiles,
        "duplicates": duplicates,
        "categories": categories,
    }

    # Deep analysis sections
    if deep_metrics:
        print("Computing edge connectivity...")
        connectivity = compute_edge_connectivity(tiles, cols, rows)
        result["edgeConnectivity"] = connectivity

        # Summary stats
        if connectivity:
            scores = [v["score"] for v in connectivity.values()]
            result["edgeConnectivitySummary"] = {
                "meanScore": round(sum(scores) / len(scores), 3) if scores else 0,
                "perfectConnections": sum(1 for s in scores if s >= 1.0),
                "noConnections": sum(1 for s in scores if s == 0),
                "totalScored": len(scores),
            }

        print("Analyzing pattern frequencies...")
        result["patternFrequencies"] = find_pattern_frequencies(tiles, cols)

        print("Mapping tile relationships...")
        result["tileRelationships"] = compute_tile_relationships(tiles, duplicate_threshold)

        # Symmetry summary
        sym_counts = {"horizontal": 0, "vertical": 0, "rotational90": 0, "rotational180": 0}
        for t in tiles:
            if "symmetry" in t:
                for key, val in t["symmetry"].items():
                    if val:
                        sym_counts[key] += 1
        result["symmetrySummary"] = sym_counts

        # Palette complexity summary
        complexities = [t.get("paletteComplexity", {}) for t in tiles if not t["isEmpty"] and "paletteComplexity" in t]
        if complexities:
            result["paletteComplexitySummary"] = {
                "avgUniqueColors": round(sum(c["uniqueColors"] for c in complexities) / len(complexities), 1),
                "avgEntropy": round(sum(c["colorEntropy"] for c in complexities) / len(complexities), 3),
                "avgDominantRatio": round(sum(c["dominantRatio"] for c in complexities) / len(complexities), 3),
                "avgHueSpread": round(sum(c["hueSpread"] for c in complexities) / len(complexities), 1),
                "simpleTiles": sum(1 for c in complexities if c["uniqueColors"] <= 4),
                "complexTiles": sum(1 for c in complexities if c["uniqueColors"] > 16),
            }

        print("Deep analysis complete.")

    return result


# =============================================================================
# Preview Generation
# =============================================================================

def generate_preview(
    image_path: str,
    analysis: Dict[str, Any],
    output_path: str,
    scale: int = 2,
    show_connectivity: bool = False,
) -> None:
    """Generate a visual preview PNG with category color overlays and labels."""
    try:
        from PIL import ImageDraw, ImageFont
    except ImportError:
        print("Warning: Cannot generate preview without PIL ImageDraw")
        return

    grid = analysis["grid"]
    tile_size = grid["tileSize"]
    spacing = grid["spacing"]
    cols = grid["cols"]
    rows = grid["rows"]

    img = Image.open(image_path).convert("RGBA")

    preview_w = img.width * scale
    preview_h = img.height * scale
    preview = img.resize((preview_w, preview_h), Image.Resampling.NEAREST)
    draw = ImageDraw.Draw(preview, "RGBA")

    category_colors = {
        "nature": (0, 200, 0, 60),
        "water": (0, 100, 255, 60),
        "road": (150, 150, 150, 60),
        "wall": (100, 100, 100, 60),
        "wood": (160, 100, 40, 60),
        "brick": (200, 50, 50, 60),
        "sand": (220, 200, 100, 60),
        "light_surface": (240, 240, 240, 40),
        "decoration": (200, 100, 200, 60),
        "void": (0, 0, 0, 40),
        "empty": (0, 0, 0, 0),
    }

    step = tile_size + spacing
    connectivity = analysis.get("edgeConnectivity", {})

    for tile in analysis["tiles"]:
        if tile["isEmpty"]:
            continue

        col = tile["col"]
        row = tile["row"]
        category = tile["category"]

        x1 = col * step * scale
        y1 = row * step * scale
        x2 = x1 + tile_size * scale
        y2 = y1 + tile_size * scale

        color = category_colors.get(category, (128, 128, 128, 40))
        draw.rectangle([x1, y1, x2, y2], fill=color)

        border_color = tuple(list(color[:3]) + [120])
        draw.rectangle([x1, y1, x2, y2], outline=border_color)

        # Connectivity indicator (if deep analysis)
        if show_connectivity and tile["index"] in connectivity:
            conn = connectivity[tile["index"]]
            score = conn.get("score", 0)
            # Green=high connectivity, Red=low
            r_c = int(255 * (1 - score))
            g_c = int(255 * score)
            indicator_size = max(2, scale)
            draw.ellipse(
                [x2 - indicator_size * 2, y1 + 1, x2 - 1, y1 + indicator_size * 2],
                fill=(r_c, g_c, 0, 180),
            )

        # Symmetry indicator
        sym = tile.get("symmetry", {})
        if sym.get("rotational90"):
            draw.text((x1 + 1, y2 - scale * 5), "R", fill=(255, 255, 0, 200))
        elif sym.get("horizontal") and sym.get("vertical"):
            draw.text((x1 + 1, y2 - scale * 5), "S", fill=(0, 255, 255, 200))

    preview.save(output_path)
    print(f"Preview saved to {output_path}")


# =============================================================================
# CLI
# =============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analyze Kenney tileset PNGs with advanced metrics."
    )
    parser.add_argument("--input", "-i", required=True, help="Path to tileset/tilemap PNG file")
    parser.add_argument("--tile-size", "-t", type=int, default=16, help="Tile size in pixels (default: 16)")
    parser.add_argument("--spacing", "-s", type=int, default=0, help="Spacing between tiles (default: 0)")
    parser.add_argument("--output", "-o", help="Output JSON report path (default: stdout)")
    parser.add_argument("--preview", "-p", help="Generate preview PNG at this path")
    parser.add_argument("--blank-threshold", type=float, default=0.95)
    parser.add_argument("--duplicate-threshold", type=int, default=3)
    parser.add_argument("--deep-metrics", "-d", action="store_true",
                        help="Enable deep analysis: edge connectivity, symmetry, patterns, palette complexity")
    parser.add_argument("--show-connectivity", action="store_true",
                        help="Show connectivity indicators in preview (requires --deep-metrics)")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    analysis = analyze_tileset(
        image_path=args.input,
        tile_size=args.tile_size,
        spacing=args.spacing,
        blank_threshold=args.blank_threshold,
        duplicate_threshold=args.duplicate_threshold,
        deep_metrics=args.deep_metrics,
    )

    if args.output:
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(analysis, f, indent=2)
        print(f"\nAnalysis saved to {args.output}")
    else:
        print(json.dumps(analysis, indent=2))

    if args.preview:
        os.makedirs(os.path.dirname(args.preview) or ".", exist_ok=True)
        generate_preview(
            args.input, analysis, args.preview,
            show_connectivity=args.show_connectivity,
        )


if __name__ == "__main__":
    main()
